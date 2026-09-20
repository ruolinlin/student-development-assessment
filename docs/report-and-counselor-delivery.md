# 正式维度展示与导师分析资料：实现状态

2026-09-21。本轮保留正式题库原文、ID、维度名称和映射，未实现未经确认的评分公式，未调用 AI 或外部分析服务。

## 当前边界：真实维度结果仍待评分确认

项目中不存在已批准并实现的 scorer。正式题库的 scoring_policy.status 仍为 awaiting_confirmation。此前确认的是旧版评分维度，上一轮明确选择了先展示原始作答、注明维度缺失的报告。

本轮已经向用户提出采用旧项目审计公式的确认问题，尚未收到答复。因此：

- 普通学生会话没有真实 Dimension Results，不伪造分数。
- 完整报告下载及导师资料生成保持关闭，已有个人信息和原始作答保留。
- `/testing` 仅开发环境开放，使用显式展示测试值，不是真实评分。它可以验证两份成果，但不能作为评分验收。
- 本轮 A 的真实评分接入、真实学生 B 的第四阶段开放，以及 Mock Responses → real scoring 的测试仍未完成；不能宣称全流程正式完成。

## 1. 正式维度来源

`web/data/question-bank.json` 是最新 Excel 的唯一运行数据源。`web/lib/formal-dimensions.ts` 从每题的 dimension_key、dimension、subdimension 分组，派生所有名称、顺序和 itemIds，不使用旧 V2 标签表。

当前文件实际包含：兴趣、优势、偏好、价值、能力信心；36 个子维度。偏好四组：具体 ↔ 抽象、独立 ↔ 互动、计划 ↔ 探索、分析 ↔ 人本。左右文字直接拆分正式子维度名称。

## 2. StudentReportData

定义于 `web/lib/development-types.ts`：

- schemaVersion
- source：bankVersion、scoringVersion、sessionRevision、mode
- title、updatedAt
- studentContext：preferredName 与四项个人信息
- assessmentResults：评分版本、作答数量，或 null
- dimensionResults：正式维度及子维度的 key/name/itemIds/score/explanation/situation，或 null
- preferenceResults：左右名称、位置、方向与解释
- developmentProfile：clues、evidenceConnections、evidenceGaps、explorationQuestions、interpretationVersion
- rawAnswers：题目 ID、原文、原始选择与标签
- counselorPackageStatus：not_ready / ready

## 3. 数据链

`createStudentReport(session, scoringOutput, mode)` 以正式题库校验作答，接收评分结果后创建 Development Profile，再组合 Student Context。默认 scoringOutput 为 null，尚未连接任何未授权公式。

报告 UI 和导师资料都读取这个底层对象。导师资料不解析或总结报告文字。

## 4. 可视化和解释

- 普通维度使用横向 1–5 图，同时展示所有子维度的展开说明。
- 偏好用独立双端位置图，不生成偏好总分排名。
- 没有高/中/低、百分位、常模、客观能力结论。
- 线索来自维度内分布、同组题目差异、偏好位置与真实文字的可对照之处，不直接选最高分推荐专业。
- 文字关联采用可追溯的词语重合规则，并明确说明这不是行为证据的核实；不会假装进行了语义推理或 AI 分析。
- 开放问题结合具体维度和学生经历，且在导师包中标记为系统建议问题，不冒充学生本人新作答。

## 5. 六段报告

01 我的发展画像；02 比较明显的发展线索；03 真实经历中的我；04 测评和真实经历放在一起；05 值得继续认识的问题；06 下一步。原始作答另作附录。

## 6. CounselorPackage

定义于 `web/lib/counselor-package.ts`：student（称呼、年级）、assessment（版本、维度、偏好、画像、全部原始作答）、academics、experience、evidenceGaps、studentQuestions、promptVersion、sourceRevision、mode。

`ready` 要求测评与信息完成、正式维度完整、36个子维度及对应题目完整、四组偏好有效、画像存在。缺失任何必要结果时拒绝生成。

## 7. Prompt 模板

`web/prompts/counselor-analysis-v3.ts`，独立可维护的多行模板。归档 `docs/counselor-prompt-v3-provided.txt` 不改动。

为遵守本轮 Student-Only / 不出现家长要求，运行模板仅从第28节阅读对象列表移除“家长”；其余 V3 原文保留。版本为 V3-student-only。用户也收到这一处冲突的说明与选择问题，若选择保留原文可恢复该处。

## 8–10. 两份成果

- 学生报告 Markdown：六段内容与原始作答，不包含导师指令。
- 导师 Markdown：PART A — Student Development Context（结构化原始资料）；PART B — Counselor Analysis Instructions（正式 V3，输入占位符指向 PART A）。
- 模板与学生数据分离，学生资料只插入一次；资料中的文字不被视为操作指令。
- 文件名分别为“我的发展报告_称呼.md”和“导师分析资料_称呼.md”；称呼为空时省略后缀。
- 第四阶段仅提供准备完成、复制、下载与回看学生报告，不铺开指令正文。自动复制失败时提供手动复制备用界面。

## 11. 验证

- 类型检查和生产构建通过。
- 单元验证：36 个子维度、4 组偏好与正式题库一致；六段报告；两份成果共享同一对象；缺失维度/偏好/画像/作答时禁止生成；模板除指定阅读对象外与归档一致；没有旧 parent 字段。
- 开发预览浏览器验证：生成测试报告 → 第四步 → 导师资料成功；四阶段进度正确。
- 两份 Markdown 实际下载到本机，并读取核对内容：学生报告 8,179 字符，导师资料 46,918 字符（测试样本）；两份内容不同，导师文件具有 A/B 两部分。
- 复制按钮调用成功，页面出现“导师分析资料已复制”。浏览器自动化的虚拟剪贴板与网页剪贴板隔离，无法通过工具独立回读粘贴内容；不声称已完成系统剪贴板跨应用验证。
- 手机 390px：维度图和第四阶段无横向溢出；四阶段折为两行，操作可访问。未进行真机软键盘测试。
- 生产环境测试入口由 NODE_ENV 检查关闭；开发测试不读取或写入真实学生会话。

验证命令（web 目录）：

```
npx tsc --noEmit --incremental false
./node_modules/.bin/esbuild scripts/verify-report-artifacts.ts --bundle --platform=node --format=esm --outfile=/tmp/verify-report-artifacts.mjs
node /tmp/verify-report-artifacts.mjs
```

## 12. 本轮文件

新增：
- web/lib/development-types.ts
- web/lib/formal-dimensions.ts
- web/lib/development-profile.ts
- web/lib/counselor-package.ts
- web/lib/student-report-markdown.ts
- web/lib/download-text.ts
- web/lib/testing-report.ts
- web/prompts/counselor-analysis-v3.ts
- web/components/counselor-materials.tsx
- web/components/report-testing.tsx
- web/app/testing/page.tsx
- web/scripts/verify-report-artifacts.ts
- 本文档

修改：
- web/lib/student-report.ts
- web/components/student-report.tsx
- web/components/student-experience.tsx
- web/app/globals.css

本轮没有改题库、旧项目、评分规则、数据库 schema、个人信息收集问题或归档 Prompt 原文。
