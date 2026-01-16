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

### 마일스톤 1: KIS OpenAPI API 클라이언트 구현 (최우선)

**목표**: 4개의 KIS OpenAPI 엔드포인트 구현 및 환경 관리

**작업 항목**:
1. KIS API 클라이언트 클래스 구현
2. 접근토큰발급(P) API 구현 (POST /oauth2/tokenP)
3. 접속토큰폐기(P) API 구현 (POST /oauth2/revokeP)
4. Hashkey API 구현 (POST /uapi/hashkey)
5. 웹소켓 접속키 발급 API 구현 (POST /oauth2/Approval)
6. 환경 관리 기능 구현 (Production/Mock 전환)

**기술적 의존성**:
- HTTP 클라이언트 (fetch 또는 axios)
- TypeScript 5+
- 환경 변수 설정

**완료 기준**:
- 4개의 API 엔드포인트가 정상적으로 호출됨
- Production/Mock 환경 전환이 작동함
- Hashkey가 POST 요청에 포함됨

### 마일스톤 2: 토큰 저장 및 암호화 (최우선)

**목표**: 토큰 암호화 저장 및 데이터베이스 스키마 구현

**작업 항목**:
1. PostgreSQL 스키마 설계 및 구현
   - kis_tokens 테이블 (환경 필드 포함)
   - kis_configs 테이블 (AppKey, AppSecret, 환경)
2. 토큰 암호화/복호화 유틸리티 구현 (AES-256)
3. 토큰 저장소 레이어 구현
4. 환경 설정 저장소 구현

**기술적 의존성**:
- PostgreSQL 데이터베이스 설정
- 암호화 라이브러리 (crypto 또는 node-forge)
- 마일스톤 1 완료

**완료 기준**:
- 토큰이 암호화되어 PostgreSQL에 저장됨
- 환경 설정이 저장됨
- 복호화가 정상적으로 작동함

### 마일스톤 3: 자동 토큰 갱신 시스템 (2차 우선)

**목표**: 토큰 만료 감지 및 자동 갱신 메커니즘 구현

**작업 항목**:
1. 토큰 만료 시간 모니터링 로직 구현
   - 24시간 유효, 6시간 주기 갱신 권장
   - 만료 1시간 전 자동 갱신
2. 401 Unauthorized 응답 시 토큰 갱신 및 재시도 로직
3. 백그라운드 토큰 갱신 스케줄러 (선택사항)
4. 토큰 갱신 실패 시 알림 메커니즘

**기술적 의존성**:
- 마일스톤 1, 2 완료
- 백그라운드 작업 큐 (node-cron 또는 Bull)

**완료 기준**:
- 토큰 만료 1시간 전에 자동 갱신이 수행됨
- 401 응답 시 자동으로 토큰이 갱신되고 요청이 재시도됨
- 갱신 실패 시 로그에 기록되고 적절한 에러가 반환됨

### 마일스톤 4: API 요청 인증 미들웨어 (2차 우선)

**목표**: 모든 KIS API 요청에 자동으로 인증 헤더 추가

**작업 항목**:
1. Next.js Middleware 또는 API Route Handler 구현
2. KIS API 도메인 감지 및 인터셉트
3. Authorization 헤더 자동 추가
4. Hashkey 헤더 자동 추가 (POST 요청)
5. TypeScript 타입 안전한 API 클라이언트 래퍼

**기술적 의존성**:
- 마일스톤 1 완료
- Next.js App Router 또는 Pages Router

**완료 기준**:
- KIS API 요청 시 자동으로 Authorization 헤더가 추가됨
- POST 요청에 hash 헤더가 포함됨
- TypeScript 타입 검증이 통과함

### 마일스톤 5: API 로깅 및 모니터링 (3차 우선)

**목표**: 모든 API 요청/응답의 구조화된 로깅 및 모니터링

**작업 항목**:
1. API 로그 데이터베이스 스키마 설계
2. 요청/응답 로깅 미들웨어 구현
3. 민감 정보 마스킹 로직 구현
4. 환경별 로깅 (Production/Mock 구분)
5. 로그 쿼리 및 대시보드 (선택사항)
6. 모니터링 메트릭 수집 (응답 시간, 에러율)

