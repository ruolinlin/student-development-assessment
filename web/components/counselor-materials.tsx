'use client';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Download, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { StudentReportData } from '@/lib/development-types';
import { artifactFilename, createCounselorPackage, counselorPackageMarkdown } from '@/lib/counselor-package';
import { downloadText } from '@/lib/download-text';

export function CounselorMaterials({ data, onReport }: { data: StudentReportData; onReport: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  const [feedback, setFeedback] = useState('');
  const [manualCopy, setManualCopy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { heading.current?.focus(); }, []);
  let materials = '';
  try { materials = counselorPackageMarkdown(createCounselorPackage(data)); } catch {}
  async function copy() {
    setError('');
    try { await navigator.clipboard.writeText(materials); setFeedback('导师分析资料已复制'); }
    catch { setManualCopy(true); setError('自动复制未成功，可以选择下方资料手动复制，或直接下载。'); }
  }
  if (!materials) return <section className="completion-screen"><h1 ref={heading} tabIndex={-1}>导师分析资料尚未准备好</h1><p>需要完整的测评、个人信息和维度结果，才能生成这份资料。</p><Button onClick={onReport}>返回发展报告</Button></section>;
  return <section className="student-report counselor-materials"><span className="completion-check"><Check size={30}/></span><h1 ref={heading} tabIndex={-1}>AI分析资料包已准备好 ✓</h1><p className="report-status">这份资料整合了你的测评结果和个人经历，可以发给AI进行分析。</p>
    <p className="ai-tool-recommendation"><Sparkles size={17} aria-hidden="true"/>推荐使用 <strong>Workbuddy / Codex</strong> 进行分析。</p>
    {data.source.mode === 'testing' && <p className="testing-notice">测试资料，不代表真实学生。</p>}
    <section><h2>AI辅助分析测试</h2><p>开始生涯与专业分析</p><div className="artifact-actions"><Button className="primary-action" onClick={() => downloadText(artifactFilename('counselor', data.studentContext.preferredName), materials)}><Download/>下载分析资料</Button><Button variant="ghost" onClick={() => void copy()}><Copy/>复制导师分析资料</Button></div><p role="status">{feedback}</p>{error && <p className="profile-error" role="alert">{error}</p>}{manualCopy && <textarea className="manual-copy" aria-label="待复制的导师分析资料" readOnly value={materials} onFocus={e => e.target.select()}/>}</section>
    <section className="report-reference" aria-labelledby="report-reference-title"><h2 id="report-reference-title">AI分析后报告参考</h2><div className="report-reference-image"><Image src="/student-development-assessment/report-reference.png" alt="大学专业与生涯探索报告参考页面" width={2690} height={1690} sizes="(max-width: 600px) calc(100vw - 48px), 740px" unoptimized/></div></section>
  </section>;
}
