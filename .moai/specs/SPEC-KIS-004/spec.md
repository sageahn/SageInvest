---
SPEC_ID: SPEC-KIS-004
TITLE: 포트폴리오 종목 차트 표시
STATUS: Draft
PRIORITY: High
ASSIGNED: MoAI (Orchestrator)
DOMAIN: KIS (Korea Investment & Securities OpenAPI)
CREATED: 2026-02-22T12:00:00Z
UPDATED: 2026-02-22T12:00:00Z
LIFECYCLE: spec-anchored
RELATED_SPECs: [SPEC-KIS-001, SPEC-KIS-002, SPEC-SCREENING-001]
EPIC: Portfolio Enhancement
ESTIMATED_EFFORT: Medium
LABELS: chart, tradingview, portfolio, ui-components, frontend
---

# SPEC-KIS-004: 포트폴리오 종목 차트 표시

## HISTORY

| Version | Date       | Author | Changes        |
| ------- | ---------- | ------ | -------------- |
| 1.0.0   | 2026-02-22 | MoAI   | 초기 SPEC 작성 |

## ENVIRONMENT

### 시스템 컨텍스트

SageInvest 포트폴리오 페이지에서 보유 종목을 선택하면 해당 종목의 일봉 차트를 표시합니다. 차트 표시를 위해 TradingView의 무료 위젯(Widget)을 사용합니다.

### 기술 환경

- **프로젝트**: SageInvest
- **언어**: TypeScript 5+
- **프레임워크**: Next.js 14+ (App Router)
- **차트 라이브러리**: TradingView Free Widget
- **기존 데이터 소스**: KIS OpenAPI 일봉차트조회 API (FHKST03010100)

### 통합 범위

- 포트폴리오 테이블 행 클릭 시 종목 선택
- 선택된 종목의 TradingView 차트 위젯 표시
- TradingView Free Plan 기본 설정 적용
- 한국 주식 시장 데이터 연동

## ASSUMPTIONS

### 기술적 가정

1. **TradingView Widget 가용성**: TradingView가 무료 위젯을 제공하며, 상업적 용도가 아닌 개인 투자 분석용으로 사용 가능하다고 가정합니다. (신뢰도: High)

2. **한국 주식 심볼 형식**: TradingView가 한국 주식을 `KRX:종목코드` 형식으로 지원한다고 가정합니다. (신뢰도: High)

3. **KIS API 데이터 호환성**: 기존 KISPriceHistoryClient의 일봉 데이터를 참고용으로 활용할 수 있다고 가정합니다. (신뢰도: Medium)

4. **클라이언트 사이드 렌더링**: TradingView 위젯은 클라이언트 사이드에서만 렌더링되어야 한다고 가정합니다. (신뢰도: High)

### 비즈니스 가정

1. **Free Plan 제약 수용**: TradingView Free Plan의 제약사항(광고 표시, 제한된 기능)을 수용한다고 가정합니다. (신뢰도: High)

2. **실시간 데이터 요구**: 실시간 가격 업데이트는 필수가 아니며, 지연 데이터도 허용한다고 가정합니다. (신뢰도: Medium)

3. **단일 종목 조회**: 한 번에 하나의 종목 차트만 표시한다고 가정합니다. (신뢰도: High)

### 검증 방법

- TradingView Widget 공식 문서 검토
- 한국 주식 심볼 형식 테스트 (`KRX:005930` 삼성전자)
- Next.js 클라이언트 컴포넌트 렌더링 테스트

## REQUIREMENTS

### 1. 보편적 요구사항 (Ubiquitous)

**REQ-001**: 시스템은 항상 포트폴리오 테이블의 각 행을 클릭 가능하게 표시해야 한다.

**REQ-002**: 시스템은 항상 TradingView 위젯을 클라이언트 사이드에서만 렌더링해야 한다.

**REQ-003**: 시스템은 항상 선택된 종목의 정보(종목명, 종목코드)를 차트 영역에 표시해야 한다.

**REQ-004**: 시스템은 항상 TradingView 위젯의 기본 설정(일봉 차트, 한국어 인터페이스)을 적용해야 한다.

**REQ-005**: 시스템은 항상 차트 영역에서 종목 선택을 해제할 수 있는 기능을 제공해야 한다.

### 2. 이벤트 기반 요구사항 (Event-Driven)

**REQ-006**: WHEN 사용자가 포트폴리오 테이블의 종목 행을 클릭하면, 시스템은 해당 종목을 선택 상태로 변경하고 차트를 표시해야 한다.

