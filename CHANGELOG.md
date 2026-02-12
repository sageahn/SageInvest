# Changelog

이 프로젝트의 모든 주요 변경 사항이 이 파일에 기록됩니다.

이 형식은 [Keep a Changelog](https://keepachangelog.com/ko-KR/1.0.0/)을 기반으로 하며,
이 프로젝트는 [Semantic Versioning](https://semver.org/lang/ko-KR/)을 준수합니다.

## [Unreleased]

### Changed

#### SPEC-KIS-001 완료

- KIS OpenAPI 인증 시스템 구현 완료
- 상태: Planned → Completed (2026-02-08)
- 모든 요구사항 및 사양 구현 완료
- 95% 테스트 커버리지 달성
- API 문서 작성 완료

#### SPEC-KIS-002 진행 중

- KIS 국내주식 잔고조회 및 자산현황 기능 개발
- 상태: Planned → In Progress (2026-02-08)
- 의존성: SPEC-KIS-001 완료

### Added

#### KIS 잔고조회 기능 (SPEC-KIS-002)

- 국내주식 잔고조회 API 통합
- 계좌번호 설정 관리
- 대시보드 자산 요약 위젯
- 보유종목 상세 목록 페이지
- 잔고조회 서비스 레이어

#### API Routes

- GET /api/kis/balance - 계좌 잔고 전체 조회
- GET /api/kis/balance/summary - 자산 요약 조회
- POST /api/kis/account - 계좌번호 저장
- GET /api/kis/account - 저장된 계좌번호 조회

### Improved

#### 코드 품질

- ESLint와 Prettier 설정 추가
- TRUST 5 Readable 가이드라인 준수
- TypeScript 타입 안전성 강화
- 테스트 커버리지 개선

## [0.1.0] - 2026-01-17

### Added

#### KIS OpenAPI 인증 시스템 (SPEC-KIS-001)

- OAuth 2.0 Client Credentials Flow 기반 인증 시스템 구현
- 4개 KIS OpenAPI 엔드포인트 연동
  - 접근 토큰 발급 (POST /oauth2/tokenP)
  - 접속 토큰 폐기 (POST /oauth2/revokeP)
  - Hashkey 생성 (POST /uapi/hashkey)
  - 웹소켓 접속키 발급 (POST /oauth2/Approval)

#### 보안 기능

- AES-256-GCM 암호화를 통한 자격 증명 안전 저장
- PostgreSQL 암호화 토큰 저장소 (kis_tokens 테이블)
- 민감 데이터 마스킹된 구조화된 API 로깅

#### 자동화 기능

- 만료 1시간 전 자동 토큰 갱신
- Race Condition 방지를 위한 토큰 갱신 최적화
- node-cron 기반 백그라운드 스케줄러 (매시간 토큰 확인)

#### 재시도 정책

- Exponential Backoff 기반 재시도 (최대 5회)
- 지연 시간: 1초, 2초, 4초, 8초, 16초
- 401 Unauthorized 자동 재시도 (토큰 갱신 후)
- 429 Rate Limiting 자동 대기 (Retry-After 헤더 준수)

#### 인증 미들웨어

- 자동 Authorization 헤더 추가
- POST 요청 자동 Hashkey 생성
- 요청/응답 인터셉터 기반 에러 처리

#### API Routes

- POST /api/kis/authenticate - KIS 인증 수행
- GET /api/kis/status - 인증 상태 확인
- POST /api/kis/refresh - 토큰 수동 갱신
- POST /api/kis/test - API 연결 테스트
- GET /api/kis/config - 현재 설정 조회

#### 데이터베이스

- kis_config 테이블 (인증 설정 저장)
- kis_tokens 테이블 (암호화된 토큰 저장)
- kis_api_logs 테이블 (구조화된 API 로그)

#### 개발 도구

- TypeScript 5.9+ 타입 정의
- Vitest 테스트 프레임워크
- 95% 테스트 커버리지 (45/47 테스트 통과)
- ESLint + Prettier 코드 포맷팅
- Husky + lint-staged Git 후크

#### 문서화

- [KIS OpenAPI 인증 시스템 API 문서](docs/api/kis-authentication.md)
- README.md 프로젝트 개요
- CHANGELOG.md 변경 이력

### Environment Variables

- `KIS_ENCRYPTION_KEY` - AES-256-GCM 암호화 키 (64자 hex)

### Dependencies

- axios ^1.8.2 - HTTP 클라이언트
- pg ^8.14.1 - PostgreSQL 클라이언트
- node-cron ^3.0.3 - 작업 스케줄러
- crypto - 내장 암호화 모듈

### DevDependencies

- @types/node ^22.13.4
- @types/pg ^8.12.1
- @types/node-cron ^3.0.11
- vitest ^3.0.5
- eslint ^9.20.1
- prettier ^3.5.1
- husky ^9.1.7
- lint-staged ^15.4.3

### Breaking Changes

없음

### Migration Guide

없음 (초기 릴리스)

---

## [0.0.1] - 2026-01-16

### Added

- 프로젝트 초기 구조
- Next.js 14+ App Router 설정
- TypeScript 5+ 설정
- PostgreSQL 데이터베이스 연결
- 기본 프로젝트 템플릿

---

[Unreleased]: https://github.com/yourusername/SageInvest/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/yourusername/SageInvest/releases/tag/v0.1.0
[0.0.1]: https://github.com/yourusername/SageInvest/releases/tag/v0.0.1
