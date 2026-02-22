'use client';

import { useState } from 'react';
import type { StockCardData } from '@/lib/watchlist/types';

interface StockCardProps {
  stock: StockCardData;
  onRemove?: (stockCode: string) => void;
  onAddToWatchlist?: (stockCode: string, stockName: string) => void;
  showActions?: boolean;
}

/**
 * 주식 카드 컴포넌트
 * Stock card with price display and color coding
 */
export default function StockCard({
  stock,
  onRemove,
  onAddToWatchlist,
  showActions = true,
}: StockCardProps) {
  const [isLoading, setIsLoading] = useState(false);

  // 가격 방향에 따른 색상 결정
  const getPriceColor = () => {
    switch (stock.priceDirection) {
      case 'up':
        return 'text-red-600';
      case 'down':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  // 가격 방향에 따른 배경색 결정
  const getBgColor = () => {
    switch (stock.priceDirection) {
      case 'up':
        return 'bg-red-50';
      case 'down':
        return 'bg-blue-50';
      default:
        return 'bg-gray-50';
    }
  };

  const handleRemove = async () => {
    if (!onRemove || isLoading) return;

    setIsLoading(true);
    try {
      await onRemove(stock.stockCode);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToWatchlist = async () => {
    if (!onAddToWatchlist || isLoading) return;

    setIsLoading(true);
    try {
      await onAddToWatchlist(stock.stockCode, stock.stockName);
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('ko-KR');
  };

  const formatChangeRate = (rate: number) => {
    const sign = rate >= 0 ? '+' : '';
    return `${sign}${rate.toFixed(2)}%`;
  };

  return (
    <div className={`rounded-lg border p-4 ${getBgColor()} transition-shadow hover:shadow-md`}>
      <div className="flex items-start justify-between">
        {/* 왼쪽: 종목 정보 */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900">{stock.stockName}</h3>
            <span className="text-sm text-gray-500">{stock.stockCode}</span>
          </div>

          {/* 가격 정보 */}
          <div className="mt-2">
            <div className={`text-2xl font-bold ${getPriceColor()}`}>
              {stock.currentPrice > 0 ? `${formatPrice(stock.currentPrice)}원` : '-'}
            </div>

            {stock.currentPrice > 0 && (
              <div className={`mt-1 flex items-center gap-2 ${getPriceColor()}`}>
                <span className="text-sm">
                  {stock.changeAmount >= 0 ? '+' : ''}
                  {formatPrice(stock.changeAmount)}원
                </span>
                <span className="text-sm font-medium">{formatChangeRate(stock.changeRate)}</span>
              </div>
            )}
          </div>
        </div>

        {/* 오른쪽: 액션 버튼 */}
        {showActions && (
          <div className="ml-4 flex flex-col gap-2">
            {stock.isInWatchlist ? (
              <button
                onClick={handleRemove}
                disabled={isLoading}
                className="rounded px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
                title="관심종목에서 제거"
              >
                {isLoading ? '제거중...' : '제거'}
              </button>
            ) : (
              <button
                onClick={handleAddToWatchlist}
                disabled={isLoading}
                className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                title="관심종목에 추가"
              >
                {isLoading ? '추가중...' : '추가'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* 관심종목 표시 */}
      {stock.isInWatchlist && (
        <div className="mt-2">
          <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
            관심종목
          </span>
        </div>
      )}
    </div>
  );
}
