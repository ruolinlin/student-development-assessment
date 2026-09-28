import { bankVersion, isComplete, questions } from './question-bank';
import { emptyPersonalInformation, profileFields, validateSession, type AssessmentSession } from './assessment-session';

const storageKey = 'student-development-assessment:beta-1.0';

export function loadBrowserSession(): AssessmentSession | null {
  const raw = window.localStorage.getItem(storageKey);
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    return validateSession(value) ? value : null;
  } catch {
    return null;
  }
}

function store(session: AssessmentSession) {
  window.localStorage.setItem(storageKey, JSON.stringify(session));
  return session;
}

export function createBrowserSession(preferredName: string): AssessmentSession {
  const existing = loadBrowserSession();
  if (existing) return existing;
  return store({
    preferredName: preferredName.trim(),
    answers: {},
    currentIndex: 0,
    revision: 1,
    bankVersion,
    status: 'in_progress',
    updatedAt: new Date().toISOString(),
    personalInformation: emptyPersonalInformation(),
    currentProfileStep: 0,
    completedProfileSteps: 0,
  });
}

export function saveBrowserAnswer(current: AssessmentSession, currentIndex: number, value?: number): AssessmentSession {
  const answers = { ...current.answers };
  if (value !== undefined) answers[questions[current.currentIndex].item_id] = value;
  return store({
    ...current,
    answers,
    currentIndex,
    revision: current.revision + 1,
    status: isComplete(answers) ? 'completed' : 'in_progress',
    updatedAt: new Date().toISOString(),
  });
}

export function saveBrowserProfile(current: AssessmentSession, step: number, value: string, complete: boolean, targetStep: number): AssessmentSession {
  const completedProfileSteps = Math.max(current.completedProfileSteps, complete ? step + 1 : 0);
  return store({
    ...current,
    personalInformation: { ...current.personalInformation, [profileFields[step]]: value },
    completedProfileSteps,
    currentProfileStep: targetStep,
    revision: current.revision + 1,
    updatedAt: new Date().toISOString(),
  });
}
