import { bankVersion, questions, responseOptions } from '../question-bank';

export const scoringVersion = 'student-scoring-v1';
export const scoringBankVersion = bankVersion;
const supportedBankVersion = 'bdc24ef9fc5f6995b0a1daeae8a6204c5913b7212384dbbfb837ffa67d480b74';
export const validScores = new Set(responseOptions.map(option => option.value));
export const preferenceLeftItemIds = questions
  .filter(item => item.dimension_key === 'preferences' && item.scoring_direction === '左端')
  .map(item => item.item_id);

export function assertScoringConfiguration() {
  if (scoringBankVersion !== supportedBankVersion) throw new Error('正式题库版本与 student-scoring-v1 不匹配。');
  const ids = questions.map(item => item.item_id);
  if (ids.length !== 72 || new Set(ids).size !== ids.length) throw new Error('评分配置中的题目数量或 item ID 重复。');
  for (const item of questions) {
    if (!item.dimension_key || !item.subdimension) throw new Error(`题目 ${item.item_id} 缺少维度映射。`);
    if (item.dimension_key === 'preferences' && item.scoring_direction !== '左端' && item.scoring_direction !== '右端') {
      throw new Error(`偏好题 ${item.item_id} 缺少左右端映射。`);
    }
    if (item.dimension_key !== 'preferences' && item.scoring_direction !== null) throw new Error(`普通题 ${item.item_id} 存在无效方向。`);
  }
}
