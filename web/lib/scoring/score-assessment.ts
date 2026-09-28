import { questions } from '../question-bank';
import { assertScoringConfiguration, scoringVersion, validScores } from './scoring-config';
import { scorePreferences } from './score-preferences';
import { scoreScaleDimensions } from './score-scales';
import type { ScoredItem, ScoringOutput } from './scoring-types';

export function transformItemScore(itemId: string, raw: number): ScoredItem {
  const item = questions.find(candidate => candidate.item_id === itemId);
  if (!item) throw new Error(`无效 item ID：${itemId}`);
  if (!Number.isInteger(raw) || !validScores.has(raw)) throw new Error(`题目 ${itemId} 的答案值无效。`);
  const reversed = item.reverse_scoring || (item.dimension_key === 'preferences' && item.scoring_direction === '左端');
  return {
    itemId,
    dimensionKey: item.dimension_key,
    subdimensionKey: item.subdimension,
    raw,
    transformed: reversed ? 6 - raw : raw,
    reversed,
  };
}

export function scoreAssessment(answers: Record<string, number>): ScoringOutput {
  assertScoringConfiguration();
  const answerIds = Object.keys(answers);
  const officialIds = new Set(questions.map(item => item.item_id));
  const unknown = answerIds.filter(id => !officialIds.has(id));
  if (unknown.length) throw new Error(`答案包含无效 item ID：${unknown.join('、')}`);
  if (answerIds.length !== questions.length) throw new Error(`答案不完整：需要 ${questions.length} 题，实际 ${answerIds.length} 题。`);
  const scoredItems = questions.map(item => transformItemScore(item.item_id, answers[item.item_id]));
  const scaleDimensions = scoreScaleDimensions(scoredItems);
  const preference = scorePreferences(scoredItems);
  const byKey = new Map([...scaleDimensions, preference.dimension].map(result => [result.key, result]));
  const dimensions = Array.from(new Set(questions.map(item => item.dimension_key))).map(key => {
    const result = byKey.get(key);
    if (!result) throw new Error(`维度 ${key} 未生成评分结果。`);
    return result;
  });
  return { version: scoringVersion, dimensions, preferences: preference.preferences };
}
