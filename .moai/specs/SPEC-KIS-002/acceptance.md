# SPEC-KIS-002: KIS 국내주식 잔고조회 및 자산현황 - 인수 기준

## TAG BLOCK

```
TAG: SPEC-KIS-002
TITLE: KIS 국내주식 잔고조회 및 자산현황
STATUS: Planned
PRIORITY: High
DOMAIN: KIS (Korea Investment & Securities OpenAPI)
```

## 개요

본 문서는 KIS 국내주식 잔고조회 및 자산현황 기능의 인수 기준(Acceptance Criteria)을 정의합니다. Given-When-Then 형식의 시나리오 기반 테스트를 통해 모든 요구사항이 충족되었는지 검증합니다.

## 테스트 시나리오

### 시나리오 1: 국내주식 잔고조회 API 호출

**Given**: KIS 인증이 완료되고 유효한 토큰이 존재하며, 계좌번호(CANO: "12345678", ACNT_PRDT_CD: "01")가 설정되어 있음
**When**: 잔고조회를 요청하면
**Then**: 시스템은 GET `/uapi/domestic-stock/v1/trading/inquire-balance` 엔드포인트에 올바른 헤더(authorization, appkey, appsecret, tr_id)와 쿼리 파라미터를 포함하여 요청을 전송해야 한다

---

**Given**: Production 환경에서 잔고조회를 요청함
**When**: API 요청 헤더를 구성하면
**Then**: tr_id가 `TTTC8434R`으로 설정되어야 한다

---

**Given**: Mock 환경에서 잔고조회를 요청함
**When**: API 요청 헤더를 구성하면
**Then**: tr_id가 `VTTC8434R`으로 설정되어야 한다

---

**Given**: 잔고조회 API가 성공적으로 응답했음
**When**: 응답을 파싱하면
**Then**: output1에 종목별 데이터(pdno, prdt_name, hldg_qty, pchs_avg_pric, prpr, evlu_amt, evlu_pfls_amt, evlu_pfls_rt)가 포함되어야 한다

---

**Given**: 잔고조회 API가 성공적으로 응답했음
**When**: 응답을 파싱하면
**Then**: output2에 계좌 요약(dnca_tot_amt, pchs_amt_smtl_amt, evlu_amt_smtl_amt, evlu_pfls_smtl_amt, tot_evlu_amt, nass_amt)이 포함되어야 한다

### 시나리오 2: 페이지네이션 처리

**Given**: 보유 종목이 60건이고 Production 환경(1회 최대 50건)임
**When**: 잔고조회를 요청하면
**Then**: 시스템은 자동으로 2번의 API 호출을 수행하여 60건 전체를 수집해야 한다

---

**Given**: 첫 번째 페이지 응답의 ctx_area_nk100이 비어있지 않음
**When**: 다음 페이지를 요청하면
**Then**: CTX_AREA_FK100과 CTX_AREA_NK100에 이전 응답의 연속조회키 값을 전달해야 한다

---

**Given**: 마지막 페이지의 ctx_area_nk100이 비어있음
**When**: 페이지네이션 루프를 확인하면
**Then**: 더 이상 추가 API 호출이 발생하지 않아야 한다

---

**Given**: 페이지네이션 요청이 10페이지를 초과함 (안전장치)
**When**: 안전장치가 발동되면
**Then**: 추가 요청을 중단하고 현재까지 수집된 데이터를 반환해야 한다

### 시나리오 3: 데이터 변환

**Given**: KIS API가 output1에 `{ pdno: "005930", prdt_name: "삼성전자", hldg_qty: "100", pchs_avg_pric: "70000.00", pchs_amt: "7000000", prpr: "75000", evlu_amt: "7500000", evlu_pfls_amt: "500000", evlu_pfls_rt: "7.14" }`를 반환했음
**When**: 데이터를 StockHolding으로 변환하면
**Then**: quantity는 100(number), averagePurchasePrice는 70000(number), currentPrice는 75000(number), profitLossRate는 7.14(number)여야 한다

---

