import type { DimensionResult, PreferenceResult } from '../development-types';

export type ScoringOutput = {
  version: string;
  dimensions: DimensionResult[];
  preferences: PreferenceResult[];
};

export type ScoredItem = {
  itemId: string;
  dimensionKey: string;
  subdimensionKey: string;
  raw: number;
  transformed: number;
  reversed: boolean;
};
