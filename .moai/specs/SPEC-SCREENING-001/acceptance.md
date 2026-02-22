---
SPEC_ID: SPEC-SCREENING-001
TITLE: Acceptance Criteria - 이동평균선 돌파 스크리닝 시스템
CREATED: 2026-02-22T09:00:00Z
UPDATED: 2026-02-22T09:00:00Z
---

# Acceptance Criteria: SPEC-SCREENING-001

이 문서는 SPEC-SCREENING-001 (이동평균선 돌파 스크리닝 시스템)의 수용 기준을 정의합니다. 모든 테스트 시나리오는 Given-When-Then 형식으로 작성됩니다.

## Feature 1: 포트폴리오 스크리닝

### Scenario 1.1: 정상적인 포트폴리오 스크리닝

**Given**: 사용자가 KIS 인증을 완료했고 계좌번호가 설정되어 있음
**And**: 포트폴리오에 5개 종목을 보유 중 (Samsung Electronics, SK Hynix, Celltrion, Naver, Kakao)
**And**: 현재 날짜는 2026-02-22
**And**: Samsung Electronics가 2026-02-15에 20일 MA를 상향 돌파함 (돌파가격: 75,000원)
**And**: 현재 Samsung Electronics 주가는 80,000원

**When**: 사용자가 MA 기간 20일로 포트폴리오 스크리닝을 요청함

**Then**: 시스템이 5개 종목에 대한 스크리닝 결과를 반환함
**And**: Samsung Electronics 결과에 다음 정보가 포함됨:

- 종목명: "삼성전자"
- 시장: "KOSPI"
- 시가총액: (실제 값)
- 현재가격: 80,000원
- 돌파가격: 75,000원
- 돌파상승률: 6.67%
- 돌파일자: 2026-02-15
- 경과일수: 7일
  **And**: 응답에 스크리닝 요약 정보가 포함됨:
- 총 종목 수: 5
- 돌파 종목 수: (돌파한 종목 수)
- 평균 돌파상승률: (평균값)
- 스크리닝 수행 일시: 2026-02-22T...Z

---

### Scenario 1.2: KIS 인증되지 않은 경우

**Given**: 사용자가 KIS 인증을 완료하지 않음

**When**: 사용자가 포트폴리오 스크리닝을 요청함

**Then**: 시스템이 401 Unauthorized 응답을 반환함
**And**: 에러 메시지가 "KIS 연동이 필요합니다"임

---

### Scenario 1.3: 계좌번호 미설정 경우

**Given**: 사용자가 KIS 인증을 완료했으나 계좌번호가 설정되지 않음

**When**: 사용자가 포트폴리오 스크리닝을 요청함

**Then**: 시스템이 400 Bad Request 응답을 반환함
**And**: 에러 메시지가 "계좌번호를 설정해주세요"임

---

### Scenario 1.4: 빈 포트폴리오

**Given**: 사용자가 KIS 인증을 완료했고 계좌번호가 설정되어 있음
**And**: 포트폴리오에 보유 종목이 없음 (현금만 보유)

**When**: 사용자가 포트폴리오 스크리닝을 요청함

**Then**: 시스템이 200 OK 응답을 반환함
**And**: 결과 배열이 비어있음 `[]`
**And**: 요약 정보에 총 종목 수: 0, 돌파 종목 수: 0이 포함됨

---

### Scenario 1.5: 데이터 부족으로 인한 종목 제외

**Given**: 포트폴리오에 종목 A (상장 10일 차)가 포함되어 있음
**And**: 사용자가 20일 MA 스크리닝을 요청함

**When**: 스크리닝이 수행됨

**Then**: 종목 A가 결과에서 제외됨
**And**: 로그에 "종목 A: 데이터 부족 (10일 < 20일)" 경고가 기록됨

---

## Feature 2: 시장 스크리닝

### Scenario 2.1: 정상적인 시장 스크리닝

**Given**: 사용자가 종목 리스트를 제공함 ["005930", "000660", "068270"]
**And**: KIS 인증이 완료되어 있음

**When**: 사용자가 MA 기간 20일로 시장 스크리닝을 요청함

**Then**: 시스템이 3개 종목에 대한 스크리닝 결과를 반환함
**And**: 각 종목의 정보가 정확히 포함됨 (종목명, 시장, 시가총액 등)

---

### Scenario 2.2: 종목 리스트 최대 개수 초과

**Given**: 사용자가 150개 종목 코드를 제공함

**When**: 사용자가 시장 스크리닝을 요청함

**Then**: 시스템이 400 Bad Request 응답을 반환함
**And**: 에러 메시지가 "최대 100개 종목까지만 스크리닝 가능합니다"임

---

