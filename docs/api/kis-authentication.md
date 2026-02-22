# KIS OpenAPI 인증 시스템

## 개요

SageInvest의 KIS(Korea Investment & Securities) OpenAPI 인증 시스템은 한국투자증권 OpenAPI와의 안전한 통신을 위한 OAuth 2.0 기반 인증 솔루션입니다. 자동 토큰 갱신, 암호화된 자격 증명 저장, 지능적인 재시도 정책, 구조화된 로깅을 제공합니다.

### 주요 기능

- **OAuth 2.0 인증**: Client Credentials Flow 기반 액세스 토큰 발급 및 갱신
- **암호화 저장소**: AES-256-GCM 암호화를 통한 AppKey/AppSecret 보호
- **자동 갱신**: 만료 1시간 전 자동 토큰 갱신 (Race Condition 방지)
- **지능형 재시도**: Exponential Backoff 기반 재시도 정책 (최대 5회)
- **인증 미들웨어**: 자동 Authorization 헤더 추가, 401 자동 재시도
- **구조화된 로깅**: 민감 데이터 마스킹된 API 로그
- **백그라운드 스케줄러**: node-cron 기반 정기 토큰 확인

### 아키텍처

```mermaid
flowchart TB
    subgraph 클라이언트
        UI[UI Components]
        API[API Routes]
    end

    subgraph 인증_레이어
        TM[Token Manager]
        AM[Auth Middleware]
        KM[KIS API Client]
    end

    subgraph 데이터_레이어
        CR[Config Repository]
        TR[Token Repository]
        AL[API Logger]
        PG[(PostgreSQL)]
    end

    subgraph 유틸리티
        C[Crypto AES-256-GCM]
        R[Retry Policy]
        L[Logger]
        S[Scheduler]
    end

    subgraph 외부_API
        KIS[KIS OpenAPI]
    end

    UI --> API
    API --> TM
    API --> AM
    TM --> KM
    AM --> TM
    AM --> R
    AM --> L
    KM --> KIS
    TM --> CR
    TM --> TR
    CR --> C
    TR --> C
    AM --> L
    L --> AL
    AL --> PG
    CR --> PG
    TR --> PG
    S --> TM
```

## API 엔드포인트

### 1. 접근 토큰 발급

OAuth 2.0 Client Credentials Flow를 사용하여 액세스 토큰을 발급받습니다.

**엔드포인트:**

- Production: `https://openapi.koreainvestment.com:9443/oauth2/tokenP`
- Mock: `https://openapivts.koreainvestment.com:29443/oauth2/tokenP`

**메서드:** `POST`

**요청 본문:**

```json
{
  "grant_type": "client_credentials",
  "appkey": "앱_키_36자",
  "appsecret": "앱_시크릿_180자"
}
```

**응답:**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 86400,
  "access_token_token_expired": "2026-01-17 00:00:00"
}
```

**타입 정의:**

```typescript
interface TokenIssueResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}
```

---

### 2. 접속 토큰 폐기

사용자 연동 해제 시 액세스 토큰을 폐기합니다.

**엔드포인트:**

- Production: `https://openapi.koreainvestment.com:9443/oauth2/revokeP`
- Mock: `https://openapivts.koreainvestment.com:29443/oauth2/revokeP`

**메서드:** `POST`

**요청 본문:**

```json
{
  "appkey": "앱_키_36자",
  "appsecret": "앱_시크릿_180자",
  "token": "폐기할_액세스_토큰"
}
```

---

### 3. Hashkey 생성

POST 요청 본문 암호화를 위한 Hashkey를 생성합니다.

**엔드포인트:**

- Production: `https://openapi.koreainvestment.com:9443/uapi/hashkey`
- Mock: `https://openapivts.koreainvestment.com:29443/uapi/hashkey`

**메서드:** `POST`

**요청 헤더:**

```
Content-Type: application/json
appKey: 앱_키_36자
```

**요청 본문:**

```json
{
  "key1": "value1",
  "key2": "value2"
}
```

**응답:**

```json
{
  "hash": "생성된_hash_값"
}
```

**타입 정의:**

```typescript
interface HashkeyResponse {
  hash: string;
}
```

---

### 4. 웹소켓 접속키 발급

실시간 데이터 연결을 위한 웹소켓 접속 키를 발급받습니다.

**엔드포인트:**

- Production: `https://openapi.koreainvestment.com:9443/oauth2/Approval`
- Mock: `https://openapivts.koreainvestment.com:29443/oauth2/Approval`

**메서드:** `POST`

**요청 본문:**

```json
{
  "grant_type": "client_credentials",
  "appkey": "앱_키_36자",
  "appsecret": "앱_시크릿_180자"
}
```

**응답:**

```json
{
  "approval_key": "웹소켓_접속_키"
}
```

**타입 정의:**

