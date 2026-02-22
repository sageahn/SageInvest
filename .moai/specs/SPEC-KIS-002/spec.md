---
SPEC_ID: SPEC-KIS-002
TITLE: KIS 국내주식 잔고조회 및 자산현황
STATUS: In Progress
PRIORITY: High
ASSIGNED: Alfred (Orchestrator)
DOMAIN: KIS (Korea Investment & Securities OpenAPI)
CREATED: 2026-02-08T09:00:00Z
UPDATED: 2026-02-08T10:00:00Z
LIFECYCLE: spec-anchored
RELATED_SPECs: [SPEC-KIS-001]
EPIC: Portfolio Management
ESTIMATED_EFFORT: Medium
LABELS: balance, portfolio, domestic-stock, account, asset, kis, ui-components
---

# SPEC-KIS-002: KIS 국내주식 잔고조회 및 자산현황

## HISTORY

| Version | Date       | Author | Changes        |
| ------- | ---------- | ------ | -------------- |
| 1.0.0   | 2026-02-08 | Alfred | 초기 SPEC 작성 |

## ENVIRONMENT

### 시스템 컨텍스트

SageInvest는 SPEC-KIS-001에서 구축한 KIS OpenAPI 인증 시스템을 기반으로, 사용자의 국내주식 계좌 잔고와 자산현황을 실시간으로 조회하는 기능을 제공합니다. 사용자는 보유 종목별 현재가, 평가손익, 수익률을 확인하고, 계좌 전체의 자산 요약 정보를 대시보드에서 한눈에 파악할 수 있습니다.

### 기술 환경

- **프로젝트**: SageInvest
- **언어**: TypeScript 5.9+
- **프레임워크**: Next.js 16+ (App Router), React 19+
- **데이터베이스**: PostgreSQL
- **HTTP 클라이언트**: Axios (기존 KISAuthMiddleware 활용)
- **테스트**: Vitest
- **선행 의존성**: SPEC-KIS-001 (KIS OpenAPI 인증 시스템 - 완료)

### 통합 범위

- KIS OpenAPI 국내주식 잔고조회 API (GET /uapi/domestic-stock/v1/trading/inquire-balance)
- 계좌번호(CANO) 및 상품코드(ACNT_PRDT_CD) 설정 관리
- 페이지네이션을 통한 전체 보유 종목 조회
- 대시보드 자산 요약 위젯
- 보유 종목 상세 목록 페이지
- Rate Limit 준수 (초당 20건, 권장 15건)

## ASSUMPTIONS

### 기술적 가정

1. **SPEC-KIS-001 완료**: KIS OpenAPI 인증 시스템(토큰 발급, 갱신, 미들웨어)이 완전히 구현되어 있으며, `KISAuthMiddleware.makeRequest()`를 통해 인증된 API 요청을 수행할 수 있다고 가정합니다. (신뢰도: High)

2. **국내주식 잔고조회 API 안정성**: KIS OpenAPI의 국내주식 잔고조회 엔드포인트(`/uapi/domestic-stock/v1/trading/inquire-balance`)가 안정적으로 운영되며, 문서화된 응답 형식을 준수한다고 가정합니다. (신뢰도: High)

3. **tr_id 환경 분기**: Production 환경에서는 `TTTC8434R`, Mock 환경에서는 `VTTC8434R`을 tr_id로 사용해야 한다고 가정합니다. (신뢰도: High)

4. **페이지네이션 한계**: Production 환경에서 1회 요청당 최대 50건, Mock 환경에서 최대 20건의 종목 데이터를 반환하며, `ctx_area_nk100` 값이 비어있지 않으면 추가 조회가 필요하다고 가정합니다. (신뢰도: High)

5. **Rate Limit**: 초당 최대 20건의 API 요청이 허용되며, 안정적 운영을 위해 초당 15건 이하로 제한할 것을 권장한다고 가정합니다. (신뢰도: High)

### 비즈니스 가정

1. **계좌번호 보유**: 사용자가 한국투자증권 계좌를 보유하고 있으며, 종합계좌번호(CANO, 8자리)와 계좌상품코드(ACNT_PRDT_CD, 2자리)를 알고 있다고 가정합니다. (신뢰도: Medium)

2. **국내주식 전용**: 본 SPEC은 국내주식만을 대상으로 하며, 해외주식 잔고조회는 별도의 SPEC으로 관리합니다. (신뢰도: High)

