'use client';

import { useEffect, useMemo, useState } from 'react';
import AppShell from '@/app/components/app-shell';
import { AccountSummary, StockHolding } from '@/lib/kis/types';

type SortField = 'stockName' | 'quantity' | 'profitLossRate' | 'evaluationAmount';
type SortOrder = 'asc' | 'desc';

export default function PortfolioPage() {
  const [holdings, setHoldings] = useState<StockHolding[]>([]);
  const [summary, setSummary] = useState<AccountSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('evaluationAmount');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const fetchPortfolio = async (forceRefresh = false) => {
    setLoading(true);
    setError(null);

    // KIS API가 느릴 수 있으므로 타임아웃을 180초로 설정
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 180000); // 180초

    try {
      const url = forceRefresh ? '/api/kis/balance?forceRefresh=true' : '/api/kis/balance';
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const err = (await response.json()) as { error?: string };
        throw new Error(err.error || '잔고조회 실패');
      }
      const data = (await response.json()) as {
        data: { holdings: StockHolding[]; summary: AccountSummary };
      };
      setHoldings(data.data.holdings);
      setSummary(data.data.summary);
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === 'AbortError') {
        setError('요청 시간이 초과되었습니다. 다시 시도해주세요.');
      } else {
        setError(err instanceof Error ? err.message : '잔고조회 실패');
      }
      setHoldings([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
  }, []);

  const sortedHoldings = useMemo(() => {
    const copy = [...holdings];
    copy.sort((a, b) => {
      const result =
        sortField === 'stockName'
          ? a.stockName.localeCompare(b.stockName, 'ko')
          : a[sortField] - b[sortField];
      return sortOrder === 'asc' ? result : -result;
    });
    return copy;
  }, [holdings, sortField, sortOrder]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0,
    }).format(amount);
  const formatRate = (rate: number) => `${rate > 0 ? '+' : ''}${rate.toFixed(2)}%`;
  const pnlClass = (value: number) => (value > 0 ? 'si-positive' : value < 0 ? 'si-negative' : '');

  return (
    <AppShell
      active="portfolio"
      title="포트폴리오"
      subtitle={
        summary
          ? `마지막 조회: ${new Date(summary.lastUpdated).toLocaleString()}`
          : '보유 종목과 수익률을 확인합니다.'
      }
      actions={
        <div style={{ marginTop: 12 }}>
          <button
            className="si-btn si-btn-primary"
            onClick={() => fetchPortfolio(true)}
            disabled={loading}
          >
            {loading ? '조회 중...' : '새로고침'}
          </button>
        </div>
      }
    >
      {error && <div className="si-message error">{error}</div>}

      {summary && (
        <section className="si-grid-4" style={{ marginBottom: 20 }}>
          <article className="si-card">
            <p className="si-card-title">총평가금액</p>
            <p className="si-card-value">{formatCurrency(summary.totalEvaluation)}</p>
          </article>
          <article className="si-card">
            <p className="si-card-title">총평가손익</p>
            <p className={`si-card-value ${pnlClass(summary.profitLossTotal)}`}>
              {formatCurrency(summary.profitLossTotal)}
            </p>
          </article>
          <article className="si-card">
            <p className="si-card-title">총수익률</p>
            <p className={`si-card-value ${pnlClass(summary.profitLossTotal)}`}>
              {formatRate(summary.profitLossRate)}
            </p>
          </article>
          <article className="si-card">
            <p className="si-card-title">순자산금액</p>
            <p className="si-card-value">{formatCurrency(summary.netAsset)}</p>
          </article>
        </section>
      )}

      {!loading && sortedHoldings.length === 0 && (
        <section className="si-card">보유 종목이 없습니다.</section>
      )}

      {sortedHoldings.length > 0 && (
        <>
          <section className="si-card" style={{ marginBottom: 12 }}>
            <div className="si-actions" style={{ justifyContent: 'space-between' }}>
              <input
                className="si-input"
                placeholder="종목명 검색"
                style={{ maxWidth: 260 }}
                disabled
                aria-label="종목명 검색"
              />
              <button
                className="si-btn si-btn-secondary"
                onClick={() => fetchPortfolio(true)}
                disabled={loading}
              >
                새로고침
              </button>
            </div>
          </section>
          <section className="si-table-wrap">
            <table className="si-table">
              <thead>
                <tr>
                  <th>
                    <button
                      className="si-btn si-btn-secondary"
                      onClick={() => {
                        if (sortField === 'stockName')
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        else {
                          setSortField('stockName');
                          setSortOrder('desc');
                        }
                      }}
                    >
                      종목명
                    </button>
                  </th>
                  <th>보유수량</th>
                  <th>매입평균가</th>
                  <th>현재가</th>
                  <th>평가금액</th>
                  <th>평가손익</th>
                  <th>
                    <button
                      className="si-btn si-btn-secondary"
                      onClick={() => {
                        if (sortField === 'profitLossRate')
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        else {
                          setSortField('profitLossRate');
                          setSortOrder('desc');
                        }
                      }}
                    >
                      수익률
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedHoldings.map((holding, index) => (
                  <tr key={`${holding.stockCode}-${index}`}>
                    <td>
                      {holding.stockName}
                      <br />
                      <span style={{ color: 'var(--muted-foreground)', fontSize: 12 }}>
                        {holding.stockCode}
                      </span>
                    </td>
                    <td>{holding.quantity.toLocaleString()}주</td>
                    <td>{formatCurrency(holding.averagePurchasePrice)}</td>
                    <td>{formatCurrency(holding.currentPrice)}</td>
                    <td>{formatCurrency(holding.evaluationAmount)}</td>
                    <td className={pnlClass(holding.profitLossAmount)}>
                      {formatCurrency(holding.profitLossAmount)}
                    </td>
                    <td className={pnlClass(holding.profitLossAmount)}>
                      {formatRate(holding.profitLossRate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <p style={{ marginTop: 8, color: 'var(--muted-foreground)', fontSize: 13 }}>
            총 {sortedHoldings.length}개 종목
          </p>
        </>
      )}
    </AppShell>
  );
}
