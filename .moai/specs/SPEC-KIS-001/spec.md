---
SPEC_ID: SPEC-KIS-001
TITLE: KIS OpenAPI 인증 시스템
STATUS: Planned
PRIORITY: High
ASSIGNED: Alfred (Orchestrator)
DOMAIN: KIS (Korea Investment & Securities OpenAPI)
CREATED: 2026-01-16T09:00:00Z
UPDATED: 2026-01-16T10:30:00Z
LIFECYCLE: spec-anchored
RELATED_SPECs: []
EPIC: Core Infrastructure
ESTIMATED_EFFORT: Medium
LABELS: authentication, api, kis, securities, external-integration, ui-components
---

# SPEC-KIS-001: KIS OpenAPI 인증 시스템

## HISTORY

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-01-16 | Alfred | 초기 SPEC 작성 |
| 1.1.0 | 2026-01-16 | Alfred | KIS OpenAPI API 엔드포인트 및 UI 요구사항 추가 |

## ENVIRONMENT

### 시스템 컨텍스트

SageInvest는 한국투자증권(Korea Investment & Securities, KIS)의 OpenAPI를 활용하여 실제 증권계좌에 접근하고, 실시간 시세 정보를 수집하며, 자산 정보를 확인하는 기능을 제공합니다. 이를 위해 안전하고 신뢰할 수 있는 KIS OpenAPI 인증 시스템이 필수적입니다.

### 기술 환경

- **프로젝트**: SageInvest
- **언어**: TypeScript 5+
- **프레임워크**: Next.js 14+ (App Router)
- **데이터베이스**: PostgreSQL
- **인증 방식**: KIS OpenAPI OAuth 2.0 기반
- **참고 리포지토리**: https://github.com/koreainvestment/open-trading-api.git

### 통합 범위

- KIS OpenAPI 인증 토큰 발급 및 갱신 (4개 API 엔드포인트)
- POST 요청 본문 암호화를 위한 Hashkey 생성
- API 요청 시 자동 인증 헤더 추가
- 토큰 만료 감지 및 재발급
- Mock/Production 환경 전환
- API 로깅 및 모니터링
- UI 컴포넌트: Settings Page, Dashboard Widget, Authentication Page

## ASSUMPTIONS

### 기술적 가정

1. **KIS OpenAPI 가용성**: KIS OpenAPI 서비스가 안정적으로 운영되며, 인증 서버가 99.9% 이상의 가용성을 제공한다고 가정합니다. (신뢰도: High)

2. **OAuth 2.0 표준 준수**: KIS OpenAPI가 OAuth 2.0 Client Credentials Flow를 지원한다고 가정합니다. (신뢰도: High)

3. **API 속도 제한**: KIS OpenAPI가 분당/일일 요청 횟수 제한을 가지고 있으며, 이를 준수해야 한다고 가정합니다. (신뢰도: High)

4. **Hashkey 지원**: KIS OpenAPI가 POST 요청 본문 암호화를 위한 Hashkey 생성을 지원한다고 가정합니다. (신뢰도: High)

### 비즈니스 가정

1. **사용자 계좌 보유**: 사용자가 한국투자증권 계좌를 보유하고 있으며, KIS OpenAPI 사용에 동의한다고 가정합니다. (신뢰도: Medium)

2. **인증 정보 보관**: 사용자가 KIS OpenAPI 인증 정보(AppKey 36자, AppSecret 180자)를 안전하게 보관하고 제공할 것이라고 가정합니다. (신뢰도: Medium)

3. **환경 전환 필요**: 사용자가 개발/테스트를 위해 Mock 환경과 Production 환경을 전환할 수 있다고 가정합니다. (신뢰도: High)

### 검증 방법

- KIS OpenAPI 공식 문서 및 예제 코드 검토
- OAuth 2.0 Client Credentials Flow 표준 호환성 테스트
- Hashkey 생성 API 테스트
- Mock 환경 연결 테스트

## REQUIREMENTS

### 1. 보편적 요구사항 (Ubiquitous)

**REQ-001**: 시스템은 항상 모든 KIS OpenAPI 요청에 유효한 인증 토큰을 포함해야 한다.

**REQ-002**: 시스템은 항상 인증 정보(AppKey, AppSecret)를 암호화하여 저장해야 한다.

**REQ-003**: 시스템은 항상 API 요청 및 응답을 구조화된 로그로 기록해야 한다.

