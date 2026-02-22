// Market Screening API Route Tests
// SPEC-SCREENING-001: 시장 스크리닝 API 테스트
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/screening/market/route';

// Mock dependencies
vi.mock('@/lib/kis/config-repository', () => ({
  configRepository: {
    getConfig: vi.fn(),
  },
}));

const mockScreenMarket = vi.fn();
vi.mock('@/lib/screening/screening-service', () => ({
  MASScreeningService: vi.fn().mockImplementation(function () {
    return { screenMarket: mockScreenMarket };
  }),
}));

import { configRepository } from '@/lib/kis/config-repository';

describe('Market Screening API', () => {
  const mockConfig = {
    environment: 'real',
    app_key: 'test-app-key',
  };

  const mockScreeningResponse = {
    results: [
      {
        stockCode: '005930',
        stockName: '삼성전자',
        market: 'KOSPI' as const,
        marketCap: 500000,
        currentPrice: 75000,
        maPeriod: 20,
        currentMA: 73000,
        isAboveMA: true,
        breakthroughPrice: 72000,
        breakthroughDate: new Date('2024-01-15'),
        breakthroughReturnRate: 4.17,
        daysSinceBreakthrough: 5,
        calculatedAt: new Date(),
      },
      {
        stockCode: '000660',
        stockName: 'SK하이닉스',
        market: 'KOSPI' as const,
        marketCap: 300000,
        currentPrice: 150000,
        maPeriod: 20,
        currentMA: 148000,
        isAboveMA: true,
        breakthroughPrice: 145000,
        breakthroughDate: new Date('2024-01-14'),
        breakthroughReturnRate: 3.45,
        daysSinceBreakthrough: 6,
        calculatedAt: new Date(),
      },
    ],
    summary: {
      totalStocks: 2,
      breakthroughCount: 2,
      averageReturnRate: 3.81,
      screenedAt: new Date(),
      maPeriod: 20,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 400 when stockCodes is missing', async () => {
    const request = new NextRequest('http://localhost/api/screening/market', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('필수입니다');
  });

  it('should return 400 when stockCodes is not an array', async () => {
    const request = new NextRequest('http://localhost/api/screening/market', {
      method: 'POST',
      body: JSON.stringify({
        stockCodes: '005930',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('필수입니다');
  });

  it('should return 400 when stockCodes is empty', async () => {
    const request = new NextRequest('http://localhost/api/screening/market', {
      method: 'POST',
      body: JSON.stringify({
        stockCodes: [],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('비어있습니다');
  });

  it('should return 400 when stockCodes exceeds limit', async () => {
    const stockCodes = Array(101).fill('005930');

    const request = new NextRequest('http://localhost/api/screening/market', {
      method: 'POST',
      body: JSON.stringify({
        stockCodes,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('너무 많습니다');
    expect(data.error).toContain('100');
  });

  it('should return 400 when stock code format is invalid', async () => {
    const request = new NextRequest('http://localhost/api/screening/market', {
      method: 'POST',
      body: JSON.stringify({
        stockCodes: ['005930', 'invalid', '000660'],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('유효하지 않은 종목코드');
  });

  it('should return 400 when MA period is not supported', async () => {
    const request = new NextRequest('http://localhost/api/screening/market', {
      method: 'POST',
      body: JSON.stringify({
        stockCodes: ['005930'],
        maPeriod: 30,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('지원하지 않는 MA 기간');
  });

  it('should return 400 when KIS config is not found', async () => {
    vi.mocked(configRepository.getConfig).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/screening/market', {
      method: 'POST',
      body: JSON.stringify({
        stockCodes: ['005930'],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('KIS 연동이 필요합니다');
  });

  it('should remove duplicate stock codes', async () => {
    vi.mocked(configRepository.getConfig).mockResolvedValue(mockConfig);

    mockScreenMarket.mockResolvedValue(mockScreeningResponse);

    const request = new NextRequest('http://localhost/api/screening/market', {
      method: 'POST',
      body: JSON.stringify({
        stockCodes: ['005930', '005930', '000660'],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.meta.requestedCount).toBe(3);
    expect(data.meta.uniqueCount).toBe(2);
    expect(data.meta.duplicatesRemoved).toBe(1);
  });

  it('should return screening results', async () => {
    vi.mocked(configRepository.getConfig).mockResolvedValue(mockConfig);

    mockScreenMarket.mockResolvedValue(mockScreeningResponse);

    const request = new NextRequest('http://localhost/api/screening/market', {
      method: 'POST',
      body: JSON.stringify({
        stockCodes: ['005930', '000660'],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.results).toHaveLength(2);
    expect(data.data.summary.totalStocks).toBe(2);
    expect(data.data.summary.breakthroughCount).toBe(2);
  });

  it('should handle KIS authentication error', async () => {
    vi.mocked(configRepository.getConfig).mockResolvedValue(mockConfig);

    mockScreenMarket.mockRejectedValue({
      response: { status: 401 },
    });

    const request = new NextRequest('http://localhost/api/screening/market', {
      method: 'POST',
      body: JSON.stringify({
        stockCodes: ['005930'],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toContain('인증이 만료');
  });

  it('should handle rate limit error', async () => {
    vi.mocked(configRepository.getConfig).mockResolvedValue(mockConfig);

    mockScreenMarket.mockRejectedValue({
      response: { status: 429 },
    });

    const request = new NextRequest('http://localhost/api/screening/market', {
      method: 'POST',
      body: JSON.stringify({
        stockCodes: ['005930'],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toContain('요청이 너무 많습니다');
  });

  it('should handle too many stocks error from service', async () => {
    vi.mocked(configRepository.getConfig).mockResolvedValue(mockConfig);

    mockScreenMarket.mockRejectedValue(new Error('Too many stocks: 150. Maximum is 100.'));

    const request = new NextRequest('http://localhost/api/screening/market', {
      method: 'POST',
      body: JSON.stringify({
        stockCodes: ['005930'],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Too many stocks');
  });
});
