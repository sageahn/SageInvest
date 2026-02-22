// Watchlist Service
// SPEC-WATCHLIST-001: 관심 종목 관리 - Business Logic with KIS API Integration
import { watchlistRepository } from './db';
import { KISAuthMiddleware } from '../kis/auth-middleware';
import { configRepository } from '../kis/config-repository';
import type {
  WatchlistItem,
  RecentlyViewedStock,
  StockCardData,
  StockPrice,
  KISPriceApiResponse,
} from './types';
import type { KISEnvironment } from '../kis/types';

/**
 * KIS 현재가 조회 API TR_ID
 * Production: FHKST01010100
 * Mock: VHKST01010100
 */
const PRICE_TR_ID = {
  production: 'FHKST01010100',
  mock: 'VHKST01010100',
};

/**
 * 관심종목 서비스
 * Watchlist business logic with KIS API integration
 */
export class WatchlistService {
  private environment: KISEnvironment | null = null;
  private middleware: KISAuthMiddleware | null = null;

  /**
   * KIS 설정 초기화
   */
  private async initializeKIS(): Promise<void> {
    if (this.middleware) return;

    const config = await configRepository.getConfig();
    if (!config) {
      throw new Error('KIS 연동이 필요합니다');
    }

    this.environment = config.environment;
    this.middleware = new KISAuthMiddleware(config.environment, config.app_key, config.app_secret);
  }

  // ============================================================================
  // Watchlist Operations
  // ============================================================================

  /**
   * 모든 관심종목 조회 (현재가 포함)
   */
  async getAllWatchlistWithPrices(): Promise<StockCardData[]> {
    const items = await watchlistRepository.getAllItems();

    if (items.length === 0) {
      return [];
    }

    // KIS API에서 현재가 조회
    const prices = await this.getMultiplePrices(
      items.map((item) => item.stockCode),
      items.map((item) => item.stockName)
    );

    // 관심종목 여부 확인 (모두 true)
    return prices.map((price) => ({
      stockCode: price.stockCode,
      stockName: price.stockName,
      currentPrice: price.currentPrice,
      changeAmount: price.changeAmount,
      changeRate: price.changeRate,
      priceDirection: this.getPriceDirection(price.changeAmount),
      isInWatchlist: true,
    }));
  }

  /**
   * 관심종목 추가
   */
  async addToWatchlist(stockCode: string, stockName: string): Promise<WatchlistItem> {
    return await watchlistRepository.addItem(stockCode, stockName);
  }

  /**
   * 관심종목 삭제
   */
  async removeFromWatchlist(id: number): Promise<void> {
    await watchlistRepository.removeItem(id);
  }

  /**
   * 관심종목 순서 변경
   */
  async reorderWatchlist(itemIds: number[]): Promise<void> {
    await watchlistRepository.reorderItems(itemIds);
  }

  /**
   * 종목의 관심종목 여부 확인
   */
  async isInWatchlist(stockCode: string): Promise<boolean> {
    return await watchlistRepository.isWatchlistItem(stockCode);
  }

  // ============================================================================
  // Recently Viewed Operations
  // ============================================================================

  /**
   * 최근 조회 종목 목록 (현재가 포함)
   */
  async getRecentlyViewedWithPrices(limit: number = 50): Promise<StockCardData[]> {
    const items = await watchlistRepository.getRecentlyViewed(limit);

    if (items.length === 0) {
      return [];
    }

    // KIS API에서 현재가 조회
    const prices = await this.getMultiplePrices(
      items.map((item) => item.stockCode),
      items.map((item) => item.stockName)
    );

    // 관심종목 여부 일괄 확인
    const watchlistStatus = await Promise.all(
      prices.map((p) => watchlistRepository.isWatchlistItem(p.stockCode))
    );

    return prices.map((price, index) => ({
      stockCode: price.stockCode,
      stockName: price.stockName,
      currentPrice: price.currentPrice,
      changeAmount: price.changeAmount,
      changeRate: price.changeRate,
      priceDirection: this.getPriceDirection(price.changeAmount),
      isInWatchlist: watchlistStatus[index],
    }));
  }

