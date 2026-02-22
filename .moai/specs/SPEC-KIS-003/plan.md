# SPEC-KIS-003: KIS 이동평균선 비교 분석 - 구현 계획

## TAG BLOCK

```
TAG: SPEC-KIS-003
TITLE: KIS 이동평균선 비교 분석
STATUS: Planned
PRIORITY: High
DOMAIN: KIS (Korea Investment & Securities OpenAPI)
```

## 개요

본 문서는 KIS 이동평균선 비교 분석 기능의 구현 계획을 정의합니다. 일봉, 주봉, 월봉 차트 데이터를 조회하여 다양한 기간의 이동평균선(SMA)을 계산하고, 전일 종가와 비교하여 골든크로스/데드크로스 영역을 시각적으로 표현합니다.

## 구현 마일스톤

### 마일스톤 1: 이동평균선 서비스 레이어 구현 (최우선)

**목표**: SMA 계산 및 차트 데이터 조회 서비스 구현

**작업 항목**:

1. `MovingAverageService` 클래스 구현
   - SMA 계산 알고리즘 구현 (종가 기준)
   - 전일 종가 추출 로직
   - 이동평균선 비교 로직

2. 차트 데이터 조회 메서드 구현
   - 일봉 차트 조회 (`fetchDailyChart`)
   - 주봉 차트 조회 (`fetchWeeklyChart`)
   - 월봉 차트 조회 (`fetchMonthlyChart`)

3. 통합 이동평균선 비교 메서드 구현
   - 단일 종목 비교 (`compareSingleStock`)
   - 다중 종목 비교 (`compareMultipleStocks`)

**기술적 의존성**:

- SPEC-KIS-001의 `KISAuthMiddleware`
- Axios HTTP 클라이언트

**완료 기준**:

- SMA 계산이 정확하게 수행됨
- 일봉/주봉/월봉 데이터 조회가 정상 작동함
- 이동평균선 비교 결과가 올바르게 반환됨

### 마일스톤 2: API Routes 구현 (최우선)

**목표**: 이동평균선 비교 API 엔드포인트 구현

**작업 항목**:

1. 단일 종목 API 구현
   - `GET /api/kis/moving-average?stockCode={code}`
   - 쿼리 파라미터 검증
   - 에러 처리

2. 다중 종목 API 구현
   - `POST /api/kis/moving-average/batch`
   - 요청 본문 검증
   - 병렬 처리 (Promise.all with rate limiting)

3. Rate Limit 처리
   - 초당 15건 제한 로직
   - 대량 요청 시 큐잉 또는 순차 처리

**기술적 의존성**:

- 마일스톤 1 완료
- Next.js App Router

**완료 기준**:

- 단일/다중 종목 API가 정상 작동함
- Rate Limit이 준수됨
- 에러 응답이 적절하게 반환됨

### 마일스톤 3: 서버 캐싱 구현 (2차 우선)

**목표**: 30초 TTL 캐싱으로 성능 최적화

**작업 항목**:

1. 인메모리 캐시 구현
   - Node.js Map 기반 캐시
   - TTL 만료 로직
   - 캐시 키 생성 (`ma:{stockCode}:{chartType}`)

2. 캐시 적용
   - API 응답 캐싱
   - 캐시 히트/미스 로깅
   - 강제 갱신 옵션 (`?refresh=true`)

3. 캐시 모니터링 (선택사항)
   - 캐시 히트율 추적
   - 메모리 사용량 모니터링

**기술적 의존성**:

- 마일스톤 1, 2 완료

**완료 기준**:

- 30초 내 동일 요청 시 캐시된 데이터가 반환됨
- 캐시 만료 후 새 데이터가 조회됨
- 강제 갱신 옵션이 작동함

### 마일스톤 4: 데이터 모델 및 타입 정의 (최우선)

**목표**: TypeScript 타입 정의 및 데이터 구조 설계

**작업 항목**:

1. 타입 정의 파일 생성 (`types/moving-average.ts`)
   - `MovingAverageValue` 인터페이스
   - `DailyMA`, `WeeklyMA`, `MonthlyMA` 인터페이스
   - `MovingAverageComparison` 인터페이스
   - KIS API 응답 타입

2. 데이터 변환 유틸리티 구현
   - API 응답 → 내부 모델 변환
   - 숫자 포맷팅 (천 단위 쉼표)
   - 신호 계산 (`above`/`below`)

**기술적 의존성**:

- 없음

**완료 기준**:

- 모든 타입이 정의됨
- 타입 검증이 통과함
- 데이터 변환이 정상 작동함

### 마일스톤 5: UI 컴포넌트 (2차 우선)

**목표**: 이동평균선 비교 결과 표시 UI

**작업 항목**:

1. 이동평균선 비교 테이블 컴포넌트
   - 종목코드, 종목명, 전일종가 컬럼
   - 일봉/주봉/월봉 이동평균선 컬럼
   - ↑/↓ 신호 아이콘 표시
   - 값 포맷팅 (천 단위 쉼표)

2. 로딩 상태 UI
   - 스켈레톤 로딩
   - 진행률 표시 (대량 종목 조회 시)

3. 에러 상태 UI
   - 데이터 없음 메시지
   - API 오류 메시지

**기술적 의존성**:

- 마일스톤 2 완료
- React 19

**완료 기준**:

- 테이블이 정상적으로 렌더링됨
- 로딩/에러 상태가 적절하게 표시됨
- 반응형 디자인이 적용됨

## 기술적 접근 방식

### 1. MovingAverageService 클래스 설계

**클래스 구조**:

```typescript
// lib/kis/moving-average-service.ts
export class MovingAverageService {
  private authMiddleware: KISAuthMiddleware;
  private cache: Map<string, CacheEntry>;

  constructor(authMiddleware: KISAuthMiddleware) {
    this.authMiddleware = authMiddleware;
    this.cache = new Map();
  }

  /**
   * 일봉 차트 데이터 조회
   */
  async fetchDailyChart(stockCode: string): Promise<DailyCandle[]> {
    const trId = this.getTrId('daily');
    const response = await this.authMiddleware.makeRequest({
      method: 'GET',
      url: '/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice',
      params: {
        FID_COND_MRKT_DIV_CODE: 'J',
        FID_INPUT_ISCD: stockCode,
        FID_PERIOD_DIV_CODE: 'D',
      },
      trId,
    });
    return response.data.output2;
  }

  /**
   * SMA 계산
   */
  calculateSMA(candles: Candle[], period: number): number | null {
    if (candles.length < period) return null;

    const closePrices = candles.slice(0, period).map((c) => parseFloat(c.stck_clpr));

    const sum = closePrices.reduce((a, b) => a + b, 0);
    return sum / period;
  }

  /**
   * 단일 종목 이동평균선 비교
   */
  async compareSingleStock(stockCode: string): Promise<MovingAverageComparison> {
    // 캐시 확인
    const cacheKey = `ma:${stockCode}`;
    const cached = this.cache.get(cacheKey);
    if (cached && !this.isCacheExpired(cached)) {
      return cached.data;
    }

    // 차트 데이터 조회
    const [daily, weekly, monthly] = await Promise.all([
      this.fetchDailyChart(stockCode),
      this.fetchWeeklyChart(stockCode),
      this.fetchMonthlyChart(stockCode),
    ]);

    // 전일 종가 추출
    const previousClose = parseFloat(daily[0].stck_clpr);

    // SMA 계산 및 비교
    const dailyMA = this.calculateDailyMA(daily, previousClose);
    const weeklyMA = this.calculateWeeklyMA(weekly, previousClose);
    const monthlyMA = this.calculateMonthlyMA(monthly, previousClose);

    const result: MovingAverageComparison = {
      stockCode,
      stockName: await this.getStockName(stockCode),
      previousClose,
      dailyMA,
      weeklyMA,
      monthlyMA,
      fetchedAt: new Date(),
    };

    // 캐시 저장
    this.cache.set(cacheKey, { data: result, timestamp: Date.now() });

    return result;
  }

  /**
   * 다중 종목 이동평균선 비교 (Rate Limit 준수)
   */
  async compareMultipleStocks(stockCodes: string[]): Promise<MovingAverageComparison[]> {
    const results: MovingAverageComparison[] = [];
    const batchSize = 5; // 초당 5개씩 처리 (15건 제한의 1/3)

    for (let i = 0; i < stockCodes.length; i += batchSize) {
      const batch = stockCodes.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map((code) => this.compareSingleStock(code)));
      results.push(...batchResults);

      // 1초 대기 (Rate Limit 준수)
      if (i + batchSize < stockCodes.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return results;
  }
}
```

### 2. API Routes 설계

**단일 종목 API**:

```typescript
// app/api/kis/moving-average/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { MovingAverageService } from '@/lib/kis/moving-average-service';
import { getKISAuthMiddleware } from '@/lib/kis/auth-middleware';

export async function GET(request: NextRequest) {
  const stockCode = request.nextUrl.searchParams.get('stockCode');
  const refresh = request.nextUrl.searchParams.get('refresh') === 'true';

  // 입력 검증
  if (!stockCode || !/^\d{6}$/.test(stockCode)) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INVALID_STOCK_CODE', message: '종목코드는 6자리 숫자여야 합니다.' },
      },
      { status: 400 }
    );
  }

  try {
    const authMiddleware = await getKISAuthMiddleware();
    const service = new MovingAverageService(authMiddleware);

    // 강제 갱신 시 캐시 무효화
    if (refresh) {
      service.invalidateCache(stockCode);
    }

    const data = await service.compareSingleStock(stockCode);

    return NextResponse.json({
      success: true,
      data,
      cached: !refresh,
      fetchedAt: data.fetchedAt,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: 'API_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
```