**REQ-007**: WHEN 사용자가 이미 선택된 종목 행을 다시 클릭하면, 시스템은 선택을 해제하고 차트를 숨겨야 한다.

**REQ-008**: WHEN 사용자가 차트 영역의 닫기 버튼을 클릭하면, 시스템은 종목 선택을 해제하고 차트를 숨겨야 한다.

**REQ-009**: WHEN 종목이 선택되면, 시스템은 TradingView 위젯에 `KRX:{종목코드}` 심볼을 로드해야 한다.

**REQ-010**: WHEN TradingView 위젯 로딩이 완료되면, 시스템은 로딩 인디케이터를 숨겨야 한다.

**REQ-011**: WHEN TradingView 위젯 로딩 중 오류가 발생하면, 시스템은 사용자에게 오류 메시지를 표시해야 한다.

**REQ-012**: WHEN 사용자가 다른 종목을 클릭하면, 시스템은 기존 차트를 새 종목의 차트로 교체해야 한다.

### 3. 상태 기반 요구사항 (State-Driven)

**REQ-013**: IF 선택된 종목이 없으면, 시스템은 차트 영역에 "종목을 선택하세요" 안내 메시지를 표시해야 한다.

**REQ-014**: IF 종목이 선택되어 있으면, 시스템은 포트폴리오 테이블에서 해당 행을 하이라이트 표시해야 한다.

**REQ-015**: IF 차트 로딩 중이면, 시스템은 스피너 또는 로딩 인디케이터를 표시해야 한다.

**REQ-016**: IF TradingView 위젯이 초기화되지 않았으면, 시스템은 위젯 스크립트를 동적으로 로드해야 한다.

### 4. 바람직하지 않은 행동 요구사항 (Unwanted)

**REQ-017**: 시스템은 TradingView 위젯을 서버 사이드에서 렌더링하지 않아야 한다.

**REQ-018**: 시스템은 선택되지 않은 종목의 차트를 표시하지 않아야 한다.

**REQ-019**: 시스템은 유효하지 않은 종목 코드로 차트 로딩을 시도하지 않아야 한다.

**REQ-020**: 시스템은 TradingView 위젯 스크립트를 중복으로 로드하지 않아야 한다.

**REQ-021**: 시스템은 사용자의 포트폴리오 데이터를 외부로 전송하지 않아야 한다.

### 5. 선택적 요구사항 (Optional)

**REQ-022**: 가능하면, 시스템은 차트 시간 간격(일봉/주봉/월봉)을 사용자가 변경할 수 있게 해야 한다.

**REQ-023**: 가능하면, 시스템은 마지막으로 선택한 종목을 세션 스토리지에 저장하고 페이지 새로고침 시 복원해야 한다.

**REQ-024**: 가능하면, 시스템은 차트 영역의 크기를 사용자가 조절할 수 있게 해야 한다.

## SPECIFICATIONS

### SPEC-001: TradingView Widget 컴포넌트

**기능**: TradingView 무료 위젯을 래핑한 React 컴포넌트

**상세 동작**:

1. **위젯 초기화**
   - `useEffect` 훅을 사용하여 클라이언트 사이드에서만 위젯 초기화
   - TradingView Widget 생성자 호출
   - 컨테이너 DOM 요소에 위젯 마운트

2. **위젯 설정 (Free Plan)**

   ```typescript
   new TradingView.widget({
     autosize: true,
     symbol: `KRX:${stockCode}`,
     interval: 'D', // 일봉
     timezone: 'Asia/Seoul',
     theme: 'light',
     style: '1', // 캔들스틱
     locale: 'kr',
     toolbar_bg: '#f1f3f6',
     enable_publishing: false,
     hide_side_toolbar: false,
     allow_symbol_change: false, // Free Plan: 종목 변경 비활성화
     container_id: 'tradingview-chart',
   });
   ```

3. **클린업**
   - 컴포넌트 언마운트 시 위젯 인스턴스 정리
   - 메모리 누수 방지

**데이터 모델**:

```typescript
interface TradingViewWidgetProps {
  stockCode: string; // 6자리 종목코드 (예: "005930")
  stockName: string; // 종목명 (표시용)
}

interface ChartState {
  isLoading: boolean;
  error: string | null;
  isWidgetReady: boolean;
}
```

**구현 위치**: `components/tradingview-chart.tsx`

### SPEC-002: 포트폴리오 테이블 행 선택 UI

**기능**: 포트폴리오 테이블에서 종목 선택 인터랙션

**상세 동작**:

1. **행 클릭 인터랙션**
   - 테이블 행에 `onClick` 이벤트 핸들러 추가
   - 클릭된 행의 `stockCode`를 선택 상태로 설정
   - 커서 스타일을 `pointer`로 변경

2. **선택된 행 하이라이트**
   - 선택된 행에 CSS 클래스 적용 (`selected`, 배경색 변경)
   - 시각적 피드백 제공

3. **선택 상태 관리**
   - `useState`로 `selectedStock: StockHolding | null` 관리
   - 동일 행 클릭 시 선택 해제 (toggle)

**UI 변경사항**:

```tsx
// 기존: 비활성 행
<tr key={holding.stockCode}>
  ...
</tr>

// 변경: 클릭 가능한 행
<tr
  key={holding.stockCode}
  onClick={() => handleStockSelect(holding)}
  className={selectedStock?.stockCode === holding.stockCode ? 'selected' : ''}
  style={{ cursor: 'pointer' }}
>
  ...
</tr>
```

### SPEC-003: 차트 영역 레이아웃

**기능**: 포트폴리오 페이지에 차트 표시 영역 추가

**상세 동작**:

1. **레이아웃 구조**
   - 상단: 계좌 요약 카드 (기존)
   - 중간: 종목 선택 시 차트 영역 표시
   - 하단: 포트폴리오 테이블 (기존)

2. **차트 영역 스타일**
   - 고정 높이: 400px (또는 반응형)
   - 테두리 및 그림자로 시각적 구분
   - 종목 정보 헤더 (종목명, 종목코드, 닫기 버튼)

3. **빈 상태**
   - 종목 미선택 시: "차트를 보려면 테이블에서 종목을 클릭하세요" 안내

**UI 구조**:

```tsx
{
  /* 차트 영역 - 종목 선택 시 표시 */
}
{
  selectedStock && (
    <section className="si-card chart-container" style={{ marginBottom: 20 }}>
      <div className="chart-header">
        <div>
          <h3>{selectedStock.stockName}</h3>
          <span>{selectedStock.stockCode}</span>
        </div>
        <button onClick={clearSelection}>닫기</button>
      </div>
      <div className="chart-body">
        <TradingViewChart stockCode={selectedStock.stockCode} stockName={selectedStock.stockName} />
      </div>
    </section>
  );
}
```

### SPEC-004: TradingView 스크립트 동적 로드

**기능**: TradingView 위젯 스크립트를 동적으로 로드

**상세 동작**:

1. **스크립트 로드**
   - `https://s3.tradingview.com/tv.js` 동적 로드
   - `useEffect`에서 스크립트 존재 여부 확인 후 로드
   - 중복 로드 방지

2. **로드 상태 관리**
   - `isScriptLoaded` 상태로 스크립트 로드 완료 추적
   - 로드 완료 후 위젯 초기화

3. **에러 처리**
   - 스크립트 로드 실패 시 오류 메시지 표시
   - 재시도 옵션 제공 (선택적)

**구현 패턴**:

```typescript
const loadTradingViewScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.TradingView) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('TradingView 스크립트 로드 실패'));
    document.head.appendChild(script);
  });
};
```

### SPEC-005: 반응형 차트 크기

**기능**: 화면 크기에 따른 차트 크기 조절

**상세 동작**:

1. **자동 크기 조절**
   - TradingView 위젯 `autosize: true` 설정
   - 부모 컨테이너의 크기에 맞춰 자동 조절

2. **최소/최대 크기**
   - 최소 높이: 300px
   - 최대 높이: 600px
   - 모바일에서는 전체 너비 사용

3. **ResizeObserver**
   - 컨테이너 크기 변경 감지
   - 위젯 리사이즈 트리거

## CONSTRAINTS

### 기술적 제약사항

1. **TradingView Free Plan 제약**
   - 광고 표시 허용 필요
   - 종목 변경 기능 비활성화 (사용자가 직접 심볼 변경 불가)
   - 고급 기능(지표 저장, 알림 등) 제한
   - 실시간 데이터 지연 가능

2. **클라이언트 사이드 전용**
   - SSR/SSG에서 위젯 렌더링 불가
   - `use client` 지시어 필수
   - `useEffect` 내에서만 위젯 초기화

3. **보안 요구사항**
   - 사용자 포트폴리오 데이터를 외부로 전송하지 않음
   - TradingView 위젯은 공개 심볼 데이터만 사용
   - OWASP Top 10 준수

4. **성능 요구사항**
   - 위젯 초기화 시간: < 3초
   - 스크립트 로드 시간: < 2초
   - 종목 전환 시간: < 1초

### 비즈니스 제약사항

