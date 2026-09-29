'use client';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, CheckCheck, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { PersonalInformation } from '@/components/personal-information';
import { CounselorMaterials } from '@/components/counselor-materials';
import { CounselorTransition } from '@/components/counselor-transition';
import { StudentReportView } from '@/components/student-report';
import { createStudentReport, type StudentReport } from '@/lib/student-report';
import { isComplete, questions, responseOptions } from '@/lib/question-bank';
import { profileFields, validateSession, type AssessmentSession } from '@/lib/assessment-session';
import { createBrowserSession, hasGeneratedCounselorMaterials, loadBrowserSession, markCounselorMaterialsGenerated, saveBrowserAnswer } from '@/lib/browser-session';
import { scoreAssessment } from '@/lib/scoring';
import { createCounselorPackage } from '@/lib/counselor-package';

export function HelloArtwork() {
  return <svg className="hello-art" viewBox="0 0 680 270" role="img" aria-label="Hello">
    <defs>
      <linearGradient id="hello-ink" gradientUnits="userSpaceOnUse" x1="86" y1="128" x2="606" y2="145">
        <stop stopColor="#58c6cd"/>
        <stop offset=".34" stopColor="#78b7de"/>
        <stop offset=".55" stopColor="#879ee5"/>
        <stop offset=".75" stopColor="#aa7edb"/>
        <stop offset=".91" stopColor="#db8bc4"/>
        <stop offset="1" stopColor="#efa080"/>
      </linearGradient>
      <filter id="hello-glow" x="-20%" y="-40%" width="140%" height="200%">
        <feGaussianBlur stdDeviation="22"/>
      </filter>
    </defs>
    <ellipse className="hello-glow" cx="350" cy="220" rx="238" ry="23" fill="#c6a8e1" filter="url(#hello-glow)"/>
    <text className="hello-script" x="50%" y="190" textAnchor="middle" fill="url(#hello-ink)">Hello</text>
  </svg>;
}
export function StageProgress({ active = 0, complete = false, finished = false }: { active?: number; complete?: boolean; finished?: boolean }) {
  return <nav className="stages" aria-label="完整流程"><ol>{['完成测评', '补充个人信息', '生成测试结果', 'AI分析资料包'].map((title, i) => <li key={title} aria-current={!finished && i === active ? 'step' : undefined} className={!finished && i === active ? 'current' : ''}><span className="stage-number">{finished || i < active || (complete && i === 0) ? '✓' : `0${i + 1}`}</span><span>{title}</span></li>)}</ol></nav>;
}
function resumeScreen(session: AssessmentSession) {
  if (session.status !== 'completed') return 'assessment' as const;
  if (session.completedProfileSteps === profileFields.length) return 'profile-complete' as const;
  if (session.completedProfileSteps > 0 || Object.values(session.personalInformation).some(Boolean)) return 'personal-information' as const;
  return 'complete' as const;
}
export function StudentExperience() {
  const [screen, setScreen] = useState<'home' | 'hello' | 'assessment' | 'complete' | 'personal-information' | 'profile-complete' | 'counselor-transition' | 'report' | 'counselor'>('home');
  const [session, setSession] = useState<AssessmentSession | null>(null);
  const [report, setReport] = useState<StudentReport | null>(null);
  const [counselorGenerated, setCounselorGenerated] = useState(false);
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
    setCounselorGenerated(hasGeneratedCounselorMaterials(next));
    setName(next.preferredName);
    setSelected(next.answers[questions[next.currentIndex].item_id] ?? null);
  };

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      const body = { session: loadBrowserSession() };
      if (!active) return;
      if (body.session) {
        if (!validateSession(body.session)) throw new Error('已有进度暂时无法读取，请刷新后重试。');
        adopt(body.session);
        if (location.hash === '#assessment') setScreen('assessment');
        else if (body.session.status === 'completed') {
          if ((location.hash === '#counselor-transition' || location.hash === '#report' || location.hash === '#counselor') && body.session.completedProfileSteps === profileFields.length) { const data = createStudentReport(body.session, scoreAssessment(body.session.answers)); const generated = hasGeneratedCounselorMaterials(body.session); setReport(data); setCounselorGenerated(generated); setScreen(generated ? (location.hash === '#counselor' ? 'counselor' : 'report') : 'counselor-transition'); }
          else if (location.hash === '#personal-information' || location.hash === '#counselor-transition' || location.hash === '#report' || location.hash === '#counselor') setScreen('personal-information');
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
      const body = { session: createBrowserSession(name) };
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
      const body = { session: saveBrowserAnswer(current, index, value) };
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
      const body = { session: loadBrowserSession() };
      if (!validateSession(body.session)) throw new Error('暂时无法读取已保存的信息，请重试。');
      const nextReport = createStudentReport(body.session, scoreAssessment(body.session.answers));
      const generated = hasGeneratedCounselorMaterials(body.session);
      adopt(body.session); setReport(nextReport); setCounselorGenerated(generated); setScreen(generated ? 'report' : 'counselor-transition');
    } catch (e) { setError(e instanceof Error ? e.message : '暂时无法生成报告，请重试。'); }
    finally { setSaving(false); }
  }

  function generateCounselorMaterials() {
    if (!session || !report || saving) return;
    setSaving(true); setError('');
    try {
      createCounselorPackage(report);
      markCounselorMaterialsGenerated(session);
      setCounselorGenerated(true);
      setScreen('counselor');
    } catch (e) { setError(e instanceof Error ? e.message : '暂时无法生成导师分析资料，请重试。'); }
    finally { setSaving(false); }
  }

  return <div className={`experience experience-${screen}`}><header className="site-header"><a href="./" className="wordmark"><span className="brand-logo" aria-hidden="true"><Image src="/student-development-assessment/rs-insight.png" alt="" width={1254} height={1254} priority unoptimized/></span><span className="brand-copy"><span className="brand-title">学生发展优势测评</span><span className="brand-subtitle">RS Insight</span></span></a><span className="header-note">每一种成长，都有自己的方向 <ArrowUpRight size={15}/></span></header>
    <main id="main-content"><StageProgress active={screen === 'counselor-transition' || screen === 'counselor' ? 3 : screen === 'profile-complete' || screen === 'report' ? 2 : screen === 'complete' || screen === 'personal-information' ? 1 : 0} complete={session?.status === 'completed'} finished={counselorGenerated}/>
      {error && <div className="error-message" role="alert">{error}{screen === 'home' && <Button variant="ghost" onClick={() => location.reload()}>重新读取</Button>}</div>}
      {screen === 'home' && <section className="welcome"><div className="welcome-art"><HelloArtwork/></div><p className="eyebrow">请花时间，在安静的环境下完成测评</p><h1>发现优势<br/><span>探索未来</span></h1><Button disabled={loading || Boolean(error)} className="primary-action" onClick={() => setScreen(session ? resumeScreen(session) : 'hello')}>{loading ? '正在读取进度' : session ? '继续完成测评' : '开始测评'} <ArrowRight/></Button><p className="quiet-note">{session ? `${session.preferredName ? session.preferredName + '，' : ''}已为你保存 ${answered} / ${questions.length} 个回答` : '不必急着给未来一个答案'}</p></section>}
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
      {screen === 'complete' && session && <section className="completion-screen"><span className="completion-check"><Check size={30}/></span><h1 ref={headingRef} tabIndex={-1}>测评部分完成 ✓</h1><h2>接下来，填写信息让报告更了解你</h2><p>测试+真实经历，会让报告更完善</p><Button className="primary-action" onClick={() => setScreen('personal-information')}>继续补充个人信息 <ArrowRight/></Button><Button className="completion-secondary" variant="ghost" onClick={() => { void persist(0).then(() => setScreen('assessment')).catch(() => {}); }} disabled={saveState === 'pending'}>回看我的回答</Button></section>}
      {screen === 'personal-information' && session && <PersonalInformation session={session} onSave={adopt} onDone={() => setScreen('profile-complete')} onBack={() => setScreen('complete')}/>}
      {screen === 'profile-complete' && session && <section className="completion-screen"><span className="completion-check"><Check size={30}/></span><h1 ref={headingRef} tabIndex={-1}>好了，我们对你多了解了一点。</h1><p>现在，我们可以把“测评中的你”和“真实经历中的你”放在一起看看了。</p><Button className="primary-action" onClick={() => void generateReport()} disabled={saving}>{saving ? '正在生成' : '生成我的发展报告'}<ArrowRight/></Button><Button className="completion-secondary" variant="ghost" onClick={() => setScreen('personal-information')}>回看个人信息</Button></section>}
      {screen === 'counselor-transition' && report && <CounselorTransition onGenerate={generateCounselorMaterials} busy={saving}/>}
      {screen === 'report' && report && <StudentReportView report={report} onEdit={() => setScreen('personal-information')} onCounselor={() => setScreen('counselor')}/>}
      {screen === 'counselor' && report && <CounselorMaterials data={report} onReport={() => setScreen('report')}/>}
    </main>
  </div>;
}
