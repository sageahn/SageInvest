// Screening Type Definitions
// SPEC-SCREENING-001: 이동평균선 돌파 스크리닝 시스템 타입 정의

// ============================================================================
// SPEC-SCREENING-001: Screening Types
// ============================================================================

/**
 * 시장구분 (Market Division)
 */
export type MarketDivision = 'KOSPI' | 'KOSDAQ';

/**
 * 이동평균선 기간 (MA Period)
 * 지원 기간: 5일, 10일, 20일, 60일, 120일
 */
export type MAPeriod = 5 | 10 | 20 | 60 | 120;

/**
 * 종목 기본 정보
 * KIS OpenAPI 종목기본정보 조회 결과
 */
export interface StockBasicInfo {
  stockCode: string; // 종목코드 (6자리)
  stockName: string; // 종목명
  marketDivision: MarketDivision; // 시장구분 (KOSPI/KOSDAQ)
  marketCode: string; // 시장코드 (API 파라미터용: J=KOSPI, Q=KOSDAQ)
  marketCap: number; // 시가총액 (억원 단위)
  sector: string; // 섹터명
}

/**
 * 일별 가격 데이터 (OHLCV)
 * KIS OpenAPI 주식일봉차트조회 결과
 */
export interface DailyPriceData {
  date: Date; // 영업일자
  open: number; // 시가
  high: number; // 고가
  low: number; // 저가
  close: number; // 종가
  volume: number; // 거래량
  amount: number; // 거래대금
}

/**
 * 가격 이력 조회 요청 파라미터
 */
export interface PriceHistoryRequest {
  stockCode: string; // 종목코드
  marketCode: string; // 시장코드 (J/Q)
  startDate: Date; // 시작일자
  endDate: Date; // 종료일자
}

/**
 * 이동평균선 돌파 지점
 */
export interface BreakthroughPoint {
  date: Date; // 돌파일자
  price: number; // 돌파가격 (종가)
  maValue: number; // 돌파시점 MA 값
}

/**
 * MA 스크리닝 결과
 * 종목별 이동평균선 돌파 분석 결과
 */
export interface MAScreeningResult {
  // 기본 정보
  stockCode: string; // 종목코드
  stockName: string; // 종목명
  market: MarketDivision; // 시장구분
  marketCap: number; // 시가총액 (억원)

  // 현재 상태
  currentPrice: number; // 현재가격

  // 이동평균선 분석
  maPeriod: number; // 이동평균선 기간
  currentMA: number; // 현재 이동평균선 값
  isAboveMA: boolean; // 현재 MA 위에 있는지 여부

  // 돌파 정보
  breakthroughPrice: number; // 돌파시점 가격
  breakthroughDate: Date; // 돌파시점 일자
  breakthroughReturnRate: number; // 돌파상승률 (%)
  daysSinceBreakthrough: number; // 돌파 후 경과일수

  // 메타데이터
  calculatedAt: Date; // 계산 일시
}

/**
 * 스크리닝 요약 정보
 */
export interface ScreeningSummary {
  totalStocks: number; // 분석 대상 종목 수
  breakthroughCount: number; // 돌파 종목 수
  averageReturnRate: number; // 평균 돌파상승률
  screenedAt: Date; // 스크리닝 수행 일시
  maPeriod: number; // 사용된 MA 기간
}

/**
 * 스크리닝 API 응답
 */
export interface ScreeningResponse {
  results: MAScreeningResult[];
  summary: ScreeningSummary;
}

/**
 * 포트폴리오 스크리닝 요청
 */
export interface PortfolioScreeningRequest {
  cano: string; // 종합계좌번호 (8자리)
  acntPrdtCd: string; // 계좌상품코드 (2자리)
  maPeriod?: MAPeriod; // MA 기간 (기본값: 20)
}

/**
 * 시장 스크리닝 요청
 */
export interface MarketScreeningRequest {
  stockCodes: string[]; // 종목코드 리스트 (최대 100개)
  maPeriod?: MAPeriod; // MA 기간 (기본값: 20)
}

// ============================================================================
// KIS API Raw Types (응답 형식)
// ============================================================================

/**
 * KIS 종목기본정보 API 응답 (Original)
 */
