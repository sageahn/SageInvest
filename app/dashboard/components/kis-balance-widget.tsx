'use client';

import { useEffect, useState } from 'react';
import { AccountSummary } from '@/lib/kis/types';

export default function KISBalanceWidget() {
  const [summary, setSummary] = useState<AccountSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchBalance = async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const url = forceRefresh
        ? '/api/kis/balance/summary?forceRefresh=true'
        : '/api/kis/balance/summary';
      const response = await fetch(url);
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || '잔고조회 실패');
      }
      const data = (await response.json()) as { data: AccountSummary };
      setSummary(data.data);
      setLastUpdated(new Date());
    } catch (err) {
      const message = err instanceof Error ? err.message : '잔고조회 실패';
      setError(message);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, []);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0,
    }).format(amount);

  const formatRate = (rate: number) => `${rate > 0 ? '+' : ''}${rate.toFixed(2)}%`;

  const pnlClass = (value: number) => (value > 0 ? 'si-positive' : value < 0 ? 'si-negative' : '');

  if (loading) return <section className="si-card">자산 현황을 조회 중입니다...</section>;
  if (error) return <section className="si-card si-message error">{error}</section>;
  if (!summary) return null;

  return (
    <section className="si-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ marginTop: 0 }}>자산 현황</h3>
        <button className="si-btn si-btn-secondary" onClick={() => fetchBalance(true)}>
          새로고침
        </button>
      </div>
      <p>
        총평가금액: <strong>{formatCurrency(summary.totalEvaluation)}</strong>
      </p>
      <p>
        총매입금액: <strong>{formatCurrency(summary.purchaseTotal)}</strong>
      </p>
      <p className={pnlClass(summary.profitLossTotal)}>
        총평가손익: <strong>{formatCurrency(summary.profitLossTotal)}</strong>
      </p>
      <p className={pnlClass(summary.profitLossTotal)}>
        총수익률: <strong>{formatRate(summary.profitLossRate)}</strong>
      </p>
      <p>예수금: {formatCurrency(summary.depositTotal)}</p>
      <p>순자산금액: {formatCurrency(summary.netAsset)}</p>
      {lastUpdated && (
        <p style={{ color: 'var(--muted-foreground)', fontSize: 13, marginBottom: 0 }}>
          마지막 조회: {lastUpdated.toLocaleTimeString()}
        </p>
      )}
    </section>
  );
}
