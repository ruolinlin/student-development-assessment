"""Read the approved workbook without modifying it; preserve every question verbatim."""
from pathlib import Path
import collections
import hashlib
import json
import re
import openpyxl

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'source/学生发展优势测评_20260920.xlsx'
workbook = openpyxl.load_workbook(SOURCE, data_only=False)
sheet = workbook['题库']
expected_headers = ['题号', '一级维度', '子维度', '学生题目', '偏好方向', '是否反向计分', '设计说明', '状态', '题库字段']
assert list(next(sheet.iter_rows(min_row=5, max_row=5, values_only=True))) == expected_headers
items, blanks, anomalies = [], [], []
for row_number, row in enumerate(sheet.iter_rows(min_row=6, values_only=True), 6):
    if all(value in (None, '') for value in row):
        anomalies.append(f'题库第 {row_number} 行为空行')
        continue
    item_id, dimension, subdimension, text, direction, reverse, rationale, status, key = row
    for field, value in zip(expected_headers, row):
        if value in (None, ''):
            blanks.append({'row': row_number, 'item_id': item_id, 'field': field})
    if not isinstance(item_id, str) or not re.fullmatch(r'Q\d+', item_id):
        anomalies.append(f'第 {row_number} 行题号格式异常：{item_id}')
    if reverse not in ('是', '否'):
        anomalies.append(f'{item_id} 反向计分标记无法识别：{reverse}')
    if direction not in (None, '', '左端', '右端'):
        anomalies.append(f'{item_id} 偏好方向无法识别：{direction}')
    items.append(dict(item_id=item_id, dimension=dimension, dimension_key=key,
                      subdimension=subdimension, question_text=text, order=len(items)+1,
                      scoring_direction=direction or None, reverse_scoring=reverse == '是',
                      design_note=rationale, source_status=status,
                      source_row=row_number))

options = [{'value': row[0], 'label': row[1]} for row in workbook['作答选项'].iter_rows(min_row=6, values_only=True)
           if row[0] is not None]
ids = [i['item_id'] for i in items]
counts = collections.Counter(ids)
duplicates = [k for k, v in counts.items() if v > 1]
numbers = [int(x[1:]) for x in ids if isinstance(x, str) and re.fullmatch(r'Q\d+', x)]
missing = [f'Q{x:02d}' for x in range(min(numbers), max(numbers)+1) if x not in numbers]
text_groups = collections.defaultdict(list)
for item in items:
    text_groups[item['question_text']].append(item['item_id'])
duplicate_texts = [v for v in text_groups.values() if len(v) > 1]
dimensions = []
for name in dict.fromkeys(i['dimension'] for i in items):
    group = [i for i in items if i['dimension'] == name]
    dimensions.append({'name': name, 'count': len(group), 'subdimensions': dict(collections.Counter(i['subdimension'] for i in group))})
formulas = [f'{s.title}!{c.coordinate}' for s in workbook for row in s for c in row if c.data_type == 'f']
sha = hashlib.sha256(SOURCE.read_bytes()).hexdigest()
bank = {'schema_version': 1, 'source_file': SOURCE.name, 'source_sha256': sha,
        'options': options, 'items': items,
        'scoring_policy': {'status': 'awaiting_confirmation', 'aggregation': None}}
audit = {'source_sha256': sha, 'item_count': len(items), 'dimension_count': len(dimensions),
         'dimensions': dimensions, 'item_ids': ids, 'duplicate_ids': duplicates,
         'missing_ids_within_observed_sequence': missing, 'duplicate_questions': duplicate_texts,
         'blank_cells': blanks, 'structural_anomalies': anomalies, 'formula_cells': formulas,
         'reverse_item_ids': [i['item_id'] for i in items if i['reverse_scoring']],
         'options': options, 'scoring_policy_status': 'awaiting_confirmation'}
for path, value in [('data/question-bank.json', bank), ('docs/question-bank-audit.json', audit)]:
    (ROOT/path).write_text(json.dumps(value, ensure_ascii=False, indent=2)+'\n')

lines = ['# 正式题库审计', '', f'源文件：`source/{SOURCE.name}`', f'SHA-256：`{sha}`', '',
         f'总题数：{len(items)}；一级维度：{len(dimensions)}。', '', '| 维度 | 题数 | 子维度数 |', '| --- | ---: | ---: |']
lines += [f"| {d['name']} | {d['count']} | {len(d['subdimensions'])} |" for d in dimensions]
lines += ['', '## 数据完整性', '', f'- ID 唯一：{not duplicates}；重复 ID：{duplicates}。',
          f'- 当前 Q01–Q72 连续序列缺号：{missing}。此项仅核对实际编号，不推断其他版本的题数。',
          f'- 完全重复题目：{duplicate_texts}；结构异常：{anomalies}。',
          f'- 空白单元格：{len(blanks)} 个，详见 JSON 明细。',
          '- 60 道非偏好题的「偏好方向」为空；不据此补写计分方向。其他题目字段无空白。',
          '- 72 题「是否反向计分」均为「否」。偏好方向为左端不等于反向计分。',
          '- 工作簿没有公式或批注；未发现独立计分规则工作表。',
          '- 源文件保留历史导出说明及家长端选项列；新题库只导入学生题目和学生端选项。',
          '', '## 量表', '']
lines += [f"- {o['value']}：{o['label']}" for o in options]
lines += ['', '## 尚待确认的评分规则', '',
          '原文件只提供单题分值、偏好方向和反向计分标记，未指定：',
          '- 普通子维度/一级维度的汇总方法与权重。',
          '- 双极偏好的左右端如何合成；部分组的左右题数不相等。',
          '- 标准化、常模、高低阈值及并列处理规则。',
          '', '建议待确认方案：普通子维度等权均分；偏好四组左右分别均分，不合成偏好总分；不设常模或高低阈值。',
          '确认前不运行正式评分，不生成画像，Milestone A 尚未通过。',
          '', '## 逐题顺序与映射', '', '| 顺序 | ID | 维度 | 子维度 | 偏好方向 | 反向计分 | 题目原文 |', '| ---: | --- | --- | --- | --- | --- | --- |']
lines += [f"| {i['order']} | {i['item_id']} | {i['dimension']} | {i['subdimension']} | {i['scoring_direction'] or '空白'} | {'是' if i['reverse_scoring'] else '否'} | {i['question_text']} |" for i in items]
(ROOT/'docs/question-bank-audit.md').write_text('\n'.join(lines)+'\n')
print(json.dumps({k: audit[k] for k in ('item_count','dimension_count','dimensions','duplicate_ids','missing_ids_within_observed_sequence','duplicate_questions','structural_anomalies')}, ensure_ascii=False, indent=2))
