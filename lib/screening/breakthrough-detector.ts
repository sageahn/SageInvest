// Breakthrough Detection Algorithm
// SPEC-SCREENING-001: 이동평균선 돌파 감지 알고리즘
import type { DailyPriceData, BreakthroughPoint, MAScreeningResult } from './types';
import { MACalculator } from './ma-calculator';

/**
 * 돌파 감지 서비스
 * 이동평균선 상향 돌파 시점 식별
 */
export class BreakthroughDetector {
  private maCalculator: MACalculator;

  constructor() {
    this.maCalculator = new MACalculator();
  }

  /**
   * 가장 최근 상향 돌파 지점 감지
   * @param prices 일별 가격 데이터 (날짜 오름차순)
   * @param period MA 기간
   * @returns 돌파 지점 (없으면 null)
   */
  detectLatestBreakthrough(prices: DailyPriceData[], period: number): BreakthroughPoint | null {
    // 데이터 충분성 검사
    if (!this.maCalculator.hasEnoughData(prices, period)) {
      return null;
    }

    // MA 계산
    const maValues = this.maCalculator.calculateSMA(prices, period);

    // 역순 탐색으로 가장 최근 돌파 지점 찾기
    for (let i = prices.length - 1; i >= 1; i--) {
      const prevClose = prices[i - 1].close;
      const prevMA = maValues[i - 1];
      const currClose = prices[i].close;
      const currMA = maValues[i];

      // 상향 돌파 감지: 전일 종가 < 전일 MA AND 당일 종가 >= 당일 MA
      if (prevMA !== null && currMA !== null) {
        if (prevClose < prevMA && currClose >= currMA) {
          return {
            date: prices[i].date,
            price: currClose,
            maValue: currMA,
          };
        }
      }
    }

    return null; // 돌파 없음
  }

  /**
   * 모든 상향 돌파 지점 감지
   * @param prices 일별 가격 데이터
   * @param period MA 기간
   * @returns 돌파 지점 리스트
   */
  detectAllBreakthroughs(prices: DailyPriceData[], period: number): BreakthroughPoint[] {
    const breakthroughs: BreakthroughPoint[] = [];

    if (!this.maCalculator.hasEnoughData(prices, period)) {
      return breakthroughs;
    }

    const maValues = this.maCalculator.calculateSMA(prices, period);

    // 순차 탐색으로 모든 돌파 지점 찾기
    for (let i = 1; i < prices.length; i++) {
      const prevClose = prices[i - 1].close;
      const prevMA = maValues[i - 1];
      const currClose = prices[i].close;
      const currMA = maValues[i];

      if (prevMA !== null && currMA !== null) {
        if (prevClose < prevMA && currClose >= currMA) {
          breakthroughs.push({
            date: prices[i].date,
            price: currClose,
            maValue: currMA,
          });
        }
      }
    }

    return breakthroughs;
  }

  /**
   * 현재 MA 위/아래 위치 확인
   * @param prices 일별 가격 데이터
   * @param period MA 기간
   * @returns 현재 종가가 MA 위에 있는지 여부
   */
  isAboveMA(prices: DailyPriceData[], period: number): boolean {
    if (prices.length < period) {
      return false;
    }

    const currentMA = this.maCalculator.getCurrentMA(prices, period);
    const currentClose = prices[prices.length - 1].close;

    return currentMA !== null && currentClose >= currentMA;
  }

  /**
   * 돌파 후 경과일수 계산
   * @param breakthroughDate 돌파 일자
   * @param currentDate 현재 일자
   * @returns 경과일수
   */
  calculateDaysSinceBreakthrough(breakthroughDate: Date, currentDate: Date = new Date()): number {
    const diffTime = Math.abs(currentDate.getTime() - breakthroughDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  /**
   * 돌파상승률 계산
   * @param currentPrice 현재 가격
   * @param breakthroughPrice 돌파시점 가격
   * @returns 돌파상승률 (%)
   */
  calculateBreakthroughReturnRate(currentPrice: number, breakthroughPrice: number): number {
    if (breakthroughPrice === 0) {
      return 0;
    }

    const returnRate = ((currentPrice - breakthroughPrice) / breakthroughPrice) * 100;
    // 소수점 2자리 반올림
    return Math.round(returnRate * 100) / 100;
  }

  /**
   * 종목 스크리닝 결과 생성
   * @param prices 일별 가격 데이터
   * @param period MA 기간
   * @param stockInfo 종목 기본 정보
   * @returns 스크리닝 결과 (돌파하지 않았으면 null)
   */
  generateScreeningResult(
    prices: DailyPriceData[],
    period: number,
    stockInfo: {
      stockCode: string;
      stockName: string;
      market: 'KOSPI' | 'KOSDAQ';
      marketCap: number;
    }
  ): MAScreeningResult | null {
    // 데이터 충분성 검사
    if (!this.maCalculator.hasEnoughData(prices, period)) {
      return null;
    }

    // 최신 돌파 지점 감지
    const breakthrough = this.detectLatestBreakthrough(prices, period);

    // 돌파하지 않았으면 null 반환
    if (!breakthrough) {
      return null;
    }

    // 현재 상태 계산
    const currentPrice = prices[prices.length - 1].close;
    const currentMA = this.maCalculator.getCurrentMA(prices, period);
    const isAboveMA = this.isAboveMA(prices, period);

    // 돌파상승률 계산
    const returnRate = this.calculateBreakthroughReturnRate(currentPrice, breakthrough.price);

    // 경과일수 계산
    const daysSince = this.calculateDaysSinceBreakthrough(
      breakthrough.date,
      prices[prices.length - 1].date
    );

    return {
      stockCode: stockInfo.stockCode,
      stockName: stockInfo.stockName,
      market: stockInfo.market,
      marketCap: stockInfo.marketCap,
      currentPrice,
      maPeriod: period,
      currentMA: currentMA!,
      isAboveMA,
      breakthroughPrice: breakthrough.price,
      breakthroughDate: breakthrough.date,
      breakthroughReturnRate: returnRate,
      daysSinceBreakthrough: daysSince,
      calculatedAt: new Date(),
    };
  }

  /**
   * 최근 돌파 여부 확인 (N일 이내)
   * @param daysSinceBreakthrough 돌파 후 경과일수
   * @param threshold 기준일수 (기본값: 5일)
   * @returns 최근 돌파 여부
   */
  isRecentBreakthrough(daysSinceBreakthrough: number, threshold: number = 5): boolean {
    return daysSinceBreakthrough <= threshold;
  }
}

// 싱글톤 인스턴스
export const breakthroughDetector = new BreakthroughDetector();
