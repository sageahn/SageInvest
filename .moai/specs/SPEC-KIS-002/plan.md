# SPEC-KIS-002: KIS 국내주식 잔고조회 및 자산현황 - 구현 계획

## TAG BLOCK

```
TAG: SPEC-KIS-002
TITLE: KIS 국내주식 잔고조회 및 자산현황
STATUS: Planned
PRIORITY: High
DOMAIN: KIS (Korea Investment & Securities OpenAPI)
```

## 개요

본 문서는 KIS OpenAPI 국내주식 잔고조회 및 자산현황 기능의 구현 계획을 정의합니다. SPEC-KIS-001에서 구축한 인증 인프라를 기반으로, 사용자의 국내주식 계좌 잔고를 조회하고 대시보드에서 자산 현황을 한눈에 확인할 수 있는 기능을 구현합니다.

## 구현 마일스톤

### 마일스톤 1: 타입 정의 및 데이터 모델 (최우선)

**목표**: 잔고조회 API 응답 및 서비스 레이어의 TypeScript 인터페이스 정의

**작업 항목**:

1. KIS 잔고조회 API 요청/응답 인터페이스 정의 (types.ts 확장)
   - `KISBalanceQueryParams`: 쿼리 파라미터 인터페이스
   - `KISBalanceApiResponse`: API 전체 응답 인터페이스
   - `KISOutput1Item`: output1 (종목별 데이터) 인터페이스
   - `KISOutput2Item`: output2 (계좌 요약) 인터페이스
2. 서비스 레이어 인터페이스 정의
   - `StockHolding`: 변환된 보유종목 데이터
   - `AccountSummary`: 변환된 계좌 요약 데이터
   - `BalanceResponse`: 통합 응답 (holdings + summary)
3. 계좌번호 관련 인터페이스 정의
   - `KISAccountConfig`: 계좌번호 설정

**기술적 의존성**:

- 기존 `lib/kis/types.ts` (KISEnvironment, KISConfig 등)

**완료 기준**:

- 모든 인터페이스가 TypeScript strict 모드에서 컴파일 성공
- KIS API 공식 문서와 필드명/타입 일치 확인

### 마일스톤 2: 데이터베이스 스키마 확장 (최우선)

**목표**: 계좌번호 저장을 위한 DB 스키마 설계

**작업 항목**:

1. 기존 `kis_configs` 테이블에 계좌번호 컬럼 추가 (방안 A) 또는 별도 `kis_accounts` 테이블 생성 (방안 B)
2. 마이그레이션 스크립트 작성 (`migrations/002_add_kis_account.sql`)
3. Repository 패턴 구현 (`lib/kis/account-repository.ts`)
   - 계좌번호 저장 (암호화)
   - 계좌번호 조회 (복호화)
   - 계좌번호 삭제

**아키텍처 결정 - 방안 B 권장**: 별도 `kis_accounts` 테이블 생성

