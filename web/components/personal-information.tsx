'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { profileFields, validateSession, type AssessmentSession } from '@/lib/assessment-session';

const prompts = [
  { title: '你现在几年级？', hint: '' },
  { title: '你比较有优势的学科是什么？', hint: '可以写一个，也可以写几个。' },
  { title: '有没有一件你做过的事情，让你特别有成就感？', hint: '不一定是获奖。可以是一次项目、活动、作品，也可以是一件你坚持了很久、最后做成的事情。' },
  { title: '是什么让你觉得特别有成就感？', hint: '' },
  { title: '你目前主要考虑哪些升学国家或地区？', hint: '可以填写多个。如果还没有确定，也可以直接写“还没确定”。' },
  { title: '还有什么信息想让我们知道？', hint: '比如成绩、课程、考试、项目经历，或其他你觉得会影响升学选择的信息。这一项可以留空。' },
];
export function PersonalInformation({ session, onSave, onDone, onBack }: { session: AssessmentSession; onSave: (session: AssessmentSession) => void; onDone: () => void; onBack: () => void }) {
  const [step, setStep] = useState(Math.min(session.completedProfileSteps, profileFields.length - 1));
  const [values, setValues] = useState(session.personalInformation);
  const [state, setState] = useState<'saved' | 'pending' | 'error'>('saved');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const current = useRef(session);
  const draft = useRef(values);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const composing = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const field = profileFields[step];
  useEffect(() => { heading.current?.focus(); }, [step]);
  useEffect(() => { if (area.current) { area.current.style.height = 'auto'; area.current.style.height = `${Math.max(180, area.current.scrollHeight)}px`; } }, [values, step]);
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => { if (state !== 'saved') { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [state]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function save(at: number, complete: boolean, targetStep: number) {
    const value = draft.current[profileFields[at]];
    setState('pending'); setError('');
    const task = queue.current.catch(() => {}).then(async () => {
      const response = await fetch('/api/session', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'profile', revision: current.current.revision, step: at, value, complete, targetStep }) });
      const body = await response.json() as { session?: unknown; error?: string };
      if (!response.ok) throw new Error(body.error || '暂时无法保存，请重试。');
      if (!validateSession(body.session)) throw new Error('保存未完成，请重试。');
      const saved = body.session;
      current.current = saved; onSave(saved); setError('');
      // A response for an older draft must not mark newer typing as saved.
      if (profileFields.every(key => draft.current[key] === saved.personalInformation[key])) setState('saved');
    }).catch(e => { setState('error'); setError(e instanceof Error ? e.message : '暂时无法保存，请重试。'); throw e; });
    queue.current = task;
    return task;
  }
  function scheduleSave() {
    if (timer.current) clearTimeout(timer.current);
    if (!composing.current) timer.current = setTimeout(() => { void save(step, false, step).catch(() => {}); }, 700);
  }
  function change(value: string) {
    const next = { ...draft.current, [field]: value };
    draft.current = next; setValues(next); setState('pending'); scheduleSave();
  }
  async function navigate(direction: -1 | 1) {
    if (busy || composing.current) return;
    if (timer.current) clearTimeout(timer.current);
    setBusy(true);
    try {
      const target = Math.max(0, Math.min(profileFields.length - 1, step + direction));
      await save(step, direction === 1, target);
      if (direction === 1 && step === profileFields.length - 1) onDone();
      else if (direction === -1 && step === 0) onBack();
      else setStep(target);
    } catch {} finally { setBusy(false); }
  }
  return <section className="personal-information-screen">
    <div className="profile-meta"><span>补充个人信息</span><span>0{step + 1} / 06</span></div>
    {step === 0 && <p className="profile-intro">{session.preferredName ? `${session.preferredName}，` : ''}再告诉我们一点真实的你。<br/>这些信息会和你的测评结果一起，用于生成属于你的发展报告。</p>}
    <form onSubmit={event => { event.preventDefault(); void navigate(1); }}>
      <h1 ref={heading} tabIndex={-1} id="profile-question"><label htmlFor={`profile-${field}`}>{prompts[step].title}</label></h1>
      {prompts[step].hint && <p className="profile-hint" id="profile-hint">{prompts[step].hint}</p>}
      {(step < 2 || field === 'targetRegions') ? <Input key={field} id={`profile-${field}`} className="profile-input" value={values[field]} disabled={busy} aria-describedby={prompts[step].hint ? 'profile-hint' : undefined} onChange={e => change(e.target.value)} onCompositionStart={() => { composing.current = true; if (timer.current) clearTimeout(timer.current); }} onCompositionEnd={() => { composing.current = false; scheduleSave(); }}/>
        : <Textarea ref={area} key={field} id={`profile-${field}`} className="profile-input profile-textarea" value={values[field]} disabled={busy} aria-describedby={prompts[step].hint ? 'profile-hint' : undefined} onChange={e => change(e.target.value)} onCompositionStart={() => { composing.current = true; if (timer.current) clearTimeout(timer.current); }} onCompositionEnd={() => { composing.current = false; scheduleSave(); }}/>}
      {error && <p className="profile-error" role="alert">{error}</p>}
      <div className="assessment-actions"><Button type="button" variant="ghost" className="back-action" onClick={() => void navigate(-1)} disabled={busy}><ArrowLeft/>返回</Button><Button type="submit" className="primary-action" disabled={busy}>{busy ? '正在保存' : '继续'}<ArrowRight/></Button></div>
      <p className="save-status" role="status">{state === 'saved' && <CheckCheck size={15}/>} {state === 'saved' ? '已保存' : state === 'pending' ? '正在保存…' : '未保存，点击继续重试'}</p>
    </form>
  </section>;
}
