'use client';

import { useState, useEffect, useCallback } from 'react';
import StockCard from './StockCard';
import { usePolling } from './usePolling';
import type { StockCardData } from '@/lib/watchlist/types';

/** 폴링 간격: 30초 */
const POLLING_INTERVAL_MS = 30_000;

/**
 * 상대 시간 포맷 (예: "방금 전", "15초 전", "3분 전")
 */
function getRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 10) return '방금 전';
  if (seconds < 60) return `${seconds}초 전`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}분 전`;
  return `${Math.floor(seconds / 3600)}시간 전`;
}

/**
 * 최근 조회 탭
 * Recently viewed stocks tab with price display and auto-refresh polling
 */
export default function RecentlyViewedTab() {
  const [stocks, setStocks] = useState<StockCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // 가격 업데이트 실패 시 경고 배너 표시 여부
  const [priceError, setPriceError] = useState(false);
  // 상대 시간 표시 갱신용
  const [, setTick] = useState(0);

  // 초기 로딩 (스피너 표시)
  const fetchRecentlyViewed = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/watchlist/recent');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '조회에 실패했습니다');
      }

      setStocks(data.data || []);
      setPriceError(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 사일런트 가격 갱신 (스피너 없이 데이터만 업데이트)
  const refreshPrices = useCallback(async () => {
    try {
      const response = await fetch('/api/watchlist/recent');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '가격 업데이트에 실패했습니다');
      }

      setStocks(data.data || []);
      setPriceError(false);
    } catch {
      // 실패 시 기존 데이터 유지, 경고 배너 표시
      setPriceError(true);
    }
  }, []);

  // 30초 자동 갱신 폴링
  const { lastUpdated, resetTimer } = usePolling(
    refreshPrices,
    POLLING_INTERVAL_MS,
    !isLoading && stocks.length > 0
  );

  useEffect(() => {
    fetchRecentlyViewed();
  }, [fetchRecentlyViewed]);

  // 상대 시간 표시를 10초마다 갱신
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 10_000);
    return () => clearInterval(timer);
  }, []);

  // 수동 새로고침 (타이머 리셋 포함)
  const handleManualRefresh = async () => {
    await refreshPrices();
    resetTimer();
  };

  // 가격 에러 배너에서 다시 시도
  const handleRetryPriceUpdate = async () => {
    await refreshPrices();
    resetTimer();
  };

  const handleAddToWatchlist = async (stockCode: string, stockName: string) => {
    try {
      const response = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stockCode, stockName }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '추가에 실패했습니다');
      }

      // 목록 새로고침
      await fetchRecentlyViewed();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">불러오는 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-red-600">{error}</p>
        <button
          onClick={fetchRecentlyViewed}
          className="mt-2 text-sm text-red-600 underline hover:no-underline"
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (stocks.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
        <p className="text-gray-500">최근 조회한 종목이 없습니다</p>
        <p className="mt-2 text-sm text-gray-400">종목을 검색하거나 조회하면 이곳에 표시됩니다</p>
      </div>
    );
  }

  return (
    <div>
      {/* 가격 업데이트 실패 경고 배너 */}
      {priceError && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3">
          <p className="text-sm text-yellow-800">
            가격 업데이트에 실패했습니다. 마지막 저장된 가격을 표시합니다.
          </p>
          <button
            onClick={handleRetryPriceUpdate}
            className="ml-4 whitespace-nowrap rounded bg-yellow-200 px-3 py-1 text-sm font-medium text-yellow-900 hover:bg-yellow-300"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* 헤더 */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-sm text-gray-500">최근 {stocks.length}개 종목</p>
          {lastUpdated && (
            <span className="text-xs text-gray-400">
              마지막 업데이트: {getRelativeTime(lastUpdated)}
            </span>
          )}
        </div>
        <button onClick={handleManualRefresh} className="text-sm text-blue-600 hover:underline">
          새로고침
        </button>
      </div>

      {/* 종목 카드 그리드 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stocks.map((stock) => (
          <StockCard
            key={stock.stockCode}
            stock={stock}
            onAddToWatchlist={!stock.isInWatchlist ? handleAddToWatchlist : undefined}
            showActions={!stock.isInWatchlist}
          />
        ))}
      </div>
    </div>
  );
}
