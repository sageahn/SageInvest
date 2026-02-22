# SPEC-WATCHLIST-001: Implementation Plan

**TAG BLOCK**: SPEC-WATCHLIST-001 | Watchlist Management | 2026-02-22 | In Progress | High

## 마일스톤 (Milestones)

### 1차 마일스톤 (Priority: High) - 핵심 기능 구현

**목표**: 기본적인 관심 종목 관리 기능 제공

**주요 작업**:

1. 데이터베이스 스키마 구현
2. 기본 API 엔드포인트 구현
3. 기본 UI 컴포넌트 구현
4. 내비게이션 통합

**완료 기준**:

- 사용자가 관심 종목을 추가하고 조회할 수 있음
- 최근 조회 기능이 동작함
- 실시간 가격 정보가 표시됨

### 2차 마일스톤 (Priority: Medium) - 그룹 관리 및 고급 기능

**목표**: 그룹별 관리 및 사용성 개선

**주요 작업**:

1. 그룹 관리 기능 구현
2. 드래그 앤 드롭 순서 변경
3. 검색 및 필터링
4. 페이지네이션

**완료 기준**:

- 사용자가 그룹을 생성하고 관리할 수 있음
- 종목 순서를 변경할 수 있음
- 대량의 관심 종목을 효율적으로 탐색할 수 있음

### 3차 마일스톤 (Priority: Low) - 선택적 기능

**목표**: 추가 기능 및 최적화

**주요 작업**:

1. CSV 내보내기 기능
2. 관심 종목 알림 설정
3. 성능 최적화
4. 테스트 커버리지 향상

**완료 기준**:

- 사용자가 관심 종목을 내보낼 수 있음
- 가격 알림을 설정할 수 있음 (선택적)
- Lighthouse 점수 90+ 달성

## 기술 접근 방식 (Technical Approach)

### 데이터베이스 계층 (Database Layer)

**Prisma ORM 활용**:

1. **스키마 정의** (`prisma/schema.prisma`):

```prisma
model WatchlistGroup {
  id          String   @id @default(uuid())
  name        String
  userId      String
  ordering    Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  items       WatchlistItem[]

  @@unique([userId, name])
  @@index([userId])
}

model WatchlistItem {
  id          String           @id @default(uuid())
  stockCode   String
  stockName   String
  groupId     String?
  userId      String
  ordering    Int              @default(0)
  addedAt     DateTime         @default(now())

  group       WatchlistGroup?  @relation(fields: [groupId], references: [id], onDelete: SetNull)
  user        User             @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, stockCode, groupId])
  @@index([userId])
  @@index([groupId])
  @@index([stockCode])
}

model RecentlyViewed {
  id          String   @id @default(uuid())
  stockCode   String
  stockName   String
  userId      String
  viewedAt    DateTime @default(now())

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, stockCode])
  @@index([userId])
  @@index([viewedAt(sort: Desc)])
}
```

2. **마이그레이션**:

```bash
npx prisma migrate dev --name add_watchlist_tables
```

3. **시딩** (개발 환경용):

- 테스트용 관심 종목 데이터 생성
- 샘플 그룹 데이터 생성

### 백엔드 API 계층 (Backend API Layer)

**아키텍처**: Layered Architecture (Route Handler → Service → Repository)

1. **API Routes 구조** (`app/api/watchlist/`):

```
app/api/watchlist/
├── route.ts (GET, POST)
├── [id]/route.ts (DELETE)
├── reorder/route.ts (PUT)
├── recent/
│   └── route.ts (GET, POST)
└── groups/
    ├── route.ts (GET, POST)
    └── [id]/route.ts (PUT, DELETE)
```

2. **서비스 계층** (`lib/services/watchlist.service.ts`):

