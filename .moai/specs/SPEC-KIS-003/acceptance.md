# SPEC-KIS-003: KIS 이동평균선 비교 분석 - 인수 기준

## TAG BLOCK

```
TAG: SPEC-KIS-003
TITLE: KIS 이동평균선 비교 분석
STATUS: Planned
PRIORITY: High
DOMAIN: KIS (Korea Investment & Securities OpenAPI)
```

## 개요

본 문서는 KIS 이동평균선 비교 분석 기능의 인수 기준(Acceptance Criteria)을 정의합니다. Given-When-Then 형식의 시나리오 기반 테스트를 통해 모든 요구사항이 충족되었는지 검증합니다.

## 테스트 시나리오

### 시나리오 1: 일봉 차트 데이터 조회

**Given**: KIS OpenAPI 인증이 완료되어 있음
**When**: 일봉 차트 데이터를 조회하면
**Then**: 시스템은 GET /uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice 엔드포인트를 호출해야 한다

---

**Given**: 일봉 차트 데이터 요청을 보냄
**When**: Production 환경이면
**Then**: tr_id가 FHKST03010100으로 설정되어야 한다

---

**Given**: 일봉 차트 데이터 요청을 보냄
**When**: Mock 환경이면
**Then**: tr_id가 HHKST03010100으로 설정되어야 한다

---

**Given**: 일봉 차트 데이터 응답을 받음
**When**: 응답을 파싱하면
**Then**: stck_bsop_date(영업일자), stck_clpr(종가) 필드가 포함된 캔들 배열을 반환해야 한다

### 시나리오 2: 주봉/월봉 차트 데이터 조회

**Given**: KIS OpenAPI 인증이 완료되어 있음
**When**: 주봉 차트 데이터를 조회하면
**Then**: 시스템은 GET /uapi/domestic-stock/v1/quotations/inquire-weekly-itemchartprice 엔드포인트를 호출해야 한다

---

**Given**: KIS OpenAPI 인증이 완료되어 있음
**When**: 월봉 차트 데이터를 조회하면
**Then**: 시스템은 GET /uapi/domestic-stock/v1/quotations/inquire-monthly-itemchartprice 엔드포인트를 호출해야 한다

### 시나리오 3: SMA 계산

**Given**: 10일치 일봉 데이터가 있음 (종가: 10000, 10100, 10200, 10300, 10400, 10500, 10600, 10700, 10800, 10900)
**When**: 5일 SMA를 계산하면
**Then**: (10500 + 10600 + 10700 + 10800 + 10900) / 5 = 10700이 반환되어야 한다

---

**Given**: 5일치 일봉 데이터만 있음
**When**: 10일 SMA를 계산하면
**Then**: null을 반환해야 한다 (데이터 부족)

---

**Given**: 240일치 일봉 데이터가 있음
**When**: 240일 SMA를 계산하면
**Then**: 최근 240일 종가의 평균값이 반환되어야 한다

### 시나리오 4: 이동평균선 비교

**Given**: 전일 종가가 85000원이고 5일 SMA가 82000원임
**When**: 이동평균선 비교를 수행하면
**Then**: signal이 'above'이고 value가 82000인 결과를 반환해야 한다

---

**Given**: 전일 종가가 80000원이고 5일 SMA가 82000원임
**When**: 이동평균선 비교를 수행하면
**Then**: signal이 'below'이고 value가 82000인 결과를 반환해야 한다

---

**Given**: 전일 종가가 85000원이고 데이터가 부족하여 240일 SMA를 계산할 수 없음
**When**: 이동평균선 비교를 수행하면
**Then**: signal이 null이고 value가 null인 결과를 반환해야 한다 (N/A)

### 시나리오 5: 단일 종목 API

**Given**: 유효한 종목코드(005930)가 있음
**When**: GET /api/kis/moving-average?stockCode=005930 요청을 보내면
**Then**: 일봉/주봉/월봉 데이터를 모두 조회하고 MovingAverageComparison 객체를 반환해야 한다

---

