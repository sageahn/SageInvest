# SageInvest 프로젝트 구조

## 디렉토리 트리

```
SageInvest/
├── .claude/                    # Claude Code 설정
│   ├── skills/                 # 프로젝트 전용 Skills
│   ├── hooks/                  # 이벤트 후크
│   ├── settings.json           # Claude Code 설정
│   └── settings.local.json     # 로컬 설정 (Git 제외)
│
├── .github/                    # GitHub 워크플로우
│   └── workflows/              # CI/CD 파이프라인
│
├── .moai/                      # MoAI-ADK 설정
│   ├── announcements/          # 다국어 공지사항
│   ├── config/                 # 프로젝트 구성
│   │   ├── sections/
│   │   │   ├── user.yaml       # 사용자 정보
│   │   │   └── language.yaml   # 언어 설정
│   ├── llm-configs/            # LLM 모델 설정
│   ├── memory/                 # 프로젝트 메모리
│   ├── project/                # 프로젝트 문서
│   │   ├── product.md          # 제품 개요
│   │   ├── structure.md        # 구조 문서 (본 파일)
│   │   └── tech.md             # 기술 스택 문서
│   ├── reports/                # 자동화된 보고서
│   └── specs/                  # SPEC 문서 저장소
│       └── SPEC-XXX/
│           └── spec.md
│
├── CLAUDE.md                   # Alfred 실행 지침
├── .gitignore                  # Git 제외 파일
└── .mcp.json                   # MCP 서버 설정
```

## 주요 디렉토리 설명

### `.claude/` - Claude Code 설정

Claude Code의 동작을 제어하는 설정 파일과 프로젝트 전용 Skills, Hooks를 포함합니다.

- **skills/**: 프로젝트 특화 Skills (최대 500줄)
- **hooks/**: PreToolUse, PostToolUse 등 이벤트 후크
- **settings.json**: Claude Code 기본 설정
- **settings.local.json**: 로컬 환경 설정 (Git 추적 제외)

### `.github/` - GitHub 설정

GitHub Actions 워크플로우와 관련 설정을 포함합니다.

- **workflows/**: CI/CD 파이프라인 정의
- 자동화된 테스트, 빌드, 배포 설정

### `.moai/` - MoAI-ADK 코어

MoAI-ADK 프레임워크의 핵심 설정과 문서를 관리합니다.

| 하위 디렉토리 | 용도 |
|--------------|------|
| `announcements/` | 다국어 공지사항 (ko, en, ja, zh) |
| `config/` | 프로젝트 구성 섹션 |
| `llm-configs/` | LLM 모델별 설정 |
| `memory/` | 프로젝트 장기 메모리 |
| `project/` | 프로젝트 문서 (product, structure, tech) |
| `reports/` | 품질 보고서 및 분석 |
| `specs/` | EARS 형식 SPEC 문서 |

### `.moai/config/sections/` - 구성 섹션

프로젝트의 핵심 설정을 YAML 형식으로 관리합니다.

- **user.yaml**: 사용자 이름, 역할 등
- **language.yaml**: 대화 언어, 코드 주석 언어, Git 메시지 언어

### `.moai/specs/` - SPEC 문서 저장소

EARS 형식으로 작성된 요구사항 명세서를 저장합니다.

```
specs/
├── SPEC-001/
│   └── spec.md        # 첫 번째 기능 명세
├── SPEC-002/
│   └── spec.md        # 두 번째 기능 명세
└── ...
```

## 주요 파일 위치

| 파일 | 경로 | 용도 |
|------|------|------|
| Alfred 지침 | `/CLAUDE.md` | 오케스트레이션 규칙 |
| 사용자 설정 | `/.moai/config/sections/user.yaml` | 사용자 정보 |
| 언어 설정 | `/.moai/config/sections/language.yaml` | 언어 구성 |
| 제품 문서 | `/.moai/project/product.md` | 제품 개요 |
| 구조 문서 | `/.moai/project/structure.md` | 프로젝트 구조 (본 파일) |
| 기술 문서 | `/.moai/project/tech.md` | 기술 스택 |
| MCP 설정 | `/.mcp.json` | MCP 서버 연결 |

## 확장 예정 디렉토리

다음 단계에서 다음 디렉토리들이 추가될 예정입니다:

```
SageInvest/
├── src/                    # 소스 코드
│   ├── app/               # Next.js App Router
│   ├── components/        # React 컴포넌트
│   ├── lib/               # 유틸리티 라이브러리
│   └── styles/            # 스타일 시트
│
├── tests/                  # 테스트 코드
├── docs/                   # 문서 사이트
└── public/                 # 정적 assets
```

---

*이 문서는 MoAI-ADK의 workflow-docs에 의해 자동 생성되었습니다.*