3. **실시간성 불필요**: 잔고 데이터는 사용자의 명시적 요청(새로고침) 또는 일정 간격의 자동 갱신으로 조회하며, 웹소켓 기반 실시간 스트리밍은 본 SPEC의 범위가 아닙니다. (신뢰도: High)

### 검증 방법

- KIS OpenAPI 공식 문서 잔고조회 API 스펙 확인
- Mock 환경에서 잔고조회 API 호출 테스트
- 페이지네이션 동작 검증 (다수 종목 보유 계좌)
- 빈 계좌(보유 종목 없음) 응답 처리 검증

## REQUIREMENTS

### 1. 보편적 요구사항 (Ubiquitous)

**REQ-001**: 시스템은 항상 국내주식 잔고조회 시 유효한 인증 토큰과 올바른 tr_id를 포함해야 한다.

**REQ-002**: 시스템은 항상 계좌번호(CANO)를 8자리, 계좌상품코드(ACNT_PRDT_CD)를 2자리로 검증해야 한다.

**REQ-003**: 시스템은 항상 잔고조회 응답에서 수익률 계산 시 소수점 이하 2자리까지 표시해야 한다.

**REQ-004**: 시스템은 항상 금액 표시 시 원화(KRW) 단위로 천 단위 구분자(쉼표)를 포함해야 한다.

**REQ-005**: 시스템은 항상 잔고조회 API 호출 시 Rate Limit(초당 15건 이하)을 준수해야 한다.

### 2. 이벤트 기반 요구사항 (Event-Driven)

**REQ-006**: WHEN 사용자가 잔고조회를 요청할 때, 시스템은 KIS OpenAPI 국내주식 잔고조회 API(/uapi/domestic-stock/v1/trading/inquire-balance)를 호출해야 한다.

**REQ-007**: WHEN 잔고조회 응답의 ctx_area_nk100 값이 비어있지 않을 때, 시스템은 자동으로 다음 페이지를 요청하여 전체 보유 종목을 수집해야 한다.

**REQ-008**: WHEN 사용자가 Settings Page에서 계좌번호를 저장할 때, 시스템은 CANO(8자리)와 ACNT_PRDT_CD(2자리) 형식을 검증해야 한다.

**REQ-009**: WHEN 사용자가 대시보드를 로드할 때, 시스템은 자산 요약 위젯에 총평가금액, 총손익금액, 총수익률을 표시해야 한다.

**REQ-010**: WHEN 사용자가 보유종목 목록 페이지에 진입할 때, 시스템은 종목별 종목코드, 종목명, 보유수량, 매입평균가, 현재가, 평가금액, 평가손익, 수익률을 표시해야 한다.

**REQ-011**: WHEN 잔고조회 API 호출이 실패할 때, 시스템은 기존 retry.ts의 지수 백오프 재시도 정책을 적용해야 한다.

**REQ-012**: WHEN 사용자가 잔고 새로고침 버튼을 클릭할 때, 시스템은 즉시 최신 잔고 데이터를 조회해야 한다.

### 3. 상태 기반 요구사항 (State-Driven)

**REQ-013**: IF KIS 인증이 완료되지 않았으면, 시스템은 잔고조회 대신 "KIS 연동이 필요합니다" 안내 메시지를 표시해야 한다.

**REQ-014**: IF 계좌번호가 설정되지 않았으면, 시스템은 잔고조회 대신 "계좌번호를 설정해주세요" 안내 메시지를 표시해야 한다.

**REQ-015**: IF Production 환경이면, 시스템은 tr_id로 `TTTC8434R`을 사용해야 한다.

**REQ-016**: IF Mock 환경이면, 시스템은 tr_id로 `VTTC8434R`을 사용해야 한다.

**REQ-017**: IF 보유 종목이 없으면, 시스템은 "보유 종목이 없습니다" 메시지를 표시해야 한다.

**REQ-018**: IF 평가손익이 양수이면, 시스템은 손익 금액과 수익률을 빨간색으로 표시해야 한다.

**REQ-019**: IF 평가손익이 음수이면, 시스템은 손익 금액과 수익률을 파란색으로 표시해야 한다.

### 4. 바람직하지 않은 행동 요구사항 (Unwanted)

**REQ-020**: 시스템은 계좌번호를 평문으로 저장하지 않아야 한다.

