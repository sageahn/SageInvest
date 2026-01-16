# SPEC-KIS-001: KIS OpenAPI 인증 시스템 - 인수 기준

## TAG BLOCK

```
TAG: SPEC-KIS-001
TITLE: KIS OpenAPI 인증 시스템
STATUS: Planned
PRIORITY: High
DOMAIN: KIS (Korea Investment & Securities OpenAPI)
```

## 개요

본 문서는 KIS OpenAPI 인증 시스템의 인수 기준(Acceptance Criteria)을 정의합니다. Given-When-Then 형식의 시나리오 기반 테스트를 통해 모든 요구사항이 충족되었는지 검증합니다.

## 테스트 시나리오

### 시나리오 1: 접근토큰발급 API

**Given**: 사용자가 KIS OpenAPI AppKey(36자)와 AppSecret(180자)를 보유하고 있음
**When**: 사용자가 KIS 인증을 초기화하면
**Then**: 시스템은 /oauth2/tokenP 엔드포인트에 POST 요청을 전송해야 한다

---

**Given**: KIS API가 유효한 인증 정보를 수신했음
**When**: 인증 요청이 성공하면
**Then**: access_token, token_type("Bearer"), expires_in, access_token_token_expired가 포함된 응답을 반환해야 한다

---

**Given**: 발급받은 액세스 토큰이 있음
**When**: 토큰을 데이터베이스에 저장하면
**Then**: 토큰은 AES-256으로 암호화되어 PostgreSQL kis_tokens 테이블에 저장되어야 하고, 환경 정보도 함께 저장되어야 한다

---

**Given**: 저장된 토큰이 있음
**When**: 저장된 토큰을 조회하면
**Then**: 복호화된 원본 토큰이 반환되어야 한다

### 시나리오 2: 접속토큰폐기 API

**Given**: 유효한 액세스 토큰이 있음
**When**: 사용자가 KIS 연동을 해제하면
**Then**: 시스템은 /oauth2/revokeP 엔드포인트에 POST 요청을 전송해야 한다

---

**Given**: 토큰 폐기 요청이 성공했음
**When**: 저장된 토큰을 확인하면
**Then**: 해당 토큰의 is_active가 false로 설정되어야 한다

### 시나리오 3: Hashkey 생성

**Given**: POST 요청 본문이 있음
**When**: Hashkey API(/uapi/hashkey)를 호출하면
**Then**: 요청 본문을 JSON 문자열로 변환하여 POST 요청을 전송해야 한다

---

**Given**: Hashkey API가 성공했음
**When**: 응답을 받으면
**Then**: hash 필드가 포함된 응답을 반환해야 한다

---

**Given**: 생성된 hash 값이 있음
**When**: 실제 POST 요청을 전송하면
**Then**: hash 헤더에 생성된 해시값이 포함되어야 한다

### 시나리오 4: 웹소켓 접속키 발급

**Given**: 유효한 액세스 토큰이 있음
**When**: 실시간 데이터에 접속하면
**Then**: 시스템은 /oauth2/Approval 엔드포인트에 POST 요청을 전송해야 한다

---

**Given**: 웹소켓 접속키 발급이 성공했음
**When**: 응답을 받으면
**Then**: approval_key 필드가 포함된 응답을 반환해야 한다

### 시나리오 5: 환경 관리 (Mock/Production)

**Given**: 사용자가 Mock 환경을 선택했음
**When**: API 요청을 전송하면
**Then**: https://openapivts.koreainvestment.com:29443 도메인을 사용해야 한다

---

**Given**: 사용자가 Production 환경을 선택했음
**When**: API 요청을 전송하면
**Then**: https://openapi.koreainvestment.com:9443 도메인을 사용해야 한다

---

**Given**: 사용자가 Settings Page에서 환경을 전환했음
**When**: 환경을 저장하면
**Then**: kis_configs 테이블의 environment 필드가 업데이트되어야 한다

---

**Given**: 사용자가 연결 테스트 버튼을 클릭했음
**When**: 선택된 환경으로 연결 테스트를 수행하면
**Then**: 접근토큰발급 API를 호출하여 성공/실패 결과를 표시해야 한다