### Scenario 2.3: 유효하지 않은 종목코드

**Given**: 사용자가 종목 리스트를 제공함 ["005930", "INVALID", "1234567"]

**When**: 사용자가 시장 스크리닝을 요청함

**Then**: 시스템이 "005930"에 대한 결과만 반환함
**And**: "INVALID", "1234567"은 무시됨
**And**: 로그에 무시된 종목코드 경고가 기록됨

---

## Feature 3: 단일 종목 스크리닝

### Scenario 3.1: 정상적인 단일 종목 스크리닝

**Given**: 사용자가 종목코드 "005930"을 조회함
**And**: KIS 인증이 완료되어 있음

**When**: 사용자가 MA 기간 20일로 스크리닝을 요청함 (GET /api/screening/stock/005930?maPeriod=20)

**Then**: 시스템이 Samsung Electronics의 스크리닝 결과를 반환함
**And**: 결과에 모든 필수 필드가 포함됨

---

### Scenario 3.2: 존재하지 않는 종목코드

**Given**: 사용자가 종목코드 "999999"를 조회함

**When**: 사용자가 스크리닝을 요청함

**Then**: 시스템이 404 Not Found 응답을 반환함
**And**: 에러 메시지가 "종목을 찾을 수 없습니다"임

---

### Scenario 3.3: MA 기간 파라미터 누락

**Given**: 사용자가 종목코드 "005930"을 조회함

**When**: 사용자가 MA 기간 파라미터 없이 스크리닝을 요청함 (GET /api/screening/stock/005930)

**Then**: 시스템이 기본 MA 기간(20일)으로 스크리닝을 수행함
**And**: 200 OK 응답을 반환함

---

## Feature 4: 이동평균선 계산

### Scenario 4.1: 정확한 SMA 계산

**Given**: 5일간 종가 데이터: [100, 102, 101, 103, 105]

**When**: 5일 SMA를 계산함

**Then**: 결과가 102.2임 (소수점 1자리)
**And**: (100 + 102 + 101 + 103 + 105) / 5 = 102.2와 일치함

---

### Scenario 4.2: 다중 기간 MA 계산

**Given**: 20일간 종가 데이터가 주어짐

**When**: 5일, 10일, 20일 MA를 동시에 계산함

**Then**: 각 기간별 MA 배열이 반환됨
**And**: 5일 MA는 16개 값 + 4개 null
**And**: 10일 MA는 11개 값 + 9개 null
**And**: 20일 MA는 1개 값 + 19개 null

---

### Scenario 4.3: 데이터 부족한 경우

**Given**: 10일간 종가 데이터만 있음

**When**: 20일 MA를 계산함

**Then**: 모든 결과가 null임
**And**: 에러가 발생하지 않음

---

## Feature 5: 돌파 감지

### Scenario 5.1: 상향 돌파 감지

**Given**: 10일간 종가 데이터: [100, 102, 104, 103, 105, 107, 108, 106, 110, 112]
**And**: 5일 MA: [null, null, null, null, 102.8, 104.2, 105.4, 106.2, 107.2, 109.2]

**When**: 상향 돌파를 감지함

**Then**: 가장 최근 돌파 지점이 감지됨
**And**: 돌파일자: (해당 날짜)
**And**: 돌파가격: (해당 종가)
**And**: 돌파상승률: ((112 - 돌파가격) / 돌파가격) \* 100

---

### Scenario 5.2: 돌파 없음

**Given**: 10일간 종가 데이터가 항상 MA 아래에 있음

**When**: 상향 돌파를 감지함

**Then**: null이 반환됨
**And**: 에러가 발생하지 않음

---

### Scenario 5.3: 다중 돌파 시 최근 돌파 선택

**Given**: 30일간 데이터에서 3번의 상향 돌파가 발생함 (Day 10, Day 20, Day 25)

**When**: 상향 돌파를 감지함

**Then**: 가장 최근 돌파(Day 25)가 반환됨
**And**: 이전 돌파는 무시됨

---

## Feature 6: Rate Limit 준수

### Scenario 6.1: 다중 종목 스크리닝 시 Rate Limit 준수

**Given**: 포트폴리오에 50개 종목이 있음
**And**: Rate Limit이 초당 15건임

**When**: 포트폴리오 스크리닝을 수행함

**Then**: 총 소요 시간이 ≥ 50 / 15 = 3.33초임
**And**: Rate Limit 위반 에러가 발생하지 않음

---

### Scenario 6.2: Rate Limit 위반 시 재시도

**Given**: KIS API가 429 Too Many Requests를 반환함

**When**: 스크리닝 서비스가 API를 호출함