**Given**: KIS API가 output2에 `{ dnca_tot_amt: "5000000", pchs_amt_smtl_amt: "7000000", evlu_amt_smtl_amt: "7500000", evlu_pfls_smtl_amt: "500000", tot_evlu_amt: "12500000", nass_amt: "12000000" }`를 반환했음
**When**: 데이터를 AccountSummary로 변환하면
**Then**: depositTotal은 5000000(number), profitLossTotal은 500000(number), profitLossRate는 7.14(number, 계산값)여야 한다

### 시나리오 4: 계좌번호 설정

**Given**: 사용자가 Settings Page에 접속했음
**When**: 페이지를 렌더링하면
**Then**: 기존 AppKey/AppSecret/환경 설정 필드 아래에 CANO(8자리) 입력 필드와 ACNT_PRDT_CD(2자리) 입력 필드가 표시되어야 한다

---

**Given**: 사용자가 CANO에 "12345678", ACNT_PRDT_CD에 "01"을 입력했음
**When**: 저장 버튼을 클릭하면
**Then**: 계좌번호가 AES-256-GCM으로 암호화되어 PostgreSQL에 저장되어야 한다

---

**Given**: 사용자가 CANO에 7자리("1234567")를 입력했음
**When**: 저장 버튼을 클릭하면
**Then**: "계좌번호는 8자리여야 합니다" 오류 메시지를 표시해야 한다

---

**Given**: 사용자가 ACNT_PRDT_CD에 3자리("012")를 입력했음
**When**: 저장 버튼을 클릭하면
**Then**: "계좌상품코드는 2자리여야 합니다" 오류 메시지를 표시해야 한다

---

**Given**: 사용자가 CANO에 문자("1234abcd")를 입력했음
**When**: 저장 버튼을 클릭하면
**Then**: "숫자만 입력 가능합니다" 오류 메시지를 표시해야 한다

---

**Given**: 저장된 계좌번호가 있음
**When**: Settings Page를 로드하면
**Then**: CANO는 "1234\*\*\*\*"로 마스킹되어 표시되고, ACNT_PRDT_CD는 "01"로 표시되어야 한다

### 시나리오 5: 대시보드 자산 요약 위젯

**Given**: KIS 인증이 완료되고 계좌번호가 설정되어 있음
**When**: 대시보드를 로드하면
**Then**: 자산 요약 위젯에 총평가금액, 총매입금액, 총평가손익, 수익률, 예수금, 순자산금액이 표시되어야 한다

---

**Given**: 총평가손익이 +500,000원이고 수익률이 +7.14%임
**When**: 자산 요약 위젯을 렌더링하면
**Then**: 손익 금액은 "+500,000원"으로 빨간색, 수익률은 "+7.14%"로 빨간색으로 표시되어야 한다

---

**Given**: 총평가손익이 -300,000원이고 수익률이 -4.29%임
**When**: 자산 요약 위젯을 렌더링하면
**Then**: 손익 금액은 "-300,000원"으로 파란색, 수익률은 "-4.29%"로 파란색으로 표시되어야 한다

---

**Given**: 총평가금액이 12,500,000원임
**When**: 금액을 표시하면
**Then**: "12,500,000원"으로 천 단위 구분자가 포함되어 표시되어야 한다

---

**Given**: 자산 요약 위젯이 표시되고 있음
**When**: 새로고침 버튼을 클릭하면
**Then**: 즉시 최신 잔고 데이터를 조회하고 위젯을 갱신해야 한다

---

**Given**: 자산 요약 위젯에 데이터가 표시됨
**When**: 마지막 조회 시간을 확인하면
**Then**: "마지막 조회: 2026-02-08 14:30:25" 형식으로 표시되어야 한다

### 시나리오 6: 보유종목 상세 목록 페이지

**Given**: 3개의 보유종목이 있음 (삼성전자, SK하이닉스, 네이버)
**When**: /kis/portfolio 페이지를 로드하면
**Then**: 종목코드, 종목명, 보유수량, 매입평균가, 현재가, 평가금액, 평가손익, 수익률 8개 컬럼의 테이블이 표시되어야 한다

---

**Given**: 보유종목 테이블이 표시되고 있음
**When**: "수익률" 컬럼 헤더를 클릭하면
**Then**: 수익률 기준 내림차순으로 정렬되어야 한다

---