  /**
   * 최근 조회 종목 추가
   */
  async addToRecentlyViewed(stockCode: string, stockName: string): Promise<RecentlyViewedStock> {
    return await watchlistRepository.addRecentlyViewed(stockCode, stockName);
  }

  /**
   * 최근 조회 기록 전체 삭제
   */
  async clearRecentlyViewed(): Promise<void> {
    await watchlistRepository.clearRecentlyViewed();
  }

  // ============================================================================
  // KIS API Integration
  // ============================================================================

  /**
   * 단일 종목 현재가 조회
   */
  async getStockPrice(stockCode: string, stockName?: string): Promise<StockPrice> {
    await this.initializeKIS();

    const url = this.buildPriceUrl(stockCode);
    const trId = this.getTrId();

    try {
      const response = await this.middleware!.makeRequest<KISPriceApiResponse>({
        method: 'GET',
        url,
        needsAuth: true,
        headers: {
          tr_id: trId,
          custtype: 'P',
        },
      });

      return this.transformPriceResponse(response.data, stockCode, stockName);
    } catch {
      // Fallback: 이름만 반환
      return {
        stockCode,
        stockName: stockName || stockCode,
        currentPrice: 0,
        previousClose: 0,
        changeAmount: 0,
        changeRate: 0,
        lastUpdated: new Date(),
      };
    }
  }

  /**
   * 다중 종목 현재가 조회 (순차 처리 - Rate Limit 준수)
   */
  async getMultiplePrices(stockCodes: string[], stockNames?: string[]): Promise<StockPrice[]> {
    const results: StockPrice[] = [];

    for (let i = 0; i < stockCodes.length; i++) {
      try {
        const price = await this.getStockPrice(stockCodes[i], stockNames?.[i]);
        results.push(price);
      } catch {
        // 개별 실패는 전체 프로세스를 중단하지 않음
        results.push({
          stockCode: stockCodes[i],
          stockName: stockNames?.[i] || stockCodes[i],
          currentPrice: 0,
          previousClose: 0,
          changeAmount: 0,
          changeRate: 0,
          lastUpdated: new Date(),
        });
      }
    }

    return results;
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * 현재가 API URL 빌드
   */
  private buildPriceUrl(stockCode: string): string {
    // 시장구분: J=KOSPI, Q=KOSDAQ
    // 종목코드 첫 글자로 시장 구분 추론 (간단한 휴리스틱)
    const marketCode = stockCode.startsWith('0') || stockCode.startsWith('1') ? 'J' : 'Q';

    const baseUrl =
      this.environment === 'production'
        ? 'https://openapi.koreainvestment.com:9443'
        : 'https://openapivts.koreainvestment.com:29443';

    return `${baseUrl}/uapi/domestic-stock/v1/quotations/inquire-price?fid_cond_mrkt_div_code=${marketCode}&fid_input_iscd=${stockCode}`;
  }

  /**
   * 환경별 TR_ID 반환
   */
  private getTrId(): string {
    return PRICE_TR_ID[this.environment!];
  }

  /**
   * 가격 방향 결정
   */
  private getPriceDirection(changeAmount: number): 'up' | 'down' | 'unchanged' {
    if (changeAmount > 0) return 'up';
    if (changeAmount < 0) return 'down';
    return 'unchanged';
  }

  /**
   * KIS API 응답 변환
   */
  private transformPriceResponse(
    response: KISPriceApiResponse,
    stockCode: string,
    fallbackName?: string
  ): StockPrice {
    const output = response.output;

    const currentPrice = this.parseNumber(output.stck_prpr);
    const previousClose = this.parseNumber(output.stck_sdpr || output.stck_oprc); // 전일종가(stck_sdpr) 우선, 시가(stck_oprc) 대체
    const changeAmount = this.parseNumber(output.prdy_vrss);
    const changeRate = this.parseNumber(output.prdy_ctrt);

    return {
      stockCode, // 파라미터에서 전달받은 종목코드 사용
      stockName: output.hts_kor_isnm || fallbackName || '',
      currentPrice,
      previousClose,
      changeAmount,
      changeRate,
      lastUpdated: new Date(),
    };
  }

  /**
   * 문자열 숫자 파싱
   */
  private parseNumber(value: string): number {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
}

// 싱글톤 인스턴스
export const watchlistService = new WatchlistService();