```typescript
export class WatchlistService {
  async getWatchlist(userId: string, groupId?: string, page = 1, limit = 20) {
    // Prisma를 통한 데이터 조회
    // KIS API를 통한 실시간 가격 조회
    // 결과 병합 및 반환
  }

  async addItem(userId: string, stockCode: string, stockName: string, groupId?: string) {
    // 중복 검사
    // 데이터베이스에 추가
    // KIS API로 현재가 조회
  }

  async deleteItem(itemId: string, userId: string) {
    // 소유권 검증
    // 삭제 실행
  }

  async reorderItems(userId: string, items: Array<{ id: string; ordering: number }>) {
    // 트랜잭션으로 일괄 업데이트
  }
}
```

3. **KIS API 통합**:

- 기존 `lib/kis/api.ts` 활용 (SPEC-KIS-002 참조)
- `getStockPrice()` 함수로 실시간 가격 조회
- 에러 처리 및 재시도 로직

### 프런트엔드 계층 (Frontend Layer)

**아키텍처**: React 19 Server Components + Client Components

1. **서버 컴포넌트** (`app/watchlist/page.tsx`):

```typescript
export default async function WatchlistPage() {
  // 서버 사이드에서 초기 데이터 로딩
  const groups = await getWatchlistGroups();
  const recentItems = await getRecentlyViewed();

  return (
    <div>
      <WatchlistClientWrapper initialGroups={groups} initialRecent={recentItems} />
    </div>
  );
}
```

2. **클라이언트 컴포넌트** (`components/watchlist/WatchlistTabs.tsx`):

```typescript
'use client';

export function WatchlistTabs({ initialGroups, initialRecent }) {
  const [activeTab, setActiveTab] = useState('recent');

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList>
        <TabsTrigger value="recent">최근 조회</TabsTrigger>
        <TabsTrigger value="all">전체</TabsTrigger>
        <TabsTrigger value="grouped">그룹별</TabsTrigger>
      </TabsList>
      <TabsContent value="recent"><RecentlyViewedTab initialData={initialRecent} /></TabsContent>
      <TabsContent value="all"><AllItemsTab /></TabsContent>
      <TabsContent value="grouped"><GroupedItemsTab initialGroups={initialGroups} /></TabsContent>
    </Tabs>
  );
}
```

3. **TanStack Query 활용**:

```typescript
// hooks/useWatchlist.ts
export function useWatchlist(groupId?: string) {
  return useQuery({
    queryKey: ['watchlist', groupId],
    queryFn: () => fetch(`/api/watchlist?groupId=${groupId}`).then((r) => r.json()),
    refetchInterval: 30000, // 30초마다 실시간 업데이트
  });
}

export function useAddToWatchlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) =>
      fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries(['watchlist']);
    },
  });
}
```

4. **드래그 앤 드롭**:

- `dnd-kit` 또는 `react-beautiful-dnd` 라이브러리 활용
- 순서 변경 시 `/api/watchlist/reorder` 호출

### 상태 관리 전략 (State Management)

**서버 상태**: TanStack Query (React Query)

- 관심 종목 목록
- 그룹 목록
- 최근 조회 목록
- 자동 리프레시 및 캐싱

**클라이언트 상태**: Zustand (선택적)

- 현재 활성 탭
- 검색어
- 필터 옵션
- 정렬 순서

```typescript
// store/useWatchlistStore.ts
export const useWatchlistStore = create<WatchlistState>((set) => ({
  activeTab: 'recent',
  searchQuery: '',
  sortBy: 'recent',

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSortBy: (sort) => set({ sortBy: sort }),
}));
```

### 실시간 가격 업데이트 전략

**1단계: 폴링** (초기 구현):

- TanStack Query의 `refetchInterval: 30000` 활용
- 30초마다 자동 리프레시

**2단계: 낙관적 업데이트**:

- 사용자 인터랙션 시 즉시 UI 업데이트
- 백그라운드에서 실제 데이터 동기화

**3단계: SSE** (향후 개선):

- `/api/watchlist/stream` 엔드포인트 구현
- Server-Sent Events로 실시간 푸시

