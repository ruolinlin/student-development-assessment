import { bankVersion, isComplete, questions, responseOptions } from './question-bank';
import { profileFields, type AssessmentSession } from './assessment-session';
import type { StudentReportData } from './development-types';
import type { ScoringOutput } from './scoring/scoring-types';
import { createDevelopmentProfile } from './development-profile';
import { hasCompleteDimensionResults } from './counselor-package';

export type { ScoringOutput } from './scoring/scoring-types';
// Shared bottom-layer data: report and counselor materials branch from this object.
// Real sessions receive one immutable scoring result; report and counselor exports read this same object.
export function createStudentReport(session: AssessmentSession, results: ScoringOutput | null = null, mode: 'student' | 'testing' = 'student'): StudentReportData {
  if (!isComplete(session.answers) || session.completedProfileSteps !== profileFields.length) throw new Error('请先完成测评和六项个人信息。');
  const data: StudentReportData = {
    schemaVersion: 1,
    source: { bankVersion, scoringVersion: results?.version ?? null, sessionRevision: session.revision, mode },
    title: session.preferredName ? `${session.preferredName}的测试结果` : '你的测试结果',
    studentContext: { preferredName: session.preferredName, ...session.personalInformation },
    updatedAt: session.updatedAt,
    assessmentResults: results ? { scoringVersion: results.version, answeredCount: questions.length } : null,
    dimensionResults: results?.dimensions ?? null,
    preferenceResults: results?.preferences ?? [],
    developmentProfile: results ? createDevelopmentProfile(session, results.dimensions, results.preferences) : null,
    rawAnswers: questions.map(question => ({ itemId: question.item_id, question: question.question_text, value: session.answers[question.item_id], label: responseOptions.find(option => option.value === session.answers[question.item_id])!.label })),
    counselorPackageStatus: 'not_ready',
  };
  if (hasCompleteDimensionResults(data)) data.counselorPackageStatus = 'ready';
  return data;
}
export type StudentReport = StudentReportData;