### 시나리오 6: Settings Page UI

**Given**: 사용자가 Settings Page에 접속했음
**When**: 페이지를 렌더링하면
**Then**: AppKey 입력 필드(36자), AppSecret 입력 필드(180자, password type), 환경 선택(select), 연결 테스트 버튼, 저장 버튼이 표시되어야 한다

---

**Given**: AppKey(36자), AppSecret(180자), 환경을 입력했음
**When**: 저장 버튼을 클릭하면
**Then**: 암호화된 정보가 데이터베이스에 저장되어야 한다

---

**Given**: Mock 환경을 선택하고 연결 테스트 버튼을 클릭했음
**When**: 연결 테스트가 완료되면
**Then**: Mock 환경으로 접근토큰발급 API를 호출하고 성공/실패 메시지를 표시해야 한다

---

**Given**: 유효하지 않은 AppSecret(179자)을 입력했음
**When**: 저장 버튼을 클릭하면
**Then**: "AppSecret은 180자여야 합니다" 오류 메시지를 표시해야 한다

### 시나리오 7: Dashboard Widget - 연결 상태

**Given**: 유효한 토큰이 있음
**When**: Dashboard Widget을 렌더링하면
**Then**: "Connected" 상태(녹색)이 표시되어야 한다

---

**Given**: 토큰이 없음
**When**: Dashboard Widget을 렌더링하면
**Then**: "Disconnected" 상태(회색)이 표시되고 "KIS 연동하기" 버튼이 표시되어야 한다

---

**Given**: 토큰이 만료됨
**When**: Dashboard Widget을 렌더링하면
**Then**: "Expired" 상태(빨간색)이 표시되어야 한다

### 시나리오 8: Dashboard Widget - 토큰 만료 카운트다운

**Given**: 토큰 만료까지 30분 남음
**When**: Dashboard Widget을 렌더링하면
**Then**: "남은 시간: 0:30:00" 카운트다운이 표시되어야 한다

---

**Given**: 토큰 만료까지 2시간 남음
**When**: Dashboard Widget을 렌더링하면
**Then**: 카운트다운이 표시되지 않아야 한다 (1시간 이하일 때만 표시)

---

**Given**: 토큰 만료까지 5분 남음
**When**: 카운트다운이 진행되면
**Then**: "남은 시간: 0:05:00", "0:04:59", "0:04:58" ... 실시간으로 업데이트되어야 한다

---

**Given**: 토큰이 만료됨
**When**: 카운트다운을 확인하면
**Then**: "만료됨" 메시지가 표시되어야 하고, 상태가 "Expired"(빨간색)로 변경되어야 한다

### 시나리오 9: Authentication Page

**Given**: 사용자가 Authentication Page에 접속했음
**When**: 페이지를 렌더링하면
**Then**: AppKey/AppSecret 입력 폼, 인증 진행 상태, 현재 연결 정보, 환경 전환 기능, 토큰 갱신 버튼이 표시되어야 한다

---

**Given**: 사용자가 인증을 시작했음
**When**: 인증이 진행 중이면
**Then**: "인증 진행 중..." 메시지가 표시되어야 한다

---

**Given**: 인증이 성공했음
**When**: 인증 완료 메시지를 표시하면
**Then**: "KIS 인증이 완료되었습니다" 메시지와 토큰 정보(만료 시간, 마지막 갱신 시간, 연결된 환경)가 표시되어야 한다

---

**Given**: 사용자가 환경 전환 버튼을 클릭했음
**When**: 환경을 변경하면
**Then**: 이전 토큰이 폐기되고 새 환경으로 토큰이 발급되어야 한다

---

**Given**: 사용자가 토큰 갱신 버튼을 클릭했음
**When**: 토큰 갱신을 수행하면
**Then**: 새 토큰이 발급되고 "마지막 갱신 시간"이 현재 시간으로 업데이트되어야 한다

### 시나리오 10: 자동 토큰 갱신

**Given**: 액세스 토큰이 만료되기 1시간 전임
**When**: 토큰 갱신 스케줄러가 실행되면
**Then**: 시스템은 /oauth2/tokenP API를 호출하여 자동으로 액세스 토큰을 갱신해야 한다

