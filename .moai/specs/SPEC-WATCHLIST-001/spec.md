# SPEC-WATCHLIST-001: Watchlist Management

**TAG BLOCK**: SPEC-WATCHLIST-001 | Watchlist Management | 2026-02-22 | In Progress | High

## 환경 (Environment)

### 프로젝트 컨텍스트

**프로젝트**: SageInvest - AI 기반 투자 어시스턴트 웹 애플리케이션
**기술 스택**:

- 프런트엔드: Next.js 16, React 19, TypeScript 5.9+, Tailwind CSS
- 백엔드: Next.js API Routes, Prisma ORM
- 데이터베이스: PostgreSQL (Supabase)
- 인증: NextAuth.js
- 외부 API: KIS OpenAPI (한국투자증권)

### 현재 내비게이션 구조

```
대시보드 (Dashboard)
포트폴리오 (Portfolio)
설정 (Settings)
  └─ KIS 설정 (KIS Settings)
```

**변경 사항**: "포트폴리오" 뒤에 "관심 종목" 메뉴 추가

## 가정 (Assumptions)

### KIS API 제약 사항

[HARD] **가정 1**: KIS OpenAPI는 서버 사이드 관심 종목 관리 기능을 제공하지 않는다

- **신뢰도**: High
- **근거**: KIS API 문서 분석 결과, 관심 종목 관련 API 미존재
- **위험**: KIS API가 향후 관심 종목 API를 추가할 경우 마이그레이션 필요
- **검증 방법**: KIS API 공식 문서 지속 모니터링

[HARD] **가정 2**: "타사 보유 종목" 기능은 API 기반으로 구현 불가능하다

- **신뢰도**: High
- **근거**: 타사 증권사 보유 종목은 개인정보로 API 제공되지 않음
- **위험**: 사용자 기대와 다른 기능 제공으로 인한 사용자 만족도 저하
- **검증 방법**: 사용자 설문 조사 및 요구사항 재확인

[SOFT] **가정 3**: 실시간 가격 정보는 기존 KIS API를 통해 조회 가능하다

- **신뢰도**: Medium
- **근거**: SPEC-KIS-002, SPEC-KIS-003에서 이미 구현된 가격 조회 API 활용
- **위험**: KIS API rate limit 초과 가능성
- **검증 방법**: load testing 및 rate limiting 구현

### 데이터베이스 설계 가정

[HARD] **가정 4**: 관심 종목 데이터는 PostgreSQL에 사용자별로 분리 저장한다

- **신뢰도**: High
- **근거**: 보안 요구사항 및 프라이버시 정책
- **위험**: 데이터베이스 성능 저하 가능성
- **검증 방법**: 인덱스 설계 및 쿼리 최적화

[SOFT] **가정 5**: 최근 조회 목록은 최대 50개까지 저장한다

- **신뢰도**: Medium
- **근거**: 사용자 경험 및 성능 균형
- **위험**: 일부 사용자에게 제한적일 수 있음
- **검증 방법**: 사용자 피드백 수집 후 조정

### UI/UX 가정

[SOFT] **가정 6**: 관심 종목 페이지는 모바일 환경에서도 최적화된 경험을 제공한다

- **신뢰도**: Medium
- **근거**: 모바일 트래픽 증가 추세
- **위험**: 복잡한 UI로 인한 모바일 성능 저하
- **검증 방법**: 모바일 장치에서 사용성 테스트

## 요구사항 (Requirements)

### Ubiquitous Requirements (항상 활성)

**REQ-U-001**: 시스템은 항상 관심 종목 데이터를 PostgreSQL 데이터베이스에 저장해야 한다

- **이유**: KIS API 미지원으로 인한 로컬 저장 필요성
- **영향**: 데이터 영구성 및 사용자별 관리 가능

**REQ-U-002**: 시스템은 항상 관심 종목 페이지에서 실시간 가격 정보를 표시해야 한다

- **이유**: 투자 결정을 위한 최신 정보 필요성
- **영향**: KIS API 가격 조회 기능 활용

**REQ-U-003**: 시스템은 항상 사용자별로 관심 종목을 분리 저장해야 한다

- **이유**: 개인정보 보호 및 데이터 보안
- **영향**: 인증 시스템 통합 필요

