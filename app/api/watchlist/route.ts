// Watchlist API Route
// SPEC-WATCHLIST-001: 관심 종목 API - GET (list), POST (add)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { watchlistService } from '@/lib/watchlist/service';
import { watchlistRepository } from '@/lib/watchlist/db';

/**
 * GET /api/watchlist
 * 모든 관심종목 조회 (현재가 포함)
 */
export async function GET() {
  try {
    const items = await watchlistService.getAllWatchlistWithPrices();
    return NextResponse.json({ success: true, data: items });
  } catch (error: any) {
    console.error('Failed to get watchlist:', error);

    if (error.message.includes('KIS')) {
      return NextResponse.json({ error: 'KIS 연동이 필요합니다' }, { status: 400 });
    }

    return NextResponse.json({ error: '관심종목 조회에 실패했습니다' }, { status: 500 });
  }
}

/**
 * POST /api/watchlist
 * 관심종목 추가
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { stockCode, stockName } = body;

    // 입력값 검증
    if (!stockCode || !stockName) {
      return NextResponse.json({ error: '종목코드와 종목명이 필요합니다' }, { status: 400 });
    }

    if (!/^\d{6}$/.test(stockCode)) {
      return NextResponse.json({ error: '종목코드는 6자리 숫자여야 합니다' }, { status: 400 });
    }

    const item = await watchlistRepository.addItem(stockCode, stockName);
    return NextResponse.json({ success: true, data: item });
  } catch (error: any) {
    console.error('Failed to add watchlist item:', error);
    return NextResponse.json({ error: '관심종목 추가에 실패했습니다' }, { status: 500 });
  }
}
