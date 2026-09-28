import assert from 'node:assert/strict';
import { emptyPersonalInformation, type AssessmentSession } from '../lib/assessment-session';
import { createCounselorPackage, hasCompleteDimensionResults } from '../lib/counselor-package';
import { formalDimensions } from '../lib/formal-dimensions';
import { bankVersion, questions } from '../lib/question-bank';
import { scoreAssessment, scoringVersion, transformItemScore } from '../lib/scoring';
import { createStudentReport } from '../lib/student-report';
import { studentReportMarkdown } from '../lib/student-report-markdown';

type Expected = { dimensions: Record<string, number>; positions: Array<[number, 'left' | 'between' | 'right']> };
const answerAll = (value: number) => Object.fromEntries(questions.map(item => [item.item_id, value]));
const preferenceAnswer = (leftRaw: number, rightRaw: number) => Object.fromEntries(questions.map(item => [item.item_id, item.dimension_key === 'preferences' ? (item.scoring_direction === '左端' ? leftRaw : rightRaw) : 3]));
const expectedKeys = ['interest', 'strengths', 'preferences', 'values', 'selfEfficacy'];
const simple = (ordinary: number, preference: number): Record<string, number> => ({ interest: ordinary, strengths: ordinary, preferences: preference, values: ordinary, selfEfficacy: ordinary });
const ordinarySubdimensionKeys = formalDimensions.filter(dimension => dimension.key !== 'preferences').flatMap(dimension => dimension.subdimensions.map(subdimension => subdimension.key));
const preferenceSubdimensionKeys = formalDimensions.find(dimension => dimension.key === 'preferences')!.subdimensions.map(subdimension => subdimension.key);
const expectedUniformSubdimensions = (ordinary: number, positions: number[]) => Object.fromEntries([
  ...ordinarySubdimensionKeys.map(key => [key, ordinary]),
  ...preferenceSubdimensionKeys.map((key, index) => [key, positions[index]]),
]);

const manualSubdimensionValues: Record<string, number> = {
  'interest:R 实践与操作': 1, 'interest:I 研究与探索': 2, 'interest:A 创造与表达': 3, 'interest:S 帮助与连接': 4, 'interest:E 影响与推动': 5, 'interest:C 组织与秩序': 1,
  'strengths:分析推理': 2, 'strengths:好奇探究': 3, 'strengths:创意联结': 4, 'strengths:规划执行': 5, 'strengths:坚持投入': 1, 'strengths:适应调整': 2, 'strengths:共情理解': 3, 'strengths:合作支持': 4, 'strengths:表达沟通': 5, 'strengths:组织带动': 1,
  'values:自主与选择': 2, 'values:成长与挑战': 3, 'values:创造与表达': 4, 'values:关系与归属': 5, 'values:贡献与影响': 1, 'values:稳定与回报': 2,
  'selfEfficacy:理解复杂问题': 3, 'selfEfficacy:解决新问题': 4, 'selfEfficacy:表达想法': 5, 'selfEfficacy:与人合作': 1, 'selfEfficacy:组织推进': 2, 'selfEfficacy:应对挫折': 3, 'selfEfficacy:自主学习': 4, 'selfEfficacy:创造产出': 5, 'selfEfficacy:公开挑战': 1, 'selfEfficacy:未来探索': 2,
};
const subdimensionFixture = answerAll(3);
for (const dimension of formalDimensions.filter(item => item.key !== 'preferences')) for (const subdimension of dimension.subdimensions) {
  for (const item of subdimension.items) subdimensionFixture[item.item_id] = manualSubdimensionValues[subdimension.key];
}
const reverseFixture = Object.fromEntries(questions.map(item => [item.item_id, item.dimension_key === 'preferences' && item.scoring_direction === '左端' ? 1 : 3]));
const mixedFixture = Object.fromEntries(questions.map((item, index) => [item.item_id, index % 5 + 1]));
const mixedSubdimensionValues: Record<string, number> = {
  'interest:R 实践与操作': 2, 'interest:I 研究与探索': 3.33, 'interest:A 创造与表达': 3, 'interest:S 帮助与连接': 2.67, 'interest:E 影响与推动': 4, 'interest:C 组织与秩序': 2,
  'strengths:分析推理': 4.5, 'strengths:好奇探究': 1.5, 'strengths:创意联结': 3.5, 'strengths:规划执行': 3, 'strengths:坚持投入': 2.5, 'strengths:适应调整': 4.5, 'strengths:共情理解': 1.5, 'strengths:合作支持': 3.5, 'strengths:表达沟通': 3, 'strengths:组织带动': 2.5,
  'preferences:具体 ↔ 抽象': 2.67, 'preferences:独立 ↔ 互动': 3, 'preferences:计划 ↔ 探索': 1.33, 'preferences:分析 ↔ 人本': 2.67,
  'values:自主与选择': 1.5, 'values:成长与挑战': 3.5, 'values:创造与表达': 3, 'values:关系与归属': 2.5, 'values:贡献与影响': 4.5, 'values:稳定与回报': 1.5,
  'selfEfficacy:理解复杂问题': 3, 'selfEfficacy:解决新问题': 4, 'selfEfficacy:表达想法': 5, 'selfEfficacy:与人合作': 1, 'selfEfficacy:组织推进': 2, 'selfEfficacy:应对挫折': 3, 'selfEfficacy:自主学习': 4, 'selfEfficacy:创造产出': 5, 'selfEfficacy:公开挑战': 1, 'selfEfficacy:未来探索': 2,
};

