// Watchlist Type Definitions
// SPEC-WATCHLIST-001: 관심 종목 관리

/**
 * 관심 종목 아이템
 * Watchlist item with stock information
 */
export interface WatchlistItem {
  id: number;
  stockCode: string; // 종목코드 (6자리)
  stockName: string; // 종목명
  groupId: number | null; // 그룹 ID (향후 확장용)
  ordering: number; // 정렬 순서
  addedAt: Date; // 추가 일시
}

/**
 * 관심 종목 그룹 (향후 확장용)
 * Watchlist group for categorization
 */
export interface WatchlistGroup {
  id: number;
  name: string;
  ordering: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 최근 조회 종목
 * Recently viewed stock
 */
export interface RecentlyViewedStock {
  id: number;
  stockCode: string; // 종목코드 (6자리)
  stockName: string; // 종목명
  viewedAt: Date; // 조회 일시
}

/**
 * 주식 현재가 정보 (KIS API 연동)
 * Stock current price with change information
 */
export interface StockPrice {
  stockCode: string;
  stockName: string;
  currentPrice: number; // 현재가
  previousClose: number; // 전일종가
  changeAmount: number; // 대비
  changeRate: number; // 등락률 (%)
  lastUpdated: Date;
}

/**
 * 주식 카드 표시용 데이터
 * Stock card display data
 */
export interface StockCardData {
  stockCode: string;
  stockName: string;
  currentPrice: number;
  changeAmount: number;
  changeRate: number;
  priceDirection: 'up' | 'down' | 'unchanged'; // 가격 방향
  isInWatchlist: boolean; // 관심종목 여부
}

/**
 * API 응답 타입
 */
export interface WatchlistApiResponse {
  success: boolean;
  data?: WatchlistItem[];
  error?: string;
}

export interface RecentlyViewedApiResponse {
  success: boolean;
  data?: RecentlyViewedStock[];
  error?: string;
}

/**
 * 관심종목 추가 요청
 */
export interface AddWatchlistRequest {
  stockCode: string;
  stockName: string;
}

/**
 * 최근 조회 추가 요청
 */
export interface AddRecentlyViewedRequest {
  stockCode: string;
  stockName: string;
}

/**
 * 관심종목 순서 변경 요청
 */
export interface ReorderWatchlistRequest {
  itemIds: number[]; // 새로운 순서대로 정렬된 ID 목록
}

/**
 * KIS API 현재가 응답
 * KIS API current price response
 */
export interface KISPriceApiResponse {
  rt_cd: string;
  msg_cd: string;
  msg1: string;
  output: {
    stck_prpr: string; // 주식현재가
    prdy_vrss: string; // 전일대비
    prdy_vrss_sign: string; // 전일대비부호 (1:상한, 2:상승, 3:보합, 4:하락, 5:하한)
    prdy_ctrt: string; // 전일대비율
    stck_oprc: string; // 주식시가
    stck_sdpr?: string; // 전일종가(전일정산가)
    stck_hgpr: string; // 주식최고가
    stck_lwpr: string; // 주식최저가
    acml_vol: string; // 누적거래량
    hts_kor_isnm: string; // 한글종목명
  };
}
