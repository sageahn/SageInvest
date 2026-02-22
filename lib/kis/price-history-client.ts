// KIS Price History API Client
// SPEC-SCREENING-001: 주식일봉차트조회 클라이언트
import { KISAuthMiddleware } from './auth-middleware';
import type { KISEnvironment } from './types';
import type {
  DailyPriceData,
  PriceHistoryRequest,
  KISDailyChartApiResponse,
  DailyChartQueryParams,
} from '../screening/types';
import { formatDateToYYYYMMDD, parseYYYYMMDDToDate } from '../screening/types';

/**
 * KIS 주식일봉차트조회 API TR_ID
 * Production: FHKST03010100
 * Mock: FHKST03010100 (동일)
 */
const DAILY_CHART_TR_ID = 'FHKST03010100';

/**
 * 최대 조회 일수 (API 제한)
 */
const MAX_QUERY_DAYS = 100;

/**
 * 일봉차트조회 서비스
 * KIS OpenAPI 주식일봉차트조회 API 호출 및 데이터 변환
 */
export class KISPriceHistoryClient {
  private middleware: KISAuthMiddleware;
  private environment: KISEnvironment;

  // 캐시 (TTL: 장중 5분, 장외 1시간)
  private cache: Map<string, { data: DailyPriceData[]; expiresAt: number }> = new Map();
  private readonly CACHE_TTL_MS_MARKET_OPEN = 5 * 60 * 1000; // 5분
  private readonly CACHE_TTL_MS_MARKET_CLOSED = 60 * 60 * 1000; // 1시간

  constructor(environment: KISEnvironment, appKey: string, appSecret: string) {
    this.environment = environment;
    this.middleware = new KISAuthMiddleware(environment, appKey, appSecret);
  }

  /**
   * 가격 이력 조회
   * @param request 조회 요청 파라미터
   */
  async getPriceHistory(request: PriceHistoryRequest): Promise<DailyPriceData[]> {
    const cacheKey = this.getCacheKey(request);

    // 캐시 확인
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    // API 호출
    const response = await this.fetchDailyChart(request);

    // 데이터 변환
    const priceData = this.transformResponse(response);

    // 날짜 오름차순 정렬
    priceData.sort((a, b) => a.date.getTime() - b.date.getTime());

    // 캐시 저장
    this.cache.set(cacheKey, {
      data: priceData,
      expiresAt: Date.now() + this.getCacheTTL(),
    });

    return priceData;
  }

  /**
   * MA 계산을 위한 충분한 데이터 조회
   * @param stockCode 종목코드
   * @param marketCode 시장코드 (J/Q)
   * @param period MA 기간
   */
  async getPriceHistoryForMA(
    stockCode: string,
    marketCode: string,
    period: number
  ): Promise<DailyPriceData[]> {
    // MA 기간의 2배 데이터 조회 (여유분 포함)
    const daysToQuery = Math.min(period * 2, MAX_QUERY_DAYS);
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysToQuery);

    return this.getPriceHistory({
      stockCode,
      marketCode,
      startDate,
      endDate,
    });
  }

  /**
   * 일봉차트조회 API 호출
   */
  private async fetchDailyChart(request: PriceHistoryRequest): Promise<KISDailyChartApiResponse> {
    const url = this.buildUrl();

    const params: DailyChartQueryParams = {
      FID_COND_MRKT_DIV_CODE: request.marketCode,
      FID_INPUT_ISCD: request.stockCode,
      FID_INPUT_DATE_1: formatDateToYYYYMMDD(request.startDate),
      FID_INPUT_DATE_2: formatDateToYYYYMMDD(request.endDate),
      FID_PERIOD_DIV_CODE: 'D', // 일봉
    };

    try {
      const apiResponse = await this.middleware.makeRequest<KISDailyChartApiResponse>({
        method: 'GET',
        url,
        params,
        needsAuth: true,
        headers: {
          tr_id: DAILY_CHART_TR_ID,
        },
      });

      return apiResponse.data;
    } catch (error) {
      // KIS Daily Chart API Error
      throw error;
    }
  }

  /**
   * API URL 빌드
   */
  private buildUrl(): string {
    const baseUrl =
      this.environment === 'production'
        ? 'https://openapi.koreainvestment.com:9443'
        : 'https://openapivts.koreainvestment.com:29443';
    return `${baseUrl}/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice`;
  }

  /**
   * KIS API 응답을 도메인 타입으로 변환
   */
  private transformResponse(response: KISDailyChartApiResponse): DailyPriceData[] {
    if (!response.output2 || !Array.isArray(response.output2)) {
      return [];
    }

    return response.output2
      .filter((item) => item.stck_bsop_date) // 유효한 데이터만
      .map((item) => ({
        date: parseYYYYMMDDToDate(item.stck_bsop_date),
        open: parseInt(item.stck_oprc, 10) || 0,
        high: parseInt(item.stck_hgpr, 10) || 0,
        low: parseInt(item.stck_lwpr, 10) || 0,
        close: parseInt(item.stck_clpr, 10) || 0,
        volume: parseInt(item.acml_vol, 10) || 0,
        amount: parseInt(item.acml_tr_pbmn, 10) || 0,
      }));
  }

  /**
   * 캐시 키 생성
   */
  private getCacheKey(request: PriceHistoryRequest): string {
    return `${request.stockCode}-${request.marketCode}-${formatDateToYYYYMMDD(request.startDate)}-${formatDateToYYYYMMDD(request.endDate)}`;
  }

  /**
   * 장 운영 여부에 따른 캐시 TTL 반환
   */
  private getCacheTTL(): number {
    // 한국 주식시장 운영 시간: 09:00 ~ 15:30
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const dayOfWeek = now.getDay();

    // 주말 체크
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return this.CACHE_TTL_MS_MARKET_CLOSED;
    }

    // 장중 체크 (09:00 ~ 15:30)
    const isMarketOpen = hour >= 9 && (hour < 15 || (hour === 15 && minute <= 30));

    return isMarketOpen ? this.CACHE_TTL_MS_MARKET_OPEN : this.CACHE_TTL_MS_MARKET_CLOSED;
  }

  /**
   * 캐시 무효화
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 특정 종목 캐시 무효화
   */
  clearStockCache(stockCode: string): void {
    // 해당 종목코드가 포함된 모든 캐시 키 삭제
    for (const key of this.cache.keys()) {
      if (key.startsWith(stockCode)) {
        this.cache.delete(key);
      }
    }
  }
}