```sql
CREATE TABLE IF NOT EXISTS kis_accounts (
  id SERIAL PRIMARY KEY,
  cano_encrypted TEXT NOT NULL,
  acnt_prdt_cd_encrypted TEXT NOT NULL,
  environment TEXT NOT NULL CHECK (environment IN ('production', 'mock')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**권장 근거**:

- 단일 책임 원칙: 인증 설정과 계좌 설정의 관심사 분리
- 향후 다중 계좌 지원 시 확장 용이
- 기존 `kis_configs` 테이블 마이그레이션 위험 최소화

**기술적 의존성**:

- PostgreSQL 데이터베이스
- 기존 `crypto.ts` (AES-256-GCM 암호화)

**완료 기준**:

- 마이그레이션 스크립트가 정상 실행됨
- 계좌번호가 암호화되어 저장/조회됨
- 기존 kis_configs, kis_tokens 테이블에 영향 없음

### 마일스톤 3: 잔고조회 서비스 레이어 (최우선)

**목표**: KIS 잔고조회 API 호출, 페이지네이션, 데이터 변환 로직 구현

**작업 항목**:

1. `lib/kis/balance-service.ts` 구현
   - `getBalance()`: 전체 잔고 조회 (종목 + 요약)
   - `getFullHoldings()`: 페이지네이션을 통한 전체 종목 수집
   - `fetchPage()`: 단일 페이지 API 호출
   - `transformHolding()`: KIS 응답 -> StockHolding 변환
   - `transformSummary()`: KIS 응답 -> AccountSummary 변환
2. tr_id 환경 자동 분기 로직
3. Rate Limit 준수를 위한 요청 간격 제어 (throttle)
4. 서버 측 캐시 구현 (Optional, TTL 30초)

**기술적 의존성**:

- 마일스톤 1 완료
- `KISAuthMiddleware.makeRequest()` (SPEC-KIS-001)
- `configRepository.getConfig()` (환경 정보)

**완료 기준**:

- 단일 페이지 잔고조회가 정상 동작
- 페이지네이션으로 전체 종목 수집 확인 (50건 이상 시나리오)
- 빈 계좌 응답 정상 처리
- Rate Limit 초과 방지 확인

### 마일스톤 4: API Route Handler (2차 우선)

**목표**: 프론트엔드에서 호출할 Next.js API 엔드포인트 구현

**작업 항목**:

1. `app/api/kis/balance/route.ts` - 전체 잔고 조회
2. `app/api/kis/balance/summary/route.ts` - 자산 요약만 조회
3. `app/api/kis/account/route.ts` - 계좌번호 CRUD
4. 요청 검증 및 에러 핸들링
5. 응답 포맷 통일 (성공/실패 응답 구조)

**기술적 의존성**:

- 마일스톤 2, 3 완료
- Next.js App Router

**완료 기준**:

- 모든 API 엔드포인트가 정상 응답
- 미인증 상태에서 적절한 에러 응답 (401)
- 계좌번호 미설정 시 적절한 에러 응답 (400)
- 응답에 계좌번호가 마스킹되어 포함

### 마일스톤 5: Settings Page 확장 - 계좌번호 설정 (2차 우선)

**목표**: 기존 KIS Settings Page에 계좌번호 입력 필드 추가

**작업 항목**:

1. 기존 `app/kis/settings/page.tsx` 수정
   - CANO (8자리) 입력 필드 추가
   - ACNT_PRDT_CD (2자리) 입력 필드 추가
   - 입력값 실시간 검증 (자릿수, 숫자 전용)
2. 계좌번호 저장/삭제 API 연동
3. 저장된 계좌번호 마스킹 표시
4. 입력 가이드 메시지 (계좌번호 확인 방법 안내)

**기술적 의존성**:

- 마일스톤 4 완료
- 기존 Settings Page UI 패턴

**완료 기준**:

- 계좌번호 입력, 검증, 저장이 정상 동작
- 기존 AppKey/AppSecret 설정 기능에 영향 없음
- 저장된 계좌번호가 마스킹되어 표시됨

### 마일스톤 6: 대시보드 자산 요약 위젯 (2차 우선)

**목표**: 대시보드에 자산 요약 정보를 표시하는 새 위젯 구현

**작업 항목**:

1. `app/dashboard/components/kis-balance-widget.tsx` 생성
   - 총평가금액, 총매입금액, 총평가손익, 수익률 표시
   - 예수금, 순자산금액 표시
   - 손익 색상 구분 (양수: 빨간색, 음수: 파란색)
   - 금액 포맷팅 (천 단위 쉼표, 원 단위)
2. 새로고침 버튼
3. 마지막 조회 시간 표시
4. 보유종목 상세 페이지 링크
5. 기존 `kis-status-widget.tsx`와 나란히 배치

**기술적 의존성**:

- 마일스톤 4 완료
- React 19 (use hook 활용 가능)

**완료 기준**:

- 자산 요약 데이터가 정확하게 표시됨
- 손익 색상이 올바르게 적용됨
- 금액 포맷이 한국 원화 형식임
- 새로고침 버튼으로 데이터 갱신 가능

### 마일스톤 7: 보유종목 상세 목록 페이지 (3차 우선)

**목표**: 보유종목의 상세 정보를 테이블로 표시하는 전용 페이지

**작업 항목**:

1. `app/kis/portfolio/page.tsx` 생성
   - 상단 자산 요약 카드
   - 보유종목 테이블 (8개 컬럼)
   - 테이블 정렬 기능 (종목명, 수익률, 평가금액, 보유수량)
2. 빈 상태 처리 ("보유 종목이 없습니다")
3. 로딩 상태 UI (스켈레톤)
4. 에러 상태 UI (API 실패 시)
5. 새로고침 버튼

**기술적 의존성**:

- 마일스톤 4 완료
- 기존 UI 패턴 (Tailwind CSS)

**완료 기준**:

- 보유종목이 테이블에 정확히 표시됨
- 정렬 기능이 정상 동작
- 빈 상태, 로딩 상태, 에러 상태가 올바르게 처리됨
- 반응형 레이아웃 (모바일 대응)

### 마일스톤 8: 테스트 및 통합 검증 (3차 우선)

**목표**: 단위 테스트, 통합 테스트로 품질 보증

**작업 항목**:

1. 단위 테스트 (Vitest)
   - balance-service.ts: API 호출 모킹, 데이터 변환 검증
   - account-repository.ts: 암호화/복호화 검증
   - 타입 검증: 인터페이스 호환성
2. API Route 통합 테스트
   - /api/kis/balance: 성공/실패/미인증 시나리오
   - /api/kis/account: CRUD 시나리오
3. 컴포넌트 테스트 (React Testing Library)
   - 자산 요약 위젯 렌더링
   - 보유종목 테이블 정렬
   - 입력 검증 (계좌번호)

**기술적 의존성**:

- 마일스톤 1-7 완료
- Vitest, React Testing Library

**완료 기준**:

- 테스트 커버리지 85% 이상
- 모든 Given-When-Then 시나리오 통과
- ESLint, TypeScript 컴파일 에러 없음

## 기술적 접근 방식

### 1. 아키텍처 설계

**계층 구조**:

```
Frontend Layer (Next.js App Router)
  |- app/kis/portfolio/page.tsx          (보유종목 상세)
  |- app/kis/settings/page.tsx           (계좌번호 설정 추가)
  |- app/dashboard/components/
  |    |- kis-status-widget.tsx           (기존 연결 상태)
  |    |- kis-balance-widget.tsx          (자산 요약 - 신규)
  |
