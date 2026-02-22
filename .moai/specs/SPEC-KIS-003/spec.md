---
SPEC_ID: SPEC-KIS-003
TITLE: KIS 이동평균선 비교 분석
STATUS: Planned
PRIORITY: High
ASSIGNED: MoAI (Orchestrator)
DOMAIN: KIS (Korea Investment & Securities OpenAPI)
CREATED: 2026-02-22T10:00:00Z
UPDATED: 2026-02-22T10:00:00Z
LIFECYCLE: spec-anchored
RELATED_SPECs: [SPEC-KIS-001, SPEC-KIS-002]
EPIC: Technical Analysis
ESTIMATED_EFFORT: Medium
LABELS: moving-average, technical-analysis, chart, kis, stock-list, comparison
---

# SPEC-KIS-003: KIS 이동평균선 비교 분석

## HISTORY

| Version | Date       | Author | Changes        |
| ------- | ---------- | ------ | -------------- |
| 1.0.0   | 2026-02-22 | MoAI   | 초기 SPEC 작성 |

## ENVIRONMENT

### 시스템 컨텍스트

SageInvest는 SPEC-KIS-001에서 구축한 KIS OpenAPI 인증 시스템과 SPEC-KIS-002의 계좌 설정을 기반으로, 종목리스트(보유종목/관심종목)를 대상으로 전일 종가가 각 이동평균선 값보다 큰지/작은지를 표시하는 기능을 제공합니다. 일봉, 주봉, 월봉 차트 데이터를 조회하여 다양한 기간의 이동평균선(SMA)을 계산하고, 골든크로스/데드크로스 영역을 시각적으로 표현합니다.

### 기술 환경

- **프로젝트**: SageInvest
- **언어**: TypeScript 5.9+
- **프레임워크**: Next.js 16+ (App Router), React 19+
- **데이터베이스**: PostgreSQL
- **HTTP 클라이언트**: Axios (기존 KISAuthMiddleware 활용)
- **테스트**: Vitest
- **선행 의존성**:
  - SPEC-KIS-001 (KIS OpenAPI 인증 시스템 - 완료)
  - SPEC-KIS-002 (계좌 설정 및 보유종목 조회 - 진행중)

### 통합 범위

- KIS OpenAPI 일봉 차트 조회 (`/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice`)
- KIS OpenAPI 주봉 차트 조회 (`/uapi/domestic-stock/v1/quotations/inquire-weekly-itemchartprice`)
- KIS OpenAPI 월봉 차트 조회 (`/uapi/domestic-stock/v1/quotations/inquire-monthly-itemchartprice`)
- 일봉 이동평균선: 5, 10, 20, 60, 80, 120, 240일
- 주봉 이동평균선: 5, 10, 20, 60주
- 월봉 이동평균선: 5, 10, 20월
- Rate Limit 준수 (초당 20건, 권장 15건)

### 이동평균선 설정

| 차트 타입 | 이동평균선 기간             | 설명                |
| --------- | --------------------------- | ------------------- |
| 일봉      | 5, 10, 20, 60, 80, 120, 240 | 단기~장기 추세 분석 |
| 주봉      | 5, 10, 20, 60               | 중기 추세 분석      |
| 월봉      | 5, 10, 20                   | 장기 추세 분석      |

## ASSUMPTIONS

### 기술적 가정

1. **SPEC-KIS-001 완료**: KIS OpenAPI 인증 시스템(토큰 발급, 갱신, 미들웨어)이 완전히 구현되어 있으며, `KISAuthMiddleware.makeRequest()`를 통해 인증된 API 요청을 수행할 수 있다고 가정합니다. (신뢰도: High)

2. **차트 API 안정성**: KIS OpenAPI의 일봉/주봉/월봉 차트 조회 엔드포인트가 안정적으로 운영되며, OHLCV 데이터를 정확하게 반환한다고 가정합니다. (신뢰도: High)

3. **tr_id 환경 분기**: Production 환경에서는 `FHKST03010100`(일봉), `FHKST03010200`(주봉), `FHKST03010300`(월봉)을 사용하고, Mock 환경에서는 `HHKST03010100`, `HHKST03010200`, `HHKST03010300`을 사용한다고 가정합니다. (신뢰도: High)

4. **SMA 계산 정확성**: 종가(Close)를 기준으로 단순이동평균(SMA)을 계산하며, N일 SMA는 최근 N일 종가의 산술 평균이라고 가정합니다. (신뢰도: High)