**Given**: 보유종목 테이블이 수익률 내림차순으로 정렬됨
**When**: "수익률" 컬럼 헤더를 다시 클릭하면
**Then**: 수익률 기준 오름차순으로 정렬되어야 한다

---

**Given**: 기본 정렬 상태임
**When**: 페이지를 최초 로드하면
**Then**: 평가금액 내림차순으로 정렬되어야 한다

---

**Given**: 종목의 평가손익이 +500,000원이고 수익률이 +7.14%임
**When**: 해당 종목 행을 렌더링하면
**Then**: 평가손익과 수익률 셀이 빨간색으로 표시되어야 한다

---

**Given**: 종목의 평가손익이 -200,000원이고 수익률이 -3.45%임
**When**: 해당 종목 행을 렌더링하면
**Then**: 평가손익과 수익률 셀이 파란색으로 표시되어야 한다

### 시나리오 7: 미설정 상태 처리

**Given**: KIS 인증이 완료되지 않았음
**When**: 잔고조회를 시도하면
**Then**: "KIS 연동이 필요합니다" 메시지와 Settings Page로의 링크가 표시되어야 한다

---

**Given**: KIS 인증은 완료되었으나 계좌번호가 설정되지 않았음
**When**: 잔고조회를 시도하면
**Then**: "계좌번호를 설정해주세요" 메시지와 Settings Page로의 링크가 표시되어야 한다

---

**Given**: 계좌에 보유 종목이 없음
**When**: 잔고조회를 요청하면
**Then**: "보유 종목이 없습니다" 메시지가 표시되어야 한다

### 시나리오 8: Rate Limit 준수

**Given**: 페이지네이션으로 연속 API 호출이 필요함
**When**: 연속 요청을 전송하면
**Then**: 요청 간 최소 70ms 간격이 유지되어 초당 15건 이하로 제한되어야 한다

---

**Given**: 잔고조회 API가 429 Too Many Requests를 반환했음
**When**: 429 응답을 처리하면
**Then**: 기존 retry.ts의 지수 백오프 정책에 따라 재시도해야 한다

### 시나리오 9: API Route 검증

**Given**: 유효한 인증 상태임
**When**: GET /api/kis/balance를 호출하면
**Then**: `{ holdings: StockHolding[], summary: AccountSummary }` 형식의 JSON 응답을 반환해야 한다

---

**Given**: 유효한 인증 상태임
**When**: GET /api/kis/balance/summary를 호출하면
**Then**: `{ summary: AccountSummary }` 형식의 경량 JSON 응답을 반환해야 한다

---

**Given**: KIS 인증이 되어있지 않음
**When**: GET /api/kis/balance를 호출하면
**Then**: 401 상태코드와 `{ error: "KIS authentication required" }` 에러를 반환해야 한다

---

**Given**: 계좌번호가 설정되지 않았음
**When**: GET /api/kis/balance를 호출하면
**Then**: 400 상태코드와 `{ error: "Account number not configured" }` 에러를 반환해야 한다

---

**Given**: CANO가 "12345678"이고 ACNT_PRDT_CD가 "01"임
**When**: POST /api/kis/account를 호출하면
**Then**: 계좌번호가 암호화되어 저장되고 201 상태코드를 반환해야 한다

---

**Given**: 계좌번호가 저장되어 있음
**When**: GET /api/kis/account를 호출하면
**Then**: `{ cano: "1234****", acntPrdtCd: "01" }` 형식으로 마스킹된 계좌번호를 반환해야 한다

### 시나리오 10: 보안 검증

**Given**: 계좌번호를 저장해야 함
**When**: 데이터베이스에 저장하면
**Then**: CANO와 ACNT_PRDT_CD가 AES-256-GCM으로 암호화된 상태로 저장되어야 한다

---

**Given**: 암호화된 계좌번호가 데이터베이스에 있음
**When**: 계좌번호를 조회하면
**Then**: 복호화된 원본 값이 정확히 반환되어야 한다

---

**Given**: 잔고조회 API 응답에 계좌번호가 포함됨
**When**: API 로그를 기록하면
**Then**: 계좌번호가 "\*\*\*\*" 형태로 마스킹되어 기록되어야 한다

---

**Given**: 잔고 데이터를 프론트엔드에 전달해야 함
**When**: 클라이언트에 응답하면
**Then**: 잔고 데이터가 브라우저의 localStorage나 sessionStorage에 캐싱되지 않아야 한다

