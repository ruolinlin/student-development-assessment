import { formalDimensions } from '../formal-dimensions';
import type { DimensionResult, SubdimensionResult } from '../development-types';
import type { ScoredItem } from './scoring-types';

export const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
export const round2 = (value: number) => Math.round(value * 100) / 100;

export function scoreScaleDimensions(items: ScoredItem[]): DimensionResult[] {
  return formalDimensions.filter(dimension => dimension.key !== 'preferences').map(dimension => {
    const subdimensions: SubdimensionResult[] = dimension.subdimensions.map(subdimension => {
      const participating = items.filter(item => item.dimensionKey === dimension.key && item.subdimensionKey === subdimension.name);
      if (participating.length !== subdimension.items.length) throw new Error(`子维度 ${subdimension.name} 的题目不完整。`);
      const score = round2(average(participating.map(item => item.transformed)));
      return {
        key: subdimension.key,
        name: subdimension.name,
        dimensionKey: dimension.key,
        itemIds: participating.map(item => item.itemId),
        score,
        explanation: `由 ${participating.length} 道正式题目等权平均得到。`,
        situation: `参与题目：${participating.map(item => item.itemId).join('、')}。`,
      };
    });
    return {
      key: dimension.key,
      name: dimension.name,
      kind: 'scale' as const,
      score: round2(average(subdimensions.map(result => result.score))),
      subdimensions,
      explanation: `由 ${subdimensions.length} 个子维度等权平均得到；分数是本次自我描述，不是能力等级。`,
    };
  });
}
