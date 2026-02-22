---
SPEC_ID: SPEC-SCREENING-001
TITLE: Implementation Plan - 이동평균선 돌파 스크리닝 시스템
CREATED: 2026-02-22T09:00:00Z
UPDATED: 2026-02-22T09:00:00Z
---

# Implementation Plan: SPEC-SCREENING-001

## Overview

이 문서는 SPEC-SCREENING-001 (이동평균선 돌파 스크리닝 시스템)의 구현 계획을 정의합니다.

## Milestones

### Primary Goal: Core API Integration & Screening Engine

**목표**: KIS OpenAPI 종목기본정보, 일봉차트조회 통합 및 스크리닝 엔진 구현

**작업 항목**:

1. **KIS 종목기본정보 API 클라이언트** (`lib/kis/stock-info-client.ts`)
   - 종목기본정보 조회 API 통합
   - API 응답 파싱 및 타입 변환
   - 캐싱 레이어 구현 (1일 TTL)
   - 단위 테스트 작성

2. **KIS 일봉차트조회 API 클라이언트** (`lib/kis/price-history-client.ts`)
   - 일봉차트조회 API 통합
   - 기간별 데이터 조회 (시작일~종료일)
   - 페이지네이션 처리 (필요시)
   - 캐싱 레이어 구현 (5분/1시간 TTL)
   - 단위 테스트 작성

3. **이동평균선 계산 서비스** (`lib/screening/ma-calculator.ts`)
   - SMA (단순이동평균) 계산 알고리즘
   - 다중 기간 지원 (5, 10, 20, 60, 120일)
   - 정밀도 유지 (부동소수점 처리)
   - 단위 테스트 작성 (알려진 데이터셋으로 검증)

4. **돌파 감지 알고리즘** (`lib/screening/breakthrough-detector.ts`)
   - 상향 돌파 감지 로직
   - 돌파가격, 돌파일자, 돌파상승률 계산
   - 경과일수 계산
   - 단위 테스트 작성

5. **스크리닝 서비스** (`lib/screening/screening-service.ts`)
   - 포트폴리오 스크리닝 메서드
   - 시장 스크리닝 메서드
   - 단일 종목 스크리닝 메서드
   - Rate Limit 준수 로직
   - 배치 처리 최적화
   - 통합 테스트 작성

### Secondary Goal: API Routes & Data Models

**목표**: Next.js API Routes 구현 및 데이터 모델 정의

**작업 항목**:

1. **Type Definitions** (`lib/screening/types.ts`)
   - StockBasicInfo 인터페이스
   - DailyPriceData 인터페이스
   - MAScreeningResult 인터페이스
   - ScreeningSummary 인터페이스
   - API 요청/응답 타입

2. **API Route: 포트폴리오 스크리닝** (`app/api/screening/portfolio/route.ts`)
   - POST 핸들러
   - 요청 검증
   - KISBalanceService 연동
   - 응답 포맷팅

3. **API Route: 시장 스크리닝** (`app/api/screening/market/route.ts`)
   - POST 핸들러
   - 종목 리스트 검증 (최대 100개)
   - 응답 포맷팅

4. **API Route: 단일 종목 스크리닝** (`app/api/screening/stock/[code]/route.ts`)
   - GET 핸들러
   - 동적 라우팅 ([code])
   - 쿼리 파라미터 처리 (maPeriod)

5. **데이터베이스 스키마** (선택적, REQ-033)
   - 스크리닝 결과 저장 테이블
   - 마이그레이션 스크립트

### Tertiary Goal: UI Components

**목표**: 스크리닝 결과 대시보드 UI 구현

**작업 항목**:

1. **스크리닝 결과 테이블 컴포넌트** (`app/screening/components/results-table.tsx`)
   - Material-UI 또는 shadcn/ui 테이블 활용
   - 컬럼 정의 (종목코드, 종목명, 시장, 시가총액, 현재가, 돌파가격, 돌파상승률, 돌파일자, 경과일수)
   - 정렬 기능
   - 필터링 기능

2. **필터 컴포넌트** (`app/screening/components/filter-panel.tsx`)
   - MA 기간 선택 (5, 10, 20, 60, 120일)
   - 시장 선택 (전체, KOSPI, KOSDAQ)
   - 최소 시가총액 입력
   - 최소 돌파상승률 입력

3. **스크리닝 대시보드 페이지** (`app/screening/page.tsx`)
   - 전체 레이아웃
   - 필터 패널
   - 결과 테이블
   - 요약 카드 (총 종목 수, 돌파 종목 수, 평균 상승률)
   - 새로고침 버튼
   - 내보내기 버튼 (CSV)

