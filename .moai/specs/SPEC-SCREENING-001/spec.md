---
SPEC_ID: SPEC-SCREENING-001
TITLE: 이동평균선 돌파 스크리닝 시스템
STATUS: Planned
PRIORITY: High
ASSIGNED: manager-spec
DOMAIN: SCREENING (Technical Analysis)
CREATED: 2026-02-22T09:00:00Z
UPDATED: 2026-02-22T09:00:00Z
LIFECYCLE: spec-anchored
RELATED_SPECs: [SPEC-KIS-001, SPEC-KIS-002]
EPIC: AI Investment Analysis
ESTIMATED_EFFORT: High
LABELS: screening, technical-analysis, moving-average, breakthrough, portfolio, kis, api
---

# SPEC-SCREENING-001: 이동평균선 돌파 스크리닝 시스템

## HISTORY

| Version | Date       | Author       | Changes        |
| ------- | ---------- | ------------ | -------------- |
| 1.0.0   | 2026-02-22 | manager-spec | 초기 SPEC 작성 |

## ENVIRONMENT

### 시스템 컨텍스트

SageInvest는 사용자의 포트폴리오 종목 중 이동평균선(Moving Average)을 상향 돌파한 종목을 자동으로 감지하는 스크리닝 기능을 제공합니다. 이 기능은 각 종목의 종목명, 시장구분(KOSPI/KOSDAQ), 시가총액, 이동평균선 돌파시점 가격, 현재가격, 돌파상승률을 계산하여 사용자에게 투자 기회를 제안합니다.

이 SPEC은 SPEC-KIS-001(인증 시스템)과 SPEC-KIS-002(잔고조회)를 기반으로 하며, 추가적인 KIS OpenAPI 엔드포인트(종목기본정보, 일봉차트조회)를 통합합니다.

### 기술 환경

- **프로젝트**: SageInvest
- **언어**: TypeScript 5.9+
- **프레임워크**: Next.js 16+ (App Router), React 19+
- **데이터베이스**: PostgreSQL
- **HTTP 클라이언트**: Axios (기존 KISAuthMiddleware 활용)
- **테스트**: Vitest
- **선행 의존성**:
  - SPEC-KIS-001 (KIS OpenAPI 인증 시스템 - 완료)
  - SPEC-KIS-002 (국내주식 잔고조회 - 진행 중, 선택적 의존)

### 통합 범위

- **KIS OpenAPI 종목기본정보 조회**: 시장구분(KOSPI/KOSDAQ), 시가총액, 섹터 정보
- **KIS OpenAPI 주식일봉차트조회**: 과거 시계열 데이터(OHLCV) 조회
- **이동평균선 계산 엔진**: 5일, 10일, 20일, 60일, 120일 이동평균선 지원
- **돌파 감지 알고리즘**: 상향 돌파 시점 식별 및 돌파가격 산출
- **스크리닝 결과 API**: 포트폴리오 기반 및 시장 전체 스크리닝 지원
- **UI 컴포넌트**: 스크리닝 결과 대시보드, 종목별 상세 분석 페이지
- **Rate Limit 준수**: 초당 15건 요청 제한 준수

## ASSUMPTIONS

### 기술적 가정

1. **KIS API 가용성**: KIS OpenAPI의 종목기본정보 및 일봉차트조회 엔드포인트가 안정적으로 운영된다고 가정합니다. (신뢰도: High)

2. **Historical Data Availability**: KIS OpenAPI가 최소 120일 이상의 과거 데이터를 제공한다고 가정합니다. (신뢰도: High)

3. **tr_id 환경 분기**: Production 환경과 Mock 환경에서 서로 다른 tr_id를 사용해야 한다고 가정합니다. (신뢰도: High)

4. **데이터 정확성**: KIS API가 제공하는 가격 데이터가 시장 실제 가격과 일치한다고 가정합니다. (신뢰도: High)

5. **Rate Limit 충분성**: 초당 15건의 요청 제한이 포트폴리오 스크리닝(일반적으로 50종목 이하)에 충분하다고 가정합니다. (신뢰도: Medium)

