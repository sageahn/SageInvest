// Watchlist Reorder API Route
// SPEC-WATCHLIST-001: 관심 종목 순서 변경
import { NextRequest, NextResponse } from 'next/server';
import { watchlistRepository } from '@/lib/watchlist/db';

/**
 * PUT /api/watchlist/reorder
 * 관심종목 순서 변경
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { itemIds } = body;

    // 입력값 검증
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json({ error: 'itemIds 배열이 필요합니다' }, { status: 400 });
    }

    // 모든 ID가 유효한 숫자인지 확인
    const validIds = itemIds.every((id) => typeof id === 'number' && !isNaN(id));
    if (!validIds) {
      return NextResponse.json({ error: '유효하지 않은 ID가 포함되어 있습니다' }, { status: 400 });
    }

    await watchlistRepository.reorderItems(itemIds);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to reorder watchlist:', error);
    return NextResponse.json({ error: '관심종목 순서 변경에 실패했습니다' }, { status: 500 });
  }
}
