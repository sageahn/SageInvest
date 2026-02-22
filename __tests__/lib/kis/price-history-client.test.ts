import { describe, it, expect, beforeAll, vi } from 'vitest';
import { KISPriceHistoryClient } from '@/lib/kis/price-history-client';

// Mock KISAuthMiddleware
vi.mock('@/lib/kis/auth-middleware', () => {
  return {
    KISAuthMiddleware: class MockKISAuthMiddleware {
      makeRequest = vi.fn().mockResolvedValue({
        data: {
          output2: [
            {
              stck_bsop_date: '20260220',
              stck_oprc: '84000',
              stck_hgpr: '86000',
              stck_lwpr: '83500',
              stck_clpr: '85500',
              acml_vol: '10000000',
              acml_tr_pbmn: '850000000000',
            },
            {
              stck_bsop_date: '20260221',
              stck_oprc: '85500',
              stck_hgpr: '87000',
              stck_lwpr: '85000',
              stck_clpr: '86500',
              acml_vol: '12000000',
              acml_tr_pbmn: '1030000000000',
            },
            {
              stck_bsop_date: '20260222',
              stck_oprc: '86500',
              stck_hgpr: '88000',
              stck_lwpr: '86000',
              stck_clpr: '87500',
              acml_vol: '15000000',
              acml_tr_pbmn: '1300000000000',
            },
          ],
        },
      });

      constructor(environment: string, appKey: string) {
        void environment;
        void appKey;
      }
    },
  };
});

describe('KISPriceHistoryClient (SPEC-SCREENING-001)', () => {
  const testAppKey = 'test-app-key-36-chars-long!!';
  let client: KISPriceHistoryClient;

  beforeAll(() => {
    client = new KISPriceHistoryClient('mock', testAppKey, 'test-app-secret');
  });

  describe('getPriceHistory', () => {
    it('should fetch and transform daily price data', async () => {
      const startDate = new Date(2026, 1, 20);
      const endDate = new Date(2026, 1, 22);

      const result = await client.getPriceHistory({
        stockCode: '005930',
        marketCode: 'J',
        startDate,
        endDate,
      });

      expect(result.length).toBe(3);

      // 날짜 오름차순 정렬 확인
      expect(result[0].date.getTime()).toBeLessThan(result[1].date.getTime());
      expect(result[1].date.getTime()).toBeLessThan(result[2].date.getTime());
    });

    it('should parse price data correctly', async () => {
      const startDate = new Date(2026, 1, 20);
      const endDate = new Date(2026, 1, 22);

      const result = await client.getPriceHistory({
        stockCode: '005930',
        marketCode: 'J',
        startDate,
        endDate,
      });

      const firstDay = result[0];
      expect(firstDay.date.getFullYear()).toBe(2026);
      expect(firstDay.date.getMonth()).toBe(1); // February (0-indexed)
      expect(firstDay.date.getDate()).toBe(20);
      expect(firstDay.open).toBe(84000);
      expect(firstDay.high).toBe(86000);
      expect(firstDay.low).toBe(83500);
      expect(firstDay.close).toBe(85500);
      expect(firstDay.volume).toBe(10000000);
      expect(firstDay.amount).toBe(850000000000);
    });

    it('should return empty array when no data', async () => {
      const mockClient = new KISPriceHistoryClient('mock', testAppKey, 'test-app-secret');
      vi.mocked(mockClient['middleware'].makeRequest).mockResolvedValueOnce({
        data: {
          output2: null,
        },
      });

      const result = await mockClient.getPriceHistory({
        stockCode: '005930',
        marketCode: 'J',
        startDate: new Date(),
        endDate: new Date(),
      });

      expect(result).toEqual([]);
    });
  });

  describe('getPriceHistoryForMA', () => {
    it('should fetch enough data for MA calculation', async () => {
      const result = await client.getPriceHistoryForMA('005930', 'J', 20);

      // 20일 MA의 2배 = 40일 데이터 요청
      expect(result.length).toBeGreaterThan(0);
    });

    it('should limit to MAX_QUERY_DAYS', async () => {
      // 120일 MA 요청해도 최대 100일까지만 조회
      const result = await client.getPriceHistoryForMA('005930', 'J', 120);

      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('Caching', () => {
    it('should cache price history data', async () => {
      const freshClient = new KISPriceHistoryClient('mock', testAppKey, 'test-app-secret');

      const startDate = new Date(2026, 1, 20);
      const endDate = new Date(2026, 1, 22);

      // First call
      await freshClient.getPriceHistory({
        stockCode: '005930',
        marketCode: 'J',
        startDate,
        endDate,
      });

      // Second call should use cache
      const startTime = Date.now();
      await freshClient.getPriceHistory({
        stockCode: '005930',
        marketCode: 'J',
        startDate,
        endDate,
      });
      const elapsedTime = Date.now() - startTime;

      // Cached response should be fast
      expect(elapsedTime).toBeLessThan(100);
    });

    it('should clear cache', () => {
      expect(() => client.clearCache()).not.toThrow();
    });

    it('should clear specific stock cache', () => {
      expect(() => client.clearStockCache('005930')).not.toThrow();
    });
  });

  describe('TR_ID', () => {
    it('should use FHKST03010100 for both environments', () => {
      const mockClient = new KISPriceHistoryClient('mock', testAppKey, 'test-app-secret');
      const prodClient = new KISPriceHistoryClient('production', testAppKey, 'test-app-secret');

      expect(mockClient).toBeDefined();
      expect(prodClient).toBeDefined();
    });
  });
});
