---
SPEC_ID: SPEC-KIS-001
TITLE: KIS OpenAPI 인증 시스템
STATUS: Planned
PRIORITY: High
ASSIGNED: Alfred (Orchestrator)
DOMAIN: KIS (Korea Investment & Securities OpenAPI)
CREATED: 2026-01-16T09:00:00Z
UPDATED: 2026-01-16T09:00:00Z
LIFECYCLE: spec-anchored
RELATED_SPECs: []
EPIC: Core Infrastructure
ESTIMATED_EFFORT: Medium
LABELS: authentication, api, kis, securities, external-integration
---

# SPEC-KIS-001: KIS OpenAPI 인증 시스템

## HISTORY

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-01-16 | Alfred | 초기 SPEC 작성 |

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

- KIS OpenAPI 인증 토큰 발급 및 갱신
- API 요청 시 자동 인증 헤더 추가
- 토큰 만료 감지 및 재발급
- API 로깅 및 모니터링
- 요청 실패 시 재시도 정책

## ASSUMPTIONS

### 기술적 가정

1. **KIS OpenAPI 가용성**: KIS OpenAPI 서비스가 안정적으로 운영되며, 인증 서버가 99.9% 이상의 가용성을 제공한다고 가정합니다. (신뢰도: High)

2. **OAuth 2.0 표준 준수**: KIS OpenAPI가 OAuth 2.0 표준을 준수하여 표준적인 인증 흐름으로 구현 가능하다고 가정합니다. (신뢰도: High)

3. **API 속도 제한**: KIS OpenAPI가 분당/일일 요청 횟수 제한을 가지고 있으며, 이를 준수해야 한다고 가정합니다. (신뢰도: High)

### 비즈니스 가정

1. **사용자 계좌 보유**: 사용자가 한국투자증권 계좌를 보유하고 있으며, KIS OpenAPI 사용에 동의한다고 가정합니다. (신뢰도: Medium)

2. **인증 정보 보관**: 사용자가 KIS OpenAPI 인증 정보(앱 키, 시크릿 키)를 안전하게 보관하고 제공할 것이라고 가정합니다. (신뢰도: Medium)

### 검증 방법

- KIS OpenAPI 공식 문서 및 예제 코드 검토
- OAuth 2.0 표준 호환성 테스트
- 속도 제한 정책 확인 및 재시도 전략 수립

## REQUIREMENTS

### 1. 보편적 요구사항 (Ubiquitous)

**REQ-001**: 시스템은 항상 모든 KIS OpenAPI 요청에 유효한 인증 토큰을 포함해야 한다.

**REQ-002**: 시스템은 항상 인증 정보(앱 키, 시크릿 키)를 암호화하여 저장해야 한다.

**REQ-003**: 시스템은 항상 API 요청 및 응답을 구조화된 로그로 기록해야 한다.

**REQ-004**: 시스템은 항상 API 요청 실패 시 재시도 정책을 따라야 한다.

### 2. 이벤트 기반 요구사항 (Event-Driven)

**REQ-005**: WHEN 사용자가 KIS OpenAPI 인증을 초기화할 때, 시스템은 OAuth 2.0 인증 흐름을 시작해야 한다.

**REQ-006**: WHEN 액세스 토큰이 만료될 때, 시스템은 자동으로 리프레시 토큰을 사용하여 갱신해야 한다.

**REQ-007**: WHEN API 요청이 401 Unauthorized 응답을 반환할 때, 시스템은 토큰을 갱신하고 요청을 재시도해야 한다.

**REQ-008**: WHEN API 요청이 429 Too Many Requests 응답을 반환할 때, 시스템은 지수 백오프(exponential backoff)로 재시도해야 한다.

**REQ-009**: WHEN API 요청이 5회 연속 실패할 때, 시스템은 재시도를 중단하고 관리자에게 알림을 보내야 한다.

### 3. 상태 기반 요구사항 (State-Driven)

**REQ-010**: IF 유효한 액세스 토큰이 존재하면, 시스템은 토큰 갱신 없이 API 요청을 수행해야 한다.

**REQ-011**: IF 액세스 토큰이 존재하지 않거나 만료되었으면, 시스템은 새 토큰을 발급받아야 한다.

**REQ-012**: IF 사용자가 KIS OpenAPI 연동을 해제하면, 시스템은 저장된 인증 정보를 안전하게 삭제해야 한다.

### 4. 바람직하지 않은 행동 요구사항 (Unwanted)

**REQ-013**: 시스템은 인증 정보를 평문으로 저장하지 않아야 한다.

**REQ-014**: 시스템은 로그에 민감한 정보(시크릿 키, 리프레시 토큰)를 포함하지 않아야 한다.

**REQ-015**: 시스템은 API 속도 제한을 초과하는 요청을 보내지 않아야 한다.

### 5. 선택적 요구사항 (Optional)

**REQ-016**: 가능하면, 시스템은 토큰 만료 시간을 예측하여 사전에 갱신해야 한다.

**REQ-017**: 가능하면, 시스템은 다중 KIS 계정 연동을 지원해야 한다.

## SPECIFICATIONS

### SPEC-001: 인증 토큰 관리

**기능**: KIS OpenAPI 인증 토큰의 발급, 갱신, 저장, 검증

**상세 동작**:

1. **토큰 발급**
   - OAuth 2.0 Authorization Code Flow 또는 Client Credentials Flow 사용
   - 앱 키, 시크릿 키를 사용하여 토큰 엔드포인트에 요청
   - 발급받은 토큰을 암호화하여 데이터베이스에 저장
   - 토큰 만료 시간(UTC) 함께 저장

