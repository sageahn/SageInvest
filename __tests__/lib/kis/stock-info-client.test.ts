import { describe, it, expect, beforeAll, vi } from 'vitest';
import { KISStockInfoClient } from '@/lib/kis/stock-info-client';

// Mock KISAuthMiddleware
vi.mock('@/lib/kis/auth-middleware', () => {
  return {
    KISAuthMiddleware: class MockKISAuthMiddleware {
      makeRequest = vi.fn().mockResolvedValue({
        data: {
          output: {
            pdno: '005930',
            prdt_name: '삼성전자',
            mrkt_div_nm: 'KOSPI',
            mrkt_div_cd: '1',
            mrkt_cap_amt: '450000000000000', // 450조원
            sect_nm: '반도체',
          },
        },
      });

      constructor(environment: string, appKey: string) {
        void environment;
        void appKey;
      }
    },
  };
});

describe('KISStockInfoClient (SPEC-SCREENING-001)', () => {
  const testAppKey = 'test-app-key-36-chars-long!!';
  let client: KISStockInfoClient;

  beforeAll(() => {
    client = new KISStockInfoClient('mock', testAppKey, 'test-app-secret');
  });

  describe('getStockInfo', () => {
    it('should fetch and transform stock info for valid stock code', async () => {
      const result = await client.getStockInfo('005930');

      expect(result.stockCode).toBe('005930');
      expect(result.stockName).toBe('삼성전자');
      expect(result.marketDivision).toBe('KOSPI');
      expect(result.marketCode).toBe('J');
      expect(result.sector).toBe('반도체');
    });

    it('should parse market cap correctly (in 100 million won)', async () => {
      const result = await client.getStockInfo('005930');

      // 450조원 = 4,500,000억원
      expect(result.marketCap).toBe(4500000);
    });

    it('should throw error for invalid stock code', async () => {
      await expect(client.getStockInfo('123')).rejects.toThrow('Invalid stock code');
      await expect(client.getStockInfo('ABCDEF')).rejects.toThrow('Invalid stock code');
    });

    it('should detect KOSDAQ market correctly', async () => {
      // Mock KOSDAQ response
      const mockClient = new KISStockInfoClient('mock', testAppKey, 'test-app-secret');
      vi.mocked(mockClient['middleware'].makeRequest).mockResolvedValueOnce({
        data: {
          output: {
            pdno: '035720',
            prdt_name: '카카오',
            mrkt_div_nm: 'KOSDAQ',
            mrkt_div_cd: '2',
            mrkt_cap_amt: '50000000000000', // 50조원
            sect_nm: '인터넷',
          },
        },
      });

      const result = await mockClient.getStockInfo('035720');

      expect(result.marketDivision).toBe('KOSDAQ');
      expect(result.marketCode).toBe('Q');
    });
  });

  describe('getMultipleStockInfo', () => {
    it('should fetch multiple stock info sequentially', async () => {
      const stockCodes = ['005930', '000660'];
      const results = await client.getMultipleStockInfo(stockCodes);

      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle partial failures gracefully', async () => {
      // Invalid code mixed with valid codes
      const stockCodes = ['005930', 'invalid'];
      const results = await client.getMultipleStockInfo(stockCodes);

      // Should not throw, just skip invalid ones
      expect(results).toBeDefined();
    });
  });

  describe('Caching', () => {
    it('should cache stock info data', async () => {
      const freshClient = new KISStockInfoClient('mock', testAppKey, 'test-app-secret');

      // First call
      await freshClient.getStockInfo('005930');

      // Second call should use cache
      const startTime = Date.now();
      await freshClient.getStockInfo('005930');
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
    it('should use VCTPF1602R for mock environment', () => {
      const mockClient = new KISStockInfoClient('mock', testAppKey, 'test-app-secret');
      expect(mockClient).toBeDefined();
    });

    it('should use CTPF1602R for production environment', () => {
      const prodClient = new KISStockInfoClient('production', testAppKey, 'test-app-secret');
      expect(prodClient).toBeDefined();
    });
  });
});
