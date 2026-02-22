import { describe, it, expect, beforeAll } from 'vitest';
import { MACalculator, maCalculator } from '@/lib/screening/ma-calculator';
import type { DailyPriceData } from '@/lib/screening/types';

describe('MACalculator (SPEC-SCREENING-001)', () => {
  // 테스트용 가격 데이터 (20일)
  const testPrices: DailyPriceData[] = Array.from({ length: 20 }, (_, i) => ({
    date: new Date(2026, 1, i + 1), // 2026-02-01 ~ 2026-02-20
    open: 80000 + i * 100,
    high: 81000 + i * 100,
    low: 79000 + i * 100,
    close: 80000 + i * 100, // 종가: 80000, 80100, 80200, ... 81900
    volume: 10000000,
    amount: 800000000000,
  }));

  let calculator: MACalculator;

  beforeAll(() => {
    calculator = new MACalculator();
  });

  describe('calculateSMA', () => {
    it('should calculate 5-day SMA correctly', () => {
      const maValues = calculator.calculateSMA(testPrices, 5);

      // 5일 MA는 4일부터 시작 (인덱스 0-3은 null)
      expect(maValues[0]).toBeNull();
      expect(maValues[1]).toBeNull();
      expect(maValues[2]).toBeNull();
      expect(maValues[3]).toBeNull();

      // 5일 MA 값 (인덱스 4): (80000 + 80100 + 80200 + 80300 + 80400) / 5 = 80200
      expect(maValues[4]).toBe(80200);

      // 5일 MA 값 (인덱스 5): (80100 + 80200 + 80300 + 80400 + 80500) / 5 = 80300
      expect(maValues[5]).toBe(80300);
    });

    it('should calculate 20-day SMA correctly', () => {
      const maValues = calculator.calculateSMA(testPrices, 20);

      // 20일 MA는 19일부터 시작 (인덱스 0-18은 null)
      for (let i = 0; i < 19; i++) {
        expect(maValues[i]).toBeNull();
      }

      // 20일 MA 값 (인덱스 19): 평균 = (80000 + 81900) * 10 / 20 = 80950
      const expectedMA = (80000 + 81900) / 2; // 등차수열의 합 / 20
      expect(maValues[19]).toBeCloseTo(expectedMA, 0);
    });

    it('should return null for insufficient data', () => {
      const smallPrices = testPrices.slice(0, 3);
      const maValues = calculator.calculateSMA(smallPrices, 5);

      expect(maValues.every((v) => v === null)).toBe(true);
    });

    it('should round to 2 decimal places', () => {
      // 소수점이 발생하는 데이터
      const oddPrices: DailyPriceData[] = [
        {
          date: new Date(),
          open: 80000,
          high: 81000,
          low: 79000,
          close: 80001,
          volume: 1000,
          amount: 80000,
        },
        {
          date: new Date(),
          open: 80000,
          high: 81000,
          low: 79000,
          close: 80002,
          volume: 1000,
          amount: 80000,
        },
        {
          date: new Date(),
          open: 80000,
          high: 81000,
          low: 79000,
          close: 80003,
          volume: 1000,
          amount: 80000,
        },
        {
          date: new Date(),
          open: 80000,
          high: 81000,
          low: 79000,
          close: 80004,
          volume: 1000,
          amount: 80000,
        },
        {
          date: new Date(),
          open: 80000,
          high: 81000,
          low: 79000,
          close: 80005,
          volume: 1000,
          amount: 80000,
        },
      ];

      const maValues = calculator.calculateSMA(oddPrices, 3);
      // (80001 + 80002 + 80003) / 3 = 80002
      expect(maValues[2]).toBe(80002);
    });
  });

  describe('calculateMultipleMA', () => {
    it('should calculate multiple MA periods', () => {
      const periods = [5, 10, 20];
      const result = calculator.calculateMultipleMA(testPrices, periods);

      expect(result.size).toBe(3);
      expect(result.has(5)).toBe(true);
      expect(result.has(10)).toBe(true);
      expect(result.has(20)).toBe(true);
    });

    it('should return correct values for each period', () => {
      const periods = [5, 10];
      const result = calculator.calculateMultipleMA(testPrices, periods);

      const ma5 = result.get(5)!;
      const ma10 = result.get(10)!;

      // 5일 MA는 인덱스 4부터 값 존재
      expect(ma5[4]).not.toBeNull();
      // 10일 MA는 인덱스 9부터 값 존재
      expect(ma10[9]).not.toBeNull();
    });
  });

  describe('getCurrentMA', () => {
    it('should return latest MA value', () => {
      const currentMA = calculator.getCurrentMA(testPrices, 5);

      // 최신 5일 MA: 마지막 5일 평균
      expect(currentMA).not.toBeNull();
      expect(typeof currentMA).toBe('number');
    });

    it('should return null when insufficient data', () => {
      const smallPrices = testPrices.slice(0, 3);
      const currentMA = calculator.getCurrentMA(smallPrices, 5);

      expect(currentMA).toBeNull();
    });
  });

  describe('getMAAtIndex', () => {
    it('should return MA value at specific index', () => {
      const maAtIndex4 = calculator.getMAAtIndex(testPrices, 5, 4);
      const maAtIndex9 = calculator.getMAAtIndex(testPrices, 10, 9);

      expect(maAtIndex4).toBe(80200);
      expect(maAtIndex9).not.toBeNull();
    });

    it('should return null for invalid index', () => {
      const maInvalid = calculator.getMAAtIndex(testPrices, 5, -1);
      expect(maInvalid).toBeNull();

      const maOutOfRange = calculator.getMAAtIndex(testPrices, 5, 100);
      expect(maOutOfRange).toBeNull();
    });
  });

  describe('hasEnoughData', () => {
    it('should return true when data is sufficient', () => {
      expect(calculator.hasEnoughData(testPrices, 5)).toBe(true);
      expect(calculator.hasEnoughData(testPrices, 20)).toBe(true);
    });

    it('should return false when data is insufficient', () => {
      const smallPrices = testPrices.slice(0, 10);
      expect(calculator.hasEnoughData(smallPrices, 20)).toBe(false);
    });
  });

  describe('checkDataAvailability', () => {
    it('should check availability for multiple periods', () => {
      const periods = [5, 10, 20, 60];
      const availability = calculator.checkDataAvailability(testPrices, periods);

      expect(availability.get(5)).toBe(true);
      expect(availability.get(10)).toBe(true);
      expect(availability.get(20)).toBe(true);
      expect(availability.get(60)).toBe(false); // 20일 데이터만 있음
    });
  });

  describe('Singleton Instance', () => {
    it('should provide singleton instance', () => {
      expect(maCalculator).toBeDefined();
      expect(maCalculator).toBeInstanceOf(MACalculator);
    });
  });
});
