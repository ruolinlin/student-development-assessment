import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createTestingReport } from '../lib/testing-report';
import { formalDimensions } from '../lib/formal-dimensions';
import { aiReportExecutionPrompt, createCounselorPackage, counselorPackageMarkdown, artifactFilename, hasCompleteDimensionResults } from '../lib/counselor-package';
import { studentReportMarkdown } from '../lib/student-report-markdown';
import { counselorPromptTemplate, counselorPromptVersion } from '../prompts/counselor-analysis-v3';

const data = createTestingReport();
assert.equal(data.source.mode, 'testing');
assert.equal(data.source.scoringVersion, 'ui-fixture-only-not-scored');
assert.deepEqual(data.dimensionResults!.map(d => d.name), formalDimensions.map(d => d.name));
assert.equal(data.dimensionResults!.flatMap(d => d.subdimensions).length, 36);
assert.equal(data.preferenceResults.length, 4);
assert.equal(data.developmentProfile!.clues.length >= 2 && data.developmentProfile!.clues.length <= 4, true);
assert.equal(data.developmentProfile!.explorationQuestions.length >= 2 && data.developmentProfile!.explorationQuestions.length <= 4, true);
assert.equal(hasCompleteDimensionResults(data), true);
const packageData = createCounselorPackage(data);
assert.equal(packageData.promptVersion, 'V3.1-student-only-report-schema');
assert.strictEqual(packageData.assessment.dimensionResults, data.dimensionResults);
assert.strictEqual(packageData.assessment.developmentProfile, data.developmentProfile);
assert.strictEqual(packageData.assessment.responses, data.rawAnswers);
assert.equal(packageData.educationPreferences.targetRegions, '美国、英国、香港');
assert.equal(packageData.additionalContext, '目前IB课程，数学AA HL，最近一次预测分6。');
const undecided = createCounselorPackage({ ...data, studentContext: { ...data.studentContext, targetRegions: '还没确定', additionalContext: '' } });
assert.equal(undecided.educationPreferences.targetRegions, '还没确定');
assert.equal(undecided.additionalContext, '');
const markdown = counselorPackageMarkdown(packageData);
assert.ok(markdown.includes('PART A — Student Development Context'));
assert.ok(markdown.includes('PART B — Counselor Analysis Instructions'));
assert.ok(!markdown.includes('{{STUDENT_DEVELOPMENT_CONTEXT}}'));
assert.ok(!markdown.includes('家长'));
assert.ok(markdown.includes('未经核实'));
assert.ok(markdown.includes('美国、英国、香港'));
assert.ok(markdown.includes('目前IB课程，数学AA HL，最近一次预测分6。'));
assert.ok(!JSON.stringify(packageData).match(/parent|dualPerspective/i));
const original = readFileSync('../docs/counselor-prompt-v3-provided.txt', 'utf8');
assert.equal(counselorPromptTemplate, original.replace('高中生\n+\n家长\n+\n升学指导师', '高中生\n+\n升学指导师'));
assert.equal(counselorPromptVersion, 'V3.1-student-only-report-schema');
const reportSections = [
  '## 00｜报告摘要 Executive Summary', '## 01｜现在的你', '## 02｜从测评看到的发展线索',
  '## 03｜把测评放回真实经历', '## 04｜还需要验证的问题', '## 05｜值得进一步探索的领域',
  '## 06｜大学专业探索', '## 07｜相邻专业怎么不同', '## 08｜职业世界', '## 09｜下一步怎么探索',
  '## 10｜证据边界与核心证据表', '## 11｜资料来源与查询日期', '## 12｜本报告的不确定性声明',
];
let previousSection = -1;
for (const section of reportSections) {
  const index = counselorPromptTemplate.indexOf(section);
  assert.ok(index > previousSection, `${section} must exist in fixed order`);
  previousSection = index;
}
for (const schemaField of [
  '### 当前最清晰的发展主线', '### 目前值得继续探索的方向', '### 当前最重要的未知', '### 下一步优先行动',
  '### 待验证问题 X｜{问题}', '### 探索区 X｜{中文名称}（English Name）', '**当前证据强度**',
  '### 行动 X｜{具体行动名称}（预计时间）', '**补哪一类证据**', '**它验证什么**',
  '| Claim | Student Evidence | External Evidence | Source / Type / Year | Certainty |',
]) assert.ok(counselorPromptTemplate.includes(schemaField), `missing prompt schema: ${schemaField}`);
assert.ok(counselorPromptTemplate.includes('Executive Summary 必须在完成第 01–12 节的分析与研究之后最后撰写'));
assert.ok(counselorPromptTemplate.includes('Evidence Level ≠ Fit Score'));
assert.ok(!counselorPromptTemplate.includes('04｜值得注意的一致与差异'));
const studentMarkdown = studentReportMarkdown(data);
for (const title of ['01｜我的发展画像','02｜比较明显的发展线索','03｜真实经历中的我','04｜测评和真实经历放在一起','05｜值得继续认识的问题','06｜下一步']) assert.ok(studentMarkdown.includes(title));
assert.ok(!studentMarkdown.includes('Counselor Analysis Instructions'));
assert.ok(studentMarkdown.includes('美国、英国、香港'));
assert.ok(studentMarkdown.includes('学生主动补充的信息（未经核实）'));
assert.ok(studentMarkdown.includes('目前IB课程，数学AA HL，最近一次预测分6。'));
assert.notEqual(studentMarkdown, markdown);
for (const changes of [{dimensionResults:null}, {preferenceResults:[]}, {developmentProfile:null}, {rawAnswers:[]}, {counselorPackageStatus:'not_ready' as const}]) {
  assert.throws(() => createCounselorPackage({...data,...changes}));
}
assert.equal(artifactFilename('counselor',''), '导师分析资料.md');
assert.equal(artifactFilename('counselor','小雨'), '导师分析资料_小雨.md');
const executionPrompt = aiReportExecutionPrompt('导师分析资料_小雨.md', '小雨');
for (const requirement of ['明确授权执行', '单文件 HTML', '小雨_大学专业与生涯探索报告.html', 'report-reference.png', 'rs-insight.png', '内嵌 CSS', '00–12']) assert.ok(executionPrompt.includes(requirement));
console.log('PASS: official dimensions, shared structured data, V3.1 fixed 00–12 report schema, Executive Summary, validation/exploration/action schemas, prompt fidelity, separate Markdown exports, no parent fields');