**REQ-U-004**: 시스템은 항상 관심 종목 페이지에서 세 개의 서브탭(최근 조회, 전체, 그룹별)을 제공해야 한다

- **이유**: 한국투자증권 앱 사용자 경험과의 일관성
- **영향**: UI 컴포넌트 구조 설계

**REQ-U-005**: 시스템은 항상 관심 종목 데이터의 추가/삭제/수정 시 변경 내역을 즉시 반영해야 한다

- **이유**: 실시간 데이터 정확성
- **영향**: 낙관적 업데이트 또는 실시간 동기화

### Event-Driven Requirements (WHEN-THEN)

**REQ-E-001**: WHEN 사용자가 종목을 조회하면 THEN 시스템은 최근 조회 목록에 해당 종목을 추가해야 한다

- **이벤트**: 종목 상세 페이지 방문 또는 검색 실행
- **응답**: 최근 조회 테이블에 stock_code, stock_name, viewed_at 기록
- **제약**: 중복 종목은 viewed_at만 업데이트

**REQ-E-002**: WHEN 사용자가 관심 종목에 종목을 추가하면 THEN 시스템은 전체 탭과 그룹별 탭에 해당 종목을 표시해야 한다

- **이벤트**: 종목 카드 또는 검색 결과에서 "관심 종목 추가" 클릭
- **응답**: watchlist_items 테이블에 레코드 생성 및 UI 업데이트
- **제약**: 이미 추가된 종목은 중복 추가 불가

**REQ-E-003**: WHEN 사용자가 그룹을 생성하면 THEN 시스템은 그룹별 탭에 새 그룹을 표시해야 한다

- **이벤트**: 그룹 관리 모달에서 "새 그룹" 버튼 클릭 및 이름 입력
- **응답**: watchlist_groups 테이블에 레코드 생성 및 UI 업데이트
- **제약**: 그룹 이름은 사용자 내에서 유일해야 함

**REQ-E-004**: WHEN 사용자가 관심 종목을 삭제하면 THEN 시스템은 모든 탭에서 해당 종목을 제거해야 한다

- **이벤트**: 종목 카드에서 "삭제" 버튼 클릭 및 확인
- **응답**: watchlist_items 테이블에서 레코드 삭제 및 UI 업데이트
- **제약**: 삭제 작업은 되돌릴 수 없음 (사용자에게 경고)

**REQ-E-005**: WHEN 사용자가 종목 간 순서를 변경하면 THEN 시스템은 변경된 순서를 저장해야 한다

- **이벤트**: 드래그 앤 드롭 또는 순서 변경 버튼 클릭
- **응답**: ordering 필드 업데이트 및 UI 재렌더링
- **제약**: 순서 변경은 즉시 저장되어야 함

### State-Driven Requirements (IF-THEN)

**REQ-S-001**: IF 사용자가 로그인되어 있으면 THEN 시스템은 개인화된 관심 종목을 표시해야 한다

- **조건**: 세션에 유효한 사용자 ID 존재
- **동작**: 사용자별 필터링된 관심 종목 표시
- **대안**: 로그인하지 않은 경우 로그인 페이지로 리다이렉트

**REQ-S-002**: IF 관심 종목이 50개를 초과하면 THEN 시스템은 페이지네이션을 제공해야 한다

- **조건**: watchlist_items 테이블의 레코드 수 > 50
- **동작**: 페이지당 20개 항목 표시, 페이지 네비게이션 제공
- **대안**: 무한 스크롤 또는 가상화된 리스트 고려

**REQ-S-003**: IF 실시간 가격 업데이트가 실패하면 THEN 시스템은 마지막으로 저장된 가격을 표시해야 한다

- **조건**: KIS API 호출 실패 또는 타임아웃
- **동작**: 캐시된 가격 정보 표시 및 "업데이트 실패" 메시지
- **대안**: 재시도 메커니즘 구현 (최대 3회)

**REQ-S-004**: IF 관심 종목 그룹이 삭제되면 THEN 시스템은 해당 그룹의 모든 종목을 "전체" 그룹으로 이동해야 한다

- **조건**: watchlist_groups 레코드 삭제
- **동작**: 해당 그룹의 watchlist_items 레코드의 group_id를 NULL로 업데이트
- **대안**: 그룹 삭제 시 해당 종목들도 함께 삭제 (사용자 선택)

