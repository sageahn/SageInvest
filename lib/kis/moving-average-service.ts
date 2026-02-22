// KIS Moving Average Comparison Service
// SPEC-KIS-003: 이동평균선 비교 분석 서비스
import { KISAuthMiddleware } from './auth-middleware';
import type {
  KISEnvironment,
  MovingAverageValue,
  DailyMA,
  WeeklyMA,
  MonthlyMA,
  MovingAverageComparison,
  KISChartApiResponse,
  KISChartCandle,
} from './types';

/**
 * 차트 타입 정의
 */
type ChartType = 'daily' | 'weekly' | 'monthly';

/**
 * 이동평균선 비교 분석 서비스
 * KIS OpenAPI 차트 데이터 조회 및 이동평균선 계산
 */
export class KISMovingAverageService {
  private middleware: KISAuthMiddleware;
  private environment: KISEnvironment;

  // Rate Limit: 초당 15건 (권장)
  private readonly REQUEST_INTERVAL_MS = 1000 / 15;
  private lastRequestTime = 0;

  // 서버 측 캐시 (TTL: 30초)
  private cache: Map<string, { data: MovingAverageComparison; expiresAt: number }> = new Map();
  private readonly CACHE_TTL_MS = 30000;

  constructor(environment: KISEnvironment, appKey: string) {
    this.environment = environment;
    this.middleware = new KISAuthMiddleware(environment, appKey);
  }

  /**
   * 단일 종목 이동평균선 비교 분석
   * @param stockCode 종목코드 (6자리)
   * @param stockName 종목명 (선택사항)
   * @param forceRefresh 캐시 무시 여부
   */
  async compareSingleStock(
    stockCode: string,
    stockName: string = '',
    forceRefresh = false
  ): Promise<MovingAverageComparison> {
    // 종목코드 유효성 검사
    if (!this.validateStockCode(stockCode)) {
      throw new Error(`유효하지 않은 종목코드입니다: ${stockCode}`);
    }

    const cacheKey = `ma:${stockCode}`;

    // 캐시 확인
    if (!forceRefresh) {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.data;
      }
    }

    // 차트 데이터 조회 (일봉, 주봉, 월봉)
    const [dailyCandles, weeklyCandles, monthlyCandles] = await Promise.all([
      this.fetchChartCandles(stockCode, 'daily'),
      this.fetchChartCandles(stockCode, 'weekly'),
      this.fetchChartCandles(stockCode, 'monthly'),
    ]);

    // 전일 종가 (일봉 최신 데이터)
    const previousClose = dailyCandles.length > 0 ? parseInt(dailyCandles[0].stck_clpr, 10) : 0;

    // 이동평균선 계산
    const dailyMA = this.calculateDailyMA(dailyCandles, previousClose);
    const weeklyMA = this.calculateWeeklyMA(weeklyCandles, previousClose);
    const monthlyMA = this.calculateMonthlyMA(monthlyCandles, previousClose);

    const result: MovingAverageComparison = {
      stockCode,
      stockName,
      previousClose,
      dailyMA,
      weeklyMA,
      monthlyMA,
      lastUpdated: new Date(),
    };

    // 캐시 저장
    this.cache.set(cacheKey, {
      data: result,
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    });

