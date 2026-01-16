# SPEC-KIS-001: KIS OpenAPI 인증 시스템 - 구현 계획

## TAG BLOCK

```
TAG: SPEC-KIS-001
TITLE: KIS OpenAPI 인증 시스템
STATUS: Planned
PRIORITY: High
DOMAIN: KIS (Korea Investment & Securities OpenAPI)
```

## 개요

본 문서는 KIS OpenAPI 인증 시스템의 구현 계획을 정의합니다. 한국투자증권 OpenAPI와의 안전한 통합을 위한 인증 시스템을 구축하여 실시간 시세 데이터, 계좌 정보, 자산 내역을 안전하게 조회할 수 있는 기반을 마련합니다.

## 구현 마일스톤

### 마일스톤 1: 기본 인증 인프라 (최우선)

**목표**: KIS OpenAPI OAuth 2.0 인증의 기본 흐름 구현

**작업 항목**:
1. KIS OpenAPI 예제 코드 분석 및 통신 패턴 파악
2. OAuth 2.0 클라이언트 구현 (Authorization Code Flow 또는 Client Credentials Flow)
3. 액세스 토큰 발급 API 엔드포인트 구현
4. 토큰 저장소(PostgreSQL) 스키마 설계 및 구현
5. 토큰 암호화/복호화 유틸리티 구현

**기술적 의존성**:
- PostgreSQL 데이터베이스 설정
- 암호화 라이브러리 (crypto 또는 node-forge)
- HTTP 클라이언트 (fetch 또는 axios)

**완료 기준**:
- 앱 키, 시크릿 키로 KIS API로부터 액세스 토큰 발급 성공
- 발급받은 토큰이 암호화되어 PostgreSQL에 안전하게 저장됨
- 토큰 조회 및 복호화가 정상적으로 작동함

### 마일스톤 2: 토큰 자동 갱신 시스템 (2차 우선)

**목표**: 토큰 만료 감지 및 자동 갱신 메커니즘 구현

**작업 항목**:
1. 토큰 만료 시간 모니터링 로직 구현
2. 리프레시 토큰을 통한 자동 갱신 구현
3. 401 Unauthorized 응답 시 토큰 갱신 및 재시도 로직
4. 백그라운드 토큰 갱신 스케줄러 (선택사항)
5. 토큰 갱신 실패 시 알림 메커니즘

**기술적 의존성**:
- 마일스톤 1 완료
- 백그라운드 작업 큐 (node-cron 또는 Bull)

**완료 기준**:
- 토큰 만료 5분 전에 자동 갱신이 수행됨
- 401 응답 시 자동으로 토큰이 갱신되고 요청이 재시도됨
- 갱신 실패 시 로그에 기록되고 적절한 에러가 반환됨

### 마일스톤 3: API 요청 인증 미들웨어 (2차 우선)

**목표**: 모든 KIS API 요청에 자동으로 인증 헤더 추가

**작업 항목**:
1. Next.js Middleware 또는 API Route Handler 구현
2. KIS API 도메인 감지 및 인터셉트
3. Authorization 헤더 자동 추가
4. API 키 및 기타 필수 헤더 추가
5. TypeScript 타입 안전한 API 클라이언트 래퍼

**기술적 의존성**:
- 마일스톤 1 완료
- Next.js App Router 또는 Pages Router

**완료 기준**:
- KIS API 요청 시 자동으로 Authorization 헤더가 추가됨
- 모든 필수 헤더가 올바르게 설정됨
- TypeScript 타입 검증이 통과함

### 마일스톤 4: API 로깅 및 모니터링 (3차 우선)

**목표**: 모든 API 요청/응답의 구조화된 로깅 및 모니터링

**작업 항목**:
1. API 로그 데이터베이스 스키마 설계
2. 요청/응답 로깅 미들웨어 구현
3. 민감 정보 마스킹 로직 구현
4. 로그 쿼리 및 대시보드 (선택사항)
5. 모니터링 메트릭 수집 (응답 시간, 에러율)

**기술적 의존성**:
- PostgreSQL 데이터베이스
- 마일스톤 3 완료

