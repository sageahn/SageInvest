'use client';

import { useState, useEffect } from 'react';
import { StockHolding, AccountSummary } from '@/lib/kis/types';

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

    try {
      const url = forceRefresh ? '/api/kis/balance?forceRefresh=true' : '/api/kis/balance';
      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '잔고조회 실패');
      }

      const data = await response.json();
      setHoldings(data.data.holdings);
      setSummary(data.data.summary);
    } catch (err: any) {
      setError(err.message || '잔고조회에 실패했습니다');
      setHoldings([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
  }, []);

  // 정렬 처리
  const sortedHoldings = [...holdings].sort((a, b) => {
    let comparison = 0;

    switch (sortField) {
      case 'stockName':
        comparison = a.stockName.localeCompare(b.stockName, 'ko');
        break;
      case 'quantity':
        comparison = a.quantity - b.quantity;
        break;
      case 'profitLossRate':
        comparison = a.profitLossRate - b.profitLossRate;
        break;
      case 'evaluationAmount':
        comparison = a.evaluationAmount - b.evaluationAmount;
        break;
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const getProfitLossColor = (value: number): string => {
    if (value > 0) return 'text-red-600'; // 한국 증시 관행
    if (value < 0) return 'text-blue-600';
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
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-800 mb-2">오류</h2>
          <p className="text-red-700 mb-4">{error}</p>
          <div className="space-y-2">
            {error.includes('계좌') && (
              <a
                href="/kis/settings"
                className="block text-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                계좌 설정하러 가기
              </a>
            )}
            {error.includes('KIS 연동') && (
              <a
                href="/kis/auth"
                className="block text-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                KIS 연동하러 가기
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">보유종목</h1>
          <p className="text-gray-600 mt-1">
            {summary && `마지막 조회: ${new Date(summary.lastUpdated).toLocaleString()}`}
          </p>
        </div>
        <button
          onClick={() => fetchPortfolio(true)}
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '조회 중...' : '새로고침'}
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-sm text-gray-600 mb-1">총평가금액</p>
            <p className="text-2xl font-bold">{formatCurrency(summary.totalEvaluation)}</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-sm text-gray-600 mb-1">총평가손익</p>
            <p className={`text-2xl font-bold ${getProfitLossColor(summary.profitLossTotal)}`}>
              {formatCurrency(summary.profitLossTotal)}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-sm text-gray-600 mb-1">총수익률</p>
            <p className={`text-2xl font-bold ${getProfitLossColor(summary.profitLossTotal)}`}>
              {formatRate(summary.profitLossRate)}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-sm text-gray-600 mb-1">순자산금액</p>
            <p className="text-2xl font-bold">{formatCurrency(summary.netAsset)}</p>
          </div>
        </div>
      )}

      {/* Holdings Table */}
      {sortedHoldings.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <p className="text-gray-600 text-lg">보유 종목이 없습니다</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('stockName')}
                      className="flex items-center hover:text-gray-700"
                    >
                      종목명
                      {sortField === 'stockName' && (
                        <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    보유수량
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    매입평균가
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    현재가
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('evaluationAmount')}
                      className="flex items-center hover:text-gray-700"
                    >
                      평가금액
                      {sortField === 'evaluationAmount' && (
                        <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    평가손익
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('profitLossRate')}
                      className="flex items-center hover:text-gray-700"
                    >
                      수익률
                      {sortField === 'profitLossRate' && (
                        <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedHoldings.map((holding, index) => (
                  <tr key={`${holding.stockCode}-${index}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{holding.stockName}</div>
                        <div className="text-sm text-gray-500">{holding.stockCode}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {holding.quantity.toLocaleString()}주
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {formatCurrency(holding.averagePurchasePrice)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {formatCurrency(holding.currentPrice)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                      {formatCurrency(holding.evaluationAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <span className={getProfitLossColor(holding.profitLossAmount)}>
                        {formatCurrency(holding.profitLossAmount)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <span className={getProfitLossColor(holding.profitLossAmount)}>
                        {formatRate(holding.profitLossRate)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-600">총 {sortedHoldings.length}개 종목</p>
          </div>
        </div>
      )}
    </div>
  );
}