**기술적 의존성**:
- PostgreSQL 데이터베이스
- 마일스톤 4 완료

**완료 기준**:
- 모든 KIS API 요청이 로그에 기록됨
- 민감 정보(AppSecret, 액세스 토큰)가 마스킹됨
- 환경별 로그가 구분됨
- 응답 시간, 에러율 등의 메트릭이 수집됨

### 마일스톤 6: 재시도 정책 및 장애 처리 (3차 우선)

**목표**: 실패 요청에 대한 지능적인 재시도 및 장애 처리

**작업 항목**:
1. 지수 백오프(exponential backoff) 재시도 로직 구현
2. 재시도 조건 정의 (네트워크 오류, 5xx, 429, 401)
3. 최대 재시도 횟수 설정 및 중단 로직
4. 장애 알림 시스템 (이메일, Slack 등)
5. 속도 제한(Rate Limit) 준수 로직

**기술적 의존성**:
- 마일스톤 5 완료

**완료 기준**:
- 실패 요청이 지수 백오프로 재시도됨
- 5회 연속 실패 시 재시도가 중단되고 알림이 발송됨
- 속도 제한이 준수되어 429 응답이 최소화됨

### 마일스톤 7: Settings Page UI (2차 우선)

**목표**: KIS OpenAPI 설정 UI 구현

**작업 항목**:
1. Settings Page UI 컴포넌트 구현
2. AppKey/AppSecret 입력 필드 구현
   - AppKey: 36자
   - AppSecret: 180자, password type
3. 환경 선택 UI (Production/Mock)
4. 저장/삭제 버튼 구현
5. 연결 테스트 버튼 구현
6. API 호출 및 상태 관리

**기술적 의존성**:
- 마일스톤 1, 2 완료
- Next.js App Router
- React Hook Form (선택)

**완료 기준**:
- AppKey, AppSecret, 환경을 입력하고 저장할 수 있음
- 저장된 정보가 암호화되어 DB에 저장됨
- 연결 테스트가 정상 작동함
- 성공/실패 메시지가 표시됨

### 마일스톤 8: Dashboard Widget (2차 우선)

**목표**: 대시보드 연결 상태 위젯 구현

**작업 항목**:
1. Dashboard Widget UI 컴포넌트 구현
2. 연결 상태 표시 기능
   - Connected (녹색)
   - Disconnected (회색)
   - Expired (빨간색)
3. KIS 연동하기 버튼 구현
4. 연결 관리 버튼 구현
5. 토큰 만료 카운트다운 타이머 구현
   - 1시간 이하일 때 표시
   - 시:분:초 형식

**기술적 의존성**:
- 마일스톤 3 완료
- React hooks (useState, useEffect)

**완료 기준**:
- 연결 상태가 시각적으로 표시됨
- 토큰 만료 카운트다운이 실시간으로 표시됨
- 버튼 클릭으로 적절한 페이지로 이동함

### 마일스톤 9: Authentication Page (3차 우선)

**목표**: 전용 KIS 인증 페이지 구현

**작업 항목**:
1. Authentication Page UI 구현
2. OAuth 인증 흐름 UI 구현
   - AppKey/AppSecret 입력
   - 인증 진행 상태 표시
   - 성공/실패 메시지
3. 연결 관리 기능 구현
   - 현재 연결 정보 표시
   - 환경 전환 기능
   - 토큰 갱신 버튼
4. 토큰 정보 표시
   - 토큰 만료 시간
   - 마지막 갱신 시간
   - 연결된 환경

**기술적 의존성**:
- 마일스톤 7, 8 완료
- Next.js App Router

**완료 기준**:
- OAuth 인증 흐름이 완전히 작동함
- 연결 관리 기능이 작동함
- 토큰 정보가 정확하게 표시됨

### 마일스톤 10: 다중 계정 지원 (선택사항)

**목표**: 하나의 사용자가 여러 KIS 계정을 연동

**작업 항목**:
1. 사용자별 다중 토큰 저장 지원
2. 계정 선택 UI (프론트엔드)
3. 계정별 API 요청 라우팅
4. 계정 연동 해제 기능

