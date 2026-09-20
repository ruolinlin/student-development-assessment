'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, CheckCheck, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { isComplete, questions, responseOptions } from '@/lib/question-bank';
import { validateSession, type AssessmentSession } from '@/lib/assessment-session';

export function HelloArtwork() {
  return <svg className="hello-art" viewBox="0 0 460 230" role="img" aria-label="Hello">
    <defs><linearGradient id="hello-ink" x1="0" y1="1" x2="1" y2="0"><stop stopColor="#537aff"/><stop offset=".4" stopColor="#8b62d9"/><stop offset=".75" stopColor="#df8fbb"/><stop offset="1" stopColor="#57b8c7"/></linearGradient></defs>
    <g fill="none" stroke="url(#hello-ink)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round">
      <path className="ink" pathLength="1" d="M38 171 C59 139 111 28 91 29 C64 30 52 125 93 113 C127 103 157 17 138 29 C122 37 106 146 117 164 C129 184 145 144 159 124 C176 98 198 110 183 124 C171 136 143 139 154 159 C166 181 201 154 219 127 C246 91 270 18 250 24 C226 32 203 124 210 155 C216 182 245 157 263 127 C288 90 309 22 289 29 C270 40 250 136 259 157 C269 180 302 143 315 125 C333 100 358 114 347 140 C336 166 311 172 307 150 C301 130 320 107 339 115 C356 127 380 127 399 111"/>
      <path className="ink flourish" pathLength="1" d="M137 196 C202 178 304 180 377 165"/>
    </g>
  </svg>;
}
export function StageProgress({ complete = false }: { complete?: boolean }) {
  return <nav className="stages" aria-label="完整流程"><ol>{['完成测评', '补充个人信息', '生成结果'].map((title, i) => <li key={title} aria-current={i === 0 ? 'step' : undefined} className={i === 0 ? 'current' : ''}><span className="stage-number">{complete && i === 0 ? '✓' : `0${i + 1}`}</span><span>{title}</span></li>)}</ol></nav>;
}
export function StudentExperience() {
  const [screen, setScreen] = useState<'home' | 'hello' | 'assessment' | 'complete'>('home');
  const [session, setSession] = useState<AssessmentSession | null>(null);
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
        else if (location.hash === '#complete' && isComplete(body.session.answers)) setScreen('complete');
      }
    }).catch(e => active && setError(e.message)).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (screen !== 'home') headingRef.current?.focus();
    if (screen === 'assessment' || screen === 'complete') history.replaceState(null, '', `#${screen}`);
  }, [screen, session?.currentIndex]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => { if (saveState !== 'saved') { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [saveState]);

  async function start() {
    if (saving || !name.trim()) return;
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
    if (!current) throw new Error('请先填写称呼。');
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

  return <div className="experience"><header className="site-header"><a href="/" className="wordmark"><span className="brand-mark" aria-hidden="true">✳</span>学生发展优势测评</a><span className="header-note">每一种成长，都有自己的方向 <ArrowUpRight size={15}/></span></header>
    <main id="main-content"><StageProgress complete={session?.status === 'completed'}/>
      {error && <div className="error-message" role="alert">{error}{screen === 'home' && <Button variant="ghost" onClick={() => location.reload()}>重新读取</Button>}</div>}
      {screen === 'home' && <section className="welcome"><div className="welcome-art"><HelloArtwork/></div><p className="eyebrow">从现在的你，开始</p><h1>发现优势，理解自己，<br/><span>探索未来。</span></h1><p className="intro">把你的想法与真实经历放在一起，<br className="mobile-break"/>看见属于自己的发展线索。</p><Button disabled={loading || Boolean(error)} className="primary-action" onClick={() => setScreen(session ? session.status === 'completed' ? 'complete' : 'assessment' : 'hello')}>{loading ? '正在读取进度' : session ? '继续上次进度' : '开始测评'} <ArrowRight/></Button><p className="quiet-note">{session ? `${session.preferredName}，已为你保存 ${answered} / ${questions.length} 个回答` : '不必急着给未来一个答案'}</p></section>}
      {screen === 'hello' && <section className="hello-screen"><HelloArtwork/><h1 ref={headingRef} tabIndex={-1}>很高兴在这里遇见你</h1><form onSubmit={e => { e.preventDefault(); void start(); }}><label htmlFor="student-name">我们怎么称呼你？</label><Input id="student-name" className="name-input" value={name} onChange={e => setName(e.target.value)} autoComplete="nickname" maxLength={30} required/><Button className="primary-action" disabled={!name.trim() || saving} type="submit">{saving ? '正在保存' : '继续'} <ArrowRight/></Button></form><p className="quiet-note">每个回答都会自动保存，可在同一浏览器继续</p></section>}
      {screen === 'assessment' && session && <section className="assessment-screen">
        <div className="assessment-meta"><span>完成测评 <small>1 / 3</small></span><span>{String(session.currentIndex + 1).padStart(2, '0')} <span className="muted">/ {questions.length}</span></span></div>
        <Progress className="assessment-progress" value={answered / questions.length * 100} aria-label={`已回答 ${answered} 道，共 ${questions.length} 道`}/>
        <div className="question-area"><p className="eyebrow">根据最近的自己，选择最接近的一项</p><h1 ref={headingRef} tabIndex={-1} id="question-title">{item.question_text}</h1><p className="question-hint">没有标准答案，真实的感受就好。</p></div>
        <RadioGroup key={item.item_id} className="answer-options" aria-labelledby="question-title" value={selected === null ? '' : String(selected)} onValueChange={choose} aria-busy={saving}>
          {responseOptions.map(option => <label className={`answer-option ${selected === option.value ? 'is-selected' : ''}`} key={option.value} htmlFor={`answer-${option.value}`}><RadioGroupItem id={`answer-${option.value}`} className="answer-radio" value={String(option.value)}/><span className="answer-value" aria-hidden="true">{option.value}</span><span className="answer-label">{option.label}</span></label>)}
        </RadioGroup>
        <div className="assessment-actions"><Button variant="ghost" className="back-action" disabled={saving || session.currentIndex === 0} onClick={() => void move(-1)}><ArrowLeft/>上一题</Button><Button className="primary-action" disabled={saving || selected === null} onClick={() => void move(1)}>{saving ? '正在保存' : session.currentIndex === questions.length - 1 ? '完成第一部分' : '下一题'} <ArrowRight/></Button></div>
        <div className="save-status" role="status">{saveState === 'pending' ? <LoaderCircle size={14} className="spin"/> : saveState === 'saved' ? <CheckCheck size={15}/> : null}{saveState === 'pending' ? '正在保存你的回答…' : saveState === 'saved' ? `已保存 · ${answered} / ${questions.length} 个回答` : '尚未保存，请点击下一题重试'}</div>
      </section>}
      {screen === 'complete' && session && <section className="completion-screen"><span className="completion-check"><Check size={30}/></span><p className="eyebrow">完成测评 · 第一阶段</p><h1 ref={headingRef} tabIndex={-1}>第一部分完成</h1><p>你已经完成了 {questions.length} 道测评题。<br/>你的每一个回答，都已妥善保存。</p><div className="next-explanation"><h2>这只是了解你的第一步。</h2><p>接下来，还需要了解你的学习情况和真实经历，<br className="desktop-break"/>才能生成完整的发展报告。</p><p className="preview-status">当前为测评预览版，发展画像与后续步骤尚未开放。</p></div><Button className="primary-action" onClick={() => { void persist(0).then(() => setScreen('assessment')).catch(() => {}); }} disabled={saveState === 'pending'}>回看我的回答 <ArrowRight/></Button></section>}
    </main>
    <footer className="site-footer"><span>认识自己，是一个慢慢展开的过程。</span><span>为每一种可能，留一点空间。</span></footer>
  </div>;
}