    return result;
  }

  /**
   * 다중 종목 이동평균선 비교 분석 (배치 처리)
   * @param stockCodes 종목코드 배열
   * @param stockNames 종목명 맵 (선택사항)
   */
  async compareMultipleStocks(
    stockCodes: string[],
    stockNames: Record<string, string> = {}
  ): Promise<MovingAverageComparison[]> {
    const results: MovingAverageComparison[] = [];
    const batchSize = 5; // 동시 요청 수 제한

    for (let i = 0; i < stockCodes.length; i += batchSize) {
      const batch = stockCodes.slice(i, i + batchSize);

      // 배치 내 병렬 처리
      const batchResults = await Promise.all(
        batch.map((code) =>
          this.compareSingleStock(code, stockNames[code] || '').catch((error) => {
            console.error(`Failed to analyze ${code}:`, error);
            return null;
          })
        )
      );

      // null 제외하고 결과 추가
      results.push(...(batchResults.filter(Boolean) as MovingAverageComparison[]));

      // 배치 간 Rate Limit 준수를 위한 대기
      if (i + batchSize < stockCodes.length) {
        await this.sleep(this.REQUEST_INTERVAL_MS * 3);
      }
    }

    return results;
  }

  /**
   * 차트 캔들 데이터 조회
   */
  private async fetchChartCandles(
    stockCode: string,
    chartType: ChartType
  ): Promise<KISChartCandle[]> {
    // Rate Limit 준수
    await this.waitForRateLimit();

    const url = this.buildChartUrl(chartType);
    const trId = this.getChartTrId(chartType);

    try {
      const response = await this.middleware.makeRequest<KISChartApiResponse>({
        method: 'GET',
        url,
        params: {
          FID_COND_MRKT_DIV_CODE: 'J', // 주식
          FID_INPUT_ISCD: stockCode,
          FID_INPUT_DATE_1: '',
          FID_INPUT_DATE_2: '',
          FID_PERIOD_DIV_CODE: this.getPeriodDivCode(chartType),
        },
        needsAuth: true,
        headers: {
          tr_id: trId,
          custtype: 'P',
        },
      });

      return response.data.output2 || [];
    } catch (error) {
      console.error(`Failed to fetch ${chartType} chart for ${stockCode}:`, error);
      throw error;
    }
  }

  /**
   * 일봉 이동평균선 계산 (5, 10, 20, 60, 80, 120, 240일)
   */
  private calculateDailyMA(candles: KISChartCandle[], previousClose: number): DailyMA {
    const closes = candles.map((c) => parseInt(c.stck_clpr, 10));

    return {
      ma5: this.calculateMAAndSignal(closes, 5, previousClose),
      ma10: this.calculateMAAndSignal(closes, 10, previousClose),
      ma20: this.calculateMAAndSignal(closes, 20, previousClose),
      ma60: this.calculateMAAndSignal(closes, 60, previousClose),
      ma80: this.calculateMAAndSignal(closes, 80, previousClose),
      ma120: this.calculateMAAndSignal(closes, 120, previousClose),
      ma240: this.calculateMAAndSignal(closes, 240, previousClose),
    };
  }

  /**
   * 주봉 이동평균선 계산 (5, 10, 20, 60주)
   */
  private calculateWeeklyMA(candles: KISChartCandle[], previousClose: number): WeeklyMA {
    const closes = candles.map((c) => parseInt(c.stck_clpr, 10));

    return {
      ma5: this.calculateMAAndSignal(closes, 5, previousClose),
      ma10: this.calculateMAAndSignal(closes, 10, previousClose),
      ma20: this.calculateMAAndSignal(closes, 20, previousClose),
      ma60: this.calculateMAAndSignal(closes, 60, previousClose),
    };
  }

  /**
   * 월봉 이동평균선 계산 (5, 10, 20월)
   */
  private calculateMonthlyMA(candles: KISChartCandle[], previousClose: number): MonthlyMA {
    const closes = candles.map((c) => parseInt(c.stck_clpr, 10));

    return {
      ma5: this.calculateMAAndSignal(closes, 5, previousClose),
      ma10: this.calculateMAAndSignal(closes, 10, previousClose),
      ma20: this.calculateMAAndSignal(closes, 20, previousClose),
    };
  }

  /**
   * SMA 계산 및 신호 생성
   * @param closes 종가 배열 (최신순)
   * @param period 이동평균 기간
   * @param previousClose 전일 종가
   */
  private calculateMAAndSignal(
    closes: number[],
    period: number,
    previousClose: number
  ): MovingAverageValue {
    const sma = this.calculateSMA(closes, period);

    if (sma === null) {
      return {
        value: null,
        signal: 'na',
      };
    }

    return {
      value: sma,
      signal: previousClose > sma ? 'above' : 'below',
    };
  }

  /**
   * 단순이동평균(SMA) 계산
   * @param closes 종가 배열 (최신순)
   * @param period 기간
   * @returns SMA 값 또는 null (데이터 부족 시)
   */
  private calculateSMA(closes: number[], period: number): number | null {
    if (closes.length < period) {
      return null;
    }

    const slice = closes.slice(0, period);
    const sum = slice.reduce((acc, val) => acc + val, 0);
    return Math.round(sum / period);
  }

  /**
   * 차트 타입별 URL 생성
   */
  private buildChartUrl(chartType: ChartType): string {
    const baseUrl =
      this.environment === 'production'
        ? 'https://openapi.koreainvestment.com:9443'
        : 'https://openapivts.koreainvestment.com:29443';

    const endpoints: Record<ChartType, string> = {
      daily: '/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice',
      weekly: '/uapi/domestic-stock/v1/quotations/inquire-weekly-itemchartprice',
      monthly: '/uapi/domestic-stock/v1/quotations/inquire-monthly-itemchartprice',
    };

    return `${baseUrl}${endpoints[chartType]}`;
  }

  /**
   * 차트 타입별 tr_id 조회
   */
  private getChartTrId(chartType: ChartType): string {
    const trIds: Record<ChartType, Record<KISEnvironment, string>> = {
      daily: {
        production: 'FHKST03010100',
        mock: 'HHKST03010100',
      },
      weekly: {
        production: 'FHKST03010200',
        mock: 'HHKST03010200',
      },
      monthly: {
        production: 'FHKST03010300',
        mock: 'HHKST03010300',
      },
    };

    return trIds[chartType][this.environment];
  }

  /**
   * 차트 타입별 기간 구분 코드
   */
  private getPeriodDivCode(chartType: ChartType): string {
    const codes: Record<ChartType, string> = {
      daily: 'D',
      weekly: 'W',
      monthly: 'M',
    };
    return codes[chartType];
  }

  /**
   * 종목코드 유효성 검사
   */
  private validateStockCode(stockCode: string): boolean {
    return /^\d{6}$/.test(stockCode);
  }

  /**
   * Rate Limit 준수를 위한 요청 간격 제어
   */
  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;

    if (elapsed < this.REQUEST_INTERVAL_MS) {
      await this.sleep(this.REQUEST_INTERVAL_MS - elapsed);
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * 유틸리티: sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
    this.cache.delete(`ma:${stockCode}`);
  }
}
