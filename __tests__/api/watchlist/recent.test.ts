// Recently Viewed API Route Tests
// SPEC-WATCHLIST-001: 최근 조회 종목 API 테스트
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ============================================================================
// Mock 설정 - vi.hoisted로 변수 호이스팅 보장
// ============================================================================

const { mockGetRecentlyViewedWithPrices, mockAddRecentlyViewed, mockClearRecentlyViewed } =
  vi.hoisted(() => ({
    mockGetRecentlyViewedWithPrices: vi.fn(),
    mockAddRecentlyViewed: vi.fn(),
    mockClearRecentlyViewed: vi.fn(),
  }));

// watchlistService mock
vi.mock('@/lib/watchlist/service', () => ({
  watchlistService: {
    getRecentlyViewedWithPrices: mockGetRecentlyViewedWithPrices,
  },
}));

// watchlistRepository mock
vi.mock('@/lib/watchlist/db', () => ({
  watchlistRepository: {
    addRecentlyViewed: mockAddRecentlyViewed,
    clearRecentlyViewed: mockClearRecentlyViewed,
  },
}));

// 라우트 핸들러 import (mock 선언 후)
import { GET, POST, DELETE } from '@/app/api/watchlist/recent/route';

// ============================================================================
// 테스트 데이터
// ============================================================================

const mockRecentlyViewedItem = {
  id: 1,
  stockCode: '005930',
  stockName: '삼성전자',
  viewedAt: new Date('2024-01-15'),
};

const mockStockCardDataList = [
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
    isInWatchlist: false,
  },
];

// ============================================================================
// GET /api/watchlist/recent 테스트
// ============================================================================

describe('GET /api/watchlist/recent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('최근 조회 종목을 성공적으로 조회해야 한다', async () => {
    mockGetRecentlyViewedWithPrices.mockResolvedValue(mockStockCardDataList);

    const request = new NextRequest('http://localhost/api/watchlist/recent');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(2);
    expect(data.data[0].stockCode).toBe('005930');
    expect(data.data[1].stockCode).toBe('000660');
    // 기본 limit 값(50)이 전달되어야 한다
    expect(mockGetRecentlyViewedWithPrices).toHaveBeenCalledWith(50);
  });

  it('limit 파라미터를 전달할 수 있어야 한다', async () => {
    mockGetRecentlyViewedWithPrices.mockResolvedValue(mockStockCardDataList.slice(0, 1));

    const request = new NextRequest('http://localhost/api/watchlist/recent?limit=10');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockGetRecentlyViewedWithPrices).toHaveBeenCalledWith(10);
  });

  it('최근 조회 종목이 없을 때 빈 배열을 반환해야 한다', async () => {
    mockGetRecentlyViewedWithPrices.mockResolvedValue([]);

    const request = new NextRequest('http://localhost/api/watchlist/recent');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(0);
  });

  it('KIS 설정이 없으면 400을 반환해야 한다', async () => {
    mockGetRecentlyViewedWithPrices.mockRejectedValue(new Error('KIS 연동이 필요합니다'));

    const request = new NextRequest('http://localhost/api/watchlist/recent');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('KIS');
  });

  it('일반 서버 에러 시 500을 반환해야 한다', async () => {
    mockGetRecentlyViewedWithPrices.mockRejectedValue(new Error('Database connection failed'));

    const request = new NextRequest('http://localhost/api/watchlist/recent');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('최근 조회 종목 조회에 실패했습니다');
  });
});

// ============================================================================
// POST /api/watchlist/recent 테스트
// ============================================================================

describe('POST /api/watchlist/recent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('최근 조회 종목을 성공적으로 추가해야 한다', async () => {
    mockAddRecentlyViewed.mockResolvedValue(mockRecentlyViewedItem);

    const request = new NextRequest('http://localhost/api/watchlist/recent', {
      method: 'POST',
      body: JSON.stringify({ stockCode: '005930', stockName: '삼성전자' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.stockCode).toBe('005930');
    expect(data.data.stockName).toBe('삼성전자');
    expect(mockAddRecentlyViewed).toHaveBeenCalledWith('005930', '삼성전자');
  });

  it('종목코드가 누락되면 400을 반환해야 한다', async () => {
    const request = new NextRequest('http://localhost/api/watchlist/recent', {
      method: 'POST',
      body: JSON.stringify({ stockName: '삼성전자' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('종목코드와 종목명이 필요합니다');
  });

  it('종목명이 누락되면 400을 반환해야 한다', async () => {
    const request = new NextRequest('http://localhost/api/watchlist/recent', {
      method: 'POST',
      body: JSON.stringify({ stockCode: '005930' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('종목코드와 종목명이 필요합니다');
  });

  it('종목코드와 종목명 모두 누락되면 400을 반환해야 한다', async () => {
    const request = new NextRequest('http://localhost/api/watchlist/recent', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('종목코드와 종목명이 필요합니다');
  });

  it('유효하지 않은 종목코드 형식이면 400을 반환해야 한다', async () => {
    const request = new NextRequest('http://localhost/api/watchlist/recent', {
      method: 'POST',
      body: JSON.stringify({ stockCode: '00593', stockName: '삼성전자' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('6자리 숫자');
  });

  it('유효하지 않은 종목코드 형식이면 400을 반환해야 한다 (7자리)', async () => {
    const request = new NextRequest('http://localhost/api/watchlist/recent', {
      method: 'POST',
      body: JSON.stringify({ stockCode: '0059300', stockName: '삼성전자' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('6자리 숫자');
  });

  it('repository 에러 시 500을 반환해야 한다', async () => {
    mockAddRecentlyViewed.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost/api/watchlist/recent', {
      method: 'POST',
      body: JSON.stringify({ stockCode: '005930', stockName: '삼성전자' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('최근 조회 종목 추가에 실패했습니다');
  });
});

// ============================================================================
// DELETE /api/watchlist/recent 테스트
// ============================================================================

describe('DELETE /api/watchlist/recent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('최근 조회 기록을 성공적으로 전체 삭제해야 한다', async () => {
    mockClearRecentlyViewed.mockResolvedValue(undefined);

    const response = await DELETE();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockClearRecentlyViewed).toHaveBeenCalled();
  });

  it('repository 에러 시 500을 반환해야 한다', async () => {
    mockClearRecentlyViewed.mockRejectedValue(new Error('Database error'));

    const response = await DELETE();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('최근 조회 기록 삭제에 실패했습니다');
  });
});