**REQ-021**: 시스템은 Rate Limit을 초과하는 잔고조회 요청을 전송하지 않아야 한다.

**REQ-022**: 시스템은 환경(Production/Mock)과 tr_id가 불일치하는 요청을 전송하지 않아야 한다.

**REQ-023**: 시스템은 잔고 데이터를 브라우저의 로컬 스토리지에 캐싱하지 않아야 한다.

### 5. 선택적 요구사항 (Optional)

**REQ-024**: 가능하면, 시스템은 잔고 데이터를 서버 측에서 캐싱하여 중복 API 호출을 줄여야 한다 (TTL: 30초).

**REQ-025**: 가능하면, 시스템은 종목별 일일 등락률을 함께 표시해야 한다.

**REQ-026**: 가능하면, 시스템은 종목별 비중(보유 비율)을 차트로 시각화해야 한다.

## SPECIFICATIONS

### SPEC-001: KIS 국내주식 잔고조회 API 통합

**기능**: KIS OpenAPI 국내주식 잔고조회 엔드포인트 호출 및 응답 처리

**API 상세**:

- **엔드포인트**: GET `/uapi/domestic-stock/v1/trading/inquire-balance`
- **tr_id**: `TTTC8434R` (Production) / `VTTC8434R` (Mock)

**필수 헤더**:

| 헤더          | 값                              | 설명        |
| ------------- | ------------------------------- | ----------- |
| Content-Type  | application/json; charset=utf-8 | 콘텐츠 타입 |
| authorization | Bearer {access_token}           | 인증 토큰   |
| appkey        | {appkey}                        | 앱 키       |
| appsecret     | {appsecret}                     | 앱 시크릿   |
| tr_id         | TTTC8434R / VTTC8434R           | 거래 ID     |

**쿼리 파라미터**:

| 파라미터              | 필수 | 값    | 설명                 |
| --------------------- | ---- | ----- | -------------------- |
| CANO                  | Y    | 8자리 | 종합계좌번호         |
| ACNT_PRDT_CD          | Y    | 2자리 | 계좌상품코드         |
| AFHR_FLPR_YN          | Y    | "N"   | 시간외단일가여부     |
| OFL_YN                | Y    | ""    | 오프라인여부         |
| INQR_DVSN             | Y    | "02"  | 조회구분 (종목별)    |
| UNPR_DVSN             | Y    | "01"  | 단가구분             |
| FUND_STTL_ICLD_YN     | Y    | "N"   | 펀드결제분포함여부   |
| FNCG_AMT_AUTO_RDPT_YN | Y    | "N"   | 융자금액자동상환여부 |
| PRCS_DVSN             | Y    | "00"  | 처리구분             |
| CTX_AREA_FK100        | Y    | ""    | 연속조회검색조건     |
| CTX_AREA_NK100        | Y    | ""    | 연속조회키           |

**응답 output1 (종목별 데이터)**:

| 필드          | 타입   | 설명             |
| ------------- | ------ | ---------------- |
| pdno          | string | 종목코드 (6자리) |
| prdt_name     | string | 종목명           |
| hldg_qty      | string | 보유수량         |
| pchs_avg_pric | string | 매입평균가격     |
| pchs_amt      | string | 매입금액         |
| prpr          | string | 현재가           |
| evlu_amt      | string | 평가금액         |
| evlu_pfls_amt | string | 평가손익금액     |
| evlu_pfls_rt  | string | 평가손익률 (%)   |

**응답 output2 (계좌 요약)**:

| 필드               | 타입   | 설명             |
| ------------------ | ------ | ---------------- |
| dnca_tot_amt       | string | 예수금총금액     |
| pchs_amt_smtl_amt  | string | 매입금액합계금액 |
| evlu_amt_smtl_amt  | string | 평가금액합계금액 |
| evlu_pfls_smtl_amt | string | 평가손익합계금액 |
| tot_evlu_amt       | string | 총평가금액       |
| nass_amt           | string | 순자산금액       |

**페이지네이션**:

- Production: 1회 최대 50건
- Mock: 1회 최대 20건
- `ctx_area_nk100`이 비어있지 않으면 다음 페이지 존재
- 다음 페이지 요청 시 `CTX_AREA_FK100`과 `CTX_AREA_NK100`에 이전 응답값 전달

### SPEC-002: 계좌번호 설정 관리

**기능**: 기존 KIS Settings Page에 계좌번호 입력 필드 추가

