import type { PersonalInformation } from './assessment-session';

export interface SubdimensionResult {
  key: string;
  name: string;
  dimensionKey: string;
  itemIds: string[];
  score: number;
  explanation: string;
  situation: string;
}
export interface DimensionResult {
  key: string;
  name: string;
  kind: 'scale' | 'preference';
  score: number | null;
  subdimensions: SubdimensionResult[];
  explanation: string;
}
export interface PreferenceResult {
  key: string;
  name: string;
  itemIds: string[];
  leftLabel: string;
  rightLabel: string;
  position: number;
  direction: 'left' | 'between' | 'right';
  explanation: string;
}
export interface DevelopmentClue {
  id: string;
  title: string;
  description: string;
  dimensionKeys: string[];
  itemIds: string[];
}
export interface EvidenceGap {
  id: string;
  dimensionKeys: string[];
  itemIds: string[];
  description: string;
  question: string;
}
export interface EvidenceConnection {
  dimensionKey: string;
  dimensionName: string;
  itemId: string;
  questionText: string;
  responseLabel: string;
  contextField: keyof PersonalInformation;
  studentText: string;
  sharedTerms: string[];
  explanation: string;
}
export interface DevelopmentProfile {
  clues: DevelopmentClue[];
  evidenceConnections: EvidenceConnection[];
  evidenceGaps: EvidenceGap[];
  explorationQuestions: string[];
  interpretationVersion: string;
}
export interface StudentReportData {
  schemaVersion: 1;
  source: { bankVersion: string; scoringVersion: string | null; sessionRevision: number; mode: 'student' | 'testing' };
  title: string;
  studentContext: PersonalInformation & { preferredName: string };
  updatedAt: string;
  assessmentResults: { scoringVersion: string; answeredCount: number } | null;
  dimensionResults: DimensionResult[] | null;
  preferenceResults: PreferenceResult[];
  developmentProfile: DevelopmentProfile | null;
  rawAnswers: Array<{ itemId: string; question: string; value: number; label: string }>;
  counselorPackageStatus: 'not_ready' | 'ready';
}
