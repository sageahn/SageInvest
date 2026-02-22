// Watchlist API Route Tests
// SPEC-WATCHLIST-001: 관심 종목 CRUD API 테스트
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ============================================================================
// Mock 설정 - vi.hoisted로 변수 호이스팅 보장
// ============================================================================

const {
  mockGetAllWatchlistWithPrices,
  mockAddItem,
  mockRemoveItem,
  mockReorderItems,
  mockRemoveItemByCode,
} = vi.hoisted(() => ({
  mockGetAllWatchlistWithPrices: vi.fn(),
  mockAddItem: vi.fn(),
  mockRemoveItem: vi.fn(),
  mockReorderItems: vi.fn(),
  mockRemoveItemByCode: vi.fn(),
}));

// watchlistService mock
vi.mock('@/lib/watchlist/service', () => ({
  watchlistService: {
    getAllWatchlistWithPrices: mockGetAllWatchlistWithPrices,
  },
}));

// watchlistRepository mock
vi.mock('@/lib/watchlist/db', () => ({
  watchlistRepository: {
    addItem: mockAddItem,
    removeItem: mockRemoveItem,
    reorderItems: mockReorderItems,
    removeItemByCode: mockRemoveItemByCode,
  },
}));

// 라우트 핸들러 import (mock 선언 후)
import { GET, POST } from '@/app/api/watchlist/route';
import { DELETE as DELETE_BY_ID } from '@/app/api/watchlist/[id]/route';
import { PUT as REORDER } from '@/app/api/watchlist/reorder/route';
import { DELETE as DELETE_BY_CODE } from '@/app/api/watchlist/code/[code]/route';

// ============================================================================
// 테스트 데이터
// ============================================================================

const mockWatchlistItem = {
  id: 1,
  stockCode: '005930',
  stockName: '삼성전자',
  groupId: null,
  ordering: 0,
  addedAt: new Date('2024-01-15'),
};

const mockStockCardData = [
  {
    stockCode: '005930',
    stockName: '삼성전자',
    currentPrice: 75000,
    changeAmount: 1500,
    changeRate: 2.04,
    priceDirection: 'up' as const,
    isInWatchlist: true,
  },
  {
    stockCode: '000660',
    stockName: 'SK하이닉스',
    currentPrice: 150000,
    changeAmount: -2000,
    changeRate: -1.32,
    priceDirection: 'down' as const,
    isInWatchlist: true,
  },
];

// ============================================================================
// GET /api/watchlist 테스트
// ============================================================================

describe('GET /api/watchlist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('관심종목 목록을 성공적으로 조회해야 한다', async () => {
    mockGetAllWatchlistWithPrices.mockResolvedValue(mockStockCardData);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(2);
    expect(data.data[0].stockCode).toBe('005930');
    expect(data.data[1].stockCode).toBe('000660');
  });

  it('관심종목이 없을 때 빈 배열을 반환해야 한다', async () => {
    mockGetAllWatchlistWithPrices.mockResolvedValue([]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(0);
  });

  it('KIS 설정이 없으면 400을 반환해야 한다', async () => {
    mockGetAllWatchlistWithPrices.mockRejectedValue(new Error('KIS 연동이 필요합니다'));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('KIS');
  });

  it('일반 서버 에러 시 500을 반환해야 한다', async () => {
    mockGetAllWatchlistWithPrices.mockRejectedValue(new Error('Database connection failed'));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('관심종목 조회에 실패했습니다');
  });
});

// ============================================================================
// POST /api/watchlist 테스트
// ============================================================================