```typescript
interface ApprovalKeyResponse {
  approval_key: string;
}
```

---

## 타입 정의

### KISEnvironment

KIS OpenAPI 환경 유형입니다.

```typescript
type KISEnvironment = 'production' | 'mock';
```

### KISAuthToken

액세스 토큰 정보입니다.

```typescript
interface KISAuthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  expires_at: Date;
}
```

### KISConfig

KIS 인증 설정입니다.

```typescript
interface KISConfig {
  id?: number;
  app_key: string;
  app_secret: string;
  environment: KISEnvironment;
  created_at: Date;
  updated_at: Date;
}
```

### KISApiLog

API 요청/응답 로그입니다.

```typescript
interface KISApiLog {
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
```

## 사용 예제

### 인증 설정 저장

```typescript
import { configRepository } from '@/lib/kis/config-repository';

const config = {
  app_key: 'your_36_char_app_key',
  app_secret: 'your_180_char_app_secret',
  environment: 'mock' as const,
};

await configRepository.saveConfig(config);
```

### 액세스 토큰 발급

```typescript
import { KISApiClient } from '@/lib/kis/api-client';

const client = new KISApiClient('mock');
const token = await client.issueToken(appKey, appSecret);

console.log(token.access_token);
console.log(token.expires_at);
```

### 인증 미들웨어 사용

```typescript
import { KISAuthMiddleware } from '@/lib/kis/auth-middleware';

const middleware = new KISAuthMiddleware('mock', appKey);

// GET 요청
const response = await middleware.makeRequest({
  method: 'GET',
  url: '/uapi/domestic-stock/v1/quotations/prrydd',
  params: { fid_cond_mrkt_div_code: 'J' },
  needsAuth: true,
});

// POST 요청 (Hashkey 포함)
const postResponse = await middleware.makeRequest({
  method: 'POST',
  url: '/uapi/domestic-stock/v1/trading/order-cash',
  data: { CANO: '12345678', ACNT_PRDT_CD: '01' },
  needsAuth: true,
  needsHash: true,
});
```

### 토큰 자동 갱신

```typescript
import { TokenManager } from '@/lib/kis/token-manager';

const tokenManager = new TokenManager('mock');

// 유효한 토큰 자동 반환 (만료 시 갱신)
const token = await tokenManager.getValidToken();

// 수동 갱신
const newToken = await tokenManager.forceRefresh();

// 만료 임박 확인
const isExpiring = await tokenManager.isTokenExpiringSoon();
```

### 백그라운드 스케줄러

```typescript
import { startTokenRefreshScheduler } from '@/lib/kis/scheduler';

// 서버 시작 시 스케줄러 시작
startTokenRefreshScheduler('mock');

// 매시간 토큰 만료 확인 및 자동 갱신
```

## 에러 처리

### 재시도 정책

시스템은 지수 백오프(exponential backoff) 정책을 사용하여 재시도합니다:

- **최대 재시도 횟수**: 5회
- **기본 지연 시간**: 1초
- **최대 지연 시간**: 16초
- **지연 계산**: `min(baseDelay * 2^attempt, maxDelay)`

### 재시료 가능한 상태 코드

| 상태 코드 | 설명                  |
| --------- | --------------------- |
| 408       | Request Timeout       |
| 429       | Too Many Requests     |
| 500       | Internal Server Error |
| 502       | Bad Gateway           |
| 503       | Service Unavailable   |
| 504       | Gateway Timeout       |

### 401 Unauthorized 처리

401 응답 시 자동으로 토큰을 갱신하고 원래 요청을 재시도합니다:

```mermaid
sequenceDiagram
    participant Client
    participant Middleware
    participant TokenManager
    participant KIS

    Client->>Middleware: API 요청
    Middleware->>KIS: 요청 전송
    KIS-->>Middleware: 401 Unauthorized

    Middleware->>TokenManager: 토큰 갱신 요청
    TokenManager->>KIS: 새 토큰 발급
    KIS-->>TokenManager: 새 액세스 토큰

    TokenManager-->>Middleware: 새 토큰 반환
    Middleware->>KIS: 원래 요청 재시도 (새 토큰)
    KIS-->>Middleware: 성공 응답
    Middleware-->>Client: 최종 응답
```

### 429 Rate Limiting 처리

429 응답 시 `Retry-After` 헤더를 준수하여 대기합니다:

```typescript
// Retry-After 헤더가 있으면 해당 시간만큼 대기
const retryAfter = error.response.headers['retry-after'];
const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 60000; // 기본 60초
```

## 보안 고려사항

### 암호화

- **알고리즘**: AES-256-GCM
- **키 길이**: 256비트 (32바이트)
- **IV 길이**: 16바이트 (무작위 생성)
- **Auth Tag**: 16바이트 (무결성 검증)
- **Salt**: 64바이트 (무작위 생성)

### 환경 변수