**기술적 의존성**:
- 마일스톤 9 완료
- 사용자 인증 시스템 (NextAuth.js 또는 커스텀)

**완료 기준**:
- 사용자가 여러 KIS 계정을 등록하고 전환할 수 있음
- 각 계정의 토큰이 독립적으로 관리됨

## 기술적 접근 방식

### 1. KIS API 클라이언트 설계

**클래스 구조**:

```typescript
// lib/kis/kis-api-client.ts
export class KISAPIClient {
  private config: KISConfig;
  private tokenManager: TokenManager;

  constructor(config: KISConfig) {
    this.config = config;
    this.tokenManager = new TokenManager(config);
  }

  // 접근토큰발급
  async issueAccessToken(): Promise<KISAuthToken> {
    const response = await fetch(
      `${this.getBaseURL()}/oauth2/tokenP`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'client_credentials',
          appkey: this.config.appKey,
          appsecret: this.config.appSecret,
        }),
      }
    );
    return response.json();
  }

  // 접속토큰폐기
  async revokeToken(): Promise<void> {
    await fetch(`${this.getBaseURL()}/oauth2/revokeP`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${await this.tokenManager.getAccessToken()}`,
      },
    });
  }

  // Hashkey 생성
  async generateHashkey(body: Record<string, unknown>): Promise<string> {
    const response = await fetch(
      `${this.getBaseURL()}/uapi/hashkey`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'appkey': this.config.appKey,
          'appsecret': this.config.appSecret,
        },
        body: JSON.stringify(body),
      }
    );
    const { hash } = await response.json();
    return hash;
  }

  // 웹소켓 접속키 발급
  async approveWebSocket(): Promise<string> {
    const response = await fetch(
      `${this.getBaseURL()}/oauth2/Approval`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await this.tokenManager.getAccessToken()}`,
        },
      }
    );
    const { approval_key } = await response.json();
    return approval_key;
  }

  private getBaseURL(): string {
    return KIS_API_DOMAINS[this.config.environment];
  }
}
```

### 2. 환경 관리

**환경 설정**:

```typescript
// lib/kis/environment.ts
export type KISEnvironment = 'production' | 'mock';

export const KIS_API_DOMAINS: Record<KISEnvironment, string> = {
  production: 'https://openapi.koreainvestment.com:9443',
  mock: 'https://openapivts.koreainvestment.com:29443',
};

export interface KISConfig {
  userId: string;
  environment: KISEnvironment;
  appKey: string; // encrypted
  appSecret: string; // encrypted
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class EnvironmentManager {
  async switchEnvironment(userId: string, environment: KISEnvironment): Promise<void> {
    // 환경 전환 로직
    // 1. 현재 토큰 폐기
    // 2. 환경 설정 업데이트
    // 3. 새 환경으로 토큰 발급
  }

  async testConnection(environment: KISEnvironment): Promise<boolean> {
    // 연결 테스트 로직
    // 선택된 환경으로 접근토큰발급 API 호출
  }
}
```

### 3. 아키텍처 설계

**계층 구조**:

```
┌───────────────────────────────────────────────────────────┐
│   Frontend Layer (Next.js App Router)                      │
│   ┌─────────────┬───────────────┬───────────────────────┐ │
│   │ Settings    │ Dashboard     │ Authentication        │ │
│   │ Page        │ Widget        │ Page                  │ │
│   └─────────────┴───────────────┴───────────────────────┘ │
└────────────────────────┬──────────────────────────────────┘
                         │
┌────────────────────────▼──────────────────────────────────┐
│   API Layer (Next.js API Routes)                          │
│   - /api/kis/auth/connect                                  │
│   - /api/kis/auth/disconnect                               │
│   - /api/kis/auth/refresh                                  │
│   - /api/kis/config/*                                      │
└────────────────────────┬──────────────────────────────────┘
                         │
┌────────────────────────▼──────────────────────────────────┐
│   Service Layer (lib/kis/)                                │
│   ┌─────────────┬───────────────┬───────────────────────┐ │
│   │ KISAPI      │ TokenManager  │ EnvironmentManager    │ │
│   │ Client      │               │                       │ │
│   └─────────────┴───────────────┴───────────────────────┘ │
└────────────────────────┬──────────────────────────────────┘
                         │
┌────────────────────────▼──────────────────────────────────┐
│   Data Layer                                              │
│   - PostgreSQL kis_tokens                                 │
│   - PostgreSQL kis_configs                                │
│   - PostgreSQL kis_api_logs                               │
└─────────────────────────────────────────────────────────────┘
```

### 4. 데이터베이스 스키마

**kis_tokens 테이블** (환경 필드 추가):

```sql
CREATE TABLE kis_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  access_token_encrypted TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  token_type VARCHAR(20) DEFAULT 'Bearer',
  environment VARCHAR(20) NOT NULL CHECK (environment IN ('production', 'mock')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_kis_tokens_user_env ON kis_tokens(user_id, environment);
CREATE INDEX idx_kis_tokens_expires_at ON kis_tokens(expires_at);
```

**kis_configs 테이블** (새로 추가):

```sql
CREATE TABLE kis_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  app_key_encrypted TEXT NOT NULL,
  app_secret_encrypted TEXT NOT NULL,
  environment VARCHAR(20) NOT NULL CHECK (environment IN ('production', 'mock')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_kis_configs_user_id ON kis_configs(user_id);
```

**kis_api_logs 테이블** (환경 필드 추가):

```sql
CREATE TABLE kis_api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  method VARCHAR(10) NOT NULL,
  url TEXT NOT NULL,
  environment VARCHAR(20) NOT NULL,
  status_code INTEGER,
  latency INTEGER, -- milliseconds
  retry_count INTEGER DEFAULT 0,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  metadata JSONB
);

CREATE INDEX idx_kis_api_logs_timestamp_env ON kis_api_logs(timestamp, environment);
CREATE INDEX idx_kis_api_logs_request_id ON kis_api_logs(request_id);
```

### 5. UI 컴포넌트 구조

**Settings Page**:

```typescript
// components/kis/KISSettings.tsx
export function KISSettings({ currentConfig, onConnect, onDisconnect, onTestConnection }: KISSettingsProps) {
  const [appKey, setAppKey] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [environment, setEnvironment] = useState<KISEnvironment>('mock');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<boolean | null>(null);

  const handleTest = async () => {
    setTesting(true);
    const result = await onTestConnection(environment);
    setTestResult(result);
    setTesting(false);
  };

  return (
    <div className="kis-settings">
      <h2>KIS OpenAPI 설정</h2>
      <input
        type="text"
        placeholder="AppKey (36자)"
        value={appKey}
        onChange={(e) => setAppKey(e.target.value)}
        maxLength={36}
      />
      <input
        type="password"
        placeholder="AppSecret (180자)"
        value={appSecret}
        onChange={(e) => setAppSecret(e.target.value)}
        maxLength={180}
      />
      <select value={environment} onChange={(e) => setEnvironment(e.target.value as KISEnvironment)}>
        <option value="mock">Mock (테스트 환경)</option>
        <option value="production">Production (실제 환경)</option>
      </select>
      <button onClick={handleTest} disabled={testing}>
        {testing ? '연결 테스트 중...' : '연결 테스트'}
      </button>
      {testResult !== null && (
        <p className={testResult ? 'success' : 'error'}>
          {testResult ? '연결 성공!' : '연결 실패!'}
        </p>
      )}
      <button onClick={() => onConnect(appKey, appSecret, environment)}>
        저장
      </button>
    </div>
  );
}
```

**Dashboard Widget**:

```typescript
// components/kis/KISDashboardWidget.tsx
export function KISDashboardWidget({ connectionStatus, tokenExpiresAt, onManageConnection }: KISDashboardWidgetProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  useEffect(() => {
    if (tokenExpiresAt && connectionStatus === 'connected') {
      const interval = setInterval(() => {
        const now = new Date();
        const expires = new Date(tokenExpiresAt);
        const diff = expires.getTime() - now.getTime();

        if (diff <= 0) {
          setTimeRemaining('만료됨');
          clearInterval(interval);
        } else if (diff <= 60 * 60 * 1000) { // 1시간 이하
          const hours = Math.floor(diff / (60 * 60 * 1000));
          const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
          const seconds = Math.floor((diff % (60 * 1000)) / 1000);
          setTimeRemaining(`${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        } else {
          setTimeRemaining('');
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [tokenExpiresAt, connectionStatus]);

  const statusConfig: ConnectionStatus = useMemo(() => {
    switch (connectionStatus) {
      case 'connected':
        return { status: 'connected', message: '연결됨', color: 'success' };
      case 'expired':
        return { status: 'expired', message: '토큰 만료됨', color: 'error' };
      default:
        return { status: 'disconnected', message: '연결 안됨', color: 'neutral' };
    }
  }, [connectionStatus]);

  return (
    <div className={`kis-widget status-${statusConfig.color}`}>
      <div className="status-indicator">
        <span className="status-text">{statusConfig.message}</span>
      </div>
      {timeRemaining && (
        <div className="countdown">
          남은 시간: {timeRemaining}
        </div>
      )}
      <button onClick={onManageConnection}>
        {connectionStatus === 'connected' ? '연결 관리' : 'KIS 연동하기'}
      </button>
    </div>
  );
}
```

### 6. 보안 고려사항

**암호화 전략**:

- **알고리즘**: AES-256-GCM (Galois/Counter Mode)
- **키 관리**: 환경 변수(`KIS_ENCRYPTION_KEY`)에 저장
- **키 길이**: 32 bytes (256 bits)
- **IV(초기화 벡터)**: 요청마다 무작위 생성

**AppSecret 길이 검증**:

```typescript
export function validateAppSecret(appSecret: string): boolean {
  // KIS AppSecret은 정확히 180자여야 함
  return appSecret.length === 180;
}

