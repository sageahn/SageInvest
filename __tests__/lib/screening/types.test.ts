import { describe, it, expect } from 'vitest';
import {
  isValidStockCode,
  marketDivisionToCode,
  marketCodeToDivision,
  formatDateToYYYYMMDD,
  parseYYYYMMDDToDate,
  formatCurrency,
  formatReturnRate,
  DEFAULT_MA_PERIOD,
  SUPPORTED_MA_PERIODS,
  MAX_SCREENING_STOCKS,
  RATE_LIMIT_PER_SECOND,
} from '@/lib/screening/types';
import type { MarketDivision, MAPeriod } from '@/lib/screening/types';

describe('Screening Types (SPEC-SCREENING-001)', () => {
  describe('isValidStockCode', () => {
    it('should return true for valid 6-digit stock codes', () => {
      expect(isValidStockCode('005930')).toBe(true); // Samsung Electronics
      expect(isValidStockCode('000660')).toBe(true); // SK Hynix
      expect(isValidStockCode('035720')).toBe(true); // Kakao
    });

    it('should return false for invalid stock codes', () => {
      expect(isValidStockCode('5930')).toBe(false); // 4 digits
      expect(isValidStockCode('0059300')).toBe(false); // 7 digits
      expect(isValidStockCode('ABCDEF')).toBe(false); // letters
      expect(isValidStockCode('00593A')).toBe(false); // mixed
      expect(isValidStockCode('')).toBe(false); // empty
    });
  });

  describe('marketDivisionToCode', () => {
    it('should convert KOSPI to J', () => {
      expect(marketDivisionToCode('KOSPI')).toBe('J');
    });

    it('should convert KOSDAQ to Q', () => {
      expect(marketDivisionToCode('KOSDAQ')).toBe('Q');
    });
  });

  describe('marketCodeToDivision', () => {
    it('should convert J to KOSPI', () => {
      expect(marketCodeToDivision('J')).toBe('KOSPI');
    });

    it('should convert Q to KOSDAQ', () => {
      expect(marketCodeToDivision('Q')).toBe('KOSDAQ');
    });
  });

  describe('formatDateToYYYYMMDD', () => {
    it('should format date to YYYYMMDD string', () => {
      const date = new Date(2026, 1, 22); // 2026-02-22
      expect(formatDateToYYYYMMDD(date)).toBe('20260222');
    });

    it('should pad month and day with zeros', () => {
      const date = new Date(2026, 0, 5); // 2026-01-05
      expect(formatDateToYYYYMMDD(date)).toBe('20260105');
    });
  });

  describe('parseYYYYMMDDToDate', () => {
    it('should parse YYYYMMDD string to Date', () => {
      const result = parseYYYYMMDDToDate('20260222');
      expect(result.getFullYear()).toBe(2026);
      expect(result.getMonth()).toBe(1); // February (0-indexed)
      expect(result.getDate()).toBe(22);
    });

    it('should handle dates with leading zeros', () => {
      const result = parseYYYYMMDDToDate('20260105');
      expect(result.getFullYear()).toBe(2026);
      expect(result.getMonth()).toBe(0); // January
      expect(result.getDate()).toBe(5);
    });
  });

  describe('formatCurrency', () => {
    it('should format number with Korean locale separators', () => {
      expect(formatCurrency(1000000)).toBe('1,000,000');
      expect(formatCurrency(85000)).toBe('85,000');
    });
  });

  describe('formatReturnRate', () => {
    it('should format return rate with 2 decimal places', () => {
      expect(formatReturnRate(6.25)).toBe('6.25%');
      expect(formatReturnRate(0.5)).toBe('0.50%');
    });

    it('should handle negative return rates', () => {
      expect(formatReturnRate(-2.5)).toBe('-2.50%');
    });
  });

  describe('Constants', () => {
    it('should have default MA period of 20', () => {
      expect(DEFAULT_MA_PERIOD).toBe(20);
    });

    it('should have all supported MA periods', () => {
      expect(SUPPORTED_MA_PERIODS).toContain(5);
      expect(SUPPORTED_MA_PERIODS).toContain(10);
      expect(SUPPORTED_MA_PERIODS).toContain(20);
      expect(SUPPORTED_MA_PERIODS).toContain(60);
      expect(SUPPORTED_MA_PERIODS).toContain(120);
      expect(SUPPORTED_MA_PERIODS).toHaveLength(5);
    });

    it('should have max screening stocks of 100', () => {
      expect(MAX_SCREENING_STOCKS).toBe(100);
    });

    it('should have rate limit of 15 per second', () => {
      expect(RATE_LIMIT_PER_SECOND).toBe(15);
    });
  });

  describe('Type Guards (TypeScript)', () => {
    it('should accept valid MarketDivision values', () => {
      const kospi: MarketDivision = 'KOSPI';
      const kosdaq: MarketDivision = 'KOSDAQ';
      expect(kospi).toBe('KOSPI');
      expect(kosdaq).toBe('KOSDAQ');
    });

    it('should accept valid MAPeriod values', () => {
      const period5: MAPeriod = 5;
      const period20: MAPeriod = 20;
      const period120: MAPeriod = 120;
      expect(period5).toBe(5);
      expect(period20).toBe(20);
      expect(period120).toBe(120);
    });
  });
});