5. **데이터 충분성**: 240일 SMA 계산을 위해 최소 240일 이상의 일봉 데이터가 필요하다고 가정합니다. 데이터가 부족한 경우 계산 가능한 기간까지만 표시합니다. (신뢰도: Medium)

### 비즈니스 가정

1. **종목리스트 존재**: SPEC-KIS-002에서 조회한 보유종목 리스트 또는 사용자가 등록한 관심종목 리스트가 존재한다고 가정합니다. (신뢰도: Medium)

2. **전일 종가 기준**: 이동평균선 비교는 항상 "전일 종가"를 기준으로 수행하며, 당일 실시간 가격은 반영하지 않는다고 가정합니다. (신뢰도: High)

3. **단순이동평균 사용**: EMA(지수이동평균)가 아닌 SMA(단순이동평균)를 사용한다고 가정합니다. (신뢰도: High)

### 검증 방법

- KIS OpenAPI 공식 문서 차트 조회 API 스펙 확인
- Mock 환경에서 차트 데이터 조회 테스트
- SMA 계산 정확성 검증 (수동 계산과 비교)
- 데이터 부족 시 처리 로직 검증

## REQUIREMENTS

### 1. 보편적 요구사항 (Ubiquitous)

**REQ-001**: 시스템은 항상 차트 데이터 조회 시 유효한 인증 토큰과 올바른 tr_id를 포함해야 한다.

**REQ-002**: 시스템은 항상 SMA 계산을 종가(Close)를 기준으로 수행해야 한다.

**REQ-003**: 시스템은 항상 이동평균선 비교 결과를 "위(↑)" 또는 "아래(↓)"로 명확하게 표시해야 한다.

**REQ-004**: 시스템은 항상 차트 조회 API 호출 시 Rate Limit(초당 15건 이하)을 준수해야 한다.

**REQ-005**: 시스템은 항상 이동평균선 값을 천 단위 구분자(쉼표)와 함께 표시해야 한다.

### 2. 이벤트 기반 요구사항 (Event-Driven)

**REQ-006**: WHEN 사용자가 단일 종목의 이동평균선 비교를 요청할 때, 시스템은 일봉/주봉/월봉 차트 데이터를 순차적으로 조회해야 한다.

**REQ-007**: WHEN 사용자가 여러 종목의 이동평균선 비교를 요청할 때, 시스템은 종목별로 차트 데이터를 병렬로 조회해야 한다.

**REQ-008**: WHEN 차트 데이터를 수신하면, 시스템은 각 기간별 SMA를 계산하고 전일 종가와 비교해야 한다.

**REQ-009**: WHEN 전일 종가가 이동평균선보다 크면, 시스템은 "↑" 기호와 함께 골든크로스 영역임을 표시해야 한다.

**REQ-010**: WHEN 전일 종가가 이동평균선보다 작으면, 시스템은 "↓" 기호와 함께 데드크로스 영역임을 표시해야 한다.

**REQ-011**: WHEN 캐시된 데이터가 30초 이내에 존재하면, 시스템은 API 호출 없이 캐시된 데이터를 반환해야 한다.

### 3. 상태 기반 요구사항 (State-Driven)

**REQ-012**: IF 특정 기간의 데이터가 부족하여 SMA를 계산할 수 없으면, 시스템은 "N/A"로 표시해야 한다.

**REQ-013**: IF 종목코드가 유효하지 않으면, 시스템은 적절한 에러 메시지를 반환해야 한다.

**REQ-014**: IF API 요청이 실패하면, 시스템은 재시도 정책(SPEC-KIS-001)에 따라 재시도해야 한다.

**REQ-015**: IF 서버 캐시가 활성화되어 있으면, 시스템은 30초 TTL로 응답을 캐싱해야 한다.

### 4. 바람직하지 않은 행동 요구사항 (Unwanted)

**REQ-016**: 시스템은 오래된 캐시 데이터(30초 초과)를 반환하지 않아야 한다.

**REQ-017**: 시스템은 Rate Limit을 초과하여 API 요청을 보내지 않아야 한다.

**REQ-018**: 시스템은 계산되지 않은 SMA 값을 0 또는 null로 표시하지 않고 명시적으로 "N/A"로 표시해야 한다.

**REQ-019**: 시스템은 차트 데이터 조회 실패 시 빈 결과 대신 명확한 에러 메시지를 반환해야 한다.

### 5. 선택적 요구사항 (Optional)

**REQ-020**: 가능하면, 시스템은 클라이언트 측에서도 30초간 데이터를 캐싱하여 중복 요청을 방지해야 한다.

