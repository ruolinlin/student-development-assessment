'use client';
import { useState } from 'react';
import { createTestingReport } from '@/lib/testing-report';
import { StudentReportView } from './student-report';
import { CounselorMaterials } from './counselor-materials';
import { StageProgress } from './student-experience';
import { Button } from './ui/button';
export function ReportTesting() {
  const [data] = useState(createTestingReport);
  const [screen, setScreen] = useState<'ready' | 'report' | 'counselor'>('ready');
  return <div className="experience"><p className="testing-notice">开发预览：使用正式题库名称和显式测试结果。未运行正式评分，不代表真实学生；不会读取或写入你的学生会话。</p><main id="main-content"><StageProgress active={screen === 'counselor' ? 3 : 2} complete/>
    {screen === 'ready' && <section className="completion-screen"><h1>测试作答与六项信息已准备好</h1><p>使用同一份报告数据检查学生报告和导师分析资料。</p><Button className="primary-action" onClick={() => setScreen('report')}>生成测试报告</Button></section>}
    {screen === 'report' && <StudentReportView report={data} onEdit={() => setScreen('ready')} onCounselor={() => setScreen('counselor')}/>}
    {screen === 'counselor' && <CounselorMaterials data={data} onReport={() => setScreen('report')}/>}
  </main></div>;
}