**상세 동작**:

1. **계좌번호 입력**
   - CANO (종합계좌번호): 8자리 숫자 입력
   - ACNT_PRDT_CD (계좌상품코드): 2자리 숫자 입력
   - 기존 kis_configs 테이블 확장 또는 별도 테이블로 저장

2. **입력 검증**
   - CANO: 정확히 8자리 숫자
   - ACNT_PRDT_CD: 정확히 2자리 숫자
   - 저장 전 형식 검증

3. **보안**
   - 계좌번호는 AES-256-GCM 암호화하여 저장 (기존 crypto.ts 활용)
   - API 응답의 계좌번호는 마스킹 표시 (예: 1234\*\*\*\*-01)

### SPEC-003: 대시보드 자산 요약 위젯

**기능**: 대시보드에 계좌 자산 요약 정보를 표시하는 위젯

**상세 동작**:

1. **자산 요약 정보 표시**
   - 총평가금액 (tot_evlu_amt)
   - 총매입금액 (pchs_amt_smtl_amt)
   - 총평가손익 (evlu_pfls_smtl_amt)
   - 총수익률 (계산: 총평가손익 / 총매입금액 \* 100)
   - 예수금 (dnca_tot_amt)
   - 순자산금액 (nass_amt)

2. **시각적 표현**
   - 손익 양수: 빨간색 (한국 증시 관행)
   - 손익 음수: 파란색
   - 금액: 천 단위 구분자 포함

3. **인터랙션**
   - 새로고침 버튼
   - 보유종목 상세 페이지 링크
   - 마지막 조회 시간 표시

**데이터 모델**:

```typescript
interface AccountSummary {
  depositTotal: number; // 예수금총금액
  purchaseTotal: number; // 매입금액합계
  evaluationTotal: number; // 평가금액합계
  profitLossTotal: number; // 평가손익합계
  totalEvaluation: number; // 총평가금액
  netAsset: number; // 순자산금액
  profitLossRate: number; // 총수익률 (%)
  lastUpdated: Date; // 마지막 조회 시간
}
```

### SPEC-004: 보유종목 상세 목록 페이지

**기능**: 보유 종목의 상세 정보를 테이블 형식으로 표시하는 전용 페이지

**상세 동작**:

1. **종목 테이블 컬럼**
   - 종목코드 (pdno)
   - 종목명 (prdt_name)
   - 보유수량 (hldg_qty)
   - 매입평균가 (pchs_avg_pric)
   - 현재가 (prpr)
   - 평가금액 (evlu_amt)
   - 평가손익 (evlu_pfls_amt)
   - 수익률 (evlu_pfls_rt)

2. **정렬 기능**
   - 기본 정렬: 평가금액 내림차순
   - 사용자 선택 정렬: 종목명, 수익률, 보유수량, 평가금액

3. **페이지 구조**
   - 경로: `/kis/portfolio`
   - 상단: 자산 요약 카드
   - 하단: 종목 목록 테이블

**데이터 모델**:

```typescript
interface StockHolding {
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
```

### SPEC-005: 잔고조회 서비스 레이어

**기능**: 잔고조회 비즈니스 로직을 캡슐화하는 서비스 클래스

**상세 동작**:

1. **API 호출 추상화**
   - 기존 `KISAuthMiddleware.makeRequest()`를 활용한 인증된 요청
   - 환경에 따른 자동 tr_id 선택
   - 쿼리 파라미터 조립 및 검증

2. **페이지네이션 처리**
   - 자동 연속 조회로 전체 보유 종목 수집
   - `ctx_area_nk100` 기반 다음 페이지 감지
   - Rate Limit 준수를 위한 요청 간격 제어

3. **데이터 변환**
   - KIS API 문자열 응답을 숫자형 TypeScript 인터페이스로 변환
   - output1 (종목 배열) + output2 (계좌 요약) 통합 처리
   - 수익률 소수점 2자리 반올림

4. **서버 측 캐싱 (Optional)**
   - 메모리 기반 캐시 (TTL: 30초)
   - 새로고침 요청 시 캐시 무효화

**설계 패턴**:

```typescript
// lib/kis/balance-service.ts
class KISBalanceService {
  async getBalance(cano: string, acntPrdtCd: string): Promise<BalanceResponse>;
  async getFullHoldings(cano: string, acntPrdtCd: string): Promise<StockHolding[]>;
  private async fetchPage(params: BalanceQueryParams): Promise<KISBalanceApiResponse>;
  private transformHolding(raw: KISOutput1Item): StockHolding;
  private transformSummary(raw: KISOutput2Item): AccountSummary;
}
```

### SPEC-006: API 라우트

**기능**: 잔고조회를 위한 Next.js API Route Handler

**엔드포인트**:

1. **GET /api/kis/balance**
   - 계좌 잔고 전체 조회 (종목 목록 + 자산 요약)
   - 응답: `{ holdings: StockHolding[], summary: AccountSummary }`

2. **GET /api/kis/balance/summary**
   - 자산 요약만 조회 (대시보드 위젯용, 경량)
   - 응답: `{ summary: AccountSummary }`

3. **POST /api/kis/account**
   - 계좌번호 저장
   - 요청: `{ cano: string, acntPrdtCd: string }`

4. **GET /api/kis/account**
   - 저장된 계좌번호 조회 (마스킹 처리)
   - 응답: `{ cano: "1234****", acntPrdtCd: "01" }`

## CONSTRAINTS

### 기술적 제약사항

1. **SPEC-KIS-001 의존성**
   - 인증 토큰 관리: `TokenManager`, `KISAuthMiddleware` 완전 의존
   - 암호화: `crypto.ts`의 AES-256-GCM 재사용
   - 로깅: `logger.ts`의 민감 정보 마스킹 재사용
   - 재시도: `retry.ts`의 지수 백오프 재사용

2. **KIS API 제약**
   - Rate Limit: 초당 20건 (권장 15건)
   - 페이지네이션: Production 최대 50건/요청, Mock 최대 20건/요청
   - tr_id 환경 구분 필수
   - 응답 데이터가 모두 문자열(string) 타입으로 반환됨

3. **성능 요구사항**
   - 잔고조회 전체 응답: P95 < 3초 (페이지네이션 포함)
   - 대시보드 위젯 로드: P95 < 1초
   - 보유종목 100개 이하 기준 설계

4. **보안 요구사항**
   - 계좌번호 암호화 저장
   - API 응답의 계좌번호 마스킹
   - 잔고 데이터 클라이언트 캐싱 금지

### 비즈니스 제약사항

1. **범위 한정**
   - 국내주식만 대상 (해외주식은 별도 SPEC)
   - 조회 전용 (매매 주문 기능 제외)
   - 실시간 스트리밍 제외 (폴링 방식)

2. **데이터 정확성**
   - KIS API 응답 데이터를 그대로 표시 (자체 계산 최소화)
   - 수익률은 KIS API가 제공하는 evlu_pfls_rt 값을 우선 사용

## TRACEABILITY

### 요구사항-사양 매핑

| 요구사항                                                                                 | 관련 사양 |
| ---------------------------------------------------------------------------------------- | --------- |
| REQ-001, REQ-005, REQ-006, REQ-011, REQ-015, REQ-016                                     | SPEC-001  |
| REQ-002, REQ-008, REQ-020                                                                | SPEC-002  |
| REQ-003, REQ-004, REQ-009, REQ-013, REQ-014, REQ-018, REQ-019                            | SPEC-003  |
| REQ-003, REQ-004, REQ-010, REQ-012, REQ-017, REQ-018, REQ-019                            | SPEC-004  |
| REQ-001, REQ-005, REQ-006, REQ-007, REQ-011, REQ-015, REQ-016, REQ-021, REQ-022, REQ-024 | SPEC-005  |
| REQ-006, REQ-008, REQ-009, REQ-010, REQ-012                                              | SPEC-006  |

### 태그

- `#balance` (REQ-001, REQ-003, REQ-004, REQ-006, REQ-007, REQ-010, REQ-012, REQ-017)
- `#account` (REQ-002, REQ-008, REQ-014, REQ-020)
- `#portfolio` (REQ-009, REQ-010, REQ-025, REQ-026)
- `#api` (REQ-001, REQ-005, REQ-006, REQ-007, REQ-011, REQ-015, REQ-016, REQ-021, REQ-022)
- `#security` (REQ-020, REQ-023)
- `#ui-components` (REQ-009, REQ-010, REQ-012, REQ-013, REQ-014, REQ-017, REQ-018, REQ-019)
- `#kis` (모든 REQ)
- `#rate-limit` (REQ-005, REQ-021)
