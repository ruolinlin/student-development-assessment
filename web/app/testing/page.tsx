import { notFound } from 'next/navigation';
import { ReportTesting } from '@/components/report-testing';
export default function TestingPage() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <ReportTesting/>;
}