### 비즈니스 가정

1. **사용자 요구**: 사용자가 이동평균선 돌파를 투자 의사결정의 보조 지표로 활용한다고 가정합니다. (신뢰도: High)

2. **MA 기간 설정**: 20일 이동평균선이 기본 설정이며, 사용자가 5일, 10일, 60일, 120일로 변경 가능하다고 가정합니다. (신뢰도: Medium)

3. **돌파 기준**: 종가가 이동평균선을 상향 돌파한 시점을 기준으로 한다고 가정합니다. (신뢰도: High)

4. **실시간성 요구**: 스크리닝 결과는 실시간 갱신보다는 사용자 요청 시점의 데이터를 기반으로 한다고 가정합니다. (신뢰도: High)

### 검증 방법

- KIS OpenAPI 공식 문서 종목기본정보 및 일봉차트조회 스펙 확인
- Mock 환경에서 API 호출 테스트
- 알려진 종목(Samsung Electronics, SK Hynix 등)으로 MA 계산 정확성 검증
- 돌파 감지 알고리즘을 과거 데이터로 백테스팅

## REQUIREMENTS

### 1. 보편적 요구사항 (Ubiquitous)

**REQ-001**: 시스템은 항상 모든 KIS OpenAPI 요청에 유효한 인증 토큰과 올바른 tr_id를 포함해야 한다.

**REQ-002**: 시스템은 항상 종목코드를 6자리 형식으로 검증해야 한다.

**REQ-003**: 시스템은 항상 이동평균선 계산 시 부동소수점 정밀도를 유지해야 한다.

**REQ-004**: 시스템은 항상 금액 표시 시 천 단위 구분자(쉼표)를 포함해야 한다.

**REQ-005**: 시스템은 항상 Rate Limit(초당 15건 이하)을 준수해야 한다.

**REQ-006**: 시스템은 항상 스크리닝 결과에 계산 일시를 포함해야 한다.

### 2. 이벤트 기반 요구사항 (Event-Driven)

**REQ-007**: WHEN 사용자가 포트폴리오 스크리닝을 요청할 때, 시스템은 잔고조회 API(SPEC-KIS-002)에서 종목 리스트를 가져와야 한다.

**REQ-008**: WHEN 종목 리스트가 확보되면, 시스템은 각 종목에 대해 종목기본정보 API를 호출하여 시장구분과 시가총액을 조회해야 한다.

**REQ-009**: WHEN 종목의 시장구분이 확인되면, 시스템은 일봉차트조회 API를 호출하여 과거 가격 데이터를 가져와야 한다.

**REQ-010**: WHEN 과거 가격 데이터가 수집되면, 시스템은 지정된 기간의 이동평균선을 계산해야 한다.

**REQ-011**: WHEN 이동평균선이 계산되면, 시스템은 가장 최근의 상향 돌파 시점을 감지해야 한다.

**REQ-012**: WHEN 상향 돌파가 감지되면, 시스템은 돌파시점 가격, 돌파일자, 돌파상승률을 기록해야 한다.

**REQ-013**: WHEN 사용자가 MA 기간을 변경하면, 시스템은 선택된 기간으로 스크리닝을 재수행해야 한다.

**REQ-014**: WHEN 스크리닝 대상 종목이 돌파하지 않았으면, 시스템은 결과에서 제외하거나 "돌파 없음"으로 표시해야 한다.

**REQ-015**: WHEN 사용자가 시장 전체 스크리닝을 요청하면, 시스템은 지정된 종목 리스트에 대해 동일한 분석을 수행해야 한다.

### 3. 상태 기반 요구사항 (State-Driven)

**REQ-016**: IF KIS 인증이 완료되지 않았으면, 시스템은 스크리닝 대신 "KIS 연동이 필요합니다" 안내 메시지를 표시해야 한다.

**REQ-017**: IF 과거 데이터가 이동평균선 기간만큼 존재하지 않으면, 시스템은 해당 종목을 스크리닝 결과에서 제외해야 한다.