**다중 종목 API**:

```typescript
// app/api/kis/moving-average/batch/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { MovingAverageService } from '@/lib/kis/moving-average-service';
import { getKISAuthMiddleware } from '@/lib/kis/auth-middleware';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { stockCodes } = body;

  // 입력 검증
  if (!Array.isArray(stockCodes) || stockCodes.length === 0) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INVALID_INPUT', message: 'stockCodes 배열이 필요합니다.' },
      },
      { status: 400 }
    );
  }

  if (stockCodes.length > 100) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'TOO_MANY_CODES', message: '최대 100개 종목까지 조회 가능합니다.' },
      },
      { status: 400 }
    );
  }

  // 종목코드 형식 검증
  const invalidCodes = stockCodes.filter((code) => !/^\d{6}$/.test(code));
  if (invalidCodes.length > 0) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INVALID_STOCK_CODES',
          message: `유효하지 않은 종목코드: ${invalidCodes.join(', ')}`,
        },
      },
      { status: 400 }
    );
  }

  try {
    const authMiddleware = await getKISAuthMiddleware();
    const service = new MovingAverageService(authMiddleware);
    const data = await service.compareMultipleStocks(stockCodes);

    return NextResponse.json({
      success: true,
      data,
      count: data.length,
      fetchedAt: new Date(),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: 'API_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
```

### 3. 캐싱 전략

**인메모리 캐시 구현**:

```typescript
// lib/kis/cache.ts
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export class SimpleCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private ttlMs: number;

  constructor(ttlSeconds: number = 30) {
    this.ttlMs = ttlSeconds * 1000;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // 만료된 캐시 정리
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttlMs) {
        this.cache.delete(key);
      }
    }
  }
}
```

### 4. 데이터 모델

**TypeScript 타입 정의**:

```typescript
// types/moving-average.ts

export type Signal = 'above' | 'below';

export interface MovingAverageValue {
  value: number | null; // null = N/A (데이터 부족)
  signal: Signal | null;
}

export interface DailyMA {
  ma5: MovingAverageValue;
  ma10: MovingAverageValue;
  ma20: MovingAverageValue;
  ma60: MovingAverageValue;
  ma80: MovingAverageValue;
  ma120: MovingAverageValue;
  ma240: MovingAverageValue;
}

export interface WeeklyMA {
  ma5: MovingAverageValue;
  ma10: MovingAverageValue;
  ma20: MovingAverageValue;
  ma60: MovingAverageValue;
}

export interface MonthlyMA {
  ma5: MovingAverageValue;
  ma10: MovingAverageValue;
  ma20: MovingAverageValue;
}

export interface MovingAverageComparison {
  stockCode: string;
  stockName: string;
  previousClose: number;
  dailyMA: DailyMA;
  weeklyMA: WeeklyMA;
  monthlyMA: MonthlyMA;
  fetchedAt: Date;
}

// KIS API 응답 타입
export interface KISChartCandle {
  stck_bsop_date: string;
  stck_oprc: string;
  stck_hgpr: string;
  stck_lwpr: string;
  stck_clpr: string;
  acml_vol: string;
  acml_tr_pbmn: string;
}

export interface KISChartResponse {
  rt_cd: string;
  msg_cd: string;
  msg1: string;
  output1: Record<string, string>;
  output2: KISChartCandle[];
}
```

### 5. UI 컴포넌트 구조

**이동평균선 비교 테이블**:

```typescript
// components/kis/MovingAverageTable.tsx
'use client';

import { MovingAverageComparison } from '@/types/moving-average';

interface Props {
  data: MovingAverageComparison[];
  loading?: boolean;
}

export function MovingAverageTable({ data, loading }: Props) {
  if (loading) {
    return <MovingAverageTableSkeleton />;
  }

  if (data.length === 0) {
    return <div className="text-center py-8">조회할 종목이 없습니다.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th>종목코드</th>
            <th>종목명</th>
            <th>전일종가</th>
            <th colSpan={7}>일봉 이동평균선</th>
            <th colSpan={4}>주봉 이동평균선</th>
            <th colSpan={3}>월봉 이동평균선</th>
          </tr>
          <tr>
            <th></th>
            <th></th>
            <th></th>
            {/* 일봉 */}
            <th>5일</th>
            <th>10일</th>
            <th>20일</th>
            <th>60일</th>
            <th>80일</th>
            <th>120일</th>
            <th>240일</th>
            {/* 주봉 */}
            <th>5주</th>
            <th>10주</th>
            <th>20주</th>
            <th>60주</th>
            {/* 월봉 */}
            <th>5월</th>
            <th>10월</th>
            <th>20월</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((item) => (
            <MovingAverageRow key={item.stockCode} item={item} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MovingAverageRow({ item }: { item: MovingAverageComparison }) {
  return (
    <tr>
      <td className="font-mono">{item.stockCode}</td>
      <td>{item.stockName}</td>
      <td className="font-mono">{formatNumber(item.previousClose)}</td>
      {/* 일봉 */}
      <MACell value={item.dailyMA.ma5} />
      <MACell value={item.dailyMA.ma10} />
      <MACell value={item.dailyMA.ma20} />
      <MACell value={item.dailyMA.ma60} />
      <MACell value={item.dailyMA.ma80} />
      <MACell value={item.dailyMA.ma120} />
      <MACell value={item.dailyMA.ma240} />
      {/* 주봉 */}
      <MACell value={item.weeklyMA.ma5} />
      <MACell value={item.weeklyMA.ma10} />
      <MACell value={item.weeklyMA.ma20} />
      <MACell value={item.weeklyMA.ma60} />
      {/* 월봉 */}
      <MACell value={item.monthlyMA.ma5} />
      <MACell value={item.monthlyMA.ma10} />
      <MACell value={item.monthlyMA.ma20} />
    </tr>
  );
}

function MACell({ value }: { value: MovingAverageValue }) {
  if (value.value === null) {
    return <td className="text-gray-400">N/A</td>;
  }

  const signalClass = value.signal === 'above'
    ? 'text-green-600 bg-green-50'
    : 'text-red-600 bg-red-50';
  const signalIcon = value.signal === 'above' ? '↑' : '↓';

  return (
    <td className={`font-mono ${signalClass}`}>
      {signalIcon}({formatNumber(value.value)})
    </td>
  );
}

function formatNumber(num: number): string {
  return num.toLocaleString('ko-KR');
}
```

## 기술적 의존성

### 필수 라이브러리

```json
{
  "dependencies": {
    "next": "^16.0.0",
    "react": "^19.0.0",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "typescript": "^5.9.0",
    "vitest": "^1.0.0",
    "@types/node": "^20.0.0"
  }
}
```

### 환경 변수

```env
# KIS API (SPEC-KIS-001에서 이미 설정됨)
KIS_PRODUCTION_URL=https://openapi.koreainvestment.com:9443
KIS_MOCK_URL=https://openapivts.koreainvestment.com:29443

# 캐시 설정
MA_CACHE_TTL_SECONDS=30
MA_MAX_STOCKS_PER_REQUEST=100
```

## 위험 및 대응 계획

### 위험 1: Rate Limit 초과

**확률**: 높음
**영향**: 중간

**대응 계획**:

- 초당 15건 제한 준수 (20건 제한의 75%)
- 배치 처리 시 1초 간격 적용
- 캐싱으로 중복 요청 방지

### 위험 2: 데이터 부족

**확률**: 중간
**영향**: 낮음

**대응 계획**:

- 데이터 부족 시 N/A 표시
- 최소 데이터 요구사항 명시
- 부분 결과라도 반환

### 위험 3: API 응답 지연

**확률**: 중간
**영향**: 중간

**대응 계획**:

- 타임아웃 설정 (10초)
- 로딩 상태 UI 제공
- 진행률 표시 (대량 조회 시)

### 위험 4: 캐시 메모리 누수

**확률**: 낮음
**영향**: 중간

**대응 계획**:

- 정기적 캐시 정리 (cleanup 메서드)
- 최대 캐시 크기 제한 (1000개 항목)
- LRU 캐시 고려 (대규모 사용 시)

## 다음 단계

### `/moai:2-run SPEC-KIS-003` 실행 전 준비사항

1. **SPEC-KIS-002 완료**: 계좌 설정 및 보유종목 조회 기능 완료 확인
2. **테스트 데이터 준비**: 다양한 종목의 차트 데이터 확인
3. **SMA 계산 검증**: 수동 계산과 비교하여 정확성 확인

### 전문가 상담 권장사항

**Backend 전문가 상담** (필수):

- 이유: Rate Limit 처리, 캐싱 전략, API 설계는 백엔드 전문 영역
- 예상 혜택: 성능 최적화, 안정적인 API 설계

**Frontend 전문가 상담** (필수):

- 이유: 테이블 UI, 로딩 상태, 반응형 디자인은 프론트엔드 전문 영역
- 예상 혜택: 사용자 경험 개선, 접근성 향상

**Performance 전문가 상담** (권장):

- 이유: 대량 종목 조회 시 성능 최적화 필요
- 예상 혜택: 응답 시간 단축, 리소스 효율화
