import { describe, it, expect, beforeAll } from 'vitest';
import { BreakthroughDetector, breakthroughDetector } from '@/lib/screening/breakthrough-detector';
import type { DailyPriceData } from '@/lib/screening/types';

describe('BreakthroughDetector (SPEC-SCREENING-001)', () => {
  // MA 아래에서 위로 돌파하는 시나리오 생성
  // 돌파 조건: prevClose < prevMA AND currClose >= currMA
  // 20일 MA 기준: 안정적으로 돌파를 만드는 데이터
  const createBreakthroughPrices = (): DailyPriceData[] => {
    const prices: DailyPriceData[] = [];

    // 첫 19일: 고정된 가격으로 MA 값 안정화
    // 19일 동안 종가 = 80000으로 고정하면 20일 MA도 80000
    for (let i = 0; i < 19; i++) {
      prices.push({
        date: new Date(2026, 1, i + 1),
        open: 80000,
        high: 80500,
        low: 79500,
        close: 80000,
        volume: 10000000,
        amount: 800000000000,
      });
    }

    // 20일: 종가 = 80000 (MA 위에 있지만 돌파는 아님)
    prices.push({
      date: new Date(2026, 1, 20),
      open: 80000,
      high: 80500,
      low: 79500,
      close: 80000, // MA = 80000과 동일
      volume: 10000000,
      amount: 800000000000,
    });

    // 21일: 종가 < MA (MA 아래로)
    prices.push({
      date: new Date(2026, 1, 21),
      open: 79000,
      high: 79500,
      low: 78500,
      close: 79000, // MA(80000) 아래
      volume: 10000000,
      amount: 790000000000,
    });

    // 22일: 종가 >= MA (돌파!)
    prices.push({
      date: new Date(2026, 1, 22),
      open: 81000,
      high: 81500,
      low: 80500,
      close: 81000, // MA(79950) 위로 돌파
      volume: 10000000,
      amount: 810000000000,
    });

    return prices;
  };

  // 돌파가 없는 시나리오 (항상 MA 위)
  const createNoBreakthroughPrices = (): DailyPriceData[] => {
    const prices: DailyPriceData[] = [];
    for (let i = 0; i < 20; i++) {
      prices.push({
        date: new Date(2026, 1, i + 1),
        open: 81000 + i * 100,
        high: 82000 + i * 100,
        low: 80500 + i * 100,
        close: 81000 + i * 100,
        volume: 10000000,
        amount: 810000000000,
      });
    }
    return prices;
  };

  let detector: BreakthroughDetector;

  beforeAll(() => {
    detector = new BreakthroughDetector();
  });

  describe('detectLatestBreakthrough', () => {
    it('should detect breakthrough when price crosses above MA', () => {
      const prices = createBreakthroughPrices();
      const breakthrough = detector.detectLatestBreakthrough(prices, 20);

      expect(breakthrough).not.toBeNull();
      expect(breakthrough!.date).toBeDefined();
      expect(breakthrough!.price).toBeGreaterThan(0);
      expect(breakthrough!.maValue).toBeGreaterThan(0);
    });

    it('should return null when no breakthrough exists', () => {
      const prices = createNoBreakthroughPrices();
      const breakthrough = detector.detectLatestBreakthrough(prices, 20);

      expect(breakthrough).toBeNull();
    });

    it('should return null when insufficient data', () => {
      const smallPrices = createBreakthroughPrices().slice(0, 10);
      const breakthrough = detector.detectLatestBreakthrough(smallPrices, 20);

      expect(breakthrough).toBeNull();
    });

    it('should find most recent breakthrough in multiple crossings', () => {
      // 여러 번 돌파하는 시나리오 (2번의 돌파)
      const prices: DailyPriceData[] = [];

      // 1-19일: 고정 가격으로 MA 안정화
      for (let i = 0; i < 19; i++) {
        prices.push({
          date: new Date(2026, 0, i + 1),
          open: 80000,
          high: 80500,
          low: 79500,
          close: 80000,
          volume: 10000000,
          amount: 800000000000,
        });
      }

      // 20일: 돌파 없음 (MA = 80000)
      prices.push({
        date: new Date(2026, 0, 20),
        open: 80000,
        high: 80500,
        low: 79500,
        close: 80000,
        volume: 10000000,
        amount: 800000000000,
      });

      // 21일: MA 아래로
      prices.push({
        date: new Date(2026, 0, 21),
        open: 79000,
        high: 79500,
        low: 78500,
        close: 79000,
        volume: 10000000,
        amount: 790000000000,
      });

      // 22일: 1차 돌파
      prices.push({
        date: new Date(2026, 0, 22),
        open: 81000,
        high: 81500,
        low: 80500,
        close: 81000,
        volume: 10000000,
        amount: 810000000000,
      });

      // 23일: 다시 MA 아래로
      prices.push({
        date: new Date(2026, 0, 23),
        open: 79000,
        high: 79500,
        low: 78500,
        close: 79000,
        volume: 10000000,
        amount: 790000000000,
      });

      // 24일: 2차 돌파 (최신)
      prices.push({
        date: new Date(2026, 0, 24),
        open: 81000,
        high: 81500,
        low: 80500,
        close: 81000,
        volume: 10000000,
        amount: 810000000000,
      });

      const breakthrough = detector.detectLatestBreakthrough(prices, 20);
      expect(breakthrough).not.toBeNull();
      // 최신 돌파는 24일이어야 함
      expect(breakthrough!.date.getDate()).toBe(24);
    });
  });

  describe('detectAllBreakthroughs', () => {
    it('should return all breakthrough points', () => {
      const prices = createBreakthroughPrices();
      const breakthroughs = detector.detectAllBreakthroughs(prices, 20);

      expect(breakthroughs.length).toBeGreaterThanOrEqual(1);
    });

    it('should return empty array when no breakthroughs', () => {
      const prices = createNoBreakthroughPrices();
      const breakthroughs = detector.detectAllBreakthroughs(prices, 20);

      expect(breakthroughs).toEqual([]);
    });
  });

  describe('isAboveMA', () => {
    it('should return true when current price is above MA', () => {
      const prices = createBreakthroughPrices();
      const isAbove = detector.isAboveMA(prices, 20);

      expect(isAbove).toBe(true);
    });

    it('should return false when current price is below MA', () => {
      // MA 아래에 있는 시나리오: 계속 하락하는 주가
      const prices: DailyPriceData[] = [];
      for (let i = 0; i < 25; i++) {
        prices.push({
          date: new Date(2026, 1, i + 1),
          open: 81000 - i * 200,
          high: 81500 - i * 200,
          low: 80500 - i * 200,
          close: 81000 - i * 200, // 계속 하락: 81000 -> 76000
          volume: 10000000,
          amount: 800000000000,
        });
      }

      const isAbove = detector.isAboveMA(prices, 20);
      // 마지막 종가(76000) < 20일 MA(약 79000)
      expect(isAbove).toBe(false);
    });
  });

  describe('calculateDaysSinceBreakthrough', () => {
    it('should calculate days correctly', () => {
      const breakthroughDate = new Date(2026, 1, 15);
      const currentDate = new Date(2026, 1, 22);

      const days = detector.calculateDaysSinceBreakthrough(breakthroughDate, currentDate);

      expect(days).toBe(7);
    });

    it('should return 0 for same day', () => {
      const date = new Date(2026, 1, 22);
      const days = detector.calculateDaysSinceBreakthrough(date, date);

      expect(days).toBe(0);
    });
  });

  describe('calculateBreakthroughReturnRate', () => {
    it('should calculate positive return rate correctly', () => {
      const returnRate = detector.calculateBreakthroughReturnRate(87000, 85000);

      // (87000 - 85000) / 85000 * 100 = 2.35%
      expect(returnRate).toBeCloseTo(2.35, 2);
    });

    it('should calculate negative return rate correctly', () => {
      const returnRate = detector.calculateBreakthroughReturnRate(83000, 85000);

      // (83000 - 85000) / 85000 * 100 = -2.35%
      expect(returnRate).toBeCloseTo(-2.35, 2);
    });

    it('should return 0 for same price', () => {
      const returnRate = detector.calculateBreakthroughReturnRate(85000, 85000);

      expect(returnRate).toBe(0);
    });
  });

  describe('generateScreeningResult', () => {
    it('should generate screening result for stock with breakthrough', () => {
      const prices = createBreakthroughPrices();
      const stockInfo = {
        stockCode: '005930',
        stockName: '삼성전자',
        market: 'KOSPI' as const,
        marketCap: 4500000,
      };

      const result = detector.generateScreeningResult(prices, 20, stockInfo);

      expect(result).not.toBeNull();
      expect(result!.stockCode).toBe('005930');
      expect(result!.stockName).toBe('삼성전자');
      expect(result!.market).toBe('KOSPI');
      expect(result!.currentPrice).toBeGreaterThan(0);
      expect(result!.currentMA).toBeGreaterThan(0);
      expect(result!.breakthroughPrice).toBeGreaterThan(0);
      expect(result!.breakthroughDate).toBeDefined();
      expect(result!.calculatedAt).toBeDefined();
    });

    it('should return null when no breakthrough', () => {
      const prices = createNoBreakthroughPrices();
      const stockInfo = {
        stockCode: '005930',
        stockName: '삼성전자',
        market: 'KOSPI' as const,
        marketCap: 4500000,
      };

      const result = detector.generateScreeningResult(prices, 20, stockInfo);

      expect(result).toBeNull();
    });

    it('should return null when insufficient data', () => {
      const smallPrices = createBreakthroughPrices().slice(0, 10);
      const stockInfo = {
        stockCode: '005930',
        stockName: '삼성전자',
        market: 'KOSPI' as const,
        marketCap: 4500000,
      };

      const result = detector.generateScreeningResult(smallPrices, 20, stockInfo);

      expect(result).toBeNull();
    });
  });

  describe('isRecentBreakthrough', () => {
    it('should return true for breakthrough within 5 days', () => {
      expect(detector.isRecentBreakthrough(3)).toBe(true);
      expect(detector.isRecentBreakthrough(5)).toBe(true);
    });

    it('should return false for breakthrough after 5 days', () => {
      expect(detector.isRecentBreakthrough(6)).toBe(false);
      expect(detector.isRecentBreakthrough(10)).toBe(false);
    });

    it('should allow custom threshold', () => {
      expect(detector.isRecentBreakthrough(7, 10)).toBe(true);
      expect(detector.isRecentBreakthrough(7, 5)).toBe(false);
    });
  });

  describe('Singleton Instance', () => {
    it('should provide singleton instance', () => {
      expect(breakthroughDetector).toBeDefined();
      expect(breakthroughDetector).toBeInstanceOf(BreakthroughDetector);
    });
  });
});