**REQ-021**: 가능하면, 시스템은 대량 종목 조회 시 진행 상황을 실시간으로 표시해야 한다.

**REQ-022**: 가능하면, 시스템은 이동평균선 이격도(전일종가/SMA \* 100)를 함께 표시해야 한다.

## SPECIFICATIONS

### SPEC-001: 일봉 차트 데이터 조회

**기능**: 일봉 차트 OHLCV 데이터 조회

**API 엔드포인트**:

- Production: `GET /uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice`
- Mock: `GET /uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice`

**tr_id**:

- Production: `FHKST03010100`
- Mock: `HHKST03010100`

**요청 파라미터**:

```
FID_COND_MRKT_DIV_CODE: "J" (주식)
FID_INPUT_ISCD: {종목코드} (6자리)
FID_INPUT_DATE_1: {시작일자} (YYYYMMDD, 선택)
FID_INPUT_DATE_2: {종료일자} (YYYYMMDD, 선택)
FID_PERIOD_DIV_CODE: "D" (일봉)
```

**응답 데이터**:

```typescript
interface DailyChartResponse {
  rt_cd: string; // 응답 코드
  msg_cd: string; // 메시지 코드
  msg1: string; // 메시지
  output1: ChartHeader; // 헤더 정보
  output2: DailyCandle[]; // 일봉 캔들 배열
}

interface DailyCandle {
  stck_bsop_date: string; // 영업 일자 (YYYYMMDD)
  stck_oprc: string; // 시가
  stck_hgpr: string; // 고가
  stck_lwpr: string; // 저가
  stck_clpr: string; // 종가
  acml_vol: string; // 누적 거래량
  acml_tr_pbmn: string; // 누적 거래 대금
}
```

### SPEC-002: 주봉 차트 데이터 조회

**기능**: 주봉 차트 OHLCV 데이터 조회

**API 엔드포인트**:

- Production: `GET /uapi/domestic-stock/v1/quotations/inquire-weekly-itemchartprice`
- Mock: `GET /uapi/domestic-stock/v1/quotations/inquire-weekly-itemchartprice`

**tr_id**:

- Production: `FHKST03010200`
- Mock: `HHKST03010200`

**요청 파라미터**:

```
FID_COND_MRKT_DIV_CODE: "J"
FID_INPUT_ISCD: {종목코드}
FID_INPUT_DATE_1: {시작일자}
FID_INPUT_DATE_2: {종료일자}
FID_PERIOD_DIV_CODE: "W" (주봉)
```

### SPEC-003: 월봉 차트 데이터 조회

**기능**: 월봉 차트 OHLCV 데이터 조회

**API 엔드포인트**:

- Production: `GET /uapi/domestic-stock/v1/quotations/inquire-monthly-itemchartprice`
- Mock: `GET /uapi/domestic-stock/v1/quotations/inquire-monthly-itemchartprice`

**tr_id**:

- Production: `FHKST03010300`
- Mock: `HHKST03010300`

**요청 파라미터**:

```
FID_COND_MRKT_DIV_CODE: "J"
FID_INPUT_ISCD: {종목코드}
FID_INPUT_DATE_1: {시작일자}
FID_INPUT_DATE_2: {종료일자}
FID_PERIOD_DIV_CODE: "M" (월봉)
```

### SPEC-004: 이동평균선(SMA) 계산 서비스

**기능**: 단순이동평균(Simple Moving Average) 계산

**계산 공식**:

```
SMA(N) = (P1 + P2 + ... + Pn) / N
```

- P: 각 기간의 종가
- N: 이동평균 기간

**지원 기간**:

- 일봉: 5, 10, 20, 60, 80, 120, 240일
- 주봉: 5, 10, 20, 60주
- 월봉: 5, 10, 20월

**데이터 모델**:

```typescript
interface MovingAverageValue {
  value: number; // 이동평균선 값
  signal: 'above' | 'below'; // 전일종가 대비 신호
}

interface DailyMA {
  ma5: MovingAverageValue;
  ma10: MovingAverageValue;
  ma20: MovingAverageValue;
  ma60: MovingAverageValue;
  ma80: MovingAverageValue;
  ma120: MovingAverageValue;
  ma240: MovingAverageValue;
}

interface WeeklyMA {
  ma5: MovingAverageValue;
  ma10: MovingAverageValue;
  ma20: MovingAverageValue;
  ma60: MovingAverageValue;
}

interface MonthlyMA {
  ma5: MovingAverageValue;
  ma10: MovingAverageValue;
  ma20: MovingAverageValue;
}

interface MovingAverageComparison {
  stockCode: string; // 종목코드 (6자리)
  stockName: string; // 종목명
  previousClose: number; // 전일 종가
  dailyMA: DailyMA; // 일봉 이동평균선
  weeklyMA: WeeklyMA; // 주봉 이동평균선
  monthlyMA: MonthlyMA; // 월봉 이동평균선
  fetchedAt: Date; // 데이터 조회 시각
}
```