**완료 기준**:
- 모든 KIS API 요청이 로그에 기록됨
- 민감 정보(시크릿 키, 리프레시 토큰)가 마스킹됨
- 응답 시간, 에러율 등의 메트릭이 수집됨

### 마일스톤 5: 재시도 정책 및 장애 처리 (3차 우선)

**목표**: 실패 요청에 대한 지능적인 재시도 및 장애 처리

**작업 항목**:
1. 지수 백오프(exponential backoff) 재시도 로직 구현
2. 재시도 조건 정의 (네트워크 오류, 5xx, 429, 401)
3. 최대 재시도 횟수 설정 및 중단 로직
4. 장애 알림 시스템 (이메일, Slack 등)
5. 속도 제한(Rate Limit) 준수 로직

**기술적 의존성**:
- 마일스톤 4 완료

**완료 기준**:
- 실패 요청이 지수 백오프로 재시도됨
- 5회 연속 실패 시 재시도가 중단되고 알림이 발송됨
- 속도 제한이 준수되어 429 응답이 최소화됨

### 마일스톤 6: 다중 계정 지원 (선택사항)

**목표**: 하나의 사용자가 여러 KIS 계정을 연동

**작업 항목**:
1. 사용자별 다중 토큰 저장 지원
2. 계정 선택 UI (프론트엔드)
3. 계정별 API 요청 라우팅
4. 계정 연동 해제 기능

**기술적 의존성**:
- 마일스톤 5 완료
- 사용자 인증 시스템 (NextAuth.js 또는 커스텀)

**완료 기준**:
- 사용자가 여러 KIS 계정을 등록하고 전환할 수 있음
- 각 계정의 토큰이 독립적으로 관리됨

## 기술적 접근 방식

### 1. 인증 흐름 설계

**OAuth 2.0 패턴 선택**:

KIS OpenAPI 문서를 확인 후 다음 두 패턴 중 하나 선택:

**Option A: Authorization Code Flow** (사용자 동의 필요)
- 사용자가 KIS 로그인 페이지에서 인증
- 리다이렉트를 통해 액세스 토큰 획득
- 보안성이 높지만 사용자 경험이 복잡

**Option B: Client Credentials Flow** (서버 간 인증)
- 앱 키, 시크릿 키로 직접 토큰 획득
- 구현이 간단하지만 보안 위험 존재
- KIS OpenAPI 예제 코드 패턴 확인 필요

**참고 리포지토리 분석**:
```bash
# KIS OpenAPI 예제 코드 클론 및 분석
git clone https://github.com/koreainvestment/open-trading-api.git
cd open-trading-api
# 인증 관련 코드 확인
```

### 2. 아키텍처 설계

**계층 구조**:

```
┌─────────────────────────────────────┐
│   Frontend (Next.js App Router)     │
│   - 계정 연동 페이지                  │
│   - 인증 상태 표시                   │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   API Layer (Next.js API Routes)    │
│   - /api/kis/auth/*                  │
│   - /api/kis/accounts/*              │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   Auth Service (lib/kis/auth.ts)    │
│   - TokenManager                    │
│   - AuthMiddleware                  │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   KIS OpenAPI Client                │
│   - HTTP Client with Retry          │
│   - Logging Interceptor             │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   PostgreSQL Database               │
│   - kis_tokens 테이블                │
│   - kis_api_logs 테이블              │
└─────────────────────────────────────┘
```

### 3. 데이터베이스 스키마

**kis_tokens 테이블**:

```sql
CREATE TABLE kis_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  account_name VARCHAR(100), -- 다중 계정 지원 시
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  token_type VARCHAR(20) DEFAULT 'Bearer',
  scope TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_kis_tokens_user_id ON kis_tokens(user_id);
CREATE INDEX idx_kis_tokens_expires_at ON kis_tokens(expires_at);
```

**kis_api_logs 테이블**:

```sql
CREATE TABLE kis_api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  method VARCHAR(10) NOT NULL,
  url TEXT NOT NULL,
  status_code INTEGER,
  latency INTEGER, -- milliseconds
  retry_count INTEGER DEFAULT 0,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  metadata JSONB
);

CREATE INDEX idx_kis_api_logs_timestamp ON kis_api_logs(timestamp);
CREATE INDEX idx_kis_api_logs_request_id ON kis_api_logs(request_id);
```

