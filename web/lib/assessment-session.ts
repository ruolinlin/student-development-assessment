import { bankVersion, isComplete, validItemIndex, validateAnswers } from './question-bank';

export type AssessmentSession = {
  preferredName: string;
  answers: Record<string, number>;
  currentIndex: number;
  revision: number;
  bankVersion: string;
  status: 'in_progress' | 'completed';
  updatedAt: string;
};

export function validateSession(input: unknown): input is AssessmentSession {
  if (!input || typeof input !== 'object') return false;
  const s = input as AssessmentSession;
  return s.bankVersion === bankVersion && typeof s.preferredName === 'string' && s.preferredName.trim().length > 0 && s.preferredName.length <= 30
    && validateAnswers(s.answers) && validItemIndex(s.currentIndex) && Number.isInteger(s.revision) && s.revision >= 1
    && s.status === (isComplete(s.answers) ? 'completed' : 'in_progress') && typeof s.updatedAt === 'string' && Number.isFinite(Date.parse(s.updatedAt));
}