const fixtures: Array<{ name: string; answers: Record<string, number>; expected: Expected }> = [
  { name: 'A all 1', answers: answerAll(1), expected: { dimensions: simple(1, 2.34), positions: [[2.33, 'left'], [3.67, 'right'], [2.33, 'left'], [3.67, 'right']] } },
  { name: 'B all 3', answers: answerAll(3), expected: { dimensions: simple(3, 1), positions: [[3, 'between'], [3, 'between'], [3, 'between'], [3, 'between']] } },
  { name: 'C all 5', answers: answerAll(5), expected: { dimensions: simple(5, 2.34), positions: [[3.67, 'right'], [2.33, 'left'], [3.67, 'right'], [2.33, 'left']] } },
  { name: 'D positive 5 reverse 1', answers: Object.fromEntries(questions.map(item => [item.item_id, item.dimension_key === 'preferences' && item.scoring_direction === '左端' ? 1 : 5])), expected: { dimensions: simple(5, 5), positions: [[5, 'right'], [5, 'right'], [5, 'right'], [5, 'right']] } },
  { name: 'E reverse items only', answers: reverseFixture, expected: { dimensions: simple(3, 3), positions: [[3.67, 'right'], [4.33, 'right'], [3.67, 'right'], [4.33, 'right']] } },
  { name: 'F every ordinary subdimension differs', answers: subdimensionFixture, expected: { dimensions: { interest: 2.67, strengths: 3, preferences: 1, values: 2.83, selfEfficacy: 3 }, positions: [[3, 'between'], [3, 'between'], [3, 'between'], [3, 'between']] } },
  { name: 'G preferences all left', answers: preferenceAnswer(5, 1), expected: { dimensions: simple(3, 5), positions: [[1, 'left'], [1, 'left'], [1, 'left'], [1, 'left']] } },
  { name: 'H preferences centered', answers: preferenceAnswer(3, 3), expected: { dimensions: simple(3, 1), positions: [[3, 'between'], [3, 'between'], [3, 'between'], [3, 'between']] } },
  { name: 'I preferences all right', answers: preferenceAnswer(1, 5), expected: { dimensions: simple(3, 5), positions: [[5, 'right'], [5, 'right'], [5, 'right'], [5, 'right']] } },
  { name: 'J mixed Q-order 1..5', answers: mixedFixture, expected: { dimensions: { interest: 2.83, strengths: 3, preferences: 2.17, values: 2.75, selfEfficacy: 3 }, positions: [[2.67, 'left'], [3, 'between'], [1.33, 'left'], [2.67, 'left']] } },
];