## 아키텍처 설계 방향 (Architecture Design)

### 레이어드 아키텍처 (Layered Architecture)

```
┌─────────────────────────────────────┐
│  Presentation Layer (UI)            │
│  - React Components                 │
│  - Tailwind CSS                     │
└─────────────────────────────────────┘
             ↓
┌─────────────────────────────────────┐
│  Application Layer (Business Logic) │
│  - React Hooks (useWatchlist)       │
│  - TanStack Query                   │
│  - Zustand Store                    │
└─────────────────────────────────────┘
             ↓
┌─────────────────────────────────────┐
│  Domain Layer (Services)            │
│  - WatchlistService                 │
│  - GroupService                     │
│  - RecentlyViewedService            │
└─────────────────────────────────────┘
             ↓
┌─────────────────────────────────────┐
│  Infrastructure Layer (Data)        │
│  - Prisma ORM                       │
│  - PostgreSQL                       │
│  - KIS API Client                   │
└─────────────────────────────────────┘
```

### 디렉터리 구조

```
app/
├── watchlist/
│   ├── page.tsx (메인 페이지)
│   └── layout.tsx (레이아웃)
├── api/
│   └── watchlist/
│       ├── route.ts
│       ├── [id]/route.ts
│       ├── reorder/route.ts
│       ├── recent/route.ts
│       └── groups/
│           ├── route.ts
│           └── [id]/route.ts
└── components/
    └── watchlist/
        ├── WatchlistTabs.tsx
        ├── RecentlyViewedTab.tsx
        ├── AllItemsTab.tsx
        ├── GroupedItemsTab.tsx
        ├── StockCard.tsx
        ├── GroupManager.tsx
        └── WatchlistToolbar.tsx

lib/
├── services/
│   ├── watchlist.service.ts
│   ├── group.service.ts
│   └── recently-viewed.service.ts
├── hooks/
│   ├── useWatchlist.ts
│   ├── useRecentlyViewed.ts
│   └── useWatchlistGroups.ts
└── store/
    └── useWatchlistStore.ts

prisma/
├── schema.prisma (스키마 업데이트)
└── migrations/ (마이그레이션 파일)
```

### 의존성 관계

**내부 의존성**:

- Presentation → Application → Domain → Infrastructure
- 하위 계층을 알 필요 없음 (의존성 역전)

**외부 의존성**:

- `@prisma/client`: 데이터베이스 ORM
- `@tanstack/react-query`: 서버 상태 관리
- `zustand`: 클라이언트 상태 관리
- `dnd-kit` 또는 `@dnd-kit/core`: 드래그 앤 드롭
- `lucide-react`: 아이콘
- `clsx` 또는 `classnames`: 클래스 이름 유틸리티

## 위험 및 대응 계획 (Risks and Response Plans)

### 기술적 위험

**위험 1**: KIS API rate limit 초과로 인한 가격 업데이트 실패

- **확률**: Medium
- **영향**: High
- **대응**:
  1. 요청 간 간격 조정 (최소 1초)
  2. 배치 처리로 요청 수 최소화
  3. 에러 발생 시 캐시된 데이터 표시
  4. 재시도 메커니즘 구현 (지수 백오프)

**위험 2**: 대량의 관심 종목으로 인한 성능 저하

- **확률**: Medium
- **영향**: Medium
- **대응**:
  1. 페이지네이션 (20개/페이지)
  2. 가상화된 리스트 (react-window 또는 react-virtuoso)
  3. 인덱스 최적화
  4. 쿼리 최적화 (SELECT 필드 명시)

**위험 3**: 드래그 앤 드롭 구현 복잡성

- **확률**: Low
- **영향**: Medium
- **대응**:
  1. `dnd-kit` 라이브러리 사용 (모던하고 접근성 우수)
  2. 간단한 화살표 버튼으로 순서 변경 (대안)
  3. 첫 번째 구현에서는 순서 변경 기능 제외 가능