1. **사용자 경험**
   - 직관적인 종목 선택 방식
   - 빠른 차트 로딩
   - 명확한 오류 메시지

2. **브랜딩**
   - Free Plan 사용으로 인한 TradingView 브랜딩 노출 허용
   - SageInvest UI 일관성 유지

## TRACEABILITY

### 요구사항-사양 매핑

| 요구사항                                             | 관련 사양 |
| ---------------------------------------------------- | --------- |
| REQ-002, REQ-004, REQ-009, REQ-010, REQ-016, REQ-017 | SPEC-001  |
| REQ-001, REQ-006, REQ-007, REQ-012, REQ-014          | SPEC-002  |
| REQ-003, REQ-005, REQ-008, REQ-013, REQ-015          | SPEC-003  |
| REQ-010, REQ-011, REQ-016, REQ-020                   | SPEC-004  |
| REQ-024                                              | SPEC-005  |

### 태그

- `#chart` (REQ-001~REQ-024)
- `#tradingview` (REQ-002, REQ-004, REQ-009, REQ-016, REQ-017, REQ-020)
- `#portfolio` (REQ-001, REQ-006, REQ-007, REQ-012, REQ-014)
- `#ui-components` (REQ-001, REQ-003, REQ-005, REQ-013, REQ-014, REQ-015)
- `#frontend` (모든 REQ)

## ACCEPTANCE CRITERIA

### AC-001: 종목 선택 및 차트 표시

**Given**: 사용자가 포트폴리오 페이지에 접속해 있음
**When**: 사용자가 테이블에서 "삼성전자" 행을 클릭함
**Then**:

- 삼성전자 행이 하이라이트됨
- 차트 영역에 삼성전자 일봉 차트가 표시됨
- 종목명과 종목코드가 헤더에 표시됨

### AC-002: 종목 선택 해제

**Given**: 삼성전자가 선택되어 차트가 표시 중임
**When**: 사용자가 삼성전자 행을 다시 클릭함
**Then**:

- 행 하이라이트가 해제됨
- 차트 영역이 숨겨짐
- "종목을 선택하세요" 안내가 표시됨

### AC-003: 다른 종목으로 전환

**Given**: 삼성전자가 선택되어 차트가 표시 중임
**When**: 사용자가 "SK하이닉스" 행을 클릭함
**Then**:

- 삼성전자 행 하이라이트가 해제됨
- SK하이닉스 행이 하이라이트됨
- 차트가 SK하이닉스 일봉으로 변경됨

### AC-004: 차트 닫기 버튼

**Given**: 차트가 표시 중임
**When**: 사용자가 차트 헤더의 "닫기" 버튼을 클릭함
**Then**:

- 차트 영역이 숨겨짐
- 선택된 종목이 해제됨

### AC-005: 로딩 상태

**Given**: 사용자가 종목을 선택함
**When**: TradingView 위젯이 로딩 중임
**Then**:

- 로딩 인디케이터가 표시됨
- 위젯 로드 완료 후 인디케이터가 사라짐

### AC-006: 오류 처리

**Given**: TradingView 스크립트 로드 실패
**When**: 사용자가 종목을 선택함
**Then**:

- "차트를 불러올 수 없습니다" 오류 메시지가 표시됨
- 재시도 버튼이 제공됨 (선택적)

## IMPLEMENTATION NOTES

### 파일 구조

```
app/
  kis/
    portfolio/
      page.tsx          # 수정: 종목 선택 상태 추가
components/
  tradingview-chart.tsx # 신규: TradingView 위젯 컴포넌트
lib/
  tradingview/
    types.ts            # 신규: TradingView 관련 타입
    use-script.ts       # 신규: 스크립트 로드 훅
```

### 주요 의존성

- 기존: `react`, `next`
- 신규: 없음 (TradingView는 CDN 사용)

### 테스트 전략

1. **단위 테스트**
   - `useTradingViewScript` 훅 테스트
   - 종목 선택/해제 로직 테스트

2. **통합 테스트**
   - 포트폴리오 페이지 + 차트 컴포넌트 통합 테스트

3. **E2E 테스트**
   - 종목 선택 → 차트 표시 플로우 테스트
   - TradingView 위젯 렌더링 확인 (스크린샷)

### 위험 요소

1. **TradingView CDN 가용성**: TradingView 서비스 중단 시 차트 사용 불가
2. **Free Plan 정책 변경**: TradingView 정책 변경 시 기능 제한 가능
3. **한국 주식 데이터 지연**: 무료 플랜의 데이터 지연 가능성