**REQ-S-005**: IF 최근 조회 목록이 50개를 초과하면 THEN 시스템은 가장 오래된 항목을 삭제해야 한다

- **조건**: recently_viewed 테이블의 레코드 수 > 50
- **동작**: viewed_at 기준 오름차순 정렬 후 가장 오래된 레코드 삭제
- **대안**: 사용자에게 보관 기간 설정 권한 부여

### Unwanted Behavior Requirements (금지된 동작)

**REQ-UW-001**: 시스템은 관심 종목 데이터를 KIS API 서버에 저장하면 안 된다

- **이유**: KIS API가 관심 종목 관리 기능을 제공하지 않음
- **대안**: 로컬 PostgreSQL 데이터베이스 활용

**REQ-UW-002**: 시스템은 타사 보유 종목 정보를 API로 조회하면 안 된다

- **이유**: 개인정보 보호 및 API 미지원
- **대안**: 기능 제공하지 않거나 수동 입력 지원

**REQ-UW-003**: 시스템은 관심 종목 추가 시 중복을 허용하면 안 된다

- **이유**: 데이터 일관성 및 사용자 혼란 방지
- **대안**: 중복 검사 후 "이미 추가된 종목입니다" 메시지 표시

**REQ-UW-004**: 시스템은 다른 사용자의 관심 종목을 표시하면 안 된다

- **이유**: 개인정보 보호
- **대안**: 사용자 ID 기반 엄격한 필터링

**REQ-UW-005**: 시스템은 관심 종목 삭제 시 확인 없이 즉시 삭제하면 안 된다

- **이유**: 실수로 인한 데이터 손실 방지
- **대안**: 삭제 확인 모달 또는 toast 알림 후 취소 가능한 undo 기능

### Optional Requirements (선택적 기능)

**REQ-O-001**: 가능하다면 관심 종목을 CSV로 내보내는 기능을 제공해야 한다

- **기능**: 관심 종목 목록을 CSV 파일로 다운로드
- **데이터**: 종목 코드, 종목명, 그룹, 추가 일자, 현재가, 등락률
- **우선순위**: Low

**REQ-O-002**: 가능하다면 관심 종목 가격 알림 설정 기능을 제공해야 한다

- **기능**: 특정 가격 도달 시 푸시 알림 또는 이메일 알림
- **제약**: 이메일 서비스 및 알림 서비스 인프라 필요
- **우선순위**: Low

**REQ-O-003**: 가능하다면 관심 종목을 그룹 간 대량 이동하는 기능을 제공해야 한다

- **기능**: 여러 종목 선택 후 다른 그룹으로 일괄 이동
- **UI**: 체크박스 및 "선택 항목 이동" 버튼
- **우선순위**: Medium

**REQ-O-004**: 가능하다면 관심 종목 검색 및 필터링 기능을 제공해야 한다

- **기능**: 종목명 또는 코드로 검색, 그룹별 필터링, 정렬
- **UI**: 검색 바 및 필터 드롭다운
- **우선순위**: Medium

## 명세 (Specifications)

### 데이터베이스 스키마

#### watchlist_groups 테이블

```sql
CREATE TABLE watchlist_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ordering INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name)
);

CREATE INDEX idx_watchlist_groups_user_id ON watchlist_groups(user_id);
```

**필드 설명**:

- `id`: 그룹 고유 ID
- `name`: 그룹 이름 (최대 100자, 사용자 내 유일)
- `user_id`: 사용자 ID (외래 키)
- `ordering`: 표시 순서
- `created_at`: 생성 일시
- `updated_at`: 수정 일시

#### watchlist_items 테이블

```sql
CREATE TABLE watchlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_code VARCHAR(20) NOT NULL,
  stock_name VARCHAR(100) NOT NULL,
  group_id UUID REFERENCES watchlist_groups(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ordering INTEGER NOT NULL DEFAULT 0,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, stock_code, group_id)
);

CREATE INDEX idx_watchlist_items_user_id ON watchlist_items(user_id);
CREATE INDEX idx_watchlist_items_group_id ON watchlist_items(group_id);
CREATE INDEX idx_watchlist_items_stock_code ON watchlist_items(stock_code);
```

**필드 설명**:

- `id`: 아이템 고유 ID
- `stock_code`: 종목 코드 (예: "005930" for 삼성전자)
- `stock_name`: 종목명 (예: "삼성전자")
- `group_id`: 그룹 ID (NULL이면 "전체" 그룹)
- `user_id`: 사용자 ID (외래 키)
- `ordering`: 표시 순서
- `added_at`: 추가 일시

#### recently_viewed 테이블

```sql
CREATE TABLE recently_viewed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_code VARCHAR(20) NOT NULL,
  stock_name VARCHAR(100) NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, stock_code)
);

CREATE INDEX idx_recently_viewed_user_id ON recently_viewed(user_id);
CREATE INDEX idx_recently_viewed_viewed_at ON recently_viewed(viewed_at DESC);
```

**필드 설명**:

- `id`: 레코드 고유 ID
- `stock_code`: 종목 코드
- `stock_name`: 종목명
- `user_id`: 사용자 ID (외래 키)
- `viewed_at`: 조회 일시

### API 엔드포인트

#### 관심 종목 CRUD

**GET /api/watchlist**

- 설명: 관심 종목 목록 조회
- 인증: Required
- 쿼리 파라미터:
  - `groupId` (optional): UUID, 특정 그룹 필터링
  - `page` (optional): number, 페이지 번호 (default: 1)
  - `limit` (optional): number, 페이지당 항목 수 (default: 20)
- 응답:
  ```json
  {
    "items": [
      {
        "id": "uuid",
        "stockCode": "005930",
        "stockName": "삼성전자",
        "groupId": "uuid or null",
        "groupName": "string or null",
        "currentPrice": 75000,
        "change": 1500,
        "changeRate": 2.04,
        "addedAt": "2026-02-22T10:00:00Z"
      }
    ],
    "total": 45,
    "page": 1,
    "limit": 20
  }
  ```

**POST /api/watchlist**

- 설명: 관심 종목 추가
- 인증: Required
- 요청:
  ```json
  {
    "stockCode": "005930",
    "stockName": "삼성전자",
    "groupId": "uuid or null"
  }
  ```
- 응답: 201 Created
  ```json
  {
    "id": "uuid",
    "stockCode": "005930",
    "stockName": "삼성전자",
    "groupId": "uuid or null",
    "addedAt": "2026-02-22T10:00:00Z"
  }
  ```
- 에러: 409 Conflict (이미 추가된 종목)

**DELETE /api/watchlist/:id**

- 설명: 관심 종목 삭제
- 인증: Required
- 응답: 200 OK 또는 204 No Content

**PUT /api/watchlist/reorder**

- 설명: 관심 종목 순서 변경
- 인증: Required
- 요청:
  ```json
  {
    "items": [
      { "id": "uuid", "ordering": 0 },
      { "id": "uuid", "ordering": 1 }
    ]
  }
  ```
- 응답: 200 OK

#### 최근 조회

**GET /api/watchlist/recent**

- 설명: 최근 조회 목록 조회
- 인증: Required
- 쿼리 파라미터:
  - `limit` (optional): number, 최대 항목 수 (default: 20, max: 50)
- 응답:
  ```json
  {
    "items": [
      {
        "id": "uuid",
        "stockCode": "005930",
        "stockName": "삼성전자",
        "viewedAt": "2026-02-22T10:00:00Z"
      }
    ]
  }
  ```

**POST /api/watchlist/recent**

- 설명: 최근 조회에 추가 (자동 호출)
- 인증: Required
- 요청:
  ```json
  {
    "stockCode": "005930",
    "stockName": "삼성전자"
  }
  ```
- 응답: 201 Created

#### 그룹 관리

**GET /api/watchlist/groups**

- 설명: 그룹 목록 조회
- 인증: Required
- 응답:
  ```json
  {
    "groups": [
      {
        "id": "uuid",
        "name": "국내주식",
        "ordering": 0,
        "itemCount": 15,
        "createdAt": "2026-02-22T10:00:00Z"
      }
    ]
  }
  ```

**POST /api/watchlist/groups**

- 설명: 그룹 생성
- 인증: Required
- 요청:
  ```json
  {
    "name": "국내주식"
  }
  ```
- 응답: 201 Created
  ```json
  {
    "id": "uuid",
    "name": "국내주식",
    "ordering": 0,
    "createdAt": "2026-02-22T10:00:00Z"
  }
  ```
- 에러: 409 Conflict (이미 존재하는 그룹명)

