'use client';

import { useState, useEffect } from 'react';
import { AccountSummary } from '@/lib/kis/types';

interface BalanceWidgetProps {
  className?: string;
}

export default function KISBalanceWidget({ className = '' }: BalanceWidgetProps) {
  const [summary, setSummary] = useState<AccountSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
        const errorData = await response.json();
        throw new Error(errorData.error || '잔고조회 실패');
      }

      const data = await response.json();
      setSummary(data.data);
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err.message || '잔고조회에 실패했습니다');
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, []);

  const getProfitLossColor = (value: number): string => {
    if (value > 0) return 'text-red-600'; // 한국 증시 관행: 손실 양수는 빨간색
    if (value < 0) return 'text-blue-600'; // 이익 음수는 파란색
    return 'text-gray-900';
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatRate = (rate: number): string => {
    return `${rate > 0 ? '+' : ''}${rate.toFixed(2)}%`;
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="text-center py-4">
          <p className="text-gray-600 mb-2">{error}</p>
          {error.includes('계좌') && (
            <a href="/kis/settings" className="text-blue-600 hover:underline">
              계좌 설정하러 가기
            </a>
          )}
          {error.includes('KIS 연동') && (
            <a href="/kis/auth" className="text-blue-600 hover:underline">
              KIS 연동하러 가기
            </a>
          )}
        </div>
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">자산 현황</h3>
        <button
          onClick={() => fetchBalance(true)}
          disabled={loading}
          className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
          title="새로고침"
        >
          <svg
            className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>

      {/* Asset Summary */}
      <div className="space-y-4">
        {/* 총평가금액 */}
        <div className="flex justify-between items-center pb-3 border-b">
          <span className="text-sm text-gray-600">총평가금액</span>
          <span className="text-xl font-bold">{formatCurrency(summary.totalEvaluation)}</span>
        </div>

        {/* 총매입금액 */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">총매입금액</span>
          <span className="font-medium">{formatCurrency(summary.purchaseTotal)}</span>
        </div>

        {/* 총평가손익 */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">총평가손익</span>
          <span className={`font-medium ${getProfitLossColor(summary.profitLossTotal)}`}>
            {formatCurrency(summary.profitLossTotal)}
          </span>
        </div>

        {/* 총수익률 */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">총수익률</span>
          <span className={`font-medium ${getProfitLossColor(summary.profitLossTotal)}`}>
            {formatRate(summary.profitLossRate)}
          </span>
        </div>

        {/* 예수금 */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">예수금</span>
          <span className="font-medium">{formatCurrency(summary.depositTotal)}</span>
        </div>

        {/* 순자산금액 */}
        <div className="flex justify-between items-center pt-3 border-t">
          <span className="text-sm text-gray-600">순자산금액</span>
          <span className="font-bold text-lg">{formatCurrency(summary.netAsset)}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">
            {lastUpdated && `마지막 조회: ${lastUpdated.toLocaleTimeString()}`}
          </span>
          <a href="/kis/portfolio" className="text-sm text-blue-600 hover:underline">
            보유종목 상세 &rarr;
          </a>
        </div>
      </div>
    </div>
  );
}
