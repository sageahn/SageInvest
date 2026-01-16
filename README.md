# SageInvest

SageInvest는 한국투자증권(KIS) OpenAPI를 활용한 개인 투자 자산 관리 대시보드입니다.

## 개요

SageInvest는 실시간 시세 정보, 포트폴리오 추적, 자산 분석 기능을 제공합니다. KIS OpenAPI와의 안전한 통신을 위한 OAuth 2.0 기반 인증 시스템을 탑재하고 있습니다.

## 주요 기능

### KIS OpenAPI 인증 시스템

- OAuth 2.0 Client Credentials Flow 기반 인증
- AES-256-GCM 암호화를 통한 안전한 자격 증명 저장
- 만료 1시간 전 자동 토큰 갱신
- Exponential Backoff 기반 지능형 재시도 정책
- 구조화된 API 로깅 (민감 데이터 마스킹)
- Mock/Production 환경 전환 지원

상세 문서: [KIS OpenAPI 인증 시스템](docs/api/kis-authentication.md)

### 기술 스택

- **프레임워크**: Next.js 14+ (App Router)
- **언어**: TypeScript 5.9+
- **데이터베이스**: PostgreSQL
- **인증**: KIS OpenAPI OAuth 2.0
- **암호화**: AES-256-GCM
- **테스트**: Vitest
- **코드 품질**: ESLint, Prettier
- **Git 후크**: Husky, lint-staged

## 시작하기

### 사전 요구사항

- Node.js 20+
- PostgreSQL 14+
- KIS OpenAPI 계정 (AppKey, AppSecret)

### 설치

```bash
# 저장소 복제
git clone https://github.com/yourusername/SageInvest.git
cd SageInvest

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env
```

### 환경 변수 설정

```bash
# 데이터베이스
DATABASE_URL=postgresql://user:password@localhost:5432/sageinvest

# KIS 암호화 키 (64자 hex 문자열)
KIS_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# 암호화 키 생성 방법
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 데이터베이스 마이그레이션

```bash
# 마이그레이션 실행
npm run migrate
```

### 개발 서버 시작

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000)에서 애플리케이션을 확인하세요.

## 프로젝트 구조

```
SageInvest/
├── app/                      # Next.js App Router
│   ├── api/                  # API Routes
│   │   └── kis/             # KIS API 엔드포인트
│   └── (dashboard)/         # 대시보드 페이지
├── lib/                     # 라이브러리 코드
│   └── kis/                # KIS OpenAPI 클라이언트
│       ├── api-client.ts    # API 클라이언트
│       ├── auth-middleware.ts # 인증 미들웨어
│       ├── token-manager.ts # 토큰 관리자
│       ├── crypto.ts        # 암호화 유틸리티
│       ├── retry.ts         # 재시도 정책
│       ├── logger.ts        # API 로거
│       └── scheduler.ts     # 토큰 갱신 스케줄러
├── migrations/              # 데이터베이스 마이그레이션
├── docs/                    # 문서
│   └── api/                # API 문서
└── tests/                  # 테스트 파일
```

## KIS OpenAPI 연동

### 1. KIS 계정 설정

1. [한국투자증권 OpenAPI](https://www.koreainvestment.com/main/service/serviceOpenAPI.jsp)에 가입
2. AppKey (36자)와 AppSecret (180자) 발급
3. SageInvest 설정 페이지에서 인증 정보 입력

### 2. 환경 선택

- **Mock**: 개발 및 테스트용 (https://openapivts.koreainvestment.com:29443)
- **Production**: 실제 거래용 (https://openapi.koreainvestment.com:9443)

### 3. 연결 테스트

설정 페이지에서 "연결 테스트" 버튼을 클릭하여 KIS API 연결을 확인하세요.

## 개발

### 코드 스타일

```bash
# ESLint 검사
npm run lint

# Prettier 포맷팅
npm run format

# 타입 검사
npm run type-check
```

### 테스트

```bash
# 모든 테스트 실행
npm test

# 커버리지 확인
npm run test:coverage

# 감시 모드
npm run test:watch
```

### Git 후크

pre-commit 후크가 자동으로 실행됩니다:

- ESLint 검사
- Prettier 포맷팅
- 타입 검사
- 테스트 실행

## 문서

- [KIS OpenAPI 인증 시스템](docs/api/kis-authentication.md)
- [API 문서](docs/api/)
- [SPEC 문서](.moai/specs/)

## 기여

기여를 환영합니다! Pull Request를 제출하기 전에:

1. Fork 및 브랜치 생성
2. 변경 사항 커밋
3. 테스트 통과 확인
4. Pull Request 제출

## 라이선스

MIT License

## 연락처

프로젝트 관련 문의: 이슈 트래커를 통해 문의해 주세요.

---

**SageInvest** - 개인 투자 자산 관리의 스마트한 시작
