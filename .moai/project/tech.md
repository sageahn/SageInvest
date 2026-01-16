# SageInvest 기술 스택

## 개요

SageInvest는 TypeScript 기반의 Next.js 웹 애플리케이션으로, PostgreSQL 데이터베이스와 MoAI-ADK 개발 키트를 사용하여 구축됩니다.

## 프론트엔드 기술

### 핵심 프레임워크

| 기술       | 버전 | 용도                         |
| ---------- | ---- | ---------------------------- |
| Next.js    | 14+  | React 기반 풀스택 프레임워크 |
| React      | 18+  | UI 라이브러리                |
| TypeScript | 5+   | 정적 타입 검사               |

### Next.js 아키텍처

- **App Router**: 최신 App Router 패턴 사용
- **Server Components**: RSC를 통한 성능 최적화
- **API Routes**: 백엔드 API 엔드포인트

### 상태 관리 및 데이터 페칭

| 기술                 | 용도                            |
| -------------------- | ------------------------------- |
| React Hooks          | 컴포넌트 상태 관리              |
| Server Actions       | 서버 측 데이터 변경             |
| SWR / TanStack Query | 데이터 페칭 및 캐싱 (추후 결정) |

## 백엔드 기술

### API 레이어

- **Next.js API Routes**: 서버리스 API 엔드포인트
- **Route Handlers**: App Router 기반 핸들러
- **Middleware**: 요청/응답 처리 미들웨어

### 데이터베이스

| 기술       | 용도                         |
| ---------- | ---------------------------- |
| PostgreSQL | 주요 데이터베이스            |
| Prisma ORM | 데이터베이스 ORM (추가 예정) |

### 인증 및 보안

| 기술        | 용도                    |
| ----------- | ----------------------- |
| NextAuth.js | 인증 솔루션 (추가 예정) |
| JWT         | 토큰 기반 인증          |
| OWASP       | 보안 표준 준수          |

## 개발 도구

### 코드 품질

| 도구       | 용도        |
| ---------- | ----------- |
| ESLint     | 코드 린팅   |
| Prettier   | 코드 포맷팅 |
| TypeScript | 타입 검사   |

### 테스팅

| 도구                  | 용도                   |
| --------------------- | ---------------------- |
| Jest                  | 단위 테스트 프레임워크 |
| React Testing Library | 컴포넌트 테스트        |
| Playwright            | E2E 테스트 (추가 예정) |

### Git 워크플로우

- **브랜치 전략**: Git Flow 또는 GitHub Flow
- **커밋 규칙**: Conventional Commits
- **PR 템플릿**: GitHub Pull Request 템플릿

## 개발 환경 요구사항

### 필수 조건

```bash
# Node.js 버전
Node.js 18.17.0 이상

# 패키지 매니저
npm 9.0.0 이상 또는
pnpm 8.0.0 이상 또는
yarn 1.22.0 이상

# 데이터베이스
PostgreSQL 14+ (로컬 또는 클라우드)
```

### 권장 VSCode 확장

- ESLint
- Prettier
- TypeScript Vue Plugin (Volar)
- Tailwind CSS IntelliSense (Tailwind 사용 시)
- Prisma (Prisma 사용 시)

## 빌드 및 배포 설정

### 빌드 명령어

```bash
# 개발 서버
npm run dev

# 프로덕션 빌드
npm run build

# 프로덕션 시작
npm start

# 린트
npm run lint

# 타입 검사
npm run type-check
```

### 배포 옵션

| 플랫폼        | 특징                      |
| ------------- | ------------------------- |
| Vercel        | Next.js 최적화, 제로 설정 |
| Netlify       | Edge Functions 지원       |
| AWS (EC2/ECS) | 자체 호스팅               |
| Docker        | 컨테이너화 배포           |

## MoAI-ADK 통합

### 워크플로우 명령

| 명령               | 용도           |
| ------------------ | -------------- |
| `/moai:1-plan`     | SPEC 문서 생성 |
| `/moai:2-run`      | TDD 구현       |
| `/moai:3-sync`     | 문서 동기화    |
| `/moai:9-feedback` | 피드백 제출    |

### 50+ 전문 Skills

MoAI-ADK는 다양한 도메인에 특화된 Skills를 제공합니다:

- **Foundation**: moai-foundation-core, moai-foundation-claude
- **Workflow**: moai-workflow-project, moai-workflow-docs
- **Library**: moai-library-nextra, moai-library-mermaid
- **Language**: moai-lang-typescript, moai-lang-python
- **Domain**: moai-domain-uiux, moai-domain-backend

### MCP 서버 통합

- **Context7**: 라이브러리 문서 조회
- **Playwright**: 다이어그램 렌더링 (Mermaid)
- **Web Reader**: 웹 페이지 수집

## 의존성

### 프로덕션 의존성

```json
{
  "next": "^14.0.0",
  "react": "^18.0.0",
  "react-dom": "^18.0.0",
  "typescript": "^5.0.0"
}
```

### 개발 의존성

```json
{
  "@types/node": "^20.0.0",
  "@types/react": "^18.0.0",
  "@types/react-dom": "^18.0.0",
  "eslint": "^8.0.0",
  "eslint-config-next": "^14.0.0",
  "prettier": "^3.0.0"
}
```

## 환경 변수

```env
# 데이터베이스
DATABASE_URL=

# NextAuth
NEXTAUTH_URL=
NEXTAUTH_SECRET=

# API (필요시)
API_KEY=

# 배포
VERCEL_URL=
```

## 성능 최적화

- **이미지 최적화**: next/image 사용
- **폰트 최적화**: next/font 사용
- **코드 분할**: 동적 import() 활용
- **캐싱 전략**: ISR (Incremental Static Regeneration)

## 보안 고려사항

- **환경 변수**: 민감 정보는 .env.local에 저장 (Git 제외)
- **CORS**: API 경로에 적절한 CORS 설정
- **Rate Limiting**: API 속도 제한 구현
- **HTTPS**: 프로덕션에서 HTTPS 강제

---

_이 문서는 MoAI-ADK의 workflow-docs에 의해 자동 생성되었습니다._
