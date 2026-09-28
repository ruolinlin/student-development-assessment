import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { build } from 'esbuild';
const temporary = await mkdtemp(join(tmpdir(), 'student-report-test-'));
const reportModule = join(temporary, 'report.mjs');
await build({ entryPoints: [fileURLToPath(new URL('../lib/student-report.ts', import.meta.url))], bundle: true, platform: 'node', format: 'esm', outfile: reportModule });
const origin = process.env.TEST_ORIGIN || 'http://localhost:5186';
async function student(preferredName) {
  let cookie = '';
  let session;
  async function request(method, body, expected = 200) {
    const response = await fetch(`${origin}/api/session`, { method, headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
    if (response.headers.get('set-cookie')) cookie = response.headers.get('set-cookie').split(';')[0];
    const result = await response.json();
    assert.equal(response.status, expected, JSON.stringify(result));
    if (result.session) session = result.session;
    return result;
  }
  await request('POST', { preferredName }, 201);
  await request('PUT', { action: 'profile', revision: session.revision, step: 0, value: 'test', complete: true, targetStep: 1 }, 409);
  for (let index = 0; index < 72; index++) {
    await request('PUT', { revision: session.revision, currentIndex: Math.min(index + 1, 71), answer: { item_id: `Q${String(index + 1).padStart(2, '0')}`, value: index % 5 + 1 } });
  }
  const answers = { ...session.answers };
  const values = ['十一年级', '数学、艺术、文学和计算机', '我与同学完成了一个小项目。\n反复改进后终于成功。', '让我有成就感的是坚持，也学会了合作。', preferredName ? '美国、英国、香港' : '还没确定', preferredName ? '目前IB课程，数学AA HL，最近一次预测分6。' : ''];
  const fields = ['grade', 'strengthSubjects', 'achievementExperience', 'achievementReason', 'targetRegions', 'additionalContext'];
  for (let step = 0; step < fields.length; step++) {
    const oldRevision = session.revision;
    await request('PUT', { action: 'profile', revision: session.revision, step, value: values[step], complete: true, targetStep: Math.min(step + 1, fields.length - 1) });
    await request('GET');
    assert.equal(session.personalInformation[fields[step]], values[step]);
    assert.equal(session.currentProfileStep, Math.min(step + 1, fields.length - 1));
    assert.equal(session.completedProfileSteps, step + 1);
    assert.equal(session.preferredName, preferredName);
    if (step === 1) assert.equal(session.currentProfileStep, 2, 'resume at third field');
    await request('PUT', { action: 'profile', revision: oldRevision, step, value: 'stale', complete: false, targetStep: step }, 409);
  }
  assert.deepEqual(session.answers, answers, 'personal information must not modify raw answers');
  assert.deepEqual(Object.keys(session.personalInformation), fields, 'no duplicate name or additional information');
  assert.equal(session.personalInformation.achievementExperience, values[2]);
  assert.equal(session.personalInformation.achievementReason, values[3]);
  assert.equal(session.personalInformation.targetRegions, values[4]);
  assert.equal(session.personalInformation.additionalContext, values[5]);
  assert.equal(session.completedProfileSteps, 6);
  const { createStudentReport } = await import(pathToFileURL(reportModule).href);
  const report = createStudentReport(session);
  assert.equal(report.title, preferredName ? `${preferredName}的测试结果` : '你的测试结果');
  assert.deepEqual(report.studentContext, { preferredName, ...session.personalInformation });
  assert.equal(report.rawAnswers.length, 72);
  assert.equal(report.assessmentResults, null);
  assert.equal(report.dimensionResults, null);
  assert.deepEqual(report.rawAnswers.map(answer => answer.value), Object.values(answers));
  console.log(`PASS: ${preferredName || 'unnamed'} – persistence, resume, six independent fields, conflict protection, unchanged answers, factual report`);
}
try { await student('小雨'); await student(''); } finally { await rm(temporary, { recursive: true, force: true }); }