export interface KISStockInfoOutput {
  pdno: string; // 종목코드
  prdt_name: string; // 종목명
  mrkt_div_nm: string; // 시장구분명 (KOSPI/KOSDAQ)
  mrkt_div_cd: string; // 시장구분코드
  mrkt_cap_amt: string; // 시가총액
  sect_nm: string; // 섹터명
}

/**
 * KIS 종목기본정보 API 응답
 */
export interface KISStockInfoApiResponse {
  output: KISStockInfoOutput;
}

/**
 * KIS 일봉차트조회 API 응답 (output2 - 일별 데이터)
 */
export interface KISDailyChartOutput {
  stck_bsop_date: string; // 영업일자 (YYYYMMDD)
  stck_oprc: string; // 시가
  stck_hgpr: string; // 고가
  stck_lwpr: string; // 저가
  stck_clpr: string; // 종가
  acml_vol: string; // 누적거래량
  acml_tr_pbmn: string; // 누적거래대금
}

/**
 * KIS 일봉차트조회 API 응답
 */
export interface KISDailyChartApiResponse {
  output2: KISDailyChartOutput[];
}

/**
 * KIS 종목기본정보 조회 쿼리 파라미터
 */
export interface StockInfoQueryParams {
  PRDT_TYPE_CD: string; // 상품유형코드 (300=주식)
  PDNO: string; // 종목코드 (6자리)
}

/**
 * KIS 일봉차트조회 쿼리 파라미터
 */
export interface DailyChartQueryParams {
  FID_COND_MRKT_DIV_CODE: string; // 시장분류코드 (J=KOSPI, Q=KOSDAQ)
  FID_INPUT_ISCD: string; // 종목코드 (6자리)
  FID_INPUT_DATE_1: string; // 시작일자 (YYYYMMDD)
  FID_INPUT_DATE_2: string; // 종료일자 (YYYYMMDD)
  FID_PERIOD_DIV_CODE: string; // 기간분류코드 (D=일봉)
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * 종목코드 검증 (6자리 숫자)
 */
export function isValidStockCode(code: string): boolean {
  return /^\d{6}$/.test(code);
}

/**
 * 시장구분명을 시장코드로 변환
 * KOSPI -> J, KOSDAQ -> Q
 */
export function marketDivisionToCode(division: MarketDivision): string {
  return division === 'KOSPI' ? 'J' : 'Q';
}

/**
 * 시장코드를 시장구분명으로 변환
 * J -> KOSPI, Q -> KOSDAQ
 */
export function marketCodeToDivision(code: string): MarketDivision {
  return code === 'J' ? 'KOSPI' : 'KOSDAQ';
}

/**
 * 날짜를 YYYYMMDD 형식으로 변환
 */
export function formatDateToYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * YYYYMMDD 형식 문자열을 Date로 변환
 */
export function parseYYYYMMDDToDate(dateStr: string): Date {
  const year = parseInt(dateStr.substring(0, 4), 10);
  const month = parseInt(dateStr.substring(4, 6), 10) - 1;
  const day = parseInt(dateStr.substring(6, 8), 10);
  return new Date(year, month, day);
}

/**
 * 금액 포맷팅 (천 단위 쉼표)
 */
export function formatCurrency(amount: number): string {
  return amount.toLocaleString('ko-KR');
}

/**
 * 수익률 포맷팅 (소수점 2자리 + %)
 */
export function formatReturnRate(rate: number): string {
  return `${rate.toFixed(2)}%`;
}

/**
 * 기본 MA 기간 (20일)
 */
export const DEFAULT_MA_PERIOD: MAPeriod = 20;

/**
 * 지원 MA 기간 리스트
 */
export const SUPPORTED_MA_PERIODS: MAPeriod[] = [5, 10, 20, 60, 120];

/**
 * 최대 스크리닝 종목 수 (Rate Limit 고려)
 */
export const MAX_SCREENING_STOCKS = 100;

/**
 * Rate Limit: 초당 최대 요청 수
 */
export const RATE_LIMIT_PER_SECOND = 15;

// ============================================================================
// End of SPEC-SCREENING-001 Types
// ============================================================================