**Then**: 지수 백오프로 재시도함 (1초, 2초, 4초...)
**And**: 최대 5회 재시도함
**And**: 5회 실패 시 에러를 반환함

---

## Feature 7: 캐싱

### Scenario 7.1: 종목 기본 정보 캐싱

**Given**: 종목 "005930"의 기본 정보를 처음 조회함

**When**: 동일한 종목 정보를 1시간 내에 다시 조회함

**Then**: 캐시된 데이터가 반환됨
**And**: API 호출이 발생하지 않음

---

### Scenario 7.2: 가격 이력 캐싱 (장중)

**Given**: 현재 시간이 장 중(09:00-15:30)임
**And**: 종목 "005930"의 가격 이력을 조회함

**When**: 5분 내에 동일한 요청을 수행함

**Then**: 캐시된 데이터가 반환됨
**And**: API 호출이 발생하지 않음

---

### Scenario 7.3: 가격 이력 캐싱 (장외)

**Given**: 현재 시간이 장 외(15:30-09:00)임
**And**: 종목 "005930"의 가격 이력을 조회함

**When**: 1시간 내에 동일한 요청을 수행함

**Then**: 캐시된 데이터가 반환됨
**And**: API 호출이 발생하지 않음

---

### Scenario 7.4: 스크리닝 결과 캐싱

**Given**: 포트폴리오 스크리닝을 수행함

**When**: 5분 내에 동일한 파라미터로 스크리닝을 요청함

**Then**: 캐시된 결과가 반환됨
**And**: API 호출이 최소화됨

---

### Scenario 7.5: 강제 새로고침

**Given**: 캐시된 스크리닝 결과가 있음

**When**: 사용자가 강제 새로고침을 요청함 (forceRefresh=true)

**Then**: 캐시가 무효화됨
**And**: 새로운 API 호출이 수행됨
**And**: 최신 결과가 반환됨

---

## Feature 8: UI 컴포넌트

### Scenario 8.1: 스크리닝 결과 테이블 표시

**Given**: 스크리닝 결과가 10개 종목으로 반환됨

**When**: 대시보드 페이지가 로드됨

**Then**: 테이블에 10개 행이 표시됨
**And**: 각 행에 종목코드, 종목명, 시장, 시가총액, 현재가, 돌파가격, 돌파상승률, 돌파일자, 경과일수가 표시됨

---

### Scenario 8.2: 돌파상승률 색상 표시

**Given**: 스크리닝 결과에 돌파상승률 양수 종목과 음수 종목이 혼재함

**When**: 결과 테이블이 렌더링됨

**Then**: 돌파상승률 양수 종목은 빨간색 텍스트로 표시됨
**And**: 돌파상승률 음수 종목은 파란색 텍스트로 표시됨 (한국 증시 관행)

---

### Scenario 8.3: 최근 돌파 뱃지 표시

**Given**: 스크리닝 결과에 돌파 후 5일 이내 종목이 있음

**When**: 결과 테이블이 렌더링됨

**Then**: 해당 종목에 "NEW" 뱃지가 표시됨

---

### Scenario 8.4: MA 기간 필터 변경

**Given**: 스크리닝 결과가 20일 MA 기준으로 표시됨

**When**: 사용자가 MA 기간을 60일로 변경함

**Then**: 새로운 스크리닝 요청이 60일 MA로 수행됨
**And**: 결과 테이블이 업데이트됨
**And**: 로딩 인디케이터가 표시됨

---

### Scenario 8.5: 결과 정렬

**Given**: 스크리닝 결과가 표시됨

**When**: 사용자가 "돌파상승률" 컬럼 헤더를 클릭함

**Then**: 결과가 돌파상승률 기준 내림차순으로 정렬됨
**And**: 정렬 방향 표시자(▼)가 해당 컬럼에 표시됨

---

### Scenario 8.6: CSV 내보내기

**Given**: 스크리닝 결과가 표시됨

**When**: 사용자가 "내보내기" 버튼을 클릭함

**Then**: CSV 파일이 다운로드됨
**And**: 파일명에 스크리닝 일시가 포함됨 (예: screening-20260222-093000.csv)
**And**: CSV에 모든 표시된 컬럼이 포함됨

---

## Feature 9: 에러 처리

### Scenario 9.1: KIS API 장애

**Given**: KIS API 서버가 응답하지 않음 (timeout)

**When**: 스크리닝을 요청함

**Then**: 시스템이 재시도 정책에 따라 재시도함
**And**: 최대 재시도 실패 시 503 Service Unavailable 응답을 반환함
**And**: 에러 메시지가 "KIS API 일시적 장애. 잠시 후 다시 시도해주세요"임

---

### Scenario 9.2: 네트워크 오류

**Given**: 네트워크 연결이 불안정함