**REQ-004**: 시스템은 항상 API 요청 실패 시 재시도 정책을 따라야 한다.

**REQ-005**: 시스템은 항상 POST 요청에 Hashkey를 포함하여 본문 암호화를 제공해야 한다.

**REQ-006**: 시스템은 항상 선택된 환경(Mock/Production)에 맞는 API 도메인을 사용해야 한다.

### 2. 이벤트 기반 요구사항 (Event-Driven)

**REQ-007**: WHEN 사용자가 KIS OpenAPI 인증을 초기화할 때, 시스템은 접근토큰발급 API(/oauth2/tokenP)를 호출해야 한다.

**REQ-008**: WHEN 사용자가 KIS OpenAPI 연동을 해제할 때, 시스템은 접속토큰폐기 API(/oauth2/revokeP)를 호출해야 한다.

**REQ-009**: WHEN 사용자가 POST 요청을 전송할 때, 시스템은 Hashkey API(/uapi/hashkey)를 호출하여 해시값을 생성해야 한다.

**REQ-010**: WHEN 사용자가 실시간 데이터에 접속할 때, 시스템은 웹소켓 접속키 발급 API(/oauth2/Approval)를 호출해야 한다.

**REQ-011**: WHEN 액세스 토큰이 만료될 때, 시스템은 자동으로 접근토큰발급 API를 호출하여 갱신해야 한다.

**REQ-012**: WHEN API 요청이 401 Unauthorized 응답을 반환할 때, 시스템은 토큰을 갱신하고 요청을 재시도해야 한다.

**REQ-013**: WHEN API 요청이 429 Too Many Requests 응답을 반환할 때, 시스템은 지수 백오프(exponential backoff)로 재시도해야 한다.

**REQ-014**: WHEN 사용자가 환경을 전환할 때, 시스템은 해당 환경의 API 도메인으로 전환해야 한다.

**REQ-015**: WHEN 사용자가 Settings Page에서 연결 테스트 버튼을 클릭하면, 시스템은 선택된 환경으로 연결 테스트를 수행해야 한다.

**REQ-016**: WHEN 토큰 만료 시간이 1시간 이하로 남으면, 시스템은 Dashboard Widget에 카운트다운을 표시해야 한다.

### 3. 상태 기반 요구사항 (State-Driven)

**REQ-017**: IF 유효한 액세스 토큰이 존재하면, 시스템은 토큰 갱신 없이 API 요청을 수행해야 한다.

**REQ-018**: IF 액세스 토큰이 존재하지 않거나 만료되었으면, 시스템은 새 토큰을 발급받아야 한다.

**REQ-019**: IF 사용자가 Mock 환경을 선택하면, 시스템은 https://openapivts.koreainvestment.com:29443 도메인을 사용해야 한다.

**REQ-020**: IF 사용자가 Production 환경을 선택하면, 시스템은 https://openapi.koreainvestment.com:9443 도메인을 사용해야 한다.

**REQ-021**: IF 토큰이 유효하면, 시스템은 Dashboard Widget에 "Connected" 상태를 표시해야 한다.

**REQ-022**: IF 토큰이 만료되었으면, 시스템은 Dashboard Widget에 "Expired" 상태를 표시해야 한다.

**REQ-023**: IF 토큰이 없으면, 시스템은 Dashboard Widget에 "Disconnected" 상태를 표시해야 한다.

### 4. 바람직하지 않은 행동 요구사항 (Unwanted)

**REQ-024**: 시스템은 인증 정보를 평문으로 저장하지 않아야 한다.

**REQ-025**: 시스템은 로그에 민감한 정보(AppSecret, 액세스 토큰)를 포함하지 않아야 한다.

**REQ-026**: 시스템은 API 속도 제한을 초과하는 요청을 보내지 않아야 한다.

**REQ-027**: 시스템은 잘못된 환경의 API 도메인에 요청을 보내지 않아야 한다.

**REQ-028**: 시스템은 POST 요청 본문을 Hashkey 없이 전송하지 않아야 한다.

### 5. 선택적 요구사항 (Optional)

**REQ-029**: 가능하면, 시스템은 토큰 만료 시간을 예측하여 사전에 갱신해야 한다.

**REQ-030**: 가능하면, 시스템은 다중 KIS 계정 연동을 지원해야 한다.

## SPECIFICATIONS

### SPEC-001: KIS OpenAPI API 엔드포인트 통합

**기능**: 4개의 KIS OpenAPI 인증 및 유틸리티 엔드포인트 구현