## 엣지 케이스

### 엣지 케이스 1: 빈 계좌 응답

**Given**: 계좌에 보유 종목이 0건임
**When**: 잔고조회 API를 호출하면
**Then**: output1은 빈 배열, output2의 금액 필드는 모두 "0"이어야 하며, 시스템은 정상적으로 처리해야 한다

### 엣지 케이스 2: 대량 보유종목

**Given**: 계좌에 보유 종목이 200건임
**When**: 잔고조회를 요청하면
**Then**: 페이지네이션으로 4-5번의 API 호출을 수행하여 전체 200건을 수집해야 한다

### 엣지 케이스 3: API 응답 필드 누락

**Given**: KIS API 응답에서 일부 필드(예: evlu_pfls_rt)가 빈 문자열("")임
**When**: 데이터를 변환하면
**Then**: 빈 문자열은 0으로 기본값 처리되어야 한다

### 엣지 케이스 4: 동시 잔고조회 요청

**Given**: 두 명의 사용자가 동시에 잔고조회를 요청함
**When**: 요청을 처리하면
**Then**: 각 사용자의 요청이 독립적으로 처리되어야 하며, 데이터가 혼합되지 않아야 한다

### 엣지 케이스 5: 토큰 만료 중 잔고조회

**Given**: 잔고조회 API 호출 중 토큰이 만료됨
**When**: 401 응답을 받으면
**Then**: 기존 auth-middleware.ts의 자동 토큰 갱신 및 재시도 로직이 작동해야 한다

### 엣지 케이스 6: 네트워크 오류

**Given**: 잔고조회 API 호출 중 네트워크 오류가 발생함
**When**: 연결이 실패하면
**Then**: 기존 retry.ts의 지수 백오프로 최대 5회 재시도하고, 최종 실패 시 사용자에게 에러 메시지를 표시해야 한다

### 엣지 케이스 7: 페이지네이션 중 API 오류

**Given**: 3페이지 중 2번째 페이지 요청에서 오류가 발생함
**When**: 재시도도 실패하면
**Then**: 1페이지에서 수집한 데이터를 반환하고, 불완전한 데이터임을 사용자에게 알려야 한다

### 엣지 케이스 8: 수익률 0% 종목

**Given**: 보유 종목의 매입가와 현재가가 동일함
**When**: 수익률을 표시하면
**Then**: "0.00%"로 표시되며, 색상은 기본(검정/회색)이어야 한다

## 성공 기준 (Definition of Done)

### 기능적 완료 기준

#### 잔고조회 API 통합

- [ ] **API 호출**: KIS 잔고조회 API가 올바른 헤더와 파라미터로 호출됨
- [ ] **tr_id 분기**: Production(TTTC8434R)과 Mock(VTTC8434R) 환경이 올바르게 구분됨
- [ ] **페이지네이션**: ctx_area_nk100 기반 자동 연속 조회가 작동함
- [ ] **데이터 변환**: 문자열 응답이 숫자형 TypeScript 객체로 정확히 변환됨

#### 계좌번호 관리

- [ ] **입력 검증**: CANO(8자리 숫자), ACNT_PRDT_CD(2자리 숫자) 형식 검증이 작동함
- [ ] **암호화 저장**: 계좌번호가 AES-256-GCM으로 암호화되어 저장됨
- [ ] **마스킹 표시**: 저장된 계좌번호가 마스킹되어 표시됨 (예: 1234\*\*\*\*)

#### API Route

- [ ] **GET /api/kis/balance**: 전체 잔고 조회가 정상 동작함
- [ ] **GET /api/kis/balance/summary**: 자산 요약만 조회가 정상 동작함
- [ ] **POST /api/kis/account**: 계좌번호 저장이 정상 동작함
- [ ] **GET /api/kis/account**: 마스킹된 계좌번호 조회가 정상 동작함
- [ ] **에러 처리**: 미인증(401), 미설정(400) 에러가 올바르게 반환됨

#### UI 컴포넌트

