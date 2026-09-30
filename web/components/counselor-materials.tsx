'use client';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Download, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { StudentReportData } from '@/lib/development-types';
import { aiReportExecutionPrompt, artifactFilename, createCounselorPackage, counselorPackageMarkdown } from '@/lib/counselor-package';
import { downloadText } from '@/lib/download-text';

export function CounselorMaterials({ data, onReport }: { data: StudentReportData; onReport: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  const [feedback, setFeedback] = useState('');
  const [manualCopy, setManualCopy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { heading.current?.focus(); }, []);
  let materials = '';
  try { materials = counselorPackageMarkdown(createCounselorPackage(data)); } catch {}
  const materialsFilename = artifactFilename('counselor', data.studentContext.preferredName);
  const executionPrompt = aiReportExecutionPrompt(materialsFilename, data.studentContext.preferredName);
  async function copyExecutionInstructions() {
    setError('');
    try { await navigator.clipboard.writeText(executionPrompt); setFeedback('执行指令已复制'); }
    catch { setManualCopy(true); setError('自动复制未成功，可以选择下方指令手动复制。'); }
  }
  if (!materials) return <section className="completion-screen"><h1 ref={heading} tabIndex={-1}>导师分析资料尚未准备好</h1><p>需要完整的测评、个人信息和维度结果，才能生成这份资料。</p><Button onClick={onReport}>返回发展报告</Button></section>;
  return <section className="student-report counselor-materials"><span className="completion-check"><Check size={30}/></span><h1 ref={heading} tabIndex={-1}>AI分析资料包已准备好 ✓</h1><p className="report-status">这份资料整合了你的测评结果和个人经历，可以发给AI进行分析。</p>
    <p className="ai-tool-recommendation"><Sparkles size={17} aria-hidden="true"/>推荐使用 <strong>Workbuddy / Codex</strong> 进行分析。</p>
    {data.source.mode === 'testing' && <p className="testing-notice">测试资料，不代表真实学生。</p>}
    <section className="ai-report-guide" aria-labelledby="ai-report-guide-title"><h2 id="ai-report-guide-title">如何生成完整报告</h2><p>依次完成以下三步，AI 将生成带有 RS Insight Logo 的网页版报告。</p><ol className="ai-guide-steps">
      <li><span className="ai-guide-number">1</span><div><h3>下载 AI 分析资料包</h3><p>资料包包含你的测评结果、个人经历和完整分析要求。</p><Button className="primary-action" onClick={() => downloadText(materialsFilename, materials)}><Download/>下载 AI 分析资料包</Button></div></li>
      <li><span className="ai-guide-number">2</span><div><h3>复制给 AI 的执行指令</h3><p>指令会要求 AI 执行附件内容，并生成与参考页面一致、带有 Logo 的 HTML 报告。</p><Button className="guide-copy-action" variant="outline" onClick={() => void copyExecutionInstructions()}><Copy/>复制给 AI 的执行指令</Button><p className="copy-feedback" role="status" aria-live="polite">{feedback}</p>{error && <p className="profile-error" role="alert">{error}</p>}{manualCopy && <textarea className="manual-copy" aria-label="待复制的 AI 执行指令" readOnly value={executionPrompt} onFocus={e => e.target.select()}/>}</div></li>
      <li><span className="ai-guide-number">3</span><div><h3>将资料包和执行指令一起发送</h3><p>在 WorkBuddy 或 Codex 的同一条消息中，上传刚下载的资料包并粘贴执行指令，然后一起发送。AI 会研究资料并交付可直接打开的 HTML 报告。</p></div></li>
    </ol></section>
    <section className="report-reference" aria-labelledby="report-reference-title"><h2 id="report-reference-title">AI分析后报告参考</h2><div className="report-reference-image"><Image src="/student-development-assessment/report-reference.png" alt="大学专业与生涯探索报告参考页面" width={2690} height={1690} sizes="(max-width: 600px) calc(100vw - 48px), 740px" unoptimized/></div></section>
  </section>;
}
