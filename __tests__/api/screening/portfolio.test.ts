// Portfolio Screening API Route Tests
// SPEC-SCREENING-001: 포트폴리오 스크리닝 API 테스트
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/screening/portfolio/route';

// Mock dependencies
vi.mock('@/lib/kis/config-repository', () => ({
  configRepository: {
    getConfig: vi.fn(),
  },
}));

vi.mock('@/lib/kis/account-repository', () => ({
  accountRepository: {
    getDecryptedAccount: vi.fn(),
  },
}));

const mockGetBalance = vi.fn();
vi.mock('@/lib/kis/balance-service', () => ({
  KISBalanceService: vi.fn().mockImplementation(function () {
    return { getBalance: mockGetBalance };
  }),
}));

const mockScreenPortfolio = vi.fn();
vi.mock('@/lib/screening/screening-service', () => ({
  MASScreeningService: vi.fn().mockImplementation(function () {
    return { screenPortfolio: mockScreenPortfolio };
  }),
}));

import { configRepository } from '@/lib/kis/config-repository';

describe('Portfolio Screening API', () => {
  const mockConfig = {
    environment: 'mock' as const,
    app_key: 'test-app-key',
    app_secret: 'test-app-secret',
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockBalance = {
    stocks: [
      {
        stockCode: '005930',
        stockName: '삼성전자',
        quantity: 10,
        avgPrice: 70000,
        currentPrice: 75000,
        evaluationAmount: 750000,
        returnRate: 7.14,
      },
    ],
    totalEvaluation: 750000,
    totalPurchase: 700000,
    totalReturn: 50000,
    totalReturnRate: 7.14,
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
    ],
    summary: {
      totalStocks: 1,
      breakthroughCount: 1,
      averageReturnRate: 4.17,
      screenedAt: new Date(),
      maPeriod: 20,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 400 when required parameters are missing', async () => {
    const request = new NextRequest('http://localhost/api/screening/portfolio', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('필수입니다');
  });

  it('should return 400 when account number format is invalid', async () => {
    const request = new NextRequest('http://localhost/api/screening/portfolio', {
      method: 'POST',
      body: JSON.stringify({
        cano: '1234567', // 7 digits instead of 8
        acntPrdtCd: '01',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('8자리 숫자');
  });

  it('should return 400 when product code format is invalid', async () => {
    const request = new NextRequest('http://localhost/api/screening/portfolio', {
      method: 'POST',
      body: JSON.stringify({
        cano: '12345678',
        acntPrdtCd: '1', // 1 digit instead of 2
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('2자리 숫자');
  });

  it('should return 400 when MA period is not supported', async () => {
    const request = new NextRequest('http://localhost/api/screening/portfolio', {
      method: 'POST',
      body: JSON.stringify({
        cano: '12345678',
        acntPrdtCd: '01',
        maPeriod: 30, // Unsupported period
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('지원하지 않는 MA 기간');
  });

  it('should return 400 when KIS config is not found', async () => {
    vi.mocked(configRepository.getConfig).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/screening/portfolio', {
      method: 'POST',
      body: JSON.stringify({
        cano: '12345678',
        acntPrdtCd: '01',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('KIS 연동이 필요합니다');
  });

  it('should return empty results when no stocks are held', async () => {
    vi.mocked(configRepository.getConfig).mockResolvedValue(mockConfig);

    mockGetBalance.mockResolvedValue({
      stocks: [],
      totalEvaluation: 0,
      totalPurchase: 0,
      totalReturn: 0,
      totalReturnRate: 0,
    });

    const request = new NextRequest('http://localhost/api/screening/portfolio', {
      method: 'POST',
      body: JSON.stringify({
        cano: '12345678',
        acntPrdtCd: '01',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.results).toHaveLength(0);
    expect(data.message).toContain('보유 종목이 없습니다');
  });

  it('should return screening results for portfolio', async () => {
    vi.mocked(configRepository.getConfig).mockResolvedValue(mockConfig);

    mockGetBalance.mockResolvedValue(mockBalance);
    mockScreenPortfolio.mockResolvedValue(mockScreeningResponse);

    const request = new NextRequest('http://localhost/api/screening/portfolio', {
      method: 'POST',
      body: JSON.stringify({
        cano: '12345678',
        acntPrdtCd: '01',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.results).toHaveLength(1);
    expect(data.data.summary.totalStocks).toBe(1);
    expect(data.data.summary.breakthroughCount).toBe(1);
  });

  it('should handle KIS authentication error', async () => {
    vi.mocked(configRepository.getConfig).mockResolvedValue(mockConfig);

    mockGetBalance.mockRejectedValue({
      response: { status: 401 },
    });

    const request = new NextRequest('http://localhost/api/screening/portfolio', {
      method: 'POST',
      body: JSON.stringify({
        cano: '12345678',
        acntPrdtCd: '01',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toContain('인증이 만료');
  });

  it('should handle rate limit error', async () => {
    vi.mocked(configRepository.getConfig).mockResolvedValue(mockConfig);

    mockGetBalance.mockRejectedValue({
      response: { status: 429 },
    });

    const request = new NextRequest('http://localhost/api/screening/portfolio', {
      method: 'POST',
      body: JSON.stringify({
        cano: '12345678',
        acntPrdtCd: '01',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toContain('요청이 너무 많습니다');
  });
});