**상세 동작**:

1. **접근토큰발급(P)** (POST /oauth2/tokenP)
   - Request 파라미터:
     - `grant_type`: "client_credentials"
     - `appkey`: 36자 앱 키
     - `appsecret`: 180자 앱 시크릿
   - Response 필드:
     - `access_token`: 접근 토큰
     - `token_type`: "Bearer"
     - `expires_in`: 유효 시간(초)
     - `access_token_token_expired`: 만료 일시
   - 토큰 유효기간: 일반 24시간, 6시간 주기 갱신 권장

2. **접속토큰폐기(P)** (POST /oauth2/revokeP)
   - 토큰 폐기 요청
   - 사용자 연동 해제 시 호출

3. **Hashkey** (POST /uapi/hashkey)
   - POST 요청 본문 암호화를 위한 해시값 생성
   - 선택 사항이지만 보안 권장
   - Request Body를 암호화하는데 사용

4. **웹소켓 접속키 발급** (POST /oauth2/Approval)
   - 실시간 데이터 연결을 위한 웹소켓 접속 키 발급
   - 실시간 시세, 주문 체결 등에 사용

**API 도메인**:

- **Production**: `https://openapi.koreainvestment.com:9443`
- **Mock**: `https://openapivts.koreainvestment.com:29443`

**데이터 모델 (초안)**:

```typescript
interface KISAuthToken {
  id: string;
  userId: string;
  accessToken: string; // 암호화
  expiresAt: Date; // UTC
  tokenType: 'Bearer';
  expiresIn: number; // seconds
  environment: 'production' | 'mock';
  createdAt: Date;
  updatedAt: Date;
}

interface KISHashkeyResponse {
  hash: string; // POST 요청 본문 암호화용 해시
}

interface KISWebSocketApproval {
  approval_key: string; // 웹소켓 접속용 키
}
```

### SPEC-002: Hashkey 생성 및 POST 요청 암호화

**기능**: POST 요청 본문 암호화를 위한 Hashkey 생성

**상세 동작**:

1. **Hashkey 생성**
   - POST 요청 전송 전 /uapi/hashkey 호출
   - Request Body를 JSON 문자열로 변환하여 전송
   - 응답받은 hash를 POST 요청 헤더에 포함

2. **POST 요청 구성**
   - `hash` 헤더에 생성된 해시값 포함
   - Request Body는 JSON 형식으로 전송

**구현 패턴 (초안)**:

```typescript
async function makeKISPostRequest<T>(
  endpoint: string,
  body: Record<string, unknown>
): Promise<T> {
  // 1. Hashkey 생성
  const hashResponse = await fetch(`${KIS_API_BASE}/uapi/hashkey`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'appkey': KIS_APP_KEY,
      'appsecret': KIS_APP_SECRET,
    },
    body: JSON.stringify(body),
  });

  const { hash } = await hashResponse.json();

  // 2. 실제 POST 요청
  const response = await fetch(`${KIS_API_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'hash': hash,
    },
    body: JSON.stringify(body),
  });

  return response.json();
}
```

### SPEC-003: 환경 관리 (Environment Management)

**기능**: Mock/Production 환경 전환

**상세 동작**:

1. **환경 설정**
   - 사용자가 Settings Page에서 환경 선택 (Production/Mock)
   - 선택된 환경이 PostgreSQL에 저장

2. **API 도메인 전환**
   - Mock: `https://openapivts.koreainvestment.com:29443`
   - Production: `https://openapi.koreainvestment.com:9443`
   - 모든 API 요청이 선택된 환경의 도메인 사용

3. **연결 테스트**
   - Settings Page에서 선택된 환경으로 연결 테스트
   - 접근토큰발급 API 호출로 테스트
   - 성공/실패 결과 표시

**데이터 모델 (초안)**:

```typescript
type KISEnvironment = 'production' | 'mock';

interface KISConfig {
  userId: string;
  environment: KISEnvironment;
  appKey: string; // encrypted
  appSecret: string; // encrypted
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const KIS_API_DOMAINS: Record<KISEnvironment, string> = {
  production: 'https://openapi.koreainvestment.com:9443',
  mock: 'https://openapivts.koreainvestment.com:29443',
};
```

### SPEC-004: 인증 토큰 관리

**기능**: KIS OpenAPI 인증 토큰의 발급, 갱신, 저장, 검증

**상세 동작**:

1. **토큰 발급**
   - AppKey, AppSecret을 사용하여 /oauth2/tokenP 엔드포인트에 요청
   - 발급받은 토큰을 암호화하여 데이터베이스에 저장
   - 토큰 만료 시간(UTC) 함께 저장
   - 환경 정보(Production/Mock) 함께 저장

2. **토큰 갱신**
   - 액세스 토큰 만료 1시간 전에 자동 갱신 시도
   - 24시간 유효 기간, 6시간 주기 갱신 권장
   - 갱신된 토큰으로 데이터베이스 업데이트

3. **토큰 저장**
   - 액세스 토큰 암호화 저장 (AES-256)
   - PostgreSQL 데이터베이스의 kis_tokens 테이블 활용
   - 사용자별 토큰 관리

4. **토큰 검증**
   - API 요청 전 토큰 유효성 검사
   - 만료 시간 확인 및 필요시 갱신

### SPEC-005: API 요청 인증 미들웨어

**기능**: KIS OpenAPI 요청에 자동으로 인증 헤더 추가

**상세 동작**:

1. **요청 인터셉트**
   - Next.js Middleware 또는 Axios Interceptor 사용
   - KIS API 도메인에 대한 요청 감지

2. **헤더 추가**
   - Authorization 헤더에 `Bearer {access_token}` 추가
   - hash 헤더 추가 (POST 요청의 경우)
   - Content-Type, 기타 필수 헤더 추가

3. **토큰 만료 처리**
   - 401 응답 수신 시 토큰 갱신 시도
   - 갱신 성공 시 원래 요청 재시도
   - 갱신 실패 시 401 에러 반환

### SPEC-006: API 로깅 및 모니터링

**기능**: 모든 KIS API 요청/응답을 로깅하고 모니터링

**상세 동작**:

1. **요청 로깅**
   - 요청 URL, 메서드, 타임스탬프, 환경
   - 요청 본문 (민감 정보 마스킹)
   - 요청 ID (상관관계 추적)

2. **응답 로깅**
   - 응답 상태 코드, 헤더
   - 응답 시간 (latency)
   - 응답 본문 (선택적, 크기 제한)

3. **모니터링**
   - API 가용성 추적 (환경별)
   - 응답 시간 모니터링 (P50, P95, P99)
   - 에러율 추적 (4xx, 5xx)
   - 속도 제한 경고

### SPEC-007: 재시도 정책

**기능**: API 요청 실패 시 지능적인 재시도 수행

**상세 동작**:

1. **재시도 조건**
   - 네트워크 오류 (ECONNRESET, ETIMEDOUT)
   - 5xx 서버 오류
   - 429 속도 제한
   - 401 인증 실패 (토큰 갱신 후 재시도)

2. **재시도 전략**
   - **지수 백오프**: 1초, 2초, 4초, 8초, 16초 (최대 5회)
   - **속도 제한 시**: Retry-After 헤더 준수 또는 60초 대기
   - **최대 재시도 횟수**: 5회 (설정 가능)

3. **재시도 중지**
   - 5회 연속 실패 시
   - 4xx 클라이언트 오류 (401, 429 제외)
   - 사용자가 수동으로 취소 시

## SPEC-008: Settings Page UI 컴포넌트

**기능**: KIS OpenAPI 인증 설정 UI

**상세 동작**:

1. **인증 정보 입력**
   - AppKey 입력 필드 (36자)
   - AppSecret 입력 필드 (180자, password type)
   - 환경 선택 (Production/Mock)

2. **저장 관리**
   - 저장 버튼 (암호화하여 저장)
   - 삭제 버튼 (연동 해제)
   - 현재 설정 표시

3. **연결 테스트**
   - 연결 테스트 버튼
   - 선택된 환경으로 테스트
   - 성공/실패 메시지 표시

**UI 구조**:

```typescript
interface KISSettingsProps {
  currentConfig?: KISConfig;
  onConnect: (appKey: string, appSecret: string, environment: KISEnvironment) => Promise<void>;
  onDisconnect: () => Promise<void>;
  onTestConnection: (environment: KISEnvironment) => Promise<boolean>;
}
```

### SPEC-009: Dashboard Widget UI 컴포넌트

**기능**: 대시보드에서 KIS 연결 상태 표시

**상세 동작**:

1. **연결 상태 표시**
   - Connected: 연결됨 (녹색)
   - Disconnected: 연결 안됨 (회색)
   - Expired: 토큰 만료됨 (빨간색)

