// Watchlist Item by Stock Code API Route
// SPEC-WATCHLIST-001: 관심 종목 삭제 (종목코드 기반)
import { NextRequest, NextResponse } from 'next/server';
import { watchlistRepository } from '@/lib/watchlist/db';

/**
 * DELETE /api/watchlist/code/[code]
 * 종목코드로 관심종목 삭제
 */
export async function DELETE(_request: NextRequest, { params }: { params: { code: string } }) {
  try {
    const stockCode = params.code;

    if (!stockCode || !/^\d{6}$/.test(stockCode)) {
      return NextResponse.json({ error: '유효하지 않은 종목코드입니다' }, { status: 400 });
    }

    await watchlistRepository.removeItemByCode(stockCode);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to remove watchlist item:', error);
    return NextResponse.json({ error: '관심종목 삭제에 실패했습니다' }, { status: 500 });
  }
}