**When**: 스크리닝 중 네트워크 오류가 발생함

**Then**: 시스템이 재시도 정책에 따라 재시도함
**And**: 사용자에게 진행 상황이 표시됨 (예: "3/50 종목 처리 중...")

---

### Scenario 9.3: 계산 오류 (NaN)

**Given**: 가격 데이터에 0 또는 null이 포함됨

**When**: MA를 계산함

**Then**: NaN 또는 Infinity가 결과에 포함되지 않음
**And**: 해당 종목이 결과에서 제외됨
**And**: 로그에 경고가 기록됨

---

## Feature 10: 성능

### Scenario 10.1: 포트폴리오 스크리닝 응답 시간

**Given**: 포트폴리오에 50개 종목이 있음

**When**: 스크리닝을 요청함

**Then**: 응답 시간이 10초 미만임 (P95)
**And**: 사용자에게 진행 표시기가 표시됨

---

### Scenario 10.2: 단일 종목 스크리닝 응답 시간

**Given**: 단일 종목에 대한 스크리닝을 요청함

**When**: 캐시된 데이터가 없음

**Then**: 응답 시간이 2초 미만임 (P95)

---

### Scenario 10.3: 캐시된 스크리닝 응답 시간

**Given**: 캐시된 스크리닝 결과가 있음

**When**: 동일한 요청을 수행함

**Then**: 응답 시간이 100ms 미만임

---

## Feature 11: 보안

### Scenario 11.1: 민감 정보 로깅 금지

**Given**: 스크리닝 서비스가 로그를 기록함

**When**: API 요청/응답을 로깅함

**Then**: 앱 시크릿, 액세스 토큰이 마스킹됨
**And**: 평문으로 기록되지 않음

---

### Scenario 11.2: 입력 검증

**Given**: 사용자가 종목코드를 입력함

**When**: 종목코드가 "00593A" (알파벳 포함)임

**Then**: 시스템이 400 Bad Request를 반환함
**And**: 에러 메시지가 "유효하지 않은 종목코드 형식입니다"임

---

## Test Data

### Known Datasets for Validation

**Samsung Electronics (005930)**:

- Market: KOSPI
- Typical Market Cap: ~400-500조원
- Use for: MA calculation accuracy, breakthrough detection

**SK Hynix (000660)**:

- Market: KOSPI
- Use for: MA calculation accuracy

**Celltrion (068270)**:

- Market: KOSDAQ
- Use for: KOSDAQ market parameter validation

### Expected MA Values (Hypothetical)

For testing MA calculator with sample data:

```
Prices: [100, 102, 104, 103, 105, 107, 108, 106, 110, 112]

5-day MA (day 5): (100+102+104+103+105)/5 = 102.8
5-day MA (day 6): (102+104+103+105+107)/5 = 104.2
5-day MA (day 10): (107+108+106+110+112)/5 = 108.6
```

### Breakthrough Test Case

```
Day | Close | 5-day MA | Breakthrough?
1   | 100   | null     | -
2   | 102   | null     | -
3   | 104   | null     | -
4   | 103   | null     | -
5   | 105   | 102.8    | No (first valid MA)
6   | 107   | 104.2    | Yes (106 > 104.2, prev 105 < 102.8 is false)
                                   Actually: prev close 105, prev MA null -> No
7   | 108   | 105.4    | No (108 > 105.4, but prev 107 > 104.2)
8   | 106   | 106.2    | No (106 = 106.2, prev 108 > 105.4)
9   | 110   | 107.2    | No (110 > 107.2, prev 106 = 106.2)
10  | 112   | 109.2    | No (112 > 109.2, prev 110 > 107.2)

Adjusted Test Case (with true breakthrough):
Day | Close | 5-day MA | Breakthrough?
5   | 95    | 102.8    | No (close < MA)
6   | 96    | 101.0    | No (close < MA)
7   | 102   | 99.6     | Yes! (102 > 99.6, prev 96 < 101.0)
```

---

## Coverage Targets

- **Unit Tests**: ≥ 85% line coverage
- **Integration Tests**: ≥ 70% line coverage
- **E2E Tests**: Critical user flows (portfolio screening, market screening, single stock)

---

## Definition of Done

**Feature is considered "Done" when**:

1. ✅ All acceptance criteria pass
2. ✅ Unit test coverage ≥ 85%
3. ✅ Integration test coverage ≥ 70%
4. ✅ Zero TypeScript errors
5. ✅ Zero ESLint warnings
6. ✅ TRUST 5 quality gates passed
7. ✅ API documentation updated
8. ✅ Code reviewed and approved
9. ✅ Deployed to staging environment
10. ✅ Manual testing completed on staging