API Layer (Next.js API Routes)
  |- app/api/kis/balance/route.ts        (잔고 전체 조회)
  |- app/api/kis/balance/summary/route.ts (자산 요약 조회)
  |- app/api/kis/account/route.ts        (계좌번호 CRUD)
  |
Service Layer (lib/kis/)
  |- balance-service.ts                  (잔고조회 비즈니스 로직 - 신규)
  |- account-repository.ts              (계좌번호 저장소 - 신규)
  |- api-client.ts                      (기존 - 변경 없음)
  |- auth-middleware.ts                  (기존 - 재사용)
  |- token-manager.ts                   (기존 - 재사용)
  |- types.ts                           (기존 - 확장)
  |- crypto.ts                          (기존 - 재사용)
  |- logger.ts                          (기존 - 재사용)
  |- retry.ts                           (기존 - 재사용)
  |
Data Layer
  |- kis_accounts (신규 테이블)
  |- kis_configs  (기존 - 변경 없음)
  |- kis_tokens   (기존 - 변경 없음)
```

### 2. KIS 잔고조회 API 호출 패턴

```typescript
// balance-service.ts 핵심 로직 (설계 초안)
async getBalance(cano: string, acntPrdtCd: string): Promise<BalanceResponse> {
  const holdings: StockHolding[] = [];
  let ctxAreaFk100 = '';
  let ctxAreaNk100 = '';
  let summary: AccountSummary | null = null;

  do {
    const response = await this.fetchPage({
      CANO: cano,
      ACNT_PRDT_CD: acntPrdtCd,
      CTX_AREA_FK100: ctxAreaFk100,
      CTX_AREA_NK100: ctxAreaNk100,
      // ... 고정 파라미터
    });

    // output1: 종목별 데이터 변환
    holdings.push(...response.output1.map(this.transformHolding));

    // output2: 계좌 요약 (마지막 페이지 데이터 사용)
    if (response.output2?.length > 0) {
      summary = this.transformSummary(response.output2[0]);
    }

    // 페이지네이션 키 갱신
    ctxAreaFk100 = response.ctx_area_fk100 || '';
    ctxAreaNk100 = response.ctx_area_nk100 || '';

    // Rate Limit 준수: 연속 요청 시 간격 확보
    if (ctxAreaNk100) {
      await this.delay(100); // 100ms 간격
    }
  } while (ctxAreaNk100);

  return { holdings, summary: summary! };
}
```

### 3. 데이터 변환 전략

KIS API는 모든 숫자 값을 문자열로 반환하므로, 서비스 레이어에서 숫자형으로 변환합니다:

```typescript
private transformHolding(raw: KISOutput1Item): StockHolding {
  return {
    stockCode: raw.pdno,
    stockName: raw.prdt_name,
    quantity: parseInt(raw.hldg_qty, 10),
    averagePurchasePrice: parseFloat(raw.pchs_avg_pric),
    purchaseAmount: parseInt(raw.pchs_amt, 10),
    currentPrice: parseInt(raw.prpr, 10),
    evaluationAmount: parseInt(raw.evlu_amt, 10),
    profitLossAmount: parseInt(raw.evlu_pfls_amt, 10),
    profitLossRate: parseFloat(raw.evlu_pfls_rt),
  };
}
```

### 4. Rate Limit 관리 전략

```typescript
// 요청 간격 제어 (throttle)
private requestQueue: Promise<void> = Promise.resolve();
private readonly MIN_REQUEST_INTERVAL_MS = 70; // ~15 req/sec