**Given**: 응답을 받음
**When**: 응답을 확인하면
**Then**: success가 true이고 data에 stockCode, stockName, previousClose, dailyMA, weeklyMA, monthlyMA가 포함되어야 한다

---

**Given**: 유효하지 않은 종목코드(12345)를 입력함
**When**: GET /api/kis/moving-average?stockCode=12345 요청을 보내면
**Then**: 400 에러와 "종목코드는 6자리 숫자여야 합니다" 메시지를 반환해야 한다

---

**Given**: 종목코드를 입력하지 않음
**When**: GET /api/kis/moving-average 요청을 보내면
**Then**: 400 에러와 "종목코드가 필요합니다" 메시지를 반환해야 한다

### 시나리오 6: 다중 종목 API

**Given**: 3개의 종목코드(005930, 000660, 035420)가 있음
**When**: POST /api/kis/moving-average/batch 요청을 보내면
**Then**: 3개 종목의 MovingAverageComparison 배열을 반환해야 한다

---

**Given**: 101개의 종목코드가 있음
**When**: POST /api/kis/moving-average/batch 요청을 보내면
**Then**: 400 에러와 "최대 100개 종목까지 조회 가능합니다" 메시지를 반환해야 한다

---

**Given**: 빈 배열을 보냄
**When**: POST /api/kis/moving-average/batch 요청을 보내면
**Then**: 400 에러와 "stockCodes 배열이 필요합니다" 메시지를 반환해야 한다

### 시나리오 7: Rate Limit 준수

**Given**: 50개의 종목을 조회해야 함
**When**: 다중 종목 API를 호출하면
**Then**: 초당 15건 이하로 요청을 분산하여 처리해야 한다

---

**Given**: 배치 처리 중임
**When**: 5개 종목을 처리한 후
**Then**: 1초 대기 후 다음 5개 종목을 처리해야 한다

### 시나리오 8: 서버 캐싱

**Given**: 캐시된 데이터가 없음
**When**: 최초 조회 요청을 보내면
**Then**: API를 호출하고 결과를 30초 TTL로 캐시해야 한다

---

**Given**: 10초 전에 조회한 캐시된 데이터가 있음
**When**: 동일한 종목을 다시 조회하면
**Then**: API를 호출하지 않고 캐시된 데이터를 반환해야 한다 (cached: true)

---

**Given**: 35초 전에 조회한 캐시된 데이터가 있음
**When**: 동일한 종목을 다시 조회하면
**Then**: 캐시가 만료되어 API를 다시 호출해야 한다

---

**Given**: 캐시된 데이터가 있음
**When**: ?refresh=true 파라미터로 요청하면
**Then**: 캐시를 무시하고 API를 다시 호출해야 한다

### 시나리오 9: 출력 포맷

**Given**: 이동평균선 비교 결과가 있음 (전일종가 > 5일 SMA)
**When**: 결과를 표시하면
**Then**: "↑(82,000)" 형식으로 표시하고 녹색으로 하이라이트해야 한다

---

**Given**: 이동평균선 비교 결과가 있음 (전일종가 < 5일 SMA)
**When**: 결과를 표시하면
**Then**: "↓(86,000)" 형식으로 표시하고 빨간색으로 하이라이트해야 한다

---

**Given**: 데이터가 부족하여 SMA를 계산할 수 없음
**When**: 결과를 표시하면
**Then**: "N/A"를 회색으로 표시해야 한다

---

**Given**: 전일 종가가 85000원임
**When**: 결과를 표시하면
**Then**: "85,000" 형식으로 천 단위 쉼표를 포함해야 한다

### 시나리오 10: UI 테이블 렌더링

**Given**: 5개 종목의 이동평균선 비교 데이터가 있음
**When**: MovingAverageTable 컴포넌트를 렌더링하면
**Then**: 종목코드, 종목명, 전일종가, 일봉(7개), 주봉(4개), 월봉(3개) 컬럼이 표시되어야 한다

---

**Given**: 데이터가 로딩 중임
**When**: MovingAverageTable 컴포넌트를 렌더링하면
**Then**: 스켈레톤 로딩 UI가 표시되어야 한다