export function validateAppKey(appKey: string): boolean {
  // KIS AppKey는 정확히 36자여야 함
  return appKey.length === 36;
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
# KIS OpenAPI 자격증명 (선택사항 - 사용자 입력)
# KIS_APP_KEY=your_36_char_app_key
# KIS_APP_SECRET=your_180_char_app_secret

# API 도메인
KIS_PRODUCTION_URL=https://openapi.koreainvestment.com:9443
KIS_MOCK_URL=https://openapivts.koreainvestment.com:29443

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
- 사전 갱신 정책(만료 1시간 전)
- 24시간 유효, 6시간 주기 갱신 권장 사항 준수
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

### 위험 5: 환경 설정 오류

**확률**: 중간
**영향**: 중간

**대응 계획**:
- 환경 전환 전 확인 UI 제공
- Mock/Production 명확한 표시
- 연결 테스트 기능 제공

## 다음 단계

### `/moai:2-run SPEC-KIS-001` 실행 전 준비사항

1. **KIS OpenAPI 계정 생성**: 한국투자증권 HTS 또는 MTS 계정 필요
2. **앱 키 발급**: KIS 개발자 포털에서 AppKey(36자), AppSecret(180자) 발급
3. **예제 코드 분석**: https://github.com/koreainvestment/open-trading-api.git 클론 및 분석
4. **PostgreSQL 설정**: 로컬 또는 클라우드 데이터베이스 준비

### 전문가 상담 권장사항

**Backend 전문가 상담** (필수):
- 이유: OAuth 2.0 인증 구현, Hashkey 생성, 보안 암호화, API 클라이언트 설계는 백엔드 전문 영역
- 예상 혜택: 보안 강화, 성능 최적화, 확장 가능한 아키텍처

**Frontend 전문가 상담** (필수):
- 이유: Settings Page, Dashboard Widget, Authentication Page는 프론트엔드 전문 영역
- 예상 혜택: 사용자 경험 개선, 상태 관리 최적화, 반응형 UI

**Security 전문가 상담** (권장):
- 이유: 인증 정보 암호화, OWASP 준수, 민감 정보 처리는 보안 전문 영역
- 예상 혜택: 보안 취약점 조기 발견, 컴플라이언스 준수