**REQ-018**: IF 종목이 KOSPI 시장이면, 시스템은 API 파라미터에 'J' 마켓 코드를 사용해야 한다.

**REQ-019**: IF 종목이 KOSDAQ 시장이면, 시스템은 API 파라미터에 'Q' 마켓 코드를 사용해야 한다.

**REQ-020**: IF 돌파상승률이 양수이면, 시스템은 해당 종목을 상위에 배치하고 빨간색으로 표시해야 한다.

**REQ-021**: IF 돌파 후 경과일수가 5일 이내이면, 시스템은 "최근 돌파" 라벨을 표시해야 한다.

**REQ-022**: IF 시장이 개장 중이면, 시스템은 실시간 가격을 사용해야 한다.

**REQ-023**: IF 시장이 폐장 중이면, 시스템은 직전 거래일 종가를 사용해야 한다.

### 4. 바람직하지 않은 행동 요구사항 (Unwanted)

**REQ-024**: 시스템은 Rate Limit을 초과하는 스크리닝 요청을 전송하지 않아야 한다.

**REQ-025**: 시스템은 상장폐지 또는 거래정지 종목을 스크리닝 결과에 포함하지 않아야 한다.

**REQ-026**: 시스템은 검증되지 않은 종목코드에 대해 API 호출을 수행하지 않아야 한다.

**REQ-027**: 시스템은 이동평균선 계산에서 NaN 또는 Infinity 값을 결과에 포함하지 않아야 한다.

**REQ-028**: 시스템은 민감한 API 응답 데이터를 로그에 평문으로 기록하지 않아야 한다.

### 5. 선택적 요구사항 (Optional)

**REQ-029**: 가능하면, 시스템은 다중 MA 기간(5일, 10일, 20일, 60일, 120일)을 동시에 분석해야 한다.

**REQ-030**: 가능하면, 시스템은 돌파 지점을 차트에 시각화해야 한다.

**REQ-031**: 가능하면, 시스템은 새로운 돌파 발생 시 알림을 제공해야 한다.

**REQ-032**: 가능하면, 시스템은 스크리닝 결과를 CSV로 내보내기해야 한다.

**REQ-033**: 가능하면, 시스템은 스크리닝 결과를 저장하여 추후 조회할 수 있어야 한다.

## SPECIFICATIONS

### SPEC-001: KIS 종목기본정보 API 통합

**기능**: 종목의 시장구분(KOSPI/KOSDAQ), 시가총액, 섹터 정보 조회

**API 상세**:

- **엔드포인트**: GET `/uapi/domestic-stock/v1/quotations/search-stock-info`
- **tr_id**: TBD (환경별 상이 예상)

**필수 헤더**:

| 헤더          | 값                              | 설명        |
| ------------- | ------------------------------- | ----------- |
| Content-Type  | application/json; charset=utf-8 | 콘텐츠 타입 |
| authorization | Bearer {access_token}           | 인증 토큰   |
| appkey        | {appkey}                        | 앱 키       |
| appsecret     | {appsecret}                     | 앱 시크릿   |
| tr_id         | TBD                             | 거래 ID     |

**쿼리 파라미터**:

| 파라미터     | 필수 | 값    | 설명                |
| ------------ | ---- | ----- | ------------------- |
| PRDT_TYPE_CD | Y    | "300" | 상품유형코드 (주식) |
| PDNO         | Y    | 6자리 | 종목코드            |

**응답 필드** (예상):

| 필드         | 타입   | 설명         |
| ------------ | ------ | ------------ |
| pdno         | string | 종목코드     |
| prdt_name    | string | 종목명       |
| mrkt_div_nm  | string | 시장구분명   |
| mrkt_div_cd  | string | 시장구분코드 |
| mrkt_cap_amt | string | 시가총액     |
| sect_nm      | string | 섹터명       |

**데이터 모델**:

```typescript
interface StockBasicInfo {
  stockCode: string; // 종목코드
  stockName: string; // 종목명
  marketDivision: 'KOSPI' | 'KOSDAQ'; // 시장구분
  marketCode: string; // 시장코드 (API 파라미터용)
  marketCap: number; // 시가총액 (억원 단위)
  sector: string; // 섹터명
}
```