---

**Given**: 조회할 종목이 없음 (빈 배열)
**When**: MovingAverageTable 컴포넌트를 렌더링하면
**Then**: "조회할 종목이 없습니다" 메시지가 표시되어야 한다

### 시나리오 11: 에러 처리

**Given**: KIS API가 500 에러를 반환함
**When**: 이동평균선 조회를 요청하면
**Then**: 재시도 정책에 따라 재시도하고 최종적으로 에러 메시지를 반환해야 한다

---

**Given**: 존재하지 않는 종목코드(999999)를 조회함
**When**: API 요청을 보내면
**Then**: 적절한 에러 메시지와 함께 실패 응답을 반환해야 한다

---

**Given**: 인증 토큰이 만료됨
**When**: API 요청을 보내면
**Then**: SPEC-KIS-001의 토큰 갱신 로직이 실행되어야 한다

## 엣지 케이스

### 엣지 케이스 1: 상장한 지 얼마 안 된 종목

**Given**: 상장한 지 30일밖에 안 된 종목이 있음
**When**: 이동평균선 비교를 요청하면
**Then**: 5일, 10일, 20일 SMA는 계산되고 60일 이상은 N/A로 표시되어야 한다

### 엣지 케이스 2: 거래 정지 종목

**Given**: 거래가 정지된 종목이 있음
**When**: 이동평균선 비교를 요청하면
**Then**: 마지막 거래일의 종가를 기준으로 SMA를 계산하거나 적절한 에러를 반환해야 한다

### 엣지 케이스 3: 병렬 요청 Race Condition

**Given**: 동일한 종목에 대한 2개의 요청이 동시에 들어옴
**When**: 두 요청이 모두 캐시 미스이면
**Then**: 하나의 요청만 API를 호출하고 다른 요청은 결과를 공유하거나 대기해야 한다

### 엣지 케이스 4: 대량 종목 조회 타임아웃

**Given**: 100개 종목을 조회 중임
**When**: API 응답이 지연되면
**Then**: 타임아웃(10초) 후 부분 결과라도 반환하거나 명확한 에러를 반환해야 한다

### 엣지 케이스 5: 캐시 메모리 부족

**Given**: 캐시에 1000개 이상의 항목이 저장됨
**When**: 새로운 항목을 캐시하려고 하면
**Then**: 가장 오래된 항목을 삭제하고 새 항목을 저장해야 한다 (LRU)

### 엣지 케이스 6: 잘못된 SMA 계산

**Given**: 일봉 데이터에 null 또는 0인 종가가 포함됨
**When**: SMA를 계산하면
**Then**: null/0을 제외하고 계산하거나 해당 기간을 N/A로 처리해야 한다

## 성공 기준 (Definition of Done)

### 기능적 완료 기준

#### 차트 데이터 조회

- [ ] **일봉 조회**: GET /uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice가 정상 작동함
- [ ] **주봉 조회**: GET /uapi/domestic-stock/v1/quotations/inquire-weekly-itemchartprice가 정상 작동함
- [ ] **월봉 조회**: GET /uapi/domestic-stock/v1/quotations/inquire-monthly-itemchartprice가 정상 작동함
- [ ] **tr_id 분기**: Production/Mock 환경에 따라 올바른 tr_id 사용

#### SMA 계산

- [ ] **일봉 SMA**: 5, 10, 20, 60, 80, 120, 240일 SMA 계산
- [ ] **주봉 SMA**: 5, 10, 20, 60주 SMA 계산
- [ ] **월봉 SMA**: 5, 10, 20월 SMA 계산
- [ ] **데이터 부족 처리**: 데이터가 부족할 경우 N/A 반환

#### 이동평균선 비교

- [ ] **단일 종목**: GET /api/kis/moving-average API 정상 작동
- [ ] **다중 종목**: POST /api/kis/moving-average/batch API 정상 작동
- [ ] **비교 로직**: 전일 종가 > SMA면 above, < SMA면 below

#### 캐싱

