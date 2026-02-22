// KIS Type Definitions

export type KISEnvironment = 'production' | 'mock';

// ============================================================================
// SPEC-KIS-002: Balance Inquiry Types
// ============================================================================

/**
 * KIS API Balance Inquiry Response (Original)
 * KIS OpenAPI 국내주식 잔고조회 API 응답 형식
 */
export interface KISBalanceOutput1 {
  pdno: string; // 종목코드 (6자리)
  prdt_name: string; // 종목명
  hldg_qty: string; // 보유수량
  pchs_avg_pric: string; // 매입평균가격
  pchs_amt: string; // 매입금액
  prpr: string; // 현재가
  evlu_amt: string; // 평가금액
  evlu_pfls_amt: string; // 평가손익금액
  evlu_pfls_rt: string; // 평가손익률 (%)
}

export interface KISBalanceOutput2 {
  dnca_tot_amt: string; // 예수금총금액
  pchs_amt_smtl_amt: string; // 매입금액합계금액
  evlu_amt_smtl_amt: string; // 평가금액합계금액
  evlu_pfls_smtl_amt: string; // 평가손익합계금액
  tot_evlu_amt: string; // 총평가금액
  nass_amt: string; // 순자산금액
}

export interface KISBalanceApiResponse {
  output1: KISBalanceOutput1[];
  output2: KISBalanceOutput2[];
  ctx_area_nk100: string; // 연속조회키 (비어있지 않으면 다음 페이지 존재)
}

/**
 * Domain Types (Transformed)
 * 애플리케이션에서 사용하는 변환된 도메인 타입
 */
export interface StockHolding {
  stockCode: string; // 종목코드
  stockName: string; // 종목명
  quantity: number; // 보유수량
  averagePurchasePrice: number; // 매입평균가
  purchaseAmount: number; // 매입금액
  currentPrice: number; // 현재가
  evaluationAmount: number; // 평가금액
  profitLossAmount: number; // 평가손익금액
  profitLossRate: number; // 수익률 (%)
}

export interface AccountSummary {
  depositTotal: number; // 예수금총금액
  purchaseTotal: number; // 매입금액합계
  evaluationTotal: number; // 평가금액합계
  profitLossTotal: number; // 평가손익합계
  totalEvaluation: number; // 총평가금액
  netAsset: number; // 순자산금액
  profitLossRate: number; // 총수익률 (%)
  lastUpdated: Date; // 마지막 조회 시간
}

export interface BalanceResponse {
  holdings: StockHolding[];
  summary: AccountSummary;
}

/**
 * Balance Query Parameters
 * 잔고조회 API 쿼리 파라미터
 */
export interface BalanceQueryParams {
  CANO: string; // 종합계좌번호 (8자리)
  ACNT_PRDT_CD: string; // 계좌상품코드 (2자리)
  AFHR_FLPR_YN: string; // 시간외단일가여부
  OFL_YN: string; // 오프라인여부
  INQR_DVSN: string; // 조회구분 (02: 종목별)
  UNPR_DVSN: string; // 단가구분 (01)
  FUND_STTL_ICLD_YN: string; // 펀드결제분포함여부
  FNCG_AMT_AUTO_RDPT_YN: string; // 융자금액자동상환여부
  PRCS_DVSN: string; // 처리구분 (00)
  CTX_AREA_FK100: string; // 연속조회검색조건
  CTX_AREA_NK100: string; // 연속조회키
}

/**
 * Account Settings
 * 계좌번호 설정 (암호화된 형태로 저장)
 */
export interface KISAccountSettings {
  id?: number;
  cano_encrypted: string; // 암호화된 종합계좌번호
  acnt_prdt_cd_encrypted: string; // 암호화된 계좌상품코드
  created_at: Date;
  updated_at: Date;
}

/**
 * Account Settings (Masked for API Response)
 * API 응답용 마스킹된 계좌정보
 */
export interface KISAccountSettingsMasked {
  cano: string; // 마스킹된 종합계좌번호 (예: "1234****")
  acntPrdtCd: string; // 계좌상품코드
}

// ============================================================================
// SPEC-KIS-003: Moving Average Comparison Types
// ============================================================================