### SPEC-002: KIS 주식일봉차트조회 API 통합

**기능**: 과거 시계열 데이터(OHLCV) 조회

**API 상세**:

- **엔드포인트**: GET `/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice`
- **tr_id**: TBD (FHKST03010100 예상)

**필수 헤더**:

| 헤더          | 값                              |
| ------------- | ------------------------------- |
| Content-Type  | application/json; charset=utf-8 |
| authorization | Bearer {access_token}           |
| appkey        | {appkey}                        |
| appsecret     | {appsecret}                     |
| tr_id         | TBD                             |

**쿼리 파라미터**:

| 파라미터               | 필수 | 값       | 설명               |
| ---------------------- | ---- | -------- | ------------------ |
| FID_COND_MRKT_DIV_CODE | Y    | "J"/"Q"  | 시장분류코드       |
| FID_INPUT_ISCD         | Y    | 6자리    | 종목코드           |
| FID_INPUT_DATE_1       | Y    | YYYYMMDD | 시작일자           |
| FID_INPUT_DATE_2       | Y    | YYYYMMDD | 종료일자           |
| FID_PERIOD_DIV_CODE    | Y    | "D"      | 기간분류코드(일봉) |

**응답 필드** (output2 예상):

| 필드           | 타입   | 설명         |
| -------------- | ------ | ------------ |
| stck_bsop_date | string | 영업일자     |
| stck_oprc      | string | 시가         |
| stck_hgpr      | string | 고가         |
| stck_lwpr      | string | 저가         |
| stck_clpr      | string | 종가         |
| acml_vol       | string | 누적거래량   |
| acml_tr_pbmn   | string | 누적거래대금 |

**데이터 모델**:

```typescript
interface DailyPriceData {
  date: Date; // 영업일자
  open: number; // 시가
  high: number; // 고가
  low: number; // 저가
  close: number; // 종가
  volume: number; // 거래량
  amount: number; // 거래대금
}

interface PriceHistoryRequest {
  stockCode: string;
  marketCode: string;
  startDate: Date;
  endDate: Date;
}
```

### SPEC-003: 이동평균선 계산 서비스

**기능**: 과거 가격 데이터 기반 이동평균선 계산

**상세 동작**:

1. **지원 MA 기간**: 5일, 10일, 20일, 60일, 120일
2. **계산 방식**: 단순이동평균(Simple Moving Average, SMA)
3. **데이터 요구사항**: N일 MA 계산을 위해 최소 N일의 종가 데이터 필요

**구현 알고리즘**:

```typescript
function calculateMA(prices: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];

  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      result.push(null); // 데이터 부족
    } else {
      const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / period);
    }
  }

  return result;
}
```

**서비스 인터페이스**:

```typescript
class MACalculatorService {
  /**
   * 단일 기간 이동평균선 계산
   */
  calculateSMA(prices: DailyPriceData[], period: number): number[];

  /**
   * 다중 기간 이동평균선 일괄 계산
   */
  calculateMultipleMA(prices: DailyPriceData[], periods: number[]): Map<number, number[]>;
}
```

### SPEC-004: 돌파 감지 알고리즘

**기능**: 이동평균선 상향 돌파 시점 식별

**상세 동작**:

1. **돌파 정의**: 전일 종가 < 전일 MA, 당일 종가 >= 당일 MA
2. **돌파일자**: 돌파가 발생한 거래일
3. **돌파가격**: 돌파일의 종가
4. **돌파상승률**: (현재가격 - 돌파가격) / 돌파가격 \* 100

**구현 알고리즘**:

```typescript
interface BreakthroughPoint {
  date: Date; // 돌파일자
  price: number; // 돌파가격 (종가)
  maValue: number; // 돌파시점 MA 값
}

function detectBreakthrough(
  prices: DailyPriceData[],
  maValues: (number | null)[]
): BreakthroughPoint | null {
  // 가장 최근 돌파 지점 찾기 (역순 탐색)
  for (let i = prices.length - 1; i >= 1; i--) {
    const prevClose = prices[i - 1].close;
    const prevMA = maValues[i - 1];
    const currClose = prices[i].close;
    const currMA = maValues[i];

    if (prevMA !== null && currMA !== null) {
      // 상향 돌파 감지: 전일 종가 < 전일 MA AND 당일 종가 >= 당일 MA
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
```

