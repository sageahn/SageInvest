// Single Stock Screening API Route Tests
// SPEC-SCREENING-001: 단일 종목 스크리닝 API 테스트
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/screening/stock/[code]/route';

// Mock dependencies
vi.mock('@/lib/kis/config-repository', () => ({
  configRepository: {
    getConfig: vi.fn(),
  },
}));

const mockScreenSingleStock = vi.fn();
vi.mock('@/lib/screening/screening-service', () => ({
  MASScreeningService: vi.fn().mockImplementation(function () {
    return { screenSingleStock: mockScreenSingleStock };
  }),
}));

import { configRepository } from '@/lib/kis/config-repository';

describe('Single Stock Screening API', () => {
  const mockConfig = {
    environment: 'mock' as const,
    app_key: 'test-app-key',
    app_secret: 'test-app-secret',
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockScreeningResult = {
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
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 400 when stock code format is invalid', async () => {
    const request = new NextRequest('http://localhost/api/screening/stock/invalid');
    const params = Promise.resolve({ code: 'invalid' });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('6자리 숫자');
  });

  it('should return 400 when stock code has less than 6 digits', async () => {
    const request = new NextRequest('http://localhost/api/screening/stock/00593');
    const params = Promise.resolve({ code: '00593' });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('6자리 숫자');
  });

  it('should return 400 when stock code has more than 6 digits', async () => {
    const request = new NextRequest('http://localhost/api/screening/stock/0059300');
    const params = Promise.resolve({ code: '0059300' });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('6자리 숫자');
  });

  it('should return 400 when MA period is not supported', async () => {
    const request = new NextRequest('http://localhost/api/screening/stock/005930?maPeriod=30');
    const params = Promise.resolve({ code: '005930' });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('지원하지 않는 MA 기간');
  });

  it('should return 400 when KIS config is not found', async () => {
    vi.mocked(configRepository.getConfig).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/screening/stock/005930');
    const params = Promise.resolve({ code: '005930' });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('KIS 연동이 필요합니다');
  });

  it('should return screening result for valid stock', async () => {
    vi.mocked(configRepository.getConfig).mockResolvedValue(mockConfig);

    mockScreenSingleStock.mockResolvedValue(mockScreeningResult);

    const request = new NextRequest('http://localhost/api/screening/stock/005930');
    const params = Promise.resolve({ code: '005930' });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.result).not.toBeNull();
    expect(data.data.result.stockCode).toBe('005930');
    expect(data.data.result.stockName).toBe('삼성전자');
    expect(data.data.result.isAboveMA).toBe(true);
  });

  it('should return null result when stock does not meet breakthrough criteria', async () => {
    vi.mocked(configRepository.getConfig).mockResolvedValue(mockConfig);

    mockScreenSingleStock.mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/screening/stock/005930');
    const params = Promise.resolve({ code: '005930' });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.result).toBeNull();
    expect(data.data.message).toContain('돌파 조건을 만족하지 않습니다');
  });

  it('should use custom MA period from query parameter', async () => {
    vi.mocked(configRepository.getConfig).mockResolvedValue(mockConfig);

    mockScreenSingleStock.mockResolvedValue({
      ...mockScreeningResult,
      maPeriod: 60,
    });

    const request = new NextRequest('http://localhost/api/screening/stock/005930?maPeriod=60');
    const params = Promise.resolve({ code: '005930' });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.result.maPeriod).toBe(60);
  });

  it('should handle KIS authentication error', async () => {
    vi.mocked(configRepository.getConfig).mockResolvedValue(mockConfig);

    mockScreenSingleStock.mockRejectedValue({
      response: { status: 401 },
    });

    const request = new NextRequest('http://localhost/api/screening/stock/005930');
    const params = Promise.resolve({ code: '005930' });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toContain('인증이 만료');
  });

  it('should handle rate limit error', async () => {
    vi.mocked(configRepository.getConfig).mockResolvedValue(mockConfig);

    mockScreenSingleStock.mockRejectedValue({
      response: { status: 429 },
    });

    const request = new NextRequest('http://localhost/api/screening/stock/005930');
    const params = Promise.resolve({ code: '005930' });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toContain('요청이 너무 많습니다');
  });

  it('should handle invalid stock code error', async () => {
    vi.mocked(configRepository.getConfig).mockResolvedValue(mockConfig);

    mockScreenSingleStock.mockRejectedValue(new Error('유효하지 않은 종목코드입니다'));

    const request = new NextRequest('http://localhost/api/screening/stock/005930');
    const params = Promise.resolve({ code: '005930' });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('유효하지 않은 종목코드');
  });

  it('should handle general server errors', async () => {
    vi.mocked(configRepository.getConfig).mockResolvedValue(mockConfig);

    mockScreenSingleStock.mockRejectedValue(new Error('Network error'));

    const request = new NextRequest('http://localhost/api/screening/stock/005930');
    const params = Promise.resolve({ code: '005930' });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('단일 종목 스크리닝에 실패했습니다');
  });
});