4. **포트폴리오 스크리닝 위젯** (`app/dashboard/components/ma-screening-widget.tsx`)
   - 대시보드 임베디드 버전
   - 최근 돌파 상위 5개 종목 표시
   - "전체 보기" 링크

### Final Goal: Testing & Documentation

**목표**: 테스트 완료 및 문서화

**작업 항목**:

1. **단위 테스트**
   - `__tests__/lib/kis/stock-info-client.test.ts`
   - `__tests__/lib/kis/price-history-client.test.ts`
   - `__tests__/lib/screening/ma-calculator.test.ts`
   - `__tests__/lib/screening/breakthrough-detector.test.ts`
   - `__tests__/lib/screening/screening-service.test.ts`

2. **통합 테스트**
   - `__tests__/api/screening/portfolio.test.ts`
   - `__tests__/api/screening/market.test.ts`
   - `__tests__/api/screening/stock.test.ts`

3. **E2E 테스트** (선택적)
   - 스크리닝 워크플로우 테스트

4. **API 문서**
   - OpenAPI/Swagger 스펙 작성
   - README 업데이트

5. **사용자 가이드**
   - 스크리닝 기능 사용법 문서

## Technical Approach

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    UI Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Screening    │  │ Filter       │  │ Results      │  │
│  │ Dashboard    │  │ Panel        │  │ Table        │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    API Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ /api/        │  │ /api/        │  │ /api/        │  │
│  │ screening/   │  │ screening/   │  │ screening/   │  │
│  │ portfolio    │  │ market       │  │ stock/:code  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                Service Layer                            │
│  ┌──────────────────────────────────────────────────┐  │
│  │          MASScreeningService                      │  │
│  │  - screenPortfolio()                              │  │
│  │  - screenMarket()                                 │  │
│  │  - screenSingleStock()                            │  │
│  └──────────────────────────────────────────────────┘  │
│                          │                             │
│  ┌───────────────────────┼───────────────────────┐    │
│  │                       │                       │    │
│  ▼                       ▼                       ▼    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐│
│  │ MACalculator │  │ Breakthrough │  │ Rate Limit   ││
│  │ Service      │  │ Detector     │  │ Controller   ││
│  └──────────────┘  └──────────────┘  └──────────────┘│
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                 Data Access Layer                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ StockInfo    │  │ PriceHistory │  │ KISBalance   │  │
│  │ Client       │  │ Client       │  │ Service      │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│           │                 │                  │        │
│           └─────────────────┼──────────────────┘        │
│                             ▼                           │
│                    KISAuthMiddleware                    │
│                   (from SPEC-KIS-001)                   │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                 External APIs                           │
│  ┌──────────────────────────────────────────────────┐  │
│  │           KIS OpenAPI                             │  │
│  │  - 종목기본정보 (/quotations/search-stock-info)  │  │
│  │  - 일봉차트조회 (/quotations/inquire-daily-...)  │  │
│  │  - 잔고조회 (from SPEC-KIS-002)                  │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

**Portfolio Screening Flow**:

1. User requests portfolio screening via UI
2. API Route receives request with CANO, ACNT_PRDT_CD, MA period
3. MASScreeningService calls KISBalanceService.getFullHoldings()
4. For each stock in holdings:
   a. StockInfoClient fetches basic info (market, market cap)
   b. PriceHistoryClient fetches price history (N days)
   c. MACalculator calculates moving average
   d. BreakthroughDetector identifies breakthrough points
5. MASScreeningService aggregates results
6. API Route returns screening results with summary

**Market Screening Flow**:

1. User provides list of stock codes via UI
2. API Route validates stock codes (max 100)
3. MASScreeningService processes each stock (steps 4a-4d above)
4. API Route returns screening results with summary

### Caching Strategy

**Stock Basic Info** (Low Volatility):

- Cache Key: `stock-info:{stockCode}`
- TTL: 24 hours
- Storage: In-memory Map (server-side)

**Price History** (Medium Volatility):

- Cache Key: `price-history:{stockCode}:{startDate}:{endDate}`
- TTL: 5 minutes (market hours), 1 hour (after hours)
- Storage: In-memory Map (server-side)

**Screenng Results** (High Volatility):

- Cache Key: `screening:{type}:{paramsHash}`
- TTL: 5 minutes
- Storage: In-memory Map (server-side)
- Invalidate on: user request, MA period change

### Rate Limit Compliance

**Strategy**:

- Sequential API calls with 67ms interval (15 calls/second)
- Batch processing for multiple stocks
- Progress tracking for long-running screenings
- Graceful degradation on rate limit errors

**Implementation**:

```typescript
class RateLimitController {
  private readonly MIN_INTERVAL_MS = 1000 / 15; // 67ms
  private lastCallTime = 0;

  async waitForSlot(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastCallTime;

    if (elapsed < this.MIN_INTERVAL_MS) {
      await new Promise((resolve) => setTimeout(resolve, this.MIN_INTERVAL_MS - elapsed));
    }

    this.lastCallTime = Date.now();
  }
}
```

### Error Handling

**API Errors**:

- 401 Unauthorized: Retry with token refresh (via KISAuthMiddleware)
- 429 Rate Limit: Exponential backoff with max 5 retries
- 500 Server Error: Retry with exponential backoff
- Invalid Stock Code: Skip and log warning

**Calculation Errors**:

- Insufficient Data: Exclude from results, log warning
- NaN/Infinity: Validate before including in results
- Division by Zero: Guard with zero checks

### Testing Strategy

**Unit Tests**:

- MA Calculator: Known price datasets with expected MA values
- Breakthrough Detector: Known breakthrough scenarios
- Stock Info Client: Mock API responses
- Price History Client: Mock API responses

**Integration Tests**:

- API Routes: Mock external dependencies
- Screening Service: Mock API clients, test orchestration

**E2E Tests** (Optional):

- Full screening workflow with test account

## Dependencies

### Internal Dependencies

- `lib/kis/auth-middleware.ts` (SPEC-KIS-001)
- `lib/kis/token-manager.ts` (SPEC-KIS-001)
- `lib/kis/crypto.ts` (SPEC-KIS-001)
- `lib/kis/logger.ts` (SPEC-KIS-001)
- `lib/kis/retry.ts` (SPEC-KIS-001)
- `lib/kis/balance-service.ts` (SPEC-KIS-002, optional)
- `lib/kis/types.ts` (SPEC-KIS-002)

### External Dependencies

- KIS OpenAPI 종목기본정조 조회 API
- KIS OpenAPI 주식일봉차트조회 API

### New Dependencies

No new external npm packages required. All functionality can be implemented with existing stack (Next.js, React, TypeScript, Axios, Vitest).

## Risks and Mitigation

### Risk 1: KIS API Endpoint Unavailability

**Impact**: Critical - Feature cannot function without API access

**Mitigation**:

- Verify API endpoints via KIS OpenAPI documentation before implementation
- Mock environment testing first
- Implement graceful error handling
- Document fallback behavior

### Risk 2: Rate Limit Impact on Performance

**Impact**: Medium - Large portfolios (>50 stocks) may take >10 seconds

**Mitigation**:

- Implement aggressive caching
- Progress indicators for long screenings
- Background processing option (future enhancement)
- Educate users on expected wait times

### Risk 3: Data Accuracy

**Impact**: High - Incorrect MA calculations lead to wrong investment signals

**Mitigation**:

- Validate with known datasets (Samsung Electronics, etc.)
- Unit tests with edge cases (weekends, holidays, missing data)
- Documentation on data limitations
- Disclaimer on investment advice

### Risk 4: API Response Format Changes

**Impact**: Medium - KIS API changes may break parsers

**Mitigation**:

- Flexible parsing with validation
- Comprehensive logging for debugging
- Version tracking in API responses
- Monitoring for API changes

## Future Enhancements

**Not in Current Scope**:

- Exponential Moving Average (EMA) support
- Weighted Moving Average (WMA) support
- Downward breakthrough detection
- Real-time screening (WebSocket-based)
- Custom MA periods (user-defined)
- Multi-timeframe analysis (daily, weekly, monthly)
- Backtesting module
- Alert notifications (email, push)
- Sector-based screening
- Volume-based screening

These features can be addressed in future SPECs if needed.

## Success Criteria

**Functional Requirements**:

- ✅ Can screen portfolio stocks for MA breakthroughs
- ✅ Can screen arbitrary list of stocks
- ✅ Supports 5, 10, 20, 60, 120-day MA periods
- ✅ Accurately calculates breakthrough points
- ✅ Respects rate limits

**Performance Requirements**:

- ✅ Portfolio screening (50 stocks): < 10 seconds
- ✅ Single stock screening: < 2 seconds
- ✅ MA calculation accuracy: 2 decimal places

**Quality Requirements**:

- ✅ Unit test coverage: ≥ 85%
- ✅ Integration test coverage: ≥ 70%
- ✅ Zero critical security vulnerabilities
- ✅ TRUST 5 compliance

**User Experience**:

- ✅ Clear progress indication during screening
- ✅ Intuitive filtering and sorting
- ✅ Responsive UI on desktop and mobile
- ✅ Error messages in Korean (user language)
