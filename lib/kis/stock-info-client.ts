// KIS Stock Info API Client
// SPEC-SCREENING-001: 종목기본정보 조회 클라이언트
import { KISAuthMiddleware } from './auth-middleware';
import type { KISEnvironment } from './types';
import type {
  StockBasicInfo,
  KISStockInfoApiResponse,
  StockInfoQueryParams,
  MarketDivision,
} from '../screening/types';
import { isValidStockCode } from '../screening/types';

/**
 * KIS 종목기본정보 API TR_ID
 * Production: CTPF1602R
 * Mock: VCTPF1602R
 */
const STOCK_INFO_TR_ID = {
  production: 'CTPF1602R',
  mock: 'VCTPF1602R',
};

/**
 * 종목기본정보 조회 서비스
 * KIS OpenAPI 종목기본정보 조회 API 호출 및 데이터 변환
 */
export class KISStockInfoClient {
  private middleware: KISAuthMiddleware;
  private environment: KISEnvironment;
  // appKey는 KISAuthMiddleware 생성에 사용됨

  // 캐시 (TTL: 1일)
  private cache: Map<string, { data: StockBasicInfo; expiresAt: number }> = new Map();
  private readonly CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 1일

  constructor(environment: KISEnvironment, appKey: string, appSecret: string) {
    this.environment = environment;
    this.middleware = new KISAuthMiddleware(environment, appKey, appSecret);
  }

  /**
   * 종목 기본 정보 조회
   * @param stockCode 종목코드 (6자리)
   */
  async getStockInfo(stockCode: string): Promise<StockBasicInfo> {
    // 종목코드 검증
    if (!isValidStockCode(stockCode)) {
      throw new Error(`Invalid stock code: ${stockCode}. Must be 6 digits.`);
    }

    // 캐시 확인
    const cached = this.cache.get(stockCode);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    // API 호출
    const response = await this.fetchStockInfo(stockCode);

    // 데이터 변환
    const stockInfo = this.transformResponse(response);

    // 캐시 저장
    this.cache.set(stockCode, {
      data: stockInfo,
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    });

    return stockInfo;
  }

  /**
   * 다중 종목 정보 조회 (순차 처리)
   * Rate Limit 준수를 위해 순차적으로 호출
   */
  async getMultipleStockInfo(stockCodes: string[]): Promise<StockBasicInfo[]> {
    const results: StockBasicInfo[] = [];

    for (const stockCode of stockCodes) {
      try {
        const info = await this.getStockInfo(stockCode);
        results.push(info);
      } catch {
        // 개별 실패는 전체 프로세스를 중단하지 않음
        // Failed to get stock info for ${stockCode}
      }
    }

    return results;
  }

  /**
   * 종목기본정보 API 호출
   */
  private async fetchStockInfo(stockCode: string): Promise<KISStockInfoApiResponse> {
    const url = this.buildUrl();
    const trId = this.getTrId();

    const params: StockInfoQueryParams = {
      PRDT_TYPE_CD: '300', // 주식
      PDNO: stockCode,
    };

    try {
      const apiResponse = await this.middleware.makeRequest<KISStockInfoApiResponse>({
        method: 'GET',
        url,
        params,
        needsAuth: true,
        headers: {
          tr_id: trId,
        },
      });

      return apiResponse.data;
    } catch (error) {
      // KIS Stock Info API Error
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
    return `${baseUrl}/uapi/domestic-stock/v1/quotations/search-stock-info`;
  }

  /**
   * 환경별 TR_ID 반환
   */
  private getTrId(): string {
    return STOCK_INFO_TR_ID[this.environment];
  }

  /**
   * KIS API 응답을 도메인 타입으로 변환
   */
  private transformResponse(response: KISStockInfoApiResponse): StockBasicInfo {
    const output = response.output;

    // 시장구분코드에서 시장구분명 추출
    // API 응답의 mrkt_div_nm이 없을 경우 mrkt_div_cd로 추론
    let marketDivision: MarketDivision;
    if (output.mrkt_div_nm) {
      marketDivision = output.mrkt_div_nm.includes('KOSDAQ') ? 'KOSDAQ' : 'KOSPI';
    } else {
      // 시장코드로 추론 (1=KOSPI, 2=KOSDAQ 등)
      marketDivision = output.mrkt_div_cd === '2' ? 'KOSDAQ' : 'KOSPI';
    }

    // 시장코드 (API 파라미터용)
    const marketCode = marketDivision === 'KOSPI' ? 'J' : 'Q';

    return {
      stockCode: output.pdno,
      stockName: output.prdt_name,
      marketDivision,
      marketCode,
      marketCap: this.parseMarketCap(output.mrkt_cap_amt),
      sector: output.sect_nm || '',
    };
  }

  /**
   * 시가총액 파싱 (억원 단위로 변환)
   */
  private parseMarketCap(capStr: string): number {
    const cap = parseFloat(capStr) || 0;
    // KIS API는 원 단위로 제공하므로 억원으로 변환
    return Math.round(cap / 100000000);
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
    this.cache.delete(stockCode);
  }
}
