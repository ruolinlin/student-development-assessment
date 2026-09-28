import { bankVersion, questions } from './question-bank';
import { formalDimensions } from './formal-dimensions';
import { createStudentReport, type ScoringOutput } from './student-report';
import type { AssessmentSession } from './assessment-session';

// Explicit UI fixtures, NOT a scoring implementation or a student's assessment.
// Replace with mock responses through the approved scorer once it exists.
export function createTestingReport() {
  const session: AssessmentSession = {
    preferredName: '测试同学', answers: Object.fromEntries(questions.map((item, index) => [item.item_id, index % 5 + 1])),
    currentIndex: questions.length - 1, revision: 1, bankVersion, status: 'completed', updatedAt: '2026-09-21T00:00:00.000Z',
    personalInformation: { grade: '十一年级', strengthSubjects: '艺术、语文与科学', achievementExperience: '我和同学合作完成了一件作品，反复尝试，也调整过原来的计划。', achievementReason: '我学会了表达自己的想法，也坚持完成了作品。', targetRegions: '美国、英国、香港', additionalContext: '目前IB课程，数学AA HL，最近一次预测分6。' },
    currentProfileStep: 5, completedProfileSteps: 6,
  };
  const sample = [2.5, 3.5, 4.0, 3.0];
  const preferenceClarity = Math.round((1 + sample.reduce((sum, position) => sum + Math.abs(position - 3), 0) / sample.length * 2) * 100) / 100;
  const results: ScoringOutput = { version: 'ui-fixture-only-not-scored', dimensions: formalDimensions.map((dimension, index) => ({
    key: dimension.key, name: dimension.name, kind: dimension.key === 'preferences' ? 'preference' : 'scale', score: dimension.key === 'preferences' ? preferenceClarity : sample[index % sample.length],
    explanation: '以下为界面测试结果，仅验证正式维度结构与展示，不代表真实学生。',
    subdimensions: dimension.subdimensions.map((sub, subIndex) => ({ key: sub.key, name: sub.name, dimensionKey: dimension.key, itemIds: sub.items.map(item => item.item_id), score: sample[subIndex % sample.length], explanation: '测试位置用于检查量尺和子维度显示。', situation: `对应题目情境：“${sub.items[0].question_text}”` })),
  })), preferences: formalDimensions.filter(d => d.key === 'preferences').flatMap(d => d.subdimensions.map((sub, index) => {
    const [leftLabel, rightLabel] = sub.name.split('↔').map(label => label.trim());
    return { key: sub.key, name: sub.name, itemIds: sub.items.map(item => item.item_id), leftLabel, rightLabel, position: sample[index % sample.length], direction: 'between' as const, explanation: `“${leftLabel}—${rightLabel}”的位置为界面测试值 ${sample[index % sample.length].toFixed(2)}，不作真实偏好解释。` };
  })) };
  return createStudentReport(session, results, 'testing');
}
