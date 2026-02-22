import Link from 'next/link';
import AppShell from '@/app/components/app-shell';
import KISBalanceWidget from './components/kis-balance-widget';
import KISStatusWidget from './components/kis-status-widget';

export default function DashboardPage() {
  return (
    <AppShell
      active="dashboard"
      title="SageInvest 대시보드"
      subtitle="KIS 연동 상태와 자산 현황을 확인하세요."
      actions={
        <div style={{ marginTop: 12 }}>
          <Link href="/kis/portfolio" className="si-btn si-btn-secondary">
            보유종목 보기
          </Link>
        </div>
      }
    >
      <div className="si-grid-2">
        <KISStatusWidget />
        <KISBalanceWidget />
      </div>
    </AppShell>
  );
}
