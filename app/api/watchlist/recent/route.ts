// Recently Viewed API Route
// SPEC-WATCHLIST-001: 최근 조회 종목 API - GET (list), POST (add)
import { NextRequest, NextResponse } from 'next/server';
import { watchlistService } from '@/lib/watchlist/service';
import { watchlistRepository } from '@/lib/watchlist/db';

/**
 * GET /api/watchlist/recent
 * 최근 조회 종목 목록 (현재가 포함)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const items = await watchlistService.getRecentlyViewedWithPrices(limit);
    return NextResponse.json({ success: true, data: items });
  } catch (error: any) {
    console.error('Failed to get recently viewed:', error);

    if (error.message.includes('KIS')) {
      return NextResponse.json({ error: 'KIS 연동이 필요합니다' }, { status: 400 });
    }

    return NextResponse.json({ error: '최근 조회 종목 조회에 실패했습니다' }, { status: 500 });
  }
}

/**
 * POST /api/watchlist/recent
 * 최근 조회 종목 추가
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

    const item = await watchlistRepository.addRecentlyViewed(stockCode, stockName);
    return NextResponse.json({ success: true, data: item });
  } catch (error: any) {
    console.error('Failed to add recently viewed:', error);
    return NextResponse.json({ error: '최근 조회 종목 추가에 실패했습니다' }, { status: 500 });
  }
}

/**
 * DELETE /api/watchlist/recent
 * 최근 조회 기록 전체 삭제
 */
export async function DELETE() {
  try {
    await watchlistRepository.clearRecentlyViewed();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to clear recently viewed:', error);
    return NextResponse.json({ error: '최근 조회 기록 삭제에 실패했습니다' }, { status: 500 });
  }
}