2. **인증 버튼**
   - 연결되지 않은 경우: "KIS 연동하기" 버튼
   - 연결된 경우: "연결 관리" 버튼

3. **토큰 만료 카운트다운**
   - 남은 시간 표시 (시간:분:초)
   - 1시간 이하일 때 표시
   - 만료 임박 시 경고 색상

**UI 구조**:

```typescript
interface KISDashboardWidgetProps {
  connectionStatus: 'connected' | 'disconnected' | 'expired';
  tokenExpiresAt?: Date;
  onManageConnection: () => void;
}

interface ConnectionStatus {
  status: 'connected' | 'disconnected' | 'expired';
  message: string;
  color: 'success' | 'neutral' | 'error';
}
```

### SPEC-010: Authentication Page UI 컴포넌트

**기능**: 전용 KIS 인증 페이지

**상세 동작**:

1. **OAuth 인증 흐름**
   - AppKey/AppSecret 입력
   - 인증 진행 상태 표시
   - 성공/실패 메시지

2. **연결 관리**
   - 현재 연결 정보 표시
   - 환경 전환 기능
   - 토큰 갱신 버튼

3. **토큰 정보 표시**
   - 토큰 만료 시간
   - 마지막 갱신 시간
   - 연결된 환경

**UI 구조**:

```typescript
interface KISAuthPageProps {
  config?: KISConfig;
  token?: KISAuthToken;
  onAuthenticate: (appKey: string, appSecret: string, environment: KISEnvironment) => Promise<void>;
  onRefreshToken: () => Promise<void>;
  onRevokeToken: () => Promise<void>;
}
```

## CONSTRAINTS

### 기술적 제약사항

1. **보안 요구사항**
   - OWASP Top 10 준수
   - 인증 정보 암호화 저장 (AES-256)
   - HTTPS 전용 통신
   - 민감 정보 로깅 금지
   - AppSecret은 180자 고정 길이

2. **성능 요구사항**
   - API 요청 응답 시간: P95 < 2초
   - 토큰 발급/갱신 시간: < 1초
   - Hashkey 생성 시간: < 500ms
   - 동시 인증 처리: 100+ 사용자

3. **호환성 요구사항**
   - OAuth 2.0 Client Credentials Flow 준수
   - KIS OpenAPI 버전 호환성
   - TypeScript 5+ 타입 안전성
   - Next.js 14+ App Router 호환

### 비즈니스 제약사항

1. **API 할당량**
   - KIS API 일일 요청 한계 준수
   - 속도 제한 정책 준수

2. **사용자 데이터**
   - 사용자 동의 없는 인증 불가
   - GDPR/개인정보보호법 준수

3. **환경 제약**
   - Mock 환경은 테스트 전용
   - Production 환경은 실제 거래용

## TRACEABILITY

### 요구사항-사양 매핑

| 요구사항 | 관련 사양 |
|---------|----------|
| REQ-001, REQ-007, REQ-011, REQ-012, REQ-017, REQ-018 | SPEC-001, SPEC-004 |
| REQ-001, REQ-005, REQ-012, REQ-017 | SPEC-002, SPEC-005 |
| REQ-006, REQ-014, REQ-019, REQ-020 | SPEC-003 |
| REQ-003, REQ-025 | SPEC-006 |
| REQ-004, REQ-012, REQ-013 | SPEC-007 |
| REQ-015, REQ-019, REQ-020 | SPEC-008 |
| REQ-016, REQ-021, REQ-022, REQ-023 | SPEC-009 |
| REQ-007, REQ-008 | SPEC-010 |

### 태그

- `#authentication` (REQ-001, REQ-002, REQ-007, REQ-008, REQ-011, REQ-017, REQ-018, REQ-021, REQ-022, REQ-023)
- `#api` (REQ-001, REQ-003, REQ-004, REQ-005, REQ-007, REQ-008, REQ-009, REQ-010, REQ-012, REQ-013)
- `#security` (REQ-002, REQ-005, REQ-024, REQ-025, REQ-028)
- `#monitoring` (REQ-003, REQ-016)
- `#retry` (REQ-004, REQ-012, REQ-013)
- `#kis` (모든 REQ)
- `#hashkey` (REQ-005, REQ-009, REQ-028)
- `#environment` (REQ-006, REQ-014, REQ-019, REQ-020, REQ-027)
- `#ui-components` (REQ-015, REQ-016, REQ-021, REQ-022, REQ-023)
