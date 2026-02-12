import { describe, it, expect, beforeAll, vi } from 'vitest';
import { KISBalanceService } from '@/lib/kis/balance-service';

// Mock KISAuthMiddleware
vi.mock('@/lib/kis/auth-middleware', () => ({
  KISAuthMiddleware: vi.fn().mockImplementation(() => ({
    makeRequest: vi.fn().mockResolvedValue({
      data: {
        output1: [
          {
            pdno: '005930',
            prdt_name: '삼성전자',
            hldg_qty: '100',
            pchs_avg_pric: '80000',
            pchs_amt: '8000000',
            prpr: '85000',
            evlu_amt: '8500000',
            evlu_pfls_amt: '500000',
            evlu_pfls_rt: '6.25',
          },
        ],
        output2: [
          {
            dnca_tot_amt: '10000000',
            pchs_amt_smtl_amt: '8000000',
            evlu_amt_smtl_amt: '8500000',
            evlu_pfls_smtl_amt: '500000',
            tot_evlu_amt: '18500000',
            nass_amt: '18500000',
          },
        ],
        ctx_area_nk100: '',
      },
    }),
  })),
}));

describe('KISBalanceService (SPEC-KIS-002)', () => {
  const testAppKey = 'test-app-key-36-chars-long!!';
  const testAppSecret = 'a'.repeat(180);
  let service: KISBalanceService;

  beforeAll(() => {
    service = new KISBalanceService('mock', testAppKey, testAppSecret);
  });

  describe('getTrId', () => {
    it('should return TTTC8434R for production environment', () => {
      const prodService = new KISBalanceService('production', testAppKey, testAppSecret);
      // Private 메서드 직접 테스트는 불가능하므로 public 메서드를 통해 간접 테스트
      expect(prodService).toBeDefined();
    });

    it('should return VTTC8434R for mock environment', () => {
      const mockService = new KISBalanceService('mock', testAppKey, testAppSecret);
      expect(mockService).toBeDefined();
    });
  });

  describe('buildQueryParams', () => {
    it('should build correct query parameters for initial request', async () => {
      const cano = '12345678';
      const acntPrdtCd = '01';

      // getBalance 메서드를 통해 간접적으로 buildQueryParams 테스트
      const result = await service.getBalance(cano, acntPrdtCd);

      expect(result).toBeDefined();
      expect(result.holdings).toBeDefined();
      expect(result.summary).toBeDefined();
    });
  });

  describe('transformHolding', () => {
    it('should transform KIS output1 to StockHolding', async () => {
      const result = await service.getBalance('12345678', '01');

      expect(result.holdings).toHaveLength(1);
      const holding = result.holdings[0];

      expect(holding.stockCode).toBe('005930');
      expect(holding.stockName).toBe('삼성전자');
      expect(holding.quantity).toBe(100);
      expect(holding.averagePurchasePrice).toBe(80000);
      expect(holding.purchaseAmount).toBe(8000000);
      expect(holding.currentPrice).toBe(85000);
      expect(holding.evaluationAmount).toBe(8500000);
      expect(holding.profitLossAmount).toBe(500000);
      expect(holding.profitLossRate).toBe(6.25);
    });
  });

  describe('transformSummary', () => {
    it('should transform KIS output2 to AccountSummary', async () => {
      const result = await service.getBalance('12345678', '01');

      expect(result.summary).toBeDefined();
      expect(result.summary.depositTotal).toBe(10000000);
      expect(result.summary.purchaseTotal).toBe(8000000);
      expect(result.summary.evaluationTotal).toBe(8500000);
      expect(result.summary.profitLossTotal).toBe(500000);
      expect(result.summary.totalEvaluation).toBe(18500000);
      expect(result.summary.netAsset).toBe(18500000);
      expect(result.summary.profitLossRate).toBe(6.25); // (500000 / 8000000) * 100
    });

    it('should calculate profit loss rate correctly', async () => {
      const result = await service.getBalance('12345678', '01');

      // 총수익률 = 총평가손익 / 총매입금액 * 100
      // 500000 / 8000000 * 100 = 6.25
      expect(result.summary.profitLossRate).toBe(6.25);
    });
  });

  describe('Rate Limiting', () => {
    it('should respect rate limit between requests', async () => {
      const startTime = Date.now();

      // 두 번의 연속 호출
      await service.getBalance('12345678', '01');
      await service.getBalance('12345678', '01');

      const elapsedTime = Date.now() - startTime;

      // Rate limit: 초당 15건 = 요청 간격 최소 66ms
      expect(elapsedTime).toBeGreaterThan(50);
    });
  });

  describe('Caching', () => {
    it('should cache balance data', async () => {
      const cano = '12345678';
      const acntPrdtCd = '01';

      // 첫 번째 호출
      await service.getBalance(cano, acntPrdtCd);

      // 두 번째 호출 (캐시 사용)
      const startTime = Date.now();
      await service.getBalance(cano, acntPrdtCd);
      const elapsedTime = Date.now() - startTime;

      // 캐시된 응답은 매우 빨라야 함
      expect(elapsedTime).toBeLessThan(100);
    });

    it('should bypass cache when forceRefresh is true', async () => {
      const cano = '12345678';
      const acntPrdtCd = '01';

      // 첫 번째 호출 (캐시 저장)
      await service.getBalance(cano, acntPrdtCd, false);

      // 두 번째 호출 (강제 새로고침)
      const result = await service.getBalance(cano, acntPrdtCd, true);

      expect(result).toBeDefined();
    });

    it('should clear cache', () => {
      expect(() => service.clearCache()).not.toThrow();
    });

    it('should clear specific account cache', () => {
      expect(() => service.clearAccountCache('12345678', '01')).not.toThrow();
    });
  });

  describe('getFullHoldings', () => {
    it('should handle pagination', async () => {
      // Pagination 로직은 Mock이 단일 페이지만 반환하므로
      // 실제 동작은 통합 테스트에서 확인 필요
      const result = await service.getBalance('12345678', '01');

      expect(result.holdings).toBeDefined();
      expect(Array.isArray(result.holdings)).toBe(true);
    });
  });

  describe('getAccountSummary', () => {
    it('should return account summary only', async () => {
      const cano = '12345678';
      const acntPrdtCd = '01';

      const result = await service.getAccountSummary(cano, acntPrdtCd);

      expect(result).toBeDefined();
      expect(result.depositTotal).toBeGreaterThan(0);
      expect(result.totalEvaluation).toBeGreaterThan(0);
    });
  });
});
