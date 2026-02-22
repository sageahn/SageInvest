// Watchlist Page
// SPEC-WATCHLIST-001: 관심 종목 관리 메인 페이지
import type { Metadata } from 'next';
import AppShell from '@/app/components/app-shell';
import WatchlistTabs from '@/app/components/watchlist/WatchlistTabs';

export const metadata: Metadata = {
  title: '관심 종목 | SageInvest',
  description: '관심 종목을 관리하고 현재가를 확인하세요',
};

export default function WatchlistPage() {
  return (
    <AppShell active="watchlist" title="관심 종목" subtitle="관심 종목 관리">
      <WatchlistTabs />
    </AppShell>
  );
}