---

**Given**: 갱신된 액세스 토큰을 받음
**When**: 새 토큰을 저장하면
**Then**: 데이터베이스의 토큰 정보가 갱신되어야 하고, updated_at 타임스탬프가 현재 시간으로 업데이트되어야 한다

---

**Given**: API 요청 중에 401 Unauthorized 응답을 받음
**When**: 인증 미들웨어가 401을 감지하면
**Then**: 토큰을 갱신하고 원래 요청을 재시도해야 한다

---

**Given**: 토큰 갱신이 성공함
**When**: 재시도된 요청을 전송하면
**Then**: 새 토큰으로 요청이 성공해야 한다

### 시나리오 11: API 요청 인증 헤더 추가

**Given**: 유효한 액세스 토큰이 있음
**When**: KIS API 엔드포인트에 GET 요청을 전송하면
**Then**: 요청 헤더에 `Authorization: Bearer {access_token}`이 포함되어야 한다

---

**Given**: KIS API에 POST 요청을 보냄
**When**: 요청을 전송하기 전에
**Then**: Hashkey API를 호출하여 hash를 생성하고 hash 헤더를 포함해야 한다

---

**Given**: 인증되지 않은 API 요청임
**When**: 인증 미들웨어가 요청을 가로채면
**Then**: 자동으로 인증 헤더를 추가하고 요청을 전달해야 한다

### 시나리오 12: API 로깅

**Given**: KIS API 요청을 전송함
**When**: 요청이 전송되면
**Then**: 요청 URL, 메서드, 타임스탬프, 요청 ID, 환경이 kis_api_logs 테이블에 기록되어야 한다

---

**Given**: API 응답을 받음
**When**: 응답 로그를 기록하면
**Then**: 상태 코드, 응답 시간(latency), 성공 여부가 기록되어야 한다

---

**Given**: 로그에 민감한 정보가 포함된 요청임
**When**: 로그를 기록하면
**Then**: AppSecret, 액세스 토큰 등 민감 정보는 `***MASKED***`로 마스킹되어야 한다

---

**Given**: 여러 API 요청이 수행됨
**When**: 로그를 쿼리하면
**Then**: 요청 ID를 통해 요청-응답 쌍을 추적할 수 있어야 하고, 환경별로 필터링할 수 있어야 한다

### 시나리오 13: 재시도 정책

**Given**: API 요청이 네트워크 오류(ECONNRESET)로 실패함
**When**: 재시도 로직이 실행되면
**Then**: 1초 후 첫 번째 재시도를 수행해야 한다

---

**Given**: 첫 번째 재시도가 실패함
**When**: 두 번째 재시도를 수행하면
**Then**: 2초 후(지수 백오프) 재시도해야 한다

---

**Given**: API 요청이 429 Too Many Requests 응답을 받음
**When**: 429 응답을 처리하면
**Then**: Retry-After 헤더가 있으면 그 시간만큼 대기하고, 없으면 60초 후 재시도해야 한다

---

**Given**: API 요청이 5회 연속 실패함
**When**: 최대 재시도 횟수에 도달하면
**Then**: 재시도를 중단하고 상세 에러 메시지를 반환해야 한다

---

**Given**: 최대 재시도 실패가 발생함
**When**: 실패를 기록하면
**Then**: 로그에 실패 사유를 기록하고 관리자에게 알림을 발송해야 한다

### 시나리오 14: 속도 제한 준수

**Given**: KIS API 속도 제한이 분당 100회임
**When**: 1분 내에 100회의 요청을 수행하면
**Then**: 101번째 요청은 큐에 대기시키거나 지연시켜야 한다

---

**Given**: 속도 제한에 근접함
**When**: 요청 속도를 모니터링하면
**Then**: 속도 제한에 도달하기 전에 경고를 로그에 기록해야 한다

## 엣지 케이스

### 엣지 케이스 1: 토큰 갱신 실패

**Given**: 액세스 토큰이 만료됨
**When**: 토큰 갱신을 시도하면
**Then**: 사용자에게 재인증이 필요하다는 메시지를 표시해야 한다

