'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, CheckCheck, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { PersonalInformation } from '@/components/personal-information';
import { CounselorMaterials } from '@/components/counselor-materials';
import { StudentReportView } from '@/components/student-report';
import { createStudentReport, type StudentReport } from '@/lib/student-report';
import { isComplete, questions, responseOptions } from '@/lib/question-bank';
import { profileFields, validateSession, type AssessmentSession } from '@/lib/assessment-session';

export function HelloArtwork() {
  return <svg className="hello-art" viewBox="0 0 460 230" role="img" aria-label="Hello">
    <defs><linearGradient id="hello-ink" gradientUnits="userSpaceOnUse" x1="35" y1="160" x2="420" y2="85"><stop stopColor="#2978f5"/><stop offset=".34" stopColor="#3989ff"/><stop offset=".64" stopColor="#586cf1"/><stop offset=".84" stopColor="#8a80ed"/><stop offset="1" stopColor="#54b9ec"/></linearGradient></defs>
    <g fill="none" stroke="url(#hello-ink)" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round">
      <path className="ink" pathLength="1" d="M35 159 C60 128 99 61 87 42 C72 20 52 86 47 137 L44 165 C57 138 78 107 92 119 C107 132 82 153 93 164 C105 178 123 157 139 136 C161 109 184 112 180 129 C175 145 136 152 137 136 C133 157 144 173 164 166 C187 158 209 126 227 94 C244 64 254 34 242 33 C226 31 206 87 203 123 C197 157 204 174 221 166 C242 154 264 114 280 77 C292 49 294 32 284 35 C269 40 251 94 247 126 C243 159 251 174 268 166 C284 159 298 138 311 125 C329 107 349 116 345 135 C341 155 325 172 312 167 C294 160 298 135 311 123 C323 111 337 116 344 126 C357 140 379 133 401 113"/>
    </g>
  </svg>;
}
export function StageProgress({ active = 0, complete = false }: { active?: number; complete?: boolean }) {
  return <nav className="stages" aria-label="完整流程"><ol>{['完成测评', '补充个人信息', '生成发展报告', '导师分析资料'].map((title, i) => <li key={title} aria-current={i === active ? 'step' : undefined} className={i === active ? 'current' : ''}><span className="stage-number">{i < active || (complete && i === 0) ? '✓' : `0${i + 1}`}</span><span>{title}</span></li>)}</ol></nav>;
}
function resumeScreen(session: AssessmentSession) {
  if (session.status !== 'completed') return 'assessment' as const;
  if (session.completedProfileSteps === profileFields.length) return 'profile-complete' as const;
  if (session.completedProfileSteps > 0 || Object.values(session.personalInformation).some(Boolean)) return 'personal-information' as const;
  return 'complete' as const;
}
export function StudentExperience() {
  const [screen, setScreen] = useState<'home' | 'hello' | 'assessment' | 'complete' | 'personal-information' | 'profile-complete' | 'report' | 'counselor'>('home');
  const [session, setSession] = useState<AssessmentSession | null>(null);
  const [report, setReport] = useState<StudentReport | null>(null);
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saveState, setSaveState] = useState<'saved' | 'pending' | 'error'>('saved');
  const pendingSave = useRef<Promise<AssessmentSession> | null>(null);
  const sessionRef = useRef<AssessmentSession | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const item = questions[session?.currentIndex ?? 0];
  const answered = session ? Object.keys(session.answers).length : 0;

  const adopt = (next: AssessmentSession) => {
    sessionRef.current = next;
    setSession(next);
    setName(next.preferredName);
    setSelected(next.answers[questions[next.currentIndex].item_id] ?? null);
  };

  useEffect(() => {
    let active = true;
    fetch('/api/session', { cache: 'no-store' }).then(async response => {
      const body = await response.json() as { session?: unknown; error?: string };
      if (!response.ok) throw new Error(body.error);
      if (!active) return;
      if (body.session) {
        if (!validateSession(body.session)) throw new Error('已有进度暂时无法读取，请刷新后重试。');
        adopt(body.session);
        if (location.hash === '#assessment') setScreen('assessment');
        else if (body.session.status === 'completed') {
          if ((location.hash === '#report' || location.hash === '#counselor') && body.session.completedProfileSteps === profileFields.length) { const data = createStudentReport(body.session); setReport(data); setScreen(location.hash === '#counselor' && data.counselorPackageStatus === 'ready' ? 'counselor' : 'report'); }
          else if (location.hash === '#personal-information' || location.hash === '#report' || location.hash === '#counselor') setScreen('personal-information');
          else if (location.hash === '#complete' || location.hash === '#profile-complete') setScreen(resumeScreen(body.session));
        }
      }
    }).catch(e => active && setError(e.message)).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (screen !== 'home') headingRef.current?.focus();
    if (screen !== 'home' && screen !== 'hello') history.replaceState(null, '', `#${screen}`);
  }, [screen, session?.currentIndex]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => { if (saveState !== 'saved') { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [saveState]);

  async function start() {
    if (saving) return;
    setSaving(true); setError('');
    try {
      const response = await fetch('/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ preferredName: name }) });
      const body = await response.json() as { session?: unknown; error?: string };
      if (!response.ok) throw new Error(body.error);
      if (!validateSession(body.session)) throw new Error('保存未完成，请重试。');
      adopt(body.session); setScreen('assessment');
    } catch (e) { setError(e instanceof Error ? e.message : '暂时无法连接，请重试。'); }
    finally { setSaving(false); }
  }

  async function persist(index: number, value?: number): Promise<AssessmentSession> {
    const current = sessionRef.current;
    if (!current) throw new Error('请先开始测评。');
    setSaveState('pending'); setError('');
    try {
      const response = await fetch('/api/session', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revision: current.revision, currentIndex: index, ...(value === undefined ? {} : { answer: { item_id: questions[current.currentIndex].item_id, value } }) }) });
      const body = await response.json() as { session?: unknown; error?: string };
      if (!response.ok) throw new Error(body.error);
      if (!validateSession(body.session)) throw new Error('保存结果不完整，请重试。');
      adopt(body.session); setSaveState('saved');
      return body.session;
    } catch (e) { setSaveState('error'); setError(e instanceof Error ? e.message : '连接中断，请重试保存。'); throw e; }
  }

  function choose(value: string) {
    if (pendingSave.current || saving || !session) return;
    const score = Number(value);
    setSelected(score); setSaving(true);
    const task = persist(session.currentIndex, score);
    pendingSave.current = task;
    task.catch(() => {}).finally(() => { pendingSave.current = null; setSaving(false); });
  }

  async function move(direction: -1 | 1) {
    if (saving || !session || (direction === 1 && selected === null)) return;
    setSaving(true);
    try {
      if (saveState === 'error' && selected !== null) await persist(session.currentIndex, selected);
      const current = sessionRef.current!;
      if (direction === 1 && current.currentIndex === questions.length - 1) {
        if (isComplete(current.answers)) setScreen('complete');
        else {
          const missing = questions.findIndex(q => current.answers[q.item_id] === undefined);
          await persist(missing);
        }
      } else await persist(Math.max(0, Math.min(questions.length - 1, current.currentIndex + direction)));
    } catch {} finally { setSaving(false); }
  }

  async function generateReport() {
    setSaving(true); setError('');
    try {
      const response = await fetch('/api/session', { cache: 'no-store' });
      const body = await response.json() as { session?: unknown; error?: string };
      if (!response.ok || !validateSession(body.session)) throw new Error(body.error || '暂时无法读取已保存的信息，请重试。');
      const nextReport = createStudentReport(body.session);
      adopt(body.session); setReport(nextReport); setScreen('report');
    } catch (e) { setError(e instanceof Error ? e.message : '暂时无法生成报告，请重试。'); }
    finally { setSaving(false); }
  }

  return <div className="experience"><header className="site-header"><a href="/" className="wordmark"><span className="brand-mark" aria-hidden="true">✳</span>学生发展优势测评</a><span className="header-note">每一种成长，都有自己的方向 <ArrowUpRight size={15}/></span></header>
    <main id="main-content"><StageProgress active={screen === 'counselor' ? 3 : screen === 'profile-complete' || screen === 'report' ? 2 : screen === 'complete' || screen === 'personal-information' ? 1 : 0} complete={session?.status === 'completed'}/>
      {error && <div className="error-message" role="alert">{error}{screen === 'home' && <Button variant="ghost" onClick={() => location.reload()}>重新读取</Button>}</div>}
      {screen === 'home' && <section className="welcome"><div className="welcome-art"><HelloArtwork/></div><p className="eyebrow">从现在的你，开始</p><h1>发现优势，理解自己，<br/><span>探索未来。</span></h1><Button disabled={loading || Boolean(error)} className="primary-action" onClick={() => setScreen(session ? resumeScreen(session) : 'hello')}>{loading ? '正在读取进度' : session ? '继续上次进度' : '开始测评'} <ArrowRight/></Button><p className="quiet-note">{session ? `${session.preferredName ? session.preferredName + '，' : ''}已为你保存 ${answered} / ${questions.length} 个回答` : '不必急着给未来一个答案'}</p></section>}
      {screen === 'hello' && <section className="hello-screen"><HelloArtwork/><h1 ref={headingRef} tabIndex={-1}>很高兴在这里遇见你</h1><form onSubmit={e => { e.preventDefault(); void start(); }}><label htmlFor="student-name">我们怎么称呼你？</label><Input id="student-name" className="name-input" value={name} onChange={e => setName(e.target.value)} autoComplete="nickname" maxLength={30}/><Button className="primary-action" disabled={saving} type="submit">{saving ? '正在保存' : '继续'} <ArrowRight/></Button></form><p className="quiet-note">每个回答都会自动保存，可在同一浏览器继续</p></section>}
      {screen === 'assessment' && session && <section className="assessment-screen">
        <div className="assessment-meta"><span>完成测评 <small>1 / 4</small></span><span>{String(session.currentIndex + 1).padStart(2, '0')} <span className="muted">/ {questions.length}</span></span></div>
        <Progress className="assessment-progress" value={answered / questions.length * 100} aria-label={`已回答 ${answered} 道，共 ${questions.length} 道`}/>
        <div className="question-area"><p className="eyebrow">根据最近的自己，选择最接近的一项</p><h1 ref={headingRef} tabIndex={-1} id="question-title">{item.question_text}</h1></div>
        <RadioGroup key={item.item_id} className="answer-options" aria-labelledby="question-title" value={selected === null ? '' : String(selected)} onValueChange={choose} aria-busy={saving}>
          {responseOptions.map(option => <label className={`answer-option ${selected === option.value ? 'is-selected' : ''}`} key={option.value} htmlFor={`answer-${option.value}`}><RadioGroupItem id={`answer-${option.value}`} className="answer-radio" value={String(option.value)}/><span className="answer-value" aria-hidden="true">{option.value}</span><span className="answer-label">{option.label}</span></label>)}
        </RadioGroup>
        <div className="assessment-actions"><Button variant="ghost" className="back-action" disabled={saving || session.currentIndex === 0} onClick={() => void move(-1)}><ArrowLeft/>上一题</Button><Button className="primary-action" disabled={saving || selected === null} onClick={() => void move(1)}>{saving ? '正在保存' : session.currentIndex === questions.length - 1 ? '完成第一部分' : '下一题'} <ArrowRight/></Button></div>
        <div className="save-status" role="status">{saveState === 'pending' ? <LoaderCircle size={14} className="spin"/> : saveState === 'saved' ? <CheckCheck size={15}/> : null}{saveState === 'pending' ? '正在保存你的回答…' : saveState === 'saved' ? `已保存 · ${answered} / ${questions.length} 个回答` : '尚未保存，请点击下一题重试'}</div>
      </section>}
      {screen === 'complete' && session && <section className="completion-screen"><span className="completion-check"><Check size={30}/></span><h1 ref={headingRef} tabIndex={-1}>测评部分完成 ✓</h1><h2>接下来，再告诉我们一点真实的你。</h2><p>你的学习情况和真实经历，会和刚才的测评结果放在一起，形成更完整的发展报告。</p><Button className="primary-action" onClick={() => setScreen('personal-information')}>继续补充个人信息 <ArrowRight/></Button><Button className="completion-secondary" variant="ghost" onClick={() => { void persist(0).then(() => setScreen('assessment')).catch(() => {}); }} disabled={saveState === 'pending'}>回看我的回答</Button></section>}
      {screen === 'personal-information' && session && <PersonalInformation session={session} onSave={adopt} onDone={() => setScreen('profile-complete')} onBack={() => setScreen('complete')}/>}
      {screen === 'profile-complete' && session && <section className="completion-screen"><span className="completion-check"><Check size={30}/></span><h1 ref={headingRef} tabIndex={-1}>好了，我们对你多了解了一点。</h1><p>现在，我们可以把“测评中的你”和“真实经历中的你”放在一起看看了。</p><Button className="primary-action" onClick={() => void generateReport()} disabled={saving}>{saving ? '正在生成' : '生成我的发展报告'}<ArrowRight/></Button><Button className="completion-secondary" variant="ghost" onClick={() => setScreen('personal-information')}>回看个人信息</Button></section>}
      {screen === 'report' && report && <StudentReportView report={report} onEdit={() => setScreen('personal-information')} onCounselor={() => setScreen('counselor')}/>}
      {screen === 'counselor' && report && <CounselorMaterials data={report} onReport={() => setScreen('report')}/>}
    </main>
  </div>;
}