**데이터 모델**:

```typescript
interface MAScreeningResult {
  // 기본 정보
  stockCode: string; // 종목코드
  stockName: string; // 종목명
  market: 'KOSPI' | 'KOSDAQ'; // 시장구분
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
```

### SPEC-005: 스크리닝 서비스 레이어

**기능**: 포트폴리오 및 시장 스크리닝 비즈니스 로직 캡슐화

**상세 동작**:

1. **포트폴리오 스크리닝**
   - SPEC-KIS-002의 KISBalanceService에서 보유 종목 리스트 조회
   - 각 종목에 대해 기본 정보 및 가격 이력 조회
   - MA 계산 및 돌파 감지 수행

2. **시장 스크리닝**
   - 사용자가 제공한 종목 리스트에 대해 동일한 분석 수행
   - 종목 리스트는 최대 100개로 제한 (Rate Limit 고려)

3. **배치 처리**
   - 다중 종목 스크리닝 시 Rate Limit 준수를 위한 순차적 API 호출
   - 병렬 처리 가능한 경우 최대 15개 동시 요청

4. **캐싱 전략**
   - 종목 기본 정보: 1일 TTL (잦은 변경 없음)
   - 가격 이력: 5분 TTL (장중), 1시간 TTL (장외)
   - 스크리닝 결과: 5분 TTL

**서비스 인터페이스**:

```typescript
class MASScreeningService {
  /**
   * 포트폴리오 스크리닝
   */
  async screenPortfolio(
    cano: string,
    acntPrdtCd: string,
    maPeriod: number = 20
  ): Promise<MAScreeningResult[]>;

  /**
   * 시장 스크리닝
   */
  async screenMarket(stockCodes: string[], maPeriod: number = 20): Promise<MAScreeningResult[]>;

  /**
   * 단일 종목 스크리닝
   */
  async screenSingleStock(stockCode: string, maPeriod: number): Promise<MAScreeningResult | null>;
}
```

### SPEC-006: 스크리닝 결과 API 라우트

**기능**: Next.js API Route Handler

**엔드포인트**:

1. **POST /api/screening/portfolio**
   - 포트폴리오 기반 스크리닝
   - 요청: `{ cano: string, acntPrdtCd: string, maPeriod?: number }`
   - 응답: `{ results: MAScreeningResult[], summary: ScreeningSummary }`

2. **POST /api/screening/market**
   - 시장 전체 스크리닝
   - 요청: `{ stockCodes: string[], maPeriod?: number }`
   - 응답: `{ results: MAScreeningResult[], summary: ScreeningSummary }`

3. **GET /api/screening/stock/:code**
   - 단일 종목 스크리닝
   - 쿼리: `?maPeriod=20`
   - 응답: `{ result: MAScreeningResult }`

**응답 모델**:

```typescript
interface ScreeningSummary {
  totalStocks: number; // 분석 대상 종목 수
  breakthroughCount: number; // 돌파 종목 수
  averageReturnRate: number; // 평균 돌파상승률
  screenedAt: Date; // 스크리닝 수행 일시
  maPeriod: number; // 사용된 MA 기간
}
```

### SPEC-007: 스크리닝 결과 UI 컴포넌트

**기능**: 스크리닝 결과 대시보드

**상세 동작**:

1. **필터링 옵션**
   - MA 기간 선택 (5, 10, 20, 60, 120일)
   - 시장 선택 (전체, KOSPI, KOSDAQ)
   - 최소 시가총액 필터
   - 최소 돌파상승률 필터

2. **정렬 옵션**
   - 돌파상승률 내림차순 (기본)
   - 시가총액 내림차순
   - 돌파 후 경과일수 오름차순
   - 종목명 오름차순