2. **토큰 갱신**
   - 액세스 토큰 만료 5분 전에 자동 갱신 시도
   - 리프레시 토큰이 있으면 리프레시 토큰 사용
   - 리프레시 토큰도 만료되었으면 재인증 수행
   - 갱신된 토큰으로 데이터베이스 업데이트

3. **토큰 저장**
   - 액세스 토큰, 리프레시 토큰 암호화 저장 (AES-256)
   - PostgreSQL 데이터베이스의 kis_tokens 테이블 활용
   - 사용자별 토큰 관리 (다중 계정 지원 시)

4. **토큰 검증**
   - API 요청 전 토큰 유효성 검사
   - 만료 시간 확인 및 필요시 갱신

**데이터 모델 (초안)**:

```typescript
interface KISAuthToken {
  id: string;
  userId: string;
  accessToken: string; // 암호화
  refreshToken?: string; // 암호화
  expiresAt: Date; // UTC
  tokenType: 'Bearer';
  scope: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### SPEC-002: API 요청 인증 미들웨어

**기능**: KIS OpenAPI 요청에 자동으로 인증 헤더 추가

**상세 동작**:

1. **요청 인터셉트**
   - Next.js Middleware 또는 Axios Interceptor 사용
   - KIS API 도메인에 대한 요청 감지

2. **헤더 추가**
   - Authorization 헤더에 `Bearer {access_token}` 추가
   - API 키 헤더 추가 (KIS 요구사항에 따름)
   - Content-Type, 기타 필수 헤더 추가

3. **토큰 만료 처리**
   - 401 응답 수신 시 토큰 갱신 시도
   - 갱신 성공 시 원래 요청 재시도
   - 갱신 실패 시 401 에러 반환

**구현 패턴 (초안)**:

```typescript
// middleware.ts 또는 api-client.ts
export async function makeKISRequest(
  endpoint: string,
  options: RequestInit
): Promise<Response> {
  let token = await getValidToken();
  let response = await fetch(endpoint, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (response.status === 401) {
    token = await refreshAccessToken();
    response = await fetch(endpoint, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  return response;
}
```

### SPEC-003: API 로깅 및 모니터링

**기능**: 모든 KIS API 요청/응답을 로깅하고 모니터링

**상세 동작**:

1. **요청 로깅**
   - 요청 URL, 메서드, 타임스탬프
   - 요청 본문 (민감 정보 마스킹)
   - 요청 ID (상관관계 추적)

2. **응답 로깅**
   - 응답 상태 코드, 헤더
   - 응답 시간 (latency)
   - 응답 본문 (선택적, 크기 제한)

3. **모니터링**
   - API 가용성 추적
   - 응답 시간 모니터링 (P50, P95, P99)
   - 에러율 추적 (4xx, 5xx)
   - 속도 제한 경고

4. **로그 레벨**
   - INFO: 일반 요청/응답
   - WARN: 재시도 발생, 속도 제한 경고
   - ERROR: 실패 요청, 인증 오류
   - DEBUG: 상세 디버깅 정보 (개발 환경)

**데이터 모델 (초안)**:

```typescript
interface APILogEntry {
  id: string;
  requestId: string;
  timestamp: Date;
  method: string;
  url: string; // 민감 정보 마스킹
  statusCode?: number;
  latency: number; // ms
  retryCount: number;
  success: boolean;
  error?: string;
  metadata: Record<string, unknown>;
}
```

### SPEC-004: 재시도 정책

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

4. **장애 전파**
   - 최종 실패 시 상세 에러 메시지 반환
   - 실패 사유 로깅
   - 관리자 알림 (심각한 장애 시)

**구현 패턴 (초안)**:

```typescript
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 5
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;

      const delay = Math.pow(2, attempt) * 1000; // 지수 백오프
      await sleep(delay);
    }
  }
  throw new Error('Max retries exceeded');
}
```

## CONSTRAINTS

### 기술적 제약사항

1. **보안 요구사항**
   - OWASP Top 10 준수
   - 인증 정보 암호화 저장 (AES-256)
   - HTTPS 전용 통신
   - 민감 정보 로깅 금지

2. **성능 요구사항**
   - API 요청 응답 시간: P95 < 2초
   - 토큰 갱신 시간: < 1초
   - 동시 인증 처리: 100+ 사용자

3. **호환성 요구사항**
   - OAuth 2.0 표준 준수
   - KIS OpenAPI 버전 호환성
   - TypeScript 5+ 타입 안전성

### 비즈니스 제약사항

1. **API 할당량**
   - KIS API 일일 요청 한계 준수
   - 속도 제한 정책 준수

2. **사용자 데이터**
   - 사용자 동의 없는 인증 불가
   - GDPR/개인정보보호법 준수

## TRACEABILITY

### 요구사항-사양 매핑

| 요구사항 | 관련 사양 |
|---------|----------|
| REQ-001, REQ-006, REQ-007, REQ-010, REQ-011 | SPEC-001 |
| REQ-001, REQ-007, REQ-010 | SPEC-002 |
| REQ-003, REQ-014 | SPEC-003 |
| REQ-004, REQ-007, REQ-008, REQ-009 | SPEC-004 |

### 태그

- `#authentication` (REQ-001, REQ-002, REQ-005, REQ-006, REQ-011, REQ-012)
- `#api` (REQ-001, REQ-003, REQ-004, REQ-007, REQ-008, REQ-009)
- `#security` (REQ-002, REQ-013, REQ-014)
- `#monitoring` (REQ-003, REQ-009)
- `#retry` (REQ-004, REQ-008, REQ-009)
- `#kis` (모든 REQ)