```bash
# 필수: 암호화 키 (64자 hex 문자열)
KIS_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# 데이터베이스
DATABASE_URL=postgresql://user:password@localhost:5432/sageinvest
```

### 민감 데이터 마스킹

로깅 시 민감 정보가 자동으로 마스킹됩니다:

| 필드          | 마스킹 형태  |
| ------------- | ------------ |
| appsecret     | `***`        |
| authorization | `Bearer ***` |
| app_secret    | 암호화 저장  |

### 권장 사항

1. **암호화 키 관리**: 환경 변수 또는 비밀 관리 서비스 사용
2. **HTTPS 전용**: 모든 API 통신은 HTTPS를 통해서만 이루어집니다
3. **로그 보호**: 로그 파일에 대한 접근 제한
4. **주기적 갱신**: 6시간마다 토큰 갱신 권장
5. **모의 환경 테스트**: Production 전에 Mock 환경에서 테스트

## 데이터베이스 스키마

### kis_config 테이블

```sql
CREATE TABLE kis_config (
  id SERIAL PRIMARY KEY,
  app_key TEXT NOT NULL,
  app_secret TEXT NOT NULL,
  environment VARCHAR(20) NOT NULL CHECK (environment IN ('production', 'mock')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### kis_tokens 테이블

```sql
CREATE TABLE kis_tokens (
  id SERIAL PRIMARY KEY,
  access_token TEXT NOT NULL,
  token_type VARCHAR(20) NOT NULL,
  expires_in INTEGER NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  environment VARCHAR(20) NOT NULL CHECK (environment IN ('production', 'mock')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### kis_api_logs 테이블

```sql
CREATE TABLE kis_api_logs (
  id SERIAL PRIMARY KEY,
  request_id TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  request_headers TEXT,
  request_body TEXT,
  response_status INTEGER,
  response_body TEXT,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## API Routes

### POST /api/kis/authenticate

KIS OpenAPI 인증을 수행합니다.

**요청 본문:**

```json
{
  "appKey": "36자_앱_키",
  "appSecret": "180자_앱_시크릿",
  "environment": "mock"
}
```

**응답:**

```json
{
  "success": true,
  "token": {
    "access_token": "...",
    "expires_at": "2026-01-18T00:00:00.000Z"
  }
}
```

### GET /api/kis/status

현재 인증 상태를 확인합니다.

**응답:**

```json
{
  "status": "connected",
  "environment": "mock",
  "expiresAt": "2026-01-18T00:00:00.000Z",
  "isExpiringSoon": false
}
```

### POST /api/kis/refresh

액세스 토큰을 수동으로 갱신합니다.

**응답:**

```json
{
  "success": true,
  "token": {
    "access_token": "...",
    "expires_at": "2026-01-18T06:00:00.000Z"
  }
}
```

### POST /api/kis/test

KIS API 연결 테스트를 수행합니다.

**요청 본문:**

```json
{
  "environment": "mock"
}
```

**응답:**

```json
{
  "success": true,
  "message": "KIS API 연결 성공"
}
```

### GET /api/kis/config

현재 KIS 설정을 조회합니다.

**응답:**

```json
{
  "environment": "mock",
  "hasConfig": true,
  "createdAt": "2026-01-17T00:00:00.000Z"
}
```

## 테스트

테스트 커버리지: 95% (45/47 테스트 통과)

```bash
# 모든 테스트 실행
npm test

# 특정 파일 테스트
npm test lib/kis/crypto.test.ts

# 커버리지 확인
npm run test:coverage
```

## 문제 해결

### 토큰 갱신 실패

**증상**: 토큰 갱신이 실패하고 401 오류가 지속됩니다.

**해결 방법**:

1. AppKey와 AppSecret이 올바른지 확인
2. 환경(Mock/Production)이 올바른지 확인
3. KIS OpenAPI 서비스 상태 확인
4. `TokenManager.forceRefresh()`로 수동 갱신 시도

### 암호화 키 오류

**증상**: `KIS_ENCRYPTION_KEY must be 64 hex characters` 오류

**해결 방법**:

```bash
# 64자(32바이트) hex 문자열 생성
node -e "console.log(crypto.randomBytes(32).toString('hex'))"
```

### Rate Limiting

**증상**: 429 Too Many Requests 응답

**해결 방법**:

1. 요청 빈도 줄이기
2. `Retry-After` 헤더 확인 후 대기
3. 배치 작업 간 간격 두기

## 참고 자료

- [KIS OpenAPI 공식 문서](https://www.koreainvestment.com/main/service/serviceOpenAPI.jsp)
- [KIS OpenAPI GitHub](https://github.com/koreainvestment/open-trading-api)
- [OAuth 2.0 Client Credentials](https://oauth.net/2/grant-types/client-credentials/)
- [AES-GCM](https://en.wikipedia.org/wiki/Galois/Counter_Mode)