### 사용자 경험 위험

**위험 4**: 실시간 업데이트 지연으로 인한 사용자 혼란

- **확률**: Medium
- **영향**: Medium
- **대응**:
  1. "마지막 업데이트: 30초 전" 메시지 표시
  2. 수동 새로고침 버튼 제공
  3. 로딩 상태를 명확하게 표시

**위험 5**: 모바일 환경에서의 UI 복잡성

- **확률**: Medium
- **영향**: Medium
- **대응**:
  1. 반응형 디자인 (Tailwind CSS)
  2. 모바일에서는 그룹 관리를 별도 페이지로 분리
  3. 터치 타겟 크기 최소 44px 보장

### 데이터 위험

**위험 6**: 사용자별 데이터 누출 가능성

- **확률**: Low
- **영향**: Critical
- **대응**:
  1. 모든 API에서 사용자 ID 검증
  2. Prisma의 `onDelete: Cascade`로 orphaned 레코드 방지
  3. Row-Level Security (Supabase) 고려
  4. 정기적인 보안 감사

## 통합 전략 (Integration Strategy)

### 기존 기능과의 통합

**1. 내비게이션** (`app/components/app-shell.tsx`):

```typescript
// MenuKey 타입 확장
export type MenuKey = 'dashboard' | 'portfolio' | 'watchlist' | 'settings';

// 메뉴 아이템 추가
const menuItems: MenuItem[] = [
  { key: 'dashboard', label: '대시보드', path: '/dashboard', icon: HomeIcon },
  { key: 'portfolio', label: '포트폴리오', path: '/portfolio', icon: BriefcaseIcon },
  { key: 'watchlist', label: '관심 종목', path: '/watchlist', icon: StarIcon }, // NEW
  { key: 'settings', label: '설정', path: '/settings', icon: SettingsIcon },
];
```

**2. 종목 상세 페이지** (`app/stock/[code]/page.tsx`):

```typescript
// 종목 조회 시 최근 조회에 추가
useEffect(() => {
  if (session?.user?.id && stockData) {
    fetch('/api/watchlist/recent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stockCode: stockData.code,
        stockName: stockData.name,
      }),
    });
  }
}, [session?.user?.id, stockData]);
```

**3. 검색 페이지** (`app/search/page.tsx`):

```typescript
// 검색 결과에 "관심 종목 추가" 버튼 제공
<AddToWatchlistButton
  stockCode={result.code}
  stockName={result.name}
  onAdd={() => toast.success('관심 종목에 추가되었습니다')}
/>
```

**4. 포트폴리오 페이지** (`app/portfolio/page.tsx`):

```typescript
// 포트폴리오 종목에서도 관심 종목으로 빠른 추가
{portfolio.stocks.map(stock => (
  <StockCard
    key={stock.code}
    stock={stock}
    actions={
      <Button onClick={() => addToWatchlist(stock)}>
        <StarIcon className="w-4 h-4" />
      </Button>
    }
  />
))}
```

### 인증 통합

**NextAuth.js 세션 활용**:

```typescript
// API Route에서 세션 검증
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 사용자별 필터링
  const watchlist = await prisma.watchlistItem.findMany({
    where: { userId: session.user.id },
  });

  return NextResponse.json(watchlist);
}
```

## 성능 최적화 계획 (Performance Optimization)

### 데이터베이스 최적화

1. **인덱스 설계**:

```sql
-- 자주 조회하는 필드에 인덱스 추가
CREATE INDEX idx_watchlist_items_user_group ON watchlist_items(user_id, group_id);
CREATE INDEX idx_recently_viewed_user_viewed ON recently_viewed(user_id, viewed_at DESC);
```

2. **쿼리 최적화**:

```typescript
// 필요한 필드만 선택
const items = await prisma.watchlistItem.findMany({
  select: {
    id: true,
    stockCode: true,
    stockName: true,
    addedAt: true,
    group: { select: { id: true, name: true } },
  },
  where: { userId },
  orderBy: { ordering: 'asc' },
  take: limit,
  skip: (page - 1) * limit,
});
```

3. **연결 풀링** (Supabase):

```env
DATABASE_URL=postgresql://user:pass@host/db?pgbouncer=true
```

### 프런트엔드 최적화

1. **코드 분할**:

```typescript
// 그룹 관리 모달을 lazy load
const GroupManager = dynamic(() => import('@/components/watchlist/GroupManager'), {
  loading: () => <Spinner />,
});
```

2. **이미지 최적화**:

```typescript
// Next.js Image 컴포넌트 활용
import Image from 'next/image';

<Image
  src={stock.logoUrl}
  alt={stock.name}
  width={32}
  height={32}
  loading="lazy"
/>
```

3. **가상화된 리스트** (대량 데이터):

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

// 100개 이상의 항목을 효율적으로 렌더링
const rowVirtualizer = useVirtualizer({
  count: items.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 80, // 각 항목의 예상 높이
});
```

## 테스트 전략 (Testing Strategy)

### 단위 테스트 (Vitest)

1. **서비스 계층 테스트**:

```typescript
// services/__tests__/watchlist.service.test.ts
describe('WatchlistService', () => {
  it('should add item to watchlist', async () => {
    const service = new WatchlistService(mockPrisma);
    const result = await service.addItem(userId, '005930', '삼성전자');
    expect(result.stockCode).toBe('005930');
  });

  it('should reject duplicate item', async () => {
    await expect(service.addItem(userId, '005930', '삼성전자')).rejects.toThrow('Already exists');
  });
});
```

2. **훅 테스트**:

```typescript
// hooks/__tests__/useWatchlist.test.ts
import { renderHook, waitFor } from '@testing-library/react';

describe('useWatchlist', () => {
  it('should fetch watchlist items', async () => {
    const { result } = renderHook(() => useWatchlist());
    await waitFor(() => expect(result.current.data).toBeDefined());
  });
});
```

### E2E 테스트 (Playwright)

```typescript
// e2e/watchlist.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Watchlist', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/watchlist');
  });

  test('should display watchlist tabs', async ({ page }) => {
    await expect(page.getByText('최근 조회')).toBeVisible();
    await expect(page.getByText('전체')).toBeVisible();
    await expect(page.getByText('그룹별')).toBeVisible();
  });

  test('should add item to watchlist', async ({ page }) => {
    await page.click('[data-testid="add-to-watchlist-button"]');
    await expect(page.getByText('관심 종목에 추가되었습니다')).toBeVisible();
  });
});
```

### 통합 테스트

1. **API 엔드포인트 테스트**:

```typescript
// api/__tests__/watchlist.test.ts
import { GET, POST } from '@/app/api/watchlist/route';
import { createMocks } from 'node-mocks-http';

describe('/api/watchlist', () => {
  it('should return watchlist items', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    });
    await GET(req, res);
    expect(res._getStatusCode()).toBe(200);
  });
});
```

## 추적 가능성 (Traceability)

**관련 SPEC**:

- SPEC-KIS-001: 인증 통합 (세션 검증)
- SPEC-KIS-002: KIS API 클라이언트 (가격 조회)
- SPEC-KIS-003: 포트폴리오 관리 (종목 데이터 구조)

**구현 작업 연결**:

- 데이터베이스 마이그레이션 → 1차 마일스톤
- API 엔드포인트 → 1차 마일스톤
- UI 컴포넌트 → 1차 마일스톤
- 그룹 관리 → 2차 마일스톤
- 고급 기능 → 3차 마일스톤

**품질 게이트 연결**:

- 단위 테스트: 85% 커버리지
- E2E 테스트: 주요 사용자 시나리오
- Lighthouse: 90+ 점수
- WCAG: 2.1 AA 준수