- [ ] **TTL**: 30초 캐시 TTL 적용
- [ ] **캐시 히트**: 캐시된 데이터 반환 시 cached: true
- [ ] **강제 갱신**: ?refresh=true 시 캐시 무시

#### Rate Limit

- [ ] **제한 준수**: 초당 15건 이하 요청
- [ ] **배치 처리**: 5개씩 배치 처리 후 1초 대기

#### UI 컴포넌트

- [ ] **테이블 렌더링**: 종목코드, 종목명, 전일종가, 이동평균선 컬럼 표시
- [ ] **신호 표시**: ↑(녹색)/↓(빨간색)/N/A(회색)
- [ ] **로딩 상태**: 스켈레톤 로딩 UI
- [ ] **에러 상태**: 적절한 에러 메시지

### 품질 기준 (TRUST 5)

#### Test-first (테스트 우선)

- [ ] 모든 시나리오가 Given-When-Then 형식의 테스트로 작성됨
- [ ] 테스트 커버리지가 85% 이상임
- [ ] 모든 테스트가 통과함

#### Readable (가독성)

- [ ] 코드가 ESLint 규칙을 통과함
- [ ] 함수와 변수명이 명확함
- [ ] 복잡한 로직에 주석이 포함됨

#### Unified (통일성)

- [ ] 코드가 Prettier로 포맷팅됨
- [ ] TypeScript 타입이 명확히 정의됨
- [ ] 일관된 에러 처리 패턴 사용

#### Secured (보안)

- [ ] KIS 인증 토큰이 안전하게 관리됨
- [ ] Rate Limit이 준수됨
- [ ] 민감 정보가 로그에 포함되지 않음

#### Trackable (추적 가능성)

- [ ] API 요청에 적절한 로깅이 있음
- [ ] 캐시 히트/미스가 로깅됨
- [ ] Git 커밋 메시지가 명확함

### 성능 기준

- [ ] **단일 종목 응답**: 3개 API 호출 (일봉, 주봉, 월봉) 완료 < 3초
- [ ] **캐시 히트 응답**: < 100ms
- [ ] **다중 종목 (10개)**: < 5초
- [ ] **다중 종목 (100개)**: < 30초

### UI 기준

- [ ] **테이블 컬럼**: 종목코드(6자리), 종목명, 전일종가, 일봉(7개), 주봉(4개), 월봉(3개)
- [ ] **신호 표시**: ↑/↓ 아이콘과 색상이 정확함
- [ ] **값 포맷팅**: 천 단위 쉼표 포함
- [ ] **반응형**: 가로 스크롤 가능

## 검증 방법

### 자동화된 테스트

1. **단위 테스트**: Vitest로 각 모듈 테스트
   - SMA 계산 로직 테스트
   - 이동평균선 비교 로직 테스트
   - 캐시 로직 테스트

2. **통합 테스트**: KIS API 모킹으로 전체 흐름 테스트
   - 차트 데이터 조회 흐름
   - API 엔드포인트 테스트
   - Rate Limit 처리 테스트

3. **E2E 테스트**: Playwright로 UI 테스트
   - 테이블 렌더링
   - 로딩/에러 상태

### 수동 테스트

1. **KIS Mock 환경**: Mock 환경에서 실제 차트 데이터 조회
2. **다양한 종목**: 상장된 지 얼마 안 된 종목, 오래된 종목
3. **대량 조회**: 100개 종목 동시 조회
4. **캐시 동작**: 30초 전후 조회 비교

### 성능 테스트

1. **응답 시간**: 단일/다중 종목 조회 시간 측정
2. **Rate Limit**: 요청 빈도 모니터링
3. **캐시 효율**: 캐시 히트율 측정

## 승인 절차

1. **개발 완료**: 모든 기능이 구현되고 테스트 통과
2. **코드 리뷰**: Backend, Frontend 전문가 리뷰
3. **QA 테스트**: 다양한 종목으로 테스트 수행
4. **성능 검증**: 응답 시간 및 Rate Limit 준수 확인
5. **UI 검증**: 테이블 표시 및 사용자 경험 확인
6. **프로덕션 배포**: Mock 환경 테스트 후 Production 배포