private async throttledRequest<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    this.requestQueue = this.requestQueue.then(async () => {
      try {
        const result = await fn();
        resolve(result);
      } catch (error) {
        reject(error);
      }
      await this.delay(this.MIN_REQUEST_INTERVAL_MS);
    });
  });
}
```

### 5. 금액 포맷팅 유틸리티

```typescript
// lib/utils/format.ts
export function formatKRW(amount: number): string {
  return (
    new Intl.NumberFormat('ko-KR', {
      style: 'decimal',
      maximumFractionDigits: 0,
    }).format(amount) + '원'
  );
}

export function formatPercent(rate: number): string {
  const sign = rate > 0 ? '+' : '';
  return `${sign}${rate.toFixed(2)}%`;
}

export function maskAccountNumber(cano: string): string {
  if (cano.length !== 8) return '****';
  return cano.substring(0, 4) + '****';
}
```

## 기술적 의존성

### SPEC-KIS-001에서 재사용하는 모듈

| 모듈                 | 용도                  | 변경 여부                  |
| -------------------- | --------------------- | -------------------------- |
| api-client.ts        | KIS API base URL 관리 | 변경 없음                  |
| auth-middleware.ts   | 인증된 API 요청 수행  | 재사용 (makeRequest)       |
| token-manager.ts     | 유효 토큰 확보        | 재사용                     |
| crypto.ts            | AES-256-GCM 암호화    | 재사용 (계좌번호 암호화)   |
| logger.ts            | API 로깅 + 마스킹     | 재사용                     |
| retry.ts             | 지수 백오프 재시도    | 재사용                     |
| config-repository.ts | KIS 설정 조회         | 재사용 (환경 정보)         |
| types.ts             | 공용 타입 정의        | 확장 (잔고 관련 타입 추가) |

### 신규 모듈

| 모듈                                            | 용도                        |
| ----------------------------------------------- | --------------------------- |
| lib/kis/balance-service.ts                      | 잔고조회 비즈니스 로직      |
| lib/kis/account-repository.ts                   | 계좌번호 저장소             |
| lib/utils/format.ts                             | 금액/수익률 포맷팅 유틸리티 |
| app/api/kis/balance/route.ts                    | 잔고 조회 API               |
| app/api/kis/balance/summary/route.ts            | 자산 요약 API               |
| app/api/kis/account/route.ts                    | 계좌번호 CRUD API           |
| app/kis/portfolio/page.tsx                      | 보유종목 상세 페이지        |
| app/dashboard/components/kis-balance-widget.tsx | 자산 요약 위젯              |
| migrations/002_add_kis_account.sql              | DB 마이그레이션             |

### 환경 변수

기존 SPEC-KIS-001의 환경 변수를 그대로 사용합니다. 추가 환경 변수가 필요하지 않습니다.

## 위험 및 대응 계획

### 위험 1: 페이지네이션 무한 루프

**확률**: 낮음
**영향**: 높음 (Rate Limit 소진, API 차단 위험)

**대응 계획**:

- 최대 페이지 수 제한 (10페이지 = 500종목)
- 각 페이지 요청 간 간격 확보 (100ms)
- 전체 종목 수 상한 체크 (500건 초과 시 중단)

### 위험 2: KIS API 응답 형식 변경

**확률**: 중간
**영향**: 높음

**대응 계획**:

- 응답 필드 존재 여부 방어적 체크 (optional chaining)
- 데이터 변환 시 기본값 설정
- 예상치 못한 필드 타입에 대한 에러 핸들링

### 위험 3: Rate Limit 초과

**확률**: 중간
**영향**: 중간 (일시적 API 차단)

**대응 계획**:

- 초당 15건 이하로 요청 제한 (throttle)
- 429 응답 시 기존 retry.ts의 백오프 적용
- 동시 요청 방지 (단일 사용자 직렬 처리)

### 위험 4: 대량 보유종목 시 성능 저하

**확률**: 낮음
**영향**: 중간

**대응 계획**:

- 서버 측 캐싱 (TTL 30초) 적용
- 대시보드 위젯은 summary만 요청 (경량 API)
- 종목 목록은 별도 full 요청

### 위험 5: 암호화된 계좌번호 데이터 마이그레이션

**확률**: 낮음
**영향**: 낮음

**대응 계획**:

- 별도 테이블 생성으로 기존 데이터 영향 없음
- 롤백 스크립트 준비

## 다음 단계

### `/moai:2-run SPEC-KIS-002` 실행 전 준비사항

1. **SPEC-KIS-001 구현 확인**: `KISAuthMiddleware.makeRequest()` 정상 동작 확인
2. **Mock 환경 테스트 데이터**: KIS Mock 환경에 테스트용 보유종목 등록
3. **계좌번호 확인**: 테스트에 사용할 종합계좌번호(CANO)와 상품코드(ACNT_PRDT_CD) 준비
4. **PostgreSQL 접속 확인**: DB 마이그레이션 실행 가능 상태 확인

### 전문가 상담 권장사항

**Backend 전문가 상담** (권장):

- 이유: KIS API 통합, 페이지네이션 처리, Rate Limit 관리, 서버 측 캐싱은 백엔드 전문 영역
- 예상 혜택: API 통합 안정성, 성능 최적화, 에러 핸들링 강화

**Frontend 전문가 상담** (권장):

- 이유: 자산 요약 위젯, 보유종목 테이블, 반응형 레이아웃은 프론트엔드 전문 영역
- 예상 혜택: 사용자 경험 개선, 테이블 정렬/필터링 UX, 데이터 시각화