**PUT /api/watchlist/groups/:id**

- 설명: 그룹 수정 (이름, 순서)
- 인증: Required
- 요청:
  ```json
  {
    "name": "해외주식",
    "ordering": 1
  }
  ```
- 응답: 200 OK

**DELETE /api/watchlist/groups/:id**

- 설명: 그룹 삭제
- 인증: Required
- 쿼리 파라미터:
  - `moveItems` (optional): boolean, true면 해당 그룹의 종목들을 "전체"로 이동 (default: true)
- 응답: 200 OK

### UI 컴포넌트 구조

#### 내비게이션 변경 (app/components/app-shell.tsx)

```typescript
// MenuKey 타입 확장
type MenuKey = 'dashboard' | 'portfolio' | 'watchlist' | 'settings';

// 메뉴 아이템 추가
{
  key: 'watchlist',
  label: '관심 종목',
  icon: <StarIcon />,
  path: '/watchlist'
}
```

#### 관심 종목 페이지 구조 (app/watchlist/page.tsx)

```
/watchlist
├── page.tsx (메인 페이지 컴포넌트)
├── components/
│   ├── WatchlistTabs.tsx (탭 네비게이션)
│   ├── RecentlyViewedTab.tsx (최근 조회 탭)
│   ├── AllItemsTab.tsx (전체 탭)
│   ├── GroupedItemsTab.tsx (그룹별 탭)
│   ├── StockCard.tsx (종목 카드)
│   ├── GroupManager.tsx (그룹 관리 모달)
│   └── WatchlistToolbar.tsx (검색, 필터, 정렬)
└── hooks/
    ├── useWatchlist.ts (관심 종목 데이터 fetching)
    ├── useRecentlyViewed.ts (최근 조회 데이터 fetching)
    └── useWatchlistGroups.ts (그룹 데이터 fetching)
```

#### 종목 카드 컴포넌트 (StockCard.tsx)

**표시 정보**:

- 종목명 및 코드
- 현재가
- 전일 대비 등락
- 등락률 (색상 구분: 상승-빨강, 하락-파랑, 보합-회색)
- 추가/삭제 일자
- "삭제" 버튼

**인터랙션**:

- 카드 클릭: 종목 상세 페이지로 이동
- 드래그 앤 드롭: 순서 변경 (같은 그룹 내)
- 삭제 버튼: 확인 모달 후 삭제

#### 그룹 관리 모달 (GroupManager.tsx)

**기능**:

- 그룹 목록 표시
- 새 그룹 생성
- 그룹 이름 수정
- 그룹 삭제
- 그룹 순서 변경

### 통합 포인트

#### 종목 조회 트래킹 (app/stock/[code]/page.tsx)

```typescript
// 종목 상세 페이지 접근 시 최근 조회에 추가
useEffect(() => {
  if (stockCode && stockName) {
    fetch('/api/watchlist/recent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stockCode, stockName }),
    });
  }
}, [stockCode, stockName]);
```

#### 검색 결과에서 빠른 추가 (app/search/page.tsx)

```typescript
// 검색 결과 종목 카드에 "관심 종목 추가" 버튼 제공
<AddToWatchlistButton stockCode={stock.code} stockName={stock.name} />
```

#### 실시간 가격 업데이트

**접근 1**: 폴링 (초기 구현)

- 30초마다 KIS API 호출로 가격 업데이트
- TanStack Query의 refetchInterval 활용

**접근 2**: Server-Sent Events (향후 개선)

- SSE 엔드포인트 구현으로 실시간 푸시
- 프런트엔드 EventSource로 연결

### 추적 가능성 (Traceability)

**관련 SPEC**:

- SPEC-KIS-001: KIS 설정/인증 통합 (인증 필요)
- SPEC-KIS-002: KIS API 클라이언트 (가격 조회 활용)
- SPEC-KIS-003: 포트폴리오 관리 (종목 데이터 구조 참조)

**의존성**:

- 데이터베이스 마이그레이션 스크립트
- Prisma 스키마 정의
- NextAuth.js 세션 관리
- KIS API 가격 조회 함수

**마일스톤 연결**:

- 1차 마일스톤: 기본 CRUD, UI 구현
- 2차 마일스톤: 그룹 관리, 고급 기능
- 3차 마일스톤: 내보내기, 알림 (선택적)
