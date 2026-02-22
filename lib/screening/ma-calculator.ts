// Moving Average Calculator
// SPEC-SCREENING-001: 이동평균선 계산 서비스
import type { DailyPriceData } from './types';

/**
 * 이동평균선 계산 서비스
 * 단순이동평균(Simple Moving Average, SMA) 계산
 */
export class MACalculator {
  /**
   * 단일 기간 이동평균선 계산
   * @param prices 일별 가격 데이터 (날짜 오름차순)
   * @param period MA 기간
   * @returns MA 값 배열 (데이터 부족한 경우 null)
   */
  calculateSMA(prices: DailyPriceData[], period: number): (number | null)[] {
    const result: (number | null)[] = [];

    for (let i = 0; i < prices.length; i++) {
      if (i < period - 1) {
        result.push(null); // 데이터 부족
      } else {
        const sum = prices.slice(i - period + 1, i + 1).reduce((acc, p) => acc + p.close, 0);
        const ma = sum / period;
        // 소수점 2자리 반올림
        result.push(Math.round(ma * 100) / 100);
      }
    }

    return result;
  }

  /**
   * 다중 기간 이동평균선 일괄 계산
   * @param prices 일별 가격 데이터
   * @param periods MA 기간 리스트
   * @returns 기간별 MA 값 Map
   */
  calculateMultipleMA(prices: DailyPriceData[], periods: number[]): Map<number, (number | null)[]> {
    const result = new Map<number, (number | null)[]>();

    for (const period of periods) {
      const maValues = this.calculateSMA(prices, period);
      result.set(period, maValues);
    }

    return result;
  }

  /**
   * 최신 MA 값 반환
   * @param prices 일별 가격 데이터
   * @param period MA 기간
   * @returns 최신 MA 값 (데이터 부족 시 null)
   */
  getCurrentMA(prices: DailyPriceData[], period: number): number | null {
    if (prices.length < period) {
      return null;
    }

    const maValues = this.calculateSMA(prices, period);
    return maValues[maValues.length - 1];
  }

  /**
   * 특정 날짜의 MA 값 반환
   * @param prices 일별 가격 데이터
   * @param period MA 기간
   * @param dateIndex 날짜 인덱스 (0부터 시작)
   * @returns 해당 날짜의 MA 값
   */
  getMAAtIndex(prices: DailyPriceData[], period: number, dateIndex: number): number | null {
    if (dateIndex < 0 || dateIndex >= prices.length) {
      return null;
    }

    const maValues = this.calculateSMA(prices, period);
    return maValues[dateIndex];
  }

  /**
   * MA 데이터 충분성 검사
   * @param prices 가격 데이터
   * @param period MA 기간
   * @returns 데이터가 충분한지 여부
   */
  hasEnoughData(prices: DailyPriceData[], period: number): boolean {
    return prices.length >= period;
  }

  /**
   * 모든 지원 MA 기간에 대한 충분성 검사
   * @param prices 가격 데이터
   * @param periods MA 기간 리스트
   * @returns 기간별 충분성 Map
   */
  checkDataAvailability(prices: DailyPriceData[], periods: number[]): Map<number, boolean> {
    const result = new Map<number, boolean>();

    for (const period of periods) {
      result.set(period, this.hasEnoughData(prices, period));
    }

    return result;
  }
}

// 싱글톤 인스턴스 (선택적)
export const maCalculator = new MACalculator();