---

**Given**: 토큰 갱신 중 KIS API가 다운됨
**When**: 갱신 요청이 실패하면
**Then**: 로그에 실패를 기록하고, 다음 스케줄 시점에 재시도해야 한다

### 엣지 케이스 2: 잘못된 AppKey/AppSecret 길이

**Given**: 사용자가 35자 AppKey를 입력했음
**When**: 저장 버튼을 클릭하면
**Then**: "AppKey는 36자여야 합니다" 오류 메시지를 표시해야 한다

---

**Given**: 사용자가 181자 AppSecret을 입력했음
**When**: 저장 버튼을 클릭하면
**Then**: "AppSecret은 180자여야 합니다" 오류 메시지를 표시해야 한다

### 엣지 케이스 3: 로깅 오류

**Given**: API 요청이 성공함
**When**: 로그 기록이 실패하면
**Then**: API 응답은 정상적으로 반환되어야 하고, 로그 오류는 별도로 기록해야 한다

---

**Given**: 로그 데이터베이스 연결이 끊김
**When**: 로그를 기록하려고 하면
**Then**: API 요청은 차단되지 않고, 로그는 메모리에 버퍼링되어야 한다

### 엣지 케이스 4: 암호화 실패

**Given**: 토큰 암호화 중 오류 발생
**When**: 암호화가 실패하면
**Then**: 토큰을 저장하지 않고 사용자에게 보안 경고를 표시해야 한다

---

**Given**: 암호화 키가 환경 변수에 없음
**When**: 애플리케이션이 시작되면
**Then**: 시작을 거부하고 `KIS_ENCRYPTION_KEY` 환경 변수 설정을 요구해야 한다

### 엣지 케이스 5: 환경 전환 중 토큰 갱신

**Given**: 사용자가 환경을 전환하는 중에 토큰 갱신이 시도됨
**When**: 환경 전환이 완료되면
**Then**: 이전 환경의 토큰이 폐기되고 새 환경의 토큰이 발급되어야 한다

### 엣지 케이스 6: 동시 요청 경쟁 조건

**Given**: 두 개의 API 요청이 동시에 만료된 토큰을 사용함
**When**: 두 요청이 모두 401을 받고 토큰 갱신을 시도하면
**Then**: 첫 번째 요청만 갱신을 수행하고, 두 번째 요청은 갱신된 토큰을 재사용해야 한다 (Race Condition 방지)

### 엣지 케이스 7: Hashkey 생성 실패

**Given**: POST 요청을 전송해야 함
**When**: Hashkey API 호출이 실패하면
**Then**: POST 요청을 중단하고 "Hashkey 생성 실패" 오류를 표시해야 한다

## 성공 기준 (Definition of Done)

### 기능적 완료 기준

#### KIS API 엔드포인트

- [ ] **접근토큰발급**: /oauth2/tokenP API가 정상적으로 작동함
- [ ] **접속토큰폐기**: /oauth2/revokeP API가 정상적으로 작동함
- [ ] **Hashkey**: /uapi/hashkey API가 정상적으로 작동함
- [ ] **웹소켓 접속키**: /oauth2/Approval API가 정상적으로 작동함

#### 환경 관리

- [ ] **환경 전환**: Mock/Production 환경 전환이 작동함
- [ ] **API 도메인**: 선택된 환경에 맞는 API 도메인을 사용함
- [ ] **연결 테스트**: Settings Page에서 연결 테스트가 작동함

#### 토큰 관리

- [ ] **토큰 발급**: 액세스 토큰 발급이 정상적으로 작동함
- [ ] **토큰 갱신**: 만료 1시간 전에 자동 갱신이 수행됨
- [ ] **토큰 저장**: 토큰이 암호화되어 PostgreSQL에 저장됨

#### API 요청

- [ ] **인증 헤더**: 모든 API 요청에 Authorization 헤더가 추가됨
- [ ] **Hashkey**: POST 요청에 hash 헤더가 포함됨
- [ ] **재시도**: 실패 요청이 지수 백오프로 재시도됨

#### 로깅

