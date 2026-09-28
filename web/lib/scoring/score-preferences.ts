import { formalDimensions } from '../formal-dimensions';
import type { DimensionResult, PreferenceResult, SubdimensionResult } from '../development-types';
import type { ScoredItem } from './scoring-types';
import { average, round2 } from './score-scales';

export function scorePreferences(items: ScoredItem[]): { dimension: DimensionResult; preferences: PreferenceResult[] } {
  const formal = formalDimensions.find(dimension => dimension.key === 'preferences');
  if (!formal) throw new Error('正式题库缺少偏好维度。');
  const preferences: PreferenceResult[] = [];
  const subdimensions: SubdimensionResult[] = formal.subdimensions.map(subdimension => {
    const participating = items.filter(item => item.dimensionKey === formal.key && item.subdimensionKey === subdimension.name);
    if (participating.length !== subdimension.items.length) throw new Error(`偏好组 ${subdimension.name} 的题目不完整。`);
    const position = round2(average(participating.map(item => item.transformed)));
    const [leftLabel, rightLabel] = subdimension.name.split('↔').map(label => label.trim());
    const direction = position < 2.75 ? 'left' : position > 3.25 ? 'right' : 'between';
    const directionText = direction === 'left' ? `更靠近“${leftLabel}”` : direction === 'right' ? `更靠近“${rightLabel}”` : `位于“${leftLabel}”与“${rightLabel}”之间`;
    preferences.push({
      key: subdimension.key,
      name: subdimension.name,
      itemIds: participating.map(item => item.itemId),
      leftLabel,
      rightLabel,
      position,
      direction,
      explanation: `${directionText}。这是双极位置，不表示能力高低。`,
    });
    return {
      key: subdimension.key,
      name: subdimension.name,
      dimensionKey: formal.key,
      itemIds: participating.map(item => item.itemId),
      score: position,
      explanation: '左端题按 6−原始答案转换，右端题保留原始答案，再等权平均。',
      situation: `参与题目：${participating.map(item => item.itemId).join('、')}。`,
    };
  });
  const clarity = round2(1 + average(preferences.map(result => Math.abs(result.position - 3))) * 2);
  return {
    preferences,
    dimension: {
      key: formal.key,
      name: formal.name,
      kind: 'preference',
      score: clarity,
      subdimensions,
      explanation: '总览分表示四组偏好位置离中点的平均清晰程度，不表示更好、更强或能力更高。',
    },
  };
}
