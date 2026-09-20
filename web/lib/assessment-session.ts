import { bankVersion, isComplete, validItemIndex, validateAnswers } from './question-bank';

export const profileFields = ['grade', 'strengthSubjects', 'achievementExperience', 'achievementReason', 'targetRegions', 'additionalContext'] as const;
export type ProfileField = typeof profileFields[number];
export type PersonalInformation = Record<ProfileField, string>;
export const emptyPersonalInformation = (): PersonalInformation => ({ grade: '', strengthSubjects: '', achievementExperience: '', achievementReason: '', targetRegions: '', additionalContext: '' });
export function validatePersonalInformation(value: unknown): value is PersonalInformation {
  return !!value && typeof value === 'object' && profileFields.every(field => typeof (value as PersonalInformation)[field] === 'string');
}

export type AssessmentSession = {
  preferredName: string;
  answers: Record<string, number>;
  currentIndex: number;
  revision: number;
  bankVersion: string;
  status: 'in_progress' | 'completed';
  updatedAt: string;
  personalInformation: PersonalInformation;
  currentProfileStep: number;
  completedProfileSteps: number;
};

export function validateSession(input: unknown): input is AssessmentSession {
  if (!input || typeof input !== 'object') return false;
  const s = input as AssessmentSession;
  return s.bankVersion === bankVersion && typeof s.preferredName === 'string' && s.preferredName.length <= 30
    && validatePersonalInformation(s.personalInformation) && Number.isInteger(s.currentProfileStep) && s.currentProfileStep >= 0 && s.currentProfileStep < profileFields.length && Number.isInteger(s.completedProfileSteps) && s.completedProfileSteps >= 0 && s.completedProfileSteps <= profileFields.length
    && validateAnswers(s.answers) && validItemIndex(s.currentIndex) && Number.isInteger(s.revision) && s.revision >= 1
    && s.status === (isComplete(s.answers) ? 'completed' : 'in_progress') && typeof s.updatedAt === 'string' && Number.isFinite(Date.parse(s.updatedAt));
}
