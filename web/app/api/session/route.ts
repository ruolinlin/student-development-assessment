import { sessionDatabase } from '@/lib/session-database';
import { bankVersion, isComplete, questions, validItemIndex, validateAnswers } from '@/lib/question-bank';
import { emptyPersonalInformation, profileFields, validateSession, type AssessmentSession } from '@/lib/assessment-session';

const cookieName = 'student_development_session';
const headers = { 'Cache-Control': 'no-store' };
const reply = (value: unknown, status = 200) => Response.json(value, { status, headers });
async function hashToken(token: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}
function readToken(request: Request) {
  const value = request.headers.get('cookie')?.split(';').map(v => v.trim()).find(v => v.startsWith(`${cookieName}=`))?.split('=')[1];
  return value && /^[a-f0-9-]{73}$/.test(value) ? value : null;
}
type Row = { token_hash: string; bank_version: string; preferred_name: string; answers: string; current_index: number; revision: number; status: string; updated_at: string; personal_information: string; current_profile_step: number; completed_profile_steps: number };
async function load(token: string) {
  const row = await sessionDatabase().prepare('SELECT * FROM assessment_drafts WHERE token_hash = ?').bind(await hashToken(token)).first<Row>();
  if (!row) return null;
  const session = { preferredName: row.preferred_name, answers: JSON.parse(row.answers), currentIndex: row.current_index, revision: row.revision, bankVersion: row.bank_version, status: row.status, updatedAt: row.updated_at, personalInformation: { ...emptyPersonalInformation(), ...JSON.parse(row.personal_information) }, currentProfileStep: row.current_profile_step, completedProfileSteps: row.completed_profile_steps };
  if (!validateSession(session)) throw new Error('Saved session version or data is invalid');
  return session;
}
function sameOrigin(request: Request) {
  return request.headers.get('origin') === new URL(request.url).origin;
}
export async function GET(request: Request) {
  try { const token = readToken(request); return reply({ session: token ? await load(token) : null }); }
  catch { return reply({ error: '暂时无法读取进度，请稍后重试。' }, 503); }
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return reply({ error: '请求来源不正确。' }, 403);
  try {
    const payload = await request.text();
    if (payload.length > 1000) return reply({ error: '称呼太长了。' }, 400);
    let body: { preferredName?: unknown };
    try { body = JSON.parse(payload); } catch { return reply({ error: '请检查输入。' }, 400); }
    if (!body || typeof body.preferredName !== 'string' || body.preferredName.length > 30) return reply({ error: '称呼请保持在 30 个字以内。' }, 400);
    const existingToken = readToken(request);
    if (existingToken) { const existing = await load(existingToken); if (existing) return reply({ session: existing }); }
    const token = `${crypto.randomUUID()}-${crypto.randomUUID()}`;
    const session: AssessmentSession = { preferredName: body.preferredName.trim(), answers: {}, currentIndex: 0, revision: 1, bankVersion, status: 'in_progress', personalInformation: emptyPersonalInformation(), currentProfileStep: 0, completedProfileSteps: 0, updatedAt: new Date().toISOString() };
    await sessionDatabase().prepare('INSERT INTO assessment_drafts (token_hash, bank_version, preferred_name, answers, current_index, revision, status, updated_at, personal_information) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(await hashToken(token), bankVersion, session.preferredName, '{}', 0, 1, session.status, session.updatedAt, JSON.stringify(session.personalInformation)).run();
    return Response.json({ session }, { status: 201, headers: { ...headers, 'Set-Cookie': `${cookieName}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=31536000${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}` } });
  } catch { return reply({ error: '暂时无法保存，请稍后重试。' }, 503); }
}
export async function PUT(request: Request) {
  if (!sameOrigin(request)) return reply({ error: '请求来源不正确。' }, 403);
  try {
    const token = readToken(request);
    if (!token) return reply({ error: '请先开始测评。' }, 401);
    const session = await load(token);
    if (!session) return reply({ error: '未找到已有进度，请刷新。' }, 401);
    const text = await request.text();
    if (text.length > 100000) return reply({ error: '输入过长。' }, 400);
    let body: { action?: unknown; step?: unknown; value?: unknown; complete?: unknown; targetStep?: unknown; revision?: unknown; currentIndex?: unknown; answer?: { item_id?: unknown; value?: unknown } };
    try { body = JSON.parse(text); } catch { return reply({ error: '请检查输入。' }, 400); }
    if (!body || body.revision !== session.revision) return reply({ error: '进度已在另一页面更新。请刷新后继续。' }, 409);
    if (body.action === 'profile') {
      if (session.status !== 'completed') return reply({ error: '请先完成测评。' }, 409);
      const step = body.step;
      if (typeof step !== 'number' || !Number.isInteger(step) || step < 0 || step >= profileFields.length || step > session.completedProfileSteps || typeof body.value !== 'string' || typeof body.complete !== 'boolean') return reply({ error: '填写位置无效，请刷新后继续。' }, 400);
      const completedProfileSteps = Math.max(session.completedProfileSteps, body.complete ? step + 1 : 0);
      const targetStep = body.targetStep;
      if (typeof targetStep !== 'number' || !Number.isInteger(targetStep) || targetStep < 0 || targetStep >= profileFields.length || targetStep > completedProfileSteps) return reply({ error: '填写位置无效。' }, 400);
      const next: AssessmentSession = { ...session, personalInformation: { ...session.personalInformation, [profileFields[step]]: body.value }, completedProfileSteps, currentProfileStep: targetStep, revision: session.revision + 1, updatedAt: new Date().toISOString() };
      const result = await sessionDatabase().prepare('UPDATE assessment_drafts SET personal_information = ?, current_profile_step = ?, completed_profile_steps = ?, revision = ?, updated_at = ? WHERE token_hash = ? AND revision = ?')
        .bind(JSON.stringify(next.personalInformation), next.currentProfileStep, next.completedProfileSteps, next.revision, next.updatedAt, await hashToken(token), session.revision).run();
      if (result.meta.changes !== 1) return reply({ error: '进度已更新，请刷新后继续。' }, 409);
      return reply({ session: next });
    }
    if (!validItemIndex(body.currentIndex)) return reply({ error: '题目位置无效。' }, 400);
    const answers = { ...session.answers };
    if (body.answer !== undefined) {
      if (!body.answer || typeof body.answer.item_id !== 'string' || !validateAnswers({ [body.answer.item_id]: body.answer.value })) return reply({ error: '请选择题库中的有效选项。' }, 400);
      if (body.answer.item_id !== questions[session.currentIndex].item_id) return reply({ error: '当前题目已变化，请刷新后继续。' }, 409);
      answers[body.answer.item_id] = body.answer.value as number;
    }
    const next: AssessmentSession = { ...session, answers, currentIndex: body.currentIndex, revision: session.revision + 1, status: isComplete(answers) ? 'completed' : 'in_progress', updatedAt: new Date().toISOString() };
    const result = await sessionDatabase().prepare('UPDATE assessment_drafts SET answers = ?, current_index = ?, revision = ?, status = ?, updated_at = ? WHERE token_hash = ? AND revision = ?')
      .bind(JSON.stringify(next.answers), next.currentIndex, next.revision, next.status, next.updatedAt, await hashToken(token), session.revision).run();
    if (result.meta.changes !== 1) return reply({ error: '进度已更新，请刷新后继续。' }, 409);
    return reply({ session: next });
  } catch { return reply({ error: '这一题暂时没能保存，选择仍保留在页面上，请重试。' }, 503); }
}