3. **테이블 컬럼**
   - 종목코드
   - 종목명
   - 시장 (KOSPI/KOSDAQ)
   - 시가총액
   - 현재가격
   - MA 기간
   - 돌파가격
   - 돌파상승률
   - 돌파일자
   - 경과일수

4. **시각화**
   - 돌파상승률 양수: 빨간색 텍스트
   - 최근 돌파 (5일 이내): "NEW" 뱃지
   - 돌파상승률 상위 3개: 별도 하이라이트

**UI 구조**:

```typescript
interface ScreeningDashboardProps {
  results: MAScreeningResult[];
  summary: ScreeningSummary;
  onMAPeriodChange: (period: number) => void;
  onRefresh: () => void;
  onExport: () => void;
}
```

## CONSTRAINTS

### 기술적 제약사항

1. **SPEC-KIS-001 의존성**
   - 인증 토큰 관리: `TokenManager`, `KISAuthMiddleware` 완전 의존
   - 암호화: `crypto.ts` 재사용
   - 로깅: `logger.ts` 재사용
   - 재시도: `retry.ts` 재사용

2. **SPEC-KIS-002 의존성 (선택적)**
   - 포트폴리오 스크리닝 시 `KISBalanceService.getFullHoldings()` 호출
   - 시장 스크리닝 시 독립 실행 가능

3. **KIS API 제약**
   - Rate Limit: 초당 15건 (권장)
   - 일봉 데이터 조회: 최대 100일/요청 (추가 확인 필요)
   - 종목 정보 조회: 1종목/요청
   - 응답 데이터가 문자열 타입으로 반환됨

4. **성능 요구사항**
   - 포트폴리오 스크리닝 (50종목 기준): < 10초
   - 단일 종목 스크리닝: < 2초
   - MA 계산 정확도: 소수점 2자리

5. **데이터 요구사항**
   - 최소 데이터: MA 기간일 수의 종가 데이터
   - 예: 20일 MA → 최소 20일 데이터 필요

### 비즈니스 제약사항

1. **범위 한정**
   - 국내주식만 대상 (해외주식 제외)
   - 상향 돌파만 감지 (하향 돌파 제외)
   - 단순이동평균(SMA)만 지원 (가중/지수 이동평균 제외)

2. **데이터 정확성**
   - KIS API 데이터를 원천으로 사용
   - MA 계산은 종가(Close) 기준
   - 돌파 판단은 종가 기준

3. **투자 조언 면책**
   - 스크리닝 결과는 참고용
   - 투자 결정의 책임은 사용자에게 있음을 명시

## TRACEABILITY

### 요구사항-사양 매핑

| 요구사항                  | 관련 사양                    |
| ------------------------- | ---------------------------- |
| REQ-001, REQ-016          | SPEC-001, SPEC-002, SPEC-005 |
| REQ-007, REQ-008          | SPEC-001, SPEC-005           |
| REQ-009, REQ-010          | SPEC-002, SPEC-003, SPEC-005 |
| REQ-011, REQ-012          | SPEC-004                     |
| REQ-005, REQ-024          | SPEC-005                     |
| REQ-013, REQ-015, REQ-029 | SPEC-005, SPEC-006           |
| REQ-017, REQ-027          | SPEC-003, SPEC-004           |
| REQ-018, REQ-019          | SPEC-001, SPEC-002           |
| REQ-020, REQ-021          | SPEC-007                     |

### 태그

- `#screening` (REQ-007, REQ-013, REQ-014, REQ-015)
- `#technical-analysis` (REQ-010, REQ-011, REQ-012, REQ-029)
- `#moving-average` (REQ-003, REQ-010, REQ-013, REQ-017, REQ-029)
- `#breakthrough` (REQ-011, REQ-012, REQ-014, REQ-020, REQ-021)
- `#api` (REQ-001, REQ-005, REQ-008, REQ-009, REQ-024, REQ-026)
- `#portfolio` (REQ-007, REQ-015)
- `#rate-limit` (REQ-005, REQ-024)
- `#kis` (모든 REQ)
