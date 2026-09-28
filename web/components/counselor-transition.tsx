'use client';
import { ArrowRight, FileCheck2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function CounselorTransition({ onGenerate, busy = false }: { onGenerate: () => void; busy?: boolean }) {
  return <section className="completion-screen counselor-transition" aria-labelledby="counselor-transition-title">
    <span className="completion-check"><FileCheck2 size={30}/></span>
    <p className="eyebrow">最后一步 · 04 / 04</p>
    <h1 id="counselor-transition-title" tabIndex={-1}>发展报告已经生成</h1>
    <h2>继续生成导师分析资料，完成全部流程</h2>
    <p>导师分析资料会整合你的正式维度结果、真实经历和升学背景。完成后，你就可以查看或下载完整发展报告和导师分析资料。</p>
    <Button className="primary-action" onClick={onGenerate} disabled={busy}>{busy ? '正在生成' : '生成导师分析资料'}<ArrowRight/></Button>
    <p className="quiet-note">你的测评、个人信息和发展报告已经自动保存。</p>
  </section>;
}