for (const fixture of fixtures) {
  const first = scoreAssessment(fixture.answers);
  const second = scoreAssessment(fixture.answers);
  assert.deepEqual(first, second, `${fixture.name}: deterministic output`);
  assert.equal(first.version, scoringVersion);
  assert.deepEqual(first.dimensions.map(result => result.key), expectedKeys);
  assert.deepEqual(Object.fromEntries(first.dimensions.map(result => [result.key, result.score])), fixture.expected.dimensions, `${fixture.name}: dimension totals`);
  assert.deepEqual(first.preferences.map(result => [result.position, result.direction]), fixture.expected.positions, `${fixture.name}: preference positions`);
  const actualSubdimensions = Object.fromEntries(first.dimensions.flatMap(result => result.subdimensions).map(result => [result.key, result.score]));
  const expectedSubdimensions = fixture.name.startsWith('F ') ? { ...manualSubdimensionValues, ...Object.fromEntries(preferenceSubdimensionKeys.map(key => [key, 3])) }
    : fixture.name.startsWith('J ') ? mixedSubdimensionValues
    : expectedUniformSubdimensions(fixture.name.startsWith('A ') ? 1 : fixture.name.startsWith('C ') || fixture.name.startsWith('D ') ? 5 : 3, fixture.expected.positions.map(([position]) => position));
  assert.deepEqual(actualSubdimensions, expectedSubdimensions, `${fixture.name}: all subdimension scores`);
  assert.deepEqual(first.dimensions.flatMap(result => result.subdimensions).flatMap(result => result.itemIds).sort(), questions.map(item => item.item_id).sort(), `${fixture.name}: every item once`);
}

const scoredF = scoreAssessment(subdimensionFixture);
for (const [key, expected] of Object.entries(manualSubdimensionValues)) assert.equal(scoredF.dimensions.flatMap(result => result.subdimensions).find(result => result.key === key)?.score, expected, `F: ${key}`);
for (const id of ['Q39', 'Q42', 'Q44', 'Q45', 'Q48', 'Q50']) {
  assert.deepEqual([transformItemScore(id, 1).transformed, transformItemScore(id, 5).transformed], [5, 1], `${id}: 6 - raw`);
}
for (const id of ['Q40', 'Q41', 'Q43', 'Q46', 'Q47', 'Q49']) assert.equal(transformItemScore(id, 5).transformed, 5, `${id}: right pole unchanged`);

assert.throws(() => scoreAssessment({ ...answerAll(3), Q99: 3 }), /无效 item ID/);
const missing = answerAll(3); delete missing.Q72; assert.throws(() => scoreAssessment(missing), /答案不完整/);
assert.throws(() => scoreAssessment({ ...answerAll(3), Q01: 0 }), /答案值无效/);
assert.throws(() => scoreAssessment({ ...answerAll(3), Q01: 2.5 }), /答案值无效/);

const session: AssessmentSession = {
  preferredName: '人工复算样本', answers: mixedFixture, currentIndex: 71, revision: 8, bankVersion, status: 'completed', updatedAt: '2026-09-28T00:00:00.000Z',
  personalInformation: { ...emptyPersonalInformation(), grade: '十一年级', strengthSubjects: '数学', achievementExperience: '完成研究项目并反复调整。', achievementReason: '坚持完成并与同学合作。', targetRegions: '还没确定' }, currentProfileStep: 5, completedProfileSteps: 6,
};
const report = createStudentReport(session, scoreAssessment(session.answers));
assert.equal(report.source.scoringVersion, scoringVersion);
assert.ok(report.dimensionResults && report.developmentProfile);
assert.equal(report.counselorPackageStatus, 'ready');
assert.equal(hasCompleteDimensionResults(report), true);
const counselor = createCounselorPackage(report);
assert.strictEqual(counselor.assessment.dimensionResults, report.dimensionResults);
assert.strictEqual(counselor.assessment.preferenceResults, report.preferenceResults);
assert.strictEqual(counselor.assessment.developmentProfile, report.developmentProfile);
assert.equal(counselor.assessment.scoringVersion, scoringVersion);
const reportDownload = studentReportMarkdown(report);
assert.ok(reportDownload.includes('## 01｜我的发展画像'));
assert.ok(!reportDownload.includes('维度结果尚未准备好'));

console.log(`PASS: ${fixtures.length} human-recalculable golden fixtures, all subdimensions, item transforms, invalid-input gates, deterministic downloadable report, Development Profile, Counselor Package readiness`);