- [ ] **Settings Page 확장**: 계좌번호 입력 필드가 기존 설정에 영향 없이 추가됨
- [ ] **자산 요약 위젯**: 총평가금액, 손익, 수익률이 올바른 색상과 포맷으로 표시됨
- [ ] **보유종목 페이지**: 8개 컬럼 테이블, 정렬 기능, 빈 상태 처리가 작동함
- [ ] **금액 포맷**: 천 단위 구분자, 원 단위 표시가 일관됨

### 품질 기준 (TRUST 5)

#### Tested (테스트)

- [ ] 모든 시나리오가 Given-When-Then 형식의 테스트로 작성됨
- [ ] 테스트 커버리지가 85% 이상임
- [ ] balance-service.ts 단위 테스트가 통과함
- [ ] API Route 통합 테스트가 통과함
- [ ] UI 컴포넌트 렌더링 테스트가 통과함

#### Readable (가독성)

- [ ] 코드가 ESLint 규칙을 통과함
- [ ] 함수와 변수명이 명확하고 일관됨
- [ ] KIS API 필드명과 매핑 관계가 주석으로 명시됨

#### Unified (통일성)

- [ ] 코드가 Prettier로 포맷팅됨
- [ ] TypeScript strict 모드에서 에러 없음
- [ ] 기존 SPEC-KIS-001 모듈과 동일한 패턴 사용 (Repository, Service)

#### Secured (보안)

- [ ] 계좌번호가 AES-256-GCM으로 암호화 저장됨
- [ ] 로그에 계좌번호가 마스킹됨
- [ ] 잔고 데이터가 클라이언트에 캐싱되지 않음
- [ ] API 응답에 환경 정보 외 인증 정보가 노출되지 않음

#### Trackable (추적 가능성)

- [ ] 모든 잔고조회 API 요청이 request_id와 함께 로그됨
- [ ] Git 커밋 메시지가 SPEC-KIS-002를 참조함
- [ ] 코드 변경이 마일스톤별로 추적 가능함

### 성능 기준

- [ ] **전체 잔고조회**: P95 응답 시간이 3초 미만 (50종목 기준)
- [ ] **자산 요약 조회**: P95 응답 시간이 1초 미만
- [ ] **Rate Limit 준수**: 초당 15건 이하 요청
- [ ] **페이지네이션**: 100종목 기준 5초 이내 전체 수집

### 보안 기준

- [ ] **암호화**: CANO, ACNT_PRDT_CD가 AES-256-GCM으로 암호화됨
- [ ] **마스킹**: API 응답과 로그에서 계좌번호가 마스킹됨
- [ ] **캐싱 금지**: Cache-Control: no-store 헤더 포함
- [ ] **HTTPS 전용**: 모든 KIS API 통신이 HTTPS를 사용함

## 검증 방법

### 자동화된 테스트

1. **단위 테스트** (Vitest):
   - balance-service.ts: API 모킹, 데이터 변환, 페이지네이션
   - account-repository.ts: 암호화/복호화, CRUD
   - format.ts: 금액 포맷팅, 수익률 포맷팅

2. **통합 테스트** (Vitest):
   - API Route 전체 흐름 (인증 -> 잔고조회 -> 응답)
   - 에러 시나리오 (미인증, 미설정, API 실패)

3. **컴포넌트 테스트** (React Testing Library):
   - 자산 요약 위젯 렌더링 및 색상 검증
   - 보유종목 테이블 렌더링 및 정렬
   - Settings Page 계좌번호 입력 검증

### 수동 테스트

1. **KIS Mock 환경**: Mock 환경에서 실제 잔고조회 API 호출 검증
2. **UI 검증**: 각 페이지의 레이아웃, 색상, 포맷팅 육안 확인
3. **반응형 검증**: 모바일/태블릿 해상도에서 테이블 표시 확인
4. **빈 상태 검증**: 미인증, 미설정, 빈 계좌 각 상태 UI 확인

## 승인 절차

1. **개발 완료**: 모든 마일스톤 구현 및 테스트 통과
2. **코드 리뷰**: Backend/Frontend 전문가 리뷰
3. **Mock 환경 테스트**: KIS Mock 환경에서 전체 기능 검증
4. **보안 검증**: 계좌번호 암호화, 로그 마스킹 확인
5. **UI 검수**: 금액 포맷팅, 색상 구분, 레이아웃 확인