- [ ] **요청 로깅**: 모든 KIS API 요청이 로그에 기록됨
- [ ] **마스킹**: 민감 정보가 로그에서 마스킹됨
- [ ] **환경별**: 환경별 로그가 구분됨

#### UI 컴포넌트

- [ ] **Settings Page**: AppKey/AppSecret 입력, 환경 선택, 연결 테스트가 작동함
- [ ] **Dashboard Widget**: 연결 상태, 카운트다운이 정확하게 표시됨
- [ ] **Authentication Page**: OAuth 인증 흐름, 연결 관리가 작동함

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

- [ ] 모든 토큰이 AES-256으로 암호화됨
- [ ] 로그에 민감 정보가 포함되지 않음
- [ ] OWASP Top 10 보안 취약점이 없음
- [ ] 환경 변수로 암호화 키를 관리함

#### Trackable (추적 가능성)

- [ ] 모든 API 요청에 고유 요청 ID가 있음
- [ ] 로그를 통해 요청 추적이 가능함
- [ ] Git 커밋 메시지가 명확함

### 성능 기준

- [ ] **응답 시간**: API 요청의 P95 응답 시간이 2초 미만임
- [ ] **토큰 발급**: 토큰 발급이 1초 이내에 완료됨
- [ ] **Hashkey 생성**: Hashkey 생성이 500ms 이내에 완료됨
- [ ] **동시성**: 100개의 동시 요청을 처리할 수 있음

### UI 기준

- [ ] **Settings Page**: AppKey(36자), AppSecret(180자) 입력 필드가 정확함
- [ ] **환경 선택**: Production/Mock 선택이 명확함
- [ ] **연결 상태**: Connected(녹색), Disconnected(회색), Expired(빨간색) 표시가 정확함
- [ ] **카운트다운**: 만료 1시간 이하일 때 실시간 카운트다운이 작동함

### 보안 기준

- [ ] **암호화**: 모든 인증 정보가 AES-256-GCM으로 암호화됨
- [ ] **HTTPS**: 모든 API 통신이 HTTPS를 사용함
- [ ] **로깅 보안**: 민감 정보(AppSecret, 액세스 토큰)가 로그에 포함되지 않음
- [ ] **키 관리**: 암호화 키가 환경 변수로 안전하게 관리됨
- [ ] **길이 검증**: AppKey(36자), AppSecret(180자) 길이 검증이 수행됨

## 검증 방법

### 자동화된 테스트

1. **단위 테스트**: Vitest 또는 Jest로 각 모듈 테스트
   - KIS API 클라이언트 테스트
   - Hashkey 생성 테스트
   - 환경 관리 테스트
   - 암호화/복호화 테스트

2. **통합 테스트**: KIS API 모킹으로 전체 흐름 테스트
   - 토큰 발급/갱신/폐기 흐름
   - 환경 전환 흐름
   - UI 컴포넌트 통합 테스트

3. **E2E 테스트**: Playwright로 실제 사용자 시나리오 테스트
   - Settings Page에서 인증 설정
   - Dashboard Widget 상태 확인
   - Authentication Page 인증 흐름

### 수동 테스트

1. **KIS Mock 환경**: KIS OpenAPI Mock 환경에서 실제 인증 테스트
2. **환경 전환**: Mock ↔ Production 전환 테스트 (Production은 테스트 계정 사용)
3. **UI 테스트**: 각 UI 컴포넌트의 사용자 경험 테스트
4. **모니터링 대시보드**: 로그 및 메트릭 확인

### 보안 감사

1. **코드 리뷰**: Security 전문가에 의한 코드 리뷰
2. **취약점 스캔**: OWASP ZAP 또는 similar 도구로 스캔
3. **Penetration Testing**: 선택사항, 전문 펜트레스팅

## 승인 절차

1. **개발 완료**: 모든 기능이 구현되고 테스트 통과
2. **코드 리뷰**: Backend, Frontend, Security 전문가 리뷰
3. **QA 테스트**: QA 팀에 의한 테스트 수행
4. **보안 감사**: Security 취약점 점검
5. **사용자 테스트**: 실제 사용자에 의한 UI 테스트
6. **프로덕션 배포**: 스테이징 환경에서 최종 검증 후 배포