describe('POST /api/watchlist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('관심종목을 성공적으로 추가해야 한다', async () => {
    mockAddItem.mockResolvedValue(mockWatchlistItem);

    const request = new NextRequest('http://localhost/api/watchlist', {
      method: 'POST',
      body: JSON.stringify({ stockCode: '005930', stockName: '삼성전자' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.stockCode).toBe('005930');
    expect(data.data.stockName).toBe('삼성전자');
    expect(mockAddItem).toHaveBeenCalledWith('005930', '삼성전자');
  });

  it('종목코드가 누락되면 400을 반환해야 한다', async () => {
    const request = new NextRequest('http://localhost/api/watchlist', {
      method: 'POST',
      body: JSON.stringify({ stockName: '삼성전자' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('종목코드와 종목명이 필요합니다');
  });

  it('종목명이 누락되면 400을 반환해야 한다', async () => {
    const request = new NextRequest('http://localhost/api/watchlist', {
      method: 'POST',
      body: JSON.stringify({ stockCode: '005930' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('종목코드와 종목명이 필요합니다');
  });

  it('종목코드와 종목명 모두 누락되면 400을 반환해야 한다', async () => {
    const request = new NextRequest('http://localhost/api/watchlist', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('종목코드와 종목명이 필요합니다');
  });

  it('유효하지 않은 종목코드 형식이면 400을 반환해야 한다 (5자리)', async () => {
    const request = new NextRequest('http://localhost/api/watchlist', {
      method: 'POST',
      body: JSON.stringify({ stockCode: '00593', stockName: '삼성전자' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('6자리 숫자');
  });

  it('유효하지 않은 종목코드 형식이면 400을 반환해야 한다 (문자 포함)', async () => {
    const request = new NextRequest('http://localhost/api/watchlist', {
      method: 'POST',
      body: JSON.stringify({ stockCode: 'ABCDEF', stockName: '삼성전자' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('6자리 숫자');
  });

  it('repository 에러 시 500을 반환해야 한다', async () => {
    mockAddItem.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost/api/watchlist', {
      method: 'POST',
      body: JSON.stringify({ stockCode: '005930', stockName: '삼성전자' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('관심종목 추가에 실패했습니다');
  });
});

// ============================================================================
// DELETE /api/watchlist/[id] 테스트
// ============================================================================

describe('DELETE /api/watchlist/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('관심종목을 성공적으로 삭제해야 한다', async () => {
    mockRemoveItem.mockResolvedValue(undefined);

    const request = new NextRequest('http://localhost/api/watchlist/1', {
      method: 'DELETE',
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await DELETE_BY_ID(request, { params: { id: '1' } } as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockRemoveItem).toHaveBeenCalledWith(1);
  });

  it('유효하지 않은 ID이면 400을 반환해야 한다', async () => {
    const request = new NextRequest('http://localhost/api/watchlist/abc', {
      method: 'DELETE',
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await DELETE_BY_ID(request, { params: { id: 'abc' } } as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('유효하지 않은 ID');
  });

  it('repository 에러 시 500을 반환해야 한다', async () => {
    mockRemoveItem.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost/api/watchlist/1', {
      method: 'DELETE',
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await DELETE_BY_ID(request, { params: { id: '1' } } as any);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('관심종목 삭제에 실패했습니다');
  });
});

// ============================================================================
// PUT /api/watchlist/reorder 테스트
// ============================================================================

describe('PUT /api/watchlist/reorder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('관심종목 순서를 성공적으로 변경해야 한다', async () => {
    mockReorderItems.mockResolvedValue(undefined);

    const request = new NextRequest('http://localhost/api/watchlist/reorder', {
      method: 'PUT',
      body: JSON.stringify({ itemIds: [3, 1, 2] }),
    });

    const response = await REORDER(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockReorderItems).toHaveBeenCalledWith([3, 1, 2]);
  });

  it('itemIds가 누락되면 400을 반환해야 한다', async () => {
    const request = new NextRequest('http://localhost/api/watchlist/reorder', {
      method: 'PUT',
      body: JSON.stringify({}),
    });

    const response = await REORDER(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('itemIds 배열이 필요합니다');
  });

  it('itemIds가 빈 배열이면 400을 반환해야 한다', async () => {
    const request = new NextRequest('http://localhost/api/watchlist/reorder', {
      method: 'PUT',
      body: JSON.stringify({ itemIds: [] }),
    });

    const response = await REORDER(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('itemIds 배열이 필요합니다');
  });

  it('itemIds가 배열이 아니면 400을 반환해야 한다', async () => {
    const request = new NextRequest('http://localhost/api/watchlist/reorder', {
      method: 'PUT',
      body: JSON.stringify({ itemIds: 'not-an-array' }),
    });

    const response = await REORDER(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('itemIds 배열이 필요합니다');
  });

  it('itemIds에 유효하지 않은 값이 포함되면 400을 반환해야 한다', async () => {
    const request = new NextRequest('http://localhost/api/watchlist/reorder', {
      method: 'PUT',
      body: JSON.stringify({ itemIds: [1, 'abc', 3] }),
    });

    const response = await REORDER(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('유효하지 않은 ID가 포함되어 있습니다');
  });

  it('repository 에러 시 500을 반환해야 한다', async () => {
    mockReorderItems.mockRejectedValue(new Error('Transaction failed'));

    const request = new NextRequest('http://localhost/api/watchlist/reorder', {
      method: 'PUT',
      body: JSON.stringify({ itemIds: [1, 2, 3] }),
    });

    const response = await REORDER(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('관심종목 순서 변경에 실패했습니다');
  });
});

// ============================================================================
// DELETE /api/watchlist/code/[code] 테스트
// ============================================================================

describe('DELETE /api/watchlist/code/[code]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('종목코드로 관심종목을 성공적으로 삭제해야 한다', async () => {
    mockRemoveItemByCode.mockResolvedValue(undefined);

    const request = new NextRequest('http://localhost/api/watchlist/code/005930', {
      method: 'DELETE',
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await DELETE_BY_CODE(request, { params: { code: '005930' } } as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockRemoveItemByCode).toHaveBeenCalledWith('005930');
  });

  it('유효하지 않은 종목코드이면 400을 반환해야 한다 (5자리)', async () => {
    const request = new NextRequest('http://localhost/api/watchlist/code/00593', {
      method: 'DELETE',
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await DELETE_BY_CODE(request, { params: { code: '00593' } } as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('유효하지 않은 종목코드');
  });

  it('유효하지 않은 종목코드이면 400을 반환해야 한다 (문자 포함)', async () => {
    const request = new NextRequest('http://localhost/api/watchlist/code/ABCDEF', {
      method: 'DELETE',
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await DELETE_BY_CODE(request, { params: { code: 'ABCDEF' } } as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('유효하지 않은 종목코드');
  });

  it('빈 종목코드이면 400을 반환해야 한다', async () => {
    const request = new NextRequest('http://localhost/api/watchlist/code/', {
      method: 'DELETE',
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await DELETE_BY_CODE(request, { params: { code: '' } } as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('유효하지 않은 종목코드');
  });

  it('repository 에러 시 500을 반환해야 한다', async () => {
    mockRemoveItemByCode.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost/api/watchlist/code/005930', {
      method: 'DELETE',
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await DELETE_BY_CODE(request, { params: { code: '005930' } } as any);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('관심종목 삭제에 실패했습니다');
  });
});
