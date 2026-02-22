// Watchlist Item API Route
// SPEC-WATCHLIST-001: 관심 종목 삭제
import { NextRequest, NextResponse } from 'next/server';
import { watchlistRepository } from '@/lib/watchlist/db';

/**
 * DELETE /api/watchlist/[id]
 * 관심종목 삭제
 */
export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id, 10);

    if (isNaN(id)) {
      return NextResponse.json({ error: '유효하지 않은 ID입니다' }, { status: 400 });
    }

    await watchlistRepository.removeItem(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to remove watchlist item:', error);
    return NextResponse.json({ error: '관심종목 삭제에 실패했습니다' }, { status: 500 });
  }
}
