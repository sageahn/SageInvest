// Screening Service Layer
// SPEC-SCREENING-001: 스크리닝 서비스 레이어
import { KISStockInfoClient } from '../kis/stock-info-client';
import { KISPriceHistoryClient } from '../kis/price-history-client';
import { BreakthroughDetector } from './breakthrough-detector';
import type { KISEnvironment, StockHolding } from '../kis/types';
import type { MAScreeningResult, ScreeningSummary, ScreeningResponse, MAPeriod } from './types';
import { DEFAULT_MA_PERIOD, SUPPORTED_MA_PERIODS } from './types';

/**
 * 스크리닝 서비스
 * 포트폴리오 및 시장 스크리닝 비즈니스 로직 캡슐화
 */
export class MASScreeningService {
  private stockInfoClient: KISStockInfoClient;
  private priceHistoryClient: KISPriceHistoryClient;
  private breakthroughDetector: BreakthroughDetector;

  // Rate Limit 준수를 위한 요청 간격
  private readonly REQUEST_INTERVAL_MS = 1000 / 15; // 초당 15건
  private lastRequestTime = 0;

  // 스크리닝 결과 캐시 (TTL: 5분)
  private cache: Map<string, { data: ScreeningResponse; expiresAt: number }> = new Map();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5분

  constructor(environment: KISEnvironment, appKey: string) {
    this.stockInfoClient = new KISStockInfoClient(environment, appKey);
    this.priceHistoryClient = new KISPriceHistoryClient(environment, appKey);
    this.breakthroughDetector = new BreakthroughDetector();
  }

  /**
   * 포트폴리오 스크리닝
   * @param holdings 보유 종목 리스트 (KISBalanceService에서 조회)
   * @param maPeriod MA 기간 (기본값: 20)
   */
  async screenPortfolio(
    holdings: StockHolding[],
    maPeriod: MAPeriod = DEFAULT_MA_PERIOD
  ): Promise<ScreeningResponse> {
    const cacheKey = `portfolio-${holdings.map((h) => h.stockCode).join(',')}-${maPeriod}`;

    // 캐시 확인
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    // 종목코드 추출
    const stockCodes = holdings.map((h) => h.stockCode);

    // 시장 스크리닝 수행
    const response = await this.screenMarket(stockCodes, maPeriod);

    // 캐시 저장
    this.cache.set(cacheKey, {
      data: response,
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    });

    return response;
  }

  /**
   * 시장 스크리닝
   * @param stockCodes 종목코드 리스트
   * @param maPeriod MA 기간 (기본값: 20)
   */
  async screenMarket(
    stockCodes: string[],
    maPeriod: MAPeriod = DEFAULT_MA_PERIOD
  ): Promise<ScreeningResponse> {
    // 종목 수 제한 검사
    if (stockCodes.length > 100) {
      throw new Error(`Too many stocks: ${stockCodes.length}. Maximum is 100.`);
    }

    // MA 기간 검증
    if (!SUPPORTED_MA_PERIODS.includes(maPeriod)) {
      throw new Error(
        `Unsupported MA period: ${maPeriod}. Supported: ${SUPPORTED_MA_PERIODS.join(', ')}`
      );
    }

    const cacheKey = `market-${stockCodes.join(',')}-${maPeriod}`;

    // 캐시 확인
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const screenedAt = new Date();
    const results: MAScreeningResult[] = [];

    // 각 종목에 대해 순차적으로 스크리닝 수행
    for (const stockCode of stockCodes) {
      try {
        const result = await this.screenSingleStock(stockCode, maPeriod);
        if (result) {
          results.push(result);
        }
      } catch {
        // 개별 실패는 전체 프로세스를 중단하지 않음
        // Screening failed for ${stockCode}
      }
    }

    // 요약 정보 생성
    const summary = this.generateSummary(results, stockCodes.length, maPeriod, screenedAt);

    const response: ScreeningResponse = {
      results,
      summary,
    };

    // 캐시 저장
    this.cache.set(cacheKey, {
      data: response,
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    });

    return response;
  }

  /**
   * 단일 종목 스크리닝
   * @param stockCode 종목코드
   * @param maPeriod MA 기간
   */
  async screenSingleStock(stockCode: string, maPeriod: number): Promise<MAScreeningResult | null> {
    // Rate Limit 준수
    await this.waitForRateLimit();

    // 1. 종목 기본 정보 조회
    const stockInfo = await this.stockInfoClient.getStockInfo(stockCode);

    // Rate Limit 준수
    await this.waitForRateLimit();

    // 2. 가격 이력 조회 (MA 계산에 필요한 데이터)
    const priceHistory = await this.priceHistoryClient.getPriceHistoryForMA(
      stockCode,
      stockInfo.marketCode,
      maPeriod
    );

    // 3. 돌파 감지 및 스크리닝 결과 생성
    const result = this.breakthroughDetector.generateScreeningResult(priceHistory, maPeriod, {
      stockCode: stockInfo.stockCode,
      stockName: stockInfo.stockName,
      market: stockInfo.marketDivision,
      marketCap: stockInfo.marketCap,
    });

    return result;
  }

  /**
   * 다중 종목 스크리닝 (병렬 처리, 최대 15개)
   * @param stockCodes 종목코드 리스트
   * @param maPeriod MA 기간
   */
  async screenMultipleStocks(stockCodes: string[], maPeriod: number): Promise<MAScreeningResult[]> {
    const results: MAScreeningResult[] = [];
    const batchSize = 15; // Rate Limit 고려

    for (let i = 0; i < stockCodes.length; i += batchSize) {
      const batch = stockCodes.slice(i, i + batchSize);

      // 배치 내에서는 병렬 처리
      const batchResults = await Promise.all(
        batch.map((code) => this.screenSingleStock(code, maPeriod))
      );

      // null 제외하고 결과에 추가
      results.push(...batchResults.filter((r): r is MAScreeningResult => r !== null));

      // 배치 간 Rate Limit 준수를 위한 대기
      if (i + batchSize < stockCodes.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  /**
   * 스크리닝 요약 정보 생성
   */
  private generateSummary(
    results: MAScreeningResult[],
    totalStocks: number,
    maPeriod: number,
    screenedAt: Date
  ): ScreeningSummary {
    const breakthroughCount = results.length;

    // 평균 돌파상승률 계산
    const averageReturnRate =
      breakthroughCount > 0
        ? results.reduce((sum, r) => sum + r.breakthroughReturnRate, 0) / breakthroughCount
        : 0;

    return {
      totalStocks,
      breakthroughCount,
      averageReturnRate: Math.round(averageReturnRate * 100) / 100,
      screenedAt,
      maPeriod,
    };
  }

  /**
   * Rate Limit 준수를 위한 요청 간격 제어
   */
  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;

    if (elapsed < this.REQUEST_INTERVAL_MS) {
      await new Promise((resolve) => setTimeout(resolve, this.REQUEST_INTERVAL_MS - elapsed));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * 캐시 무효화
   */
  clearCache(): void {
    this.cache.clear();
    this.stockInfoClient.clearCache();
    this.priceHistoryClient.clearCache();
  }
}