### SPEC-005: 이동평균선 비교 API 엔드포인트

**기능**: 단일 종목 및 다중 종목 이동평균선 비교 API 제공

**API 엔드포인트**:

1. **단일 종목 조회**:
   - `GET /api/kis/moving-average?stockCode={종목코드}`
   - 응답: `MovingAverageComparison`

2. **다중 종목 조회**:
   - `POST /api/kis/moving-average/batch`
   - 요청 본문: `{ stockCodes: string[] }`
   - 응답: `MovingAverageComparison[]`

**응답 형식**:

```typescript
interface MovingAverageApiResponse {
  success: boolean;
  data?: MovingAverageComparison | MovingAverageComparison[];
  error?: {
    code: string;
    message: string;
  };
  cached: boolean; // 캐시 사용 여부
  fetchedAt: Date; // 데이터 조회 시각
}
```

### SPEC-006: 서버 캐싱 전략

**기능**: API 응답 캐싱으로 Rate Limit 준수 및 성능 최적화

**캐시 설정**:

- TTL: 30초
- 저장소: 인메모리 캐시 (Node.js Map) 또는 Redis
- 키 형식: `ma:{stockCode}:{chartType}`

**캐시 무효화**:

- TTL 만료 시 자동 삭제
- 사용자 요청 시 강제 갱신 옵션 (`?refresh=true`)

### SPEC-007: 출력 포맷

**기능**: 이동평균선 비교 결과 표 형식 출력

**표 구조**:

```
종목코드 | 종목명 | 전일종가 | 일봉5 | 일봉10 | ... | 주봉5 | ... | 월봉5 | ...
         |        | 85,000  | ↑(82,000) | ↑(80,000) | ... | ↓(86,000) | ...
```

**신호 표시**:

- ↑ (위): 전일종가 > 이동평균선 (골든크로스 영역)
- ↓ (아래): 전일종가 < 이동평균선 (데드크로스 영역)
- N/A: 데이터 부족으로 계산 불가

## CONSTRAINTS

### 기술적 제약사항

1. **Rate Limit 준수**
   - 초당 최대 20건 요청 제한
   - 안정적 운영을 위해 초당 15건 이하 권장
   - 대량 종목 조회 시 순차 처리 또는 지연 처리

2. **데이터 충분성**
   - 240일 SMA 계산: 최소 240일 데이터 필요
   - 120일 SMA 계산: 최소 120일 데이터 필요
   - 데이터 부족 시 N/A 표시

3. **API 요청 제한**
   - 종목당 최대 3개 API 호출 (일봉, 주봉, 월봉)
   - 100개 종목 = 300개 API 호출 (약 20초 소요)

### 비즈니스 제약사항

1. **전일 종가 기준**
   - 당일 실시간 가격 미반영
   - 장 마감 후 데이터 기준

2. **데이터 지연**
   - KIS API 데이터 지연 가능성
   - 30초 캐시로 일관성 유지

## TRACEABILITY

### 요구사항-사양 매핑

| 요구사항                           | 관련 사양                    |
| ---------------------------------- | ---------------------------- |
| REQ-001, REQ-006, REQ-007          | SPEC-001, SPEC-002, SPEC-003 |
| REQ-002, REQ-008, REQ-009, REQ-010 | SPEC-004                     |
| REQ-003, REQ-005                   | SPEC-007                     |
| REQ-004, REQ-017                   | SPEC-006                     |
| REQ-011, REQ-015, REQ-016, REQ-020 | SPEC-006                     |
| REQ-012, REQ-018                   | SPEC-004                     |
| REQ-013, REQ-019                   | SPEC-005                     |

### 태그

- `#moving-average` (REQ-002, REQ-003, REQ-008, REQ-009, REQ-010)
- `#chart` (REQ-001, REQ-006, REQ-007)
- `#technical-analysis` (REQ-009, REQ-010, REQ-022)
- `#cache` (REQ-011, REQ-015, REQ-016, REQ-020)
- `#rate-limit` (REQ-004, REQ-017)
- `#kis` (모든 REQ)