### 4. 보안 고려사항

**암호화 전략**:

- **알고리즘**: AES-256-GCM (Galois/Counter Mode)
- **키 관리**: 환경 변수(`KIS_ENCRYPTION_KEY`)에 저장
- **키 길이**: 32 bytes (256 bits)
- **IV(초기화 벡터)**: 요청마다 무작위 생성

**민감 정보 처리**:

```typescript
// 암호화
export function encrypt(text: string, key: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

// 복호화
export function decrypt(encrypted: string, key: string): string {
  const [ivHex, authTagHex, encryptedText] = encrypted.split(':');
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    Buffer.from(key, 'hex'),
    Buffer.from(ivHex, 'hex')
  );
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

**로깅 시 마스킹**:

```typescript
export function maskSensitiveData(data: Record<string, unknown>): Record<string, unknown> {
  const masked = { ...data };
  const sensitiveKeys = ['secret', 'token', 'password', 'key'];

  for (const key of Object.keys(masked)) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
      masked[key] = '***MASKED***';
    }
  }

  return masked;
}
```

## 기술적 의존성

### 필수 라이브러리

```json
{
  "dependencies": {
    "crypto": "^1.0.1", // Node.js 내장
    "axios": "^1.6.0" // HTTP 클라이언트 (선택)
  },
  "devDependencies": {
    "@types/node": "^20.0.0"
  }
}
```

### 환경 변수

```env
# KIS OpenAPI 자격증명
KIS_APP_KEY=your_app_key
KIS_APP_SECRET=your_app_secret
KIS_API_BASE_URL=https://openapi.koreainvestment.com:9443

# 암호화
KIS_ENCRYPTION_KEY=64_character_hex_string

# 데이터베이스
DATABASE_URL=postgresql://user:password@localhost:5432/sageinvest

# 재시도 정책
KIS_MAX_RETRIES=5
KIS_RETRY_DELAY_BASE=1000
```

## 위험 및 대응 계획

### 위험 1: KIS API 인증 방식 변경

**확률**: 중간
**영향**: 높음

**대응 계획**:
- KIS OpenAPI 공식 문서 정기 확인 (월 1회)
- 예제 코드 리포지토리 모니터링
- 인증 로직을 모듈화하여 유연한 수정 가능

### 위험 2: 토큰 만료로 인한 서비스 중단

**확률**: 높음
**영향**: 높음

**대응 계획**:
- 사전 갱신 정책(만료 5분 전)
- 여러 개의 리프레시 토큰 백업
- 토큰 갱신 실패 시 알림 시스템

### 위험 3: API 속도 제한 초과

**확률**: 중간
**영향**: 중간

**대응 계획**:
- 요청 속도 제한 구현
- 지수 백오프 재시도
- 속도 제한 모니터링 및 경고

### 위험 4: 보안 침해로 인한 인증 정보 유출

**확률**: 낮음
**영향**: 매우 높음

**대응 계획**:
- 모든 인증 정보 AES-256 암호화
- 주기적인 보안 감사
- 취약점 스캔 (OWASP ZAP)
- 보안 교육 및 코드 리뷰

## 다음 단계

### `/moai:2-run SPEC-KIS-001` 실행 전 준비사항

1. **KIS OpenAPI 계정 생성**: 한국투자증권 HTS 또는 MTS 계정 필요
2. **앱 키 발급**: KIS 개발자 포털에서 앱 키, 시크릿 키 발급
3. **예제 코드 분석**: https://github.com/koreainvestment/open-trading-api.git 클론 및 분석
4. **PostgreSQL 설정**: 로컬 또는 클라우드 데이터베이스 준비

### 전문가 상담 권장사항

**Backend 전문가 상담** (필수):
- 이유: OAuth 2.0 인증 구현, 보안 암호화, API 클라이언트 설계는 백엔드 전문 영역
- 예상 혜택: 보안 강화, 성능 최적화, 확장 가능한 아키텍처

**Security 전문가 상담** (권장):
- 이유: 인증 정보 암호화, OWASP 준수, 민감 정보 처리는 보안 전문 영역
- 예상 혜택: 보안 취약점 조기 발견, 컴플라이언스 준수