/**
 * 이동평균선 값 및 신호
 * Moving Average value with comparison signal
 */
export interface MovingAverageValue {
  value: number | null; // null if insufficient data
  signal: 'above' | 'below' | 'na'; // 전일종가 대비 신호
}

/**
 * 일봉 이동평균선 (5, 10, 20, 60, 80, 120, 240일)
 * Daily Moving Averages
 */
export interface DailyMA {
  ma5: MovingAverageValue;
  ma10: MovingAverageValue;
  ma20: MovingAverageValue;
  ma60: MovingAverageValue;
  ma80: MovingAverageValue;
  ma120: MovingAverageValue;
  ma240: MovingAverageValue;
}

/**
 * 주봉 이동평균선 (5, 10, 20, 60주)
 * Weekly Moving Averages
 */
export interface WeeklyMA {
  ma5: MovingAverageValue;
  ma10: MovingAverageValue;
  ma20: MovingAverageValue;
  ma60: MovingAverageValue;
}

/**
 * 월봉 이동평균선 (5, 10, 20월)
 * Monthly Moving Averages
 */
export interface MonthlyMA {
  ma5: MovingAverageValue;
  ma10: MovingAverageValue;
  ma20: MovingAverageValue;
}

/**
 * 이동평균선 비교 결과
 * Moving Average Comparison Result
 */
export interface MovingAverageComparison {
  stockCode: string; // 종목코드 (6자리)
  stockName: string; // 종목명
  previousClose: number; // 전일 종가
  dailyMA: DailyMA; // 일봉 이동평균선
  weeklyMA: WeeklyMA; // 주봉 이동평균선
  monthlyMA: MonthlyMA; // 월봉 이동평균선
  lastUpdated: Date; // 데이터 조회 시각
}

/**
 * KIS API 차트 캔들 데이터 (일봉/주봉/월봉 공통)
 * Chart candle data from KIS API
 */
export interface KISChartCandle {
  stck_bsop_date: string; // 영업 일자 (YYYYMMDD)
  stck_oprc: string; // 시가
  stck_hgpr: string; // 고가
  stck_lwpr: string; // 저가
  stck_clpr: string; // 종가
  acml_vol: string; // 누적 거래량
  acml_tr_pbmn: string; // 누적 거래 대금
}

/**
 * KIS API 차트 응답
 * Chart API Response
 */
export interface KISChartApiResponse {
  rt_cd: string; // 응답 코드
  msg_cd: string; // 메시지 코드
  msg1: string; // 메시지
  output1?: any; // 헤더 정보
  output2: KISChartCandle[]; // 캔들 배열
}

// ============================================================================
// End of SPEC-KIS-003 Types
// ============================================================================

export interface KISAuthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  expires_at: Date;
  environment?: KISEnvironment;
}

export interface KISConfig {
  id?: number;
  app_key: string;
  app_secret: string;
  environment: KISEnvironment;
  created_at: Date;
  updated_at: Date;
}

export interface KISApiLog {
  id?: number;
  request_id: string;
  endpoint: string;
  method: string;
  request_headers: string;
  request_body: string;
  response_status: number;
  response_body: string;
  created_at: Date;
}

export interface KISApiEndpoints {
  tokenIssue: string;
  tokenRevoke: string;
  hashkey: string;
  websocket: string;
}

export const KIS_API_ENDPOINTS: Record<KISEnvironment, KISApiEndpoints> = {
  production: {
    tokenIssue: 'https://openapi.koreainvestment.com:9443/oauth2/tokenP',
    tokenRevoke: 'https://openapi.koreainvestment.com:9443/oauth2/revokeP',
    hashkey: 'https://openapi.koreainvestment.com:9443/uapi/hashkey',
    websocket: 'https://openapi.koreainvestment.com:9443/oauth2/Approval',
  },
  mock: {
    tokenIssue: 'https://openapivts.koreainvestment.com:29443/oauth2/tokenP',
    tokenRevoke: 'https://openapivts.koreainvestment.com:29443/oauth2/revokeP',
    hashkey: 'https://openapivts.koreainvestment.com:29443/uapi/hashkey',
    websocket: 'https://openapivts.koreainvestment.com:29443/oauth2/Approval',
  },
};
