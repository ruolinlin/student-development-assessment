'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { StudentReportData } from '@/lib/development-types';
import { studentReportMarkdown } from '@/lib/student-report-markdown';
import { artifactFilename } from '@/lib/counselor-package';
import { downloadText } from '@/lib/download-text';

export function StudentReportView({ report, onEdit, onCounselor }: { report: StudentReportData; onEdit: () => void; onCounselor: () => void }) {
  const context = report.studentContext;
  const heading = useRef<HTMLHeadingElement>(null);
  const [error, setError] = useState('');
  useEffect(() => { heading.current?.focus(); }, []);
  function download() {
    try { downloadText(artifactFilename('student', context.preferredName), studentReportMarkdown(report)); }
    catch (error) { setError(error instanceof Error ? error.message : '暂时无法下载，请重试。'); }
  }
  return <article className="student-report" aria-labelledby="report-title">
    <p className="eyebrow">我的发展报告{report.source.mode === 'testing' ? ' · 测试资料' : ''}</p>
    <h1 ref={heading} id="report-title" tabIndex={-1}>{report.title}</h1>
    <p className="report-status">{report.dimensionResults ? '这是一份关于你目前如何描述自己的发展记录。它不代表客观能力，不用于和其他学生比较，也不替你决定未来。' : '维度结果尚未准备好。已填写的信息和原始回答仍然保留，完整发展报告及导师分析资料暂不可生成。'}</p>
    <section aria-labelledby="portrait-title"><h2 id="portrait-title">01｜我的发展画像</h2>
      {report.dimensionResults ? <>
        <p className="profile-hint">1–5 量尺展示本次自我描述。偏好方向单独呈现。</p>
        <div className="dimension-overview" aria-label="正式维度总览">{report.dimensionResults.filter(d => d.kind === 'scale').map(d => <div className="dimension-bar" key={d.key}><div><span>{d.name}</span><strong>{d.score?.toFixed(2)} <small>/ 5</small></strong></div><div className="scale-track" role="meter" aria-label={d.name} aria-valuemin={1} aria-valuemax={5} aria-valuenow={d.score ?? 1}><span style={{width:`${((d.score ?? 1) - 1) / 4 * 100}%`}}/></div></div>)}</div>
        {report.dimensionResults.filter(d => d.kind === 'scale').map(d => <div className="dimension-explanation" key={d.key}><h3>{d.name}</h3><p>{d.explanation}</p><details><summary>查看 {d.subdimensions.length} 个子维度</summary><div className="subdimension-list">{d.subdimensions.map(s => <div key={s.key}><h4>{s.name}<span>{s.score.toFixed(2)} / 5</span></h4><p>{s.explanation}</p><p>{s.situation}</p></div>)}</div></details></div>)}
        {report.preferenceResults.length > 0 && <div className="preference-overview"><h3>{report.dimensionResults.find(d => d.kind === 'preference')?.name}</h3><p className="profile-hint">左右表示不同方式，没有优劣之分。</p>{report.preferenceResults.map(p => <div className="preference-row" key={p.key}><div className="preference-labels"><span>{p.leftLabel}</span><span>{p.rightLabel}</span></div><div className="preference-track" role="meter" aria-label={p.name} aria-valuemin={1} aria-valuemax={5} aria-valuenow={p.position} aria-valuetext={`${p.name}，位置 ${p.position.toFixed(2)}`}><span style={{left:`${(p.position-1)/4*100}%`}}/></div><p>{p.explanation}</p></div>)}</div>}
      </> : <p className="profile-hint">等待正式维度结果，不以原始选项或示例分数替代。</p>}
    </section>
    <section aria-labelledby="clues-title"><h2 id="clues-title">02｜比较明显的发展线索</h2>{report.developmentProfile ? report.developmentProfile.clues.map(clue => <div className="report-clue" key={clue.id}><h3>{clue.title}</h3><p>{clue.description}</p></div>) : <p>维度结果准备好后，才能结合回答分布观察发展线索。</p>}</section>
    <section aria-labelledby="context-title"><h2 id="context-title">03｜真实经历中的我</h2><dl className="report-context">
      <div><dt>称呼</dt><dd>{context.preferredName || '你'}</dd></div>
      <div><dt>年级</dt><dd>{context.grade || '暂未填写'}</dd></div>
      <div><dt>你填写的优势学科</dt><dd>{context.strengthSubjects || '暂未填写'}</dd></div>
      <div><dt>让你有成就感的经历</dt><dd>{context.achievementExperience || '暂未填写'}</dd></div>
      <div><dt>你的成就感来自</dt><dd>{context.achievementReason || '暂未填写'}</dd></div>
      <div><dt>目前考虑的升学国家或地区</dt><dd>{context.targetRegions || '暂未填写'}</dd></div>
      <div><dt>你主动补充的信息（未经核实）</dt><dd>{context.additionalContext || '暂未补充'}</dd></div>
    </dl></section>
    <section aria-labelledby="evidence-title"><h2 id="evidence-title">04｜测评和真实经历放在一起</h2>
      {report.developmentProfile ? <>
        {report.developmentProfile.evidenceConnections.length ? report.developmentProfile.evidenceConnections.map(connection => <div className="evidence-connection" key={`${connection.contextField}-${connection.itemId}`}><blockquote>{connection.studentText}</blockquote><p>{connection.explanation}</p><details><summary>对照这道题的回答</summary><p>{connection.questionText}</p><p>你的选择：{connection.responseLabel}</p></details></div>) : <p>目前没有发现可直接对照的文字线索，需要用具体行为进一步核实。</p>}
        <h3>仍需了解的地方</h3>{report.developmentProfile.evidenceGaps.map(gap => <p key={gap.id}>{gap.description}</p>)}
      </> : <p>已有真实经历会与正式维度结果一起使用；目前不提前给出解释。</p>}
    </section>
    <section aria-labelledby="questions-title"><h2 id="questions-title">05｜值得继续认识的问题</h2>{report.developmentProfile ? <ol className="exploration-questions">{report.developmentProfile.explorationQuestions.map(question => <li key={question}>{question}</li>)}</ol> : <p>探索问题将在维度结果和经历对照后形成。</p>}</section>
    <section aria-labelledby="next-title"><h2 id="next-title">06｜下一步</h2><p>这份报告帮助你看见目前已经出现的发展线索，但不等于专业选择结论。下一阶段可以由升学指导师结合测评、你的真实经历，以及大学专业和职业的实时信息进行进一步分析。</p></section>
    <details className="report-answers"><summary>查看全部 {report.rawAnswers.length} 个原始回答</summary><ol>{report.rawAnswers.map(answer => <li key={answer.itemId}><p>{answer.question}</p><span>{answer.value} · {answer.label}</span></li>)}</ol></details>
    <section className="results-center" aria-labelledby="ready-title"><h2 id="ready-title">{report.counselorPackageStatus === 'ready' ? '完整资料已经准备好了 ✓' : '你的资料已保存'}</h2>
      <p>你可以查看或下载完整发展报告，也可以返回已经生成的导师分析资料。</p>
      <Button className="primary-action" disabled={report.counselorPackageStatus !== 'ready'} onClick={onCounselor}>查看导师分析资料<ArrowRight/></Button>
      <div className="artifact-actions"><Button variant="ghost" onClick={() => heading.current?.focus()}>查看我的发展报告</Button><Button variant="ghost" disabled={!report.dimensionResults} onClick={download}><Download/>下载我的发展报告</Button><Button variant="ghost" onClick={onEdit}>回看个人信息</Button></div>
      {error && <p role="alert" className="profile-error">{error}</p>}
    </section>
  </article>;
}
