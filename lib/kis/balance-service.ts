// KIS Balance Inquiry Service
// SPEC-KIS-002: 국내주식 잔고조회 서비스
import { KISAuthMiddleware } from './auth-middleware';
import type {
  KISBalanceApiResponse,
  StockHolding,
  AccountSummary,
  BalanceResponse,
  BalanceQueryParams,
  KISEnvironment,
} from './types';

/**
 * 잔고조회 서비스
 * KIS OpenAPI 국내주식 잔고조회 API 호출 및 데이터 변환
 */
export class KISBalanceService {
  private middleware: KISAuthMiddleware;
  private environment: KISEnvironment;

  // Rate Limit: 초당 15건 (권장)
  private readonly REQUEST_INTERVAL_MS = 1000 / 15;
  private lastRequestTime = 0;

  // 서버 측 캐시 (Optional, TTL: 30초)
  private cache: Map<string, { data: BalanceResponse; expiresAt: number }> = new Map();
  private readonly CACHE_TTL_MS = 30000;

  constructor(environment: KISEnvironment, appKey: string, appSecret: string) {
    this.environment = environment;
    this.middleware = new KISAuthMiddleware(environment, appKey, appSecret);
  }

  /**
   * 잔고 전체 조회 (종목 목록 + 자산 요약)
   */
  async getBalance(
    cano: string,
    acntPrdtCd: string,
    forceRefresh = false
  ): Promise<BalanceResponse> {
    const cacheKey = `${cano}-${acntPrdtCd}`;

    // 캐시 확인 (forceRefresh가 false인 경우)
    if (!forceRefresh) {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.data;
      }
    }

    // 전체 보유 종목 조회 (페이지네이션 포함)
    const holdings = await this.getFullHoldings(cano, acntPrdtCd);

    // 계좌 요약 조회
    const summary = await this.getAccountSummary(cano, acntPrdtCd);

    const response: BalanceResponse = {
      holdings,
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
   * 전체 보유 종목 조회 (페이지네이션 처리)
   */
  async getFullHoldings(cano: string, acntPrdtCd: string): Promise<StockHolding[]> {
    const allHoldings: StockHolding[] = [];
    let ctxAreaNk100 = '';
    let pageIndex = 0;

    // 페이지네이션: 최대 100페이지 (안전장치)
    const MAX_PAGES = 100;

    do {
      // Rate Limit 준수를 위한 요청 간격 제어
      await this.waitForRateLimit();

      const params = this.buildQueryParams(cano, acntPrdtCd, ctxAreaNk100);
      const response = await this.fetchPage(params);

      // output1 변환
      const holdings = response.output1.map((item) => this.transformHolding(item));
      allHoldings.push(...holdings);

      // 다음 페이지 확인
      ctxAreaNk100 = response.ctx_area_nk100;
      pageIndex++;
    } while (ctxAreaNk100 && pageIndex < MAX_PAGES);

    return allHoldings;
  }

  /**
   * 계좌 요약 조회 (경량)
   */
  async getAccountSummary(cano: string, acntPrdtCd: string): Promise<AccountSummary> {
    // Rate Limit 준수
    await this.waitForRateLimit();

    const params = this.buildQueryParams(cano, acntPrdtCd, '');
    const response = await this.fetchPage(params);

    return this.transformSummary(response.output2[0]);
  }

  /**
   * 단일 페이지 조회
   */
  private async fetchPage(params: BalanceQueryParams): Promise<KISBalanceApiResponse> {
    const url = this.buildUrl();

    try {
      const apiResponse = await this.middleware.makeRequest<KISBalanceApiResponse>({
        method: 'GET',
        url,
        params,
        needsAuth: true,
      });

      return apiResponse.data;
    } catch (error) {
      console.error('KIS Balance API Error:', error);
      throw error;
    }
  }

  /**
   * 쿼리 파라미터 조립
   */
  private buildQueryParams(
    cano: string,
    acntPrdtCd: string,
    ctxAreaNk100: string
  ): BalanceQueryParams {
    return {
      CANO: cano,
      ACNT_PRDT_CD: acntPrdtCd,
      AFHR_FLPR_YN: 'N', // 시간외단일가여부
      OFL_YN: '', // 오프라인여부
      INQR_DVSN: '02', // 조회구분 (종목별)
      UNPR_DVSN: '01', // 단가구분
      FUND_STTL_ICLD_YN: 'N', // 펀드결제분포함여부
      FNCG_AMT_AUTO_RDPT_YN: 'N', // 융자금액자동상환여부
      PRCS_DVSN: '00', // 처리구분
      CTX_AREA_FK100: '', // 연속조회검색조건
      CTX_AREA_NK100: ctxAreaNk100, // 연속조회키
    };
  }

  /**
   * URL 빌드
   */
  private buildUrl(): string {
    const baseUrl =
      this.environment === 'production'
        ? 'https://openapi.koreainvestment.com:9443'
        : 'https://openapivts.koreainvestment.com:29443';
    return `${baseUrl}/uapi/domestic-stock/v1/trading/inquire-balance`;
  }

  /**
   * 종목 데이터 변환 (문자열 → 숫자)
   */
  private transformHolding(raw: any): StockHolding {
    return {
      stockCode: raw.pdno,
      stockName: raw.prdt_name,
      quantity: parseInt(raw.hldg_qty, 10) || 0,
      averagePurchasePrice: parseInt(raw.pchs_avg_pric, 10) || 0,
      purchaseAmount: parseInt(raw.pchs_amt, 10) || 0,
      currentPrice: parseInt(raw.prpr, 10) || 0,
      evaluationAmount: parseInt(raw.evlu_amt, 10) || 0,
      profitLossAmount: parseInt(raw.evlu_pfls_amt, 10) || 0,
      profitLossRate: this.parseRate(raw.evlu_pfls_rt),
    };
  }

  /**
   * 계좌 요약 변환 (문자열 → 숫자)
   */
  private transformSummary(raw: any): AccountSummary {
    const depositTotal = parseInt(raw.dnca_tot_amt, 10) || 0;
    const purchaseTotal = parseInt(raw.pchs_amt_smtl_amt, 10) || 0;
    const profitLossTotal = parseInt(raw.evlu_pfls_smtl_amt, 10) || 0;
    const totalEvaluation = parseInt(raw.tot_evlu_amt, 10) || 0;

    // 총수익률 계산: 총평가손익 / 총매입금액 * 100
    const profitLossRate = purchaseTotal > 0 ? (profitLossTotal / purchaseTotal) * 100 : 0;

    return {
      depositTotal,
      purchaseTotal,
      evaluationTotal: parseInt(raw.evlu_amt_smtl_amt, 10) || 0,
      profitLossTotal,
      totalEvaluation,
      netAsset: parseInt(raw.nass_amt, 10) || 0,
      profitLossRate: Math.round(profitLossRate * 100) / 100, // 소수점 2자리
      lastUpdated: new Date(),
    };
  }

  /**
   * 수익률 파싱 (KIS API는 소수점 없이 백분율로 제공)
   */
  private parseRate(rateStr: string): number {
    const rate = parseFloat(rateStr) || 0;
    return Math.round(rate * 100) / 100; // 소수점 2자리
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
  }

  /**
   * 특정 계좌 캐시 무효화
   */
  clearAccountCache(cano: string, acntPrdtCd: string): void {
    const cacheKey = `${cano}-${acntPrdtCd}`;
    this.cache.delete(cacheKey);
  }
}
