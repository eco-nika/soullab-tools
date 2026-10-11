# Soul;Lab Tools

소울랩의 출강 문의 회신 작성기, 토스페이먼츠 테스트 결제, 테스트 주문 관리·백업, 직무별 AI 프롬프트 추천기입니다.

- 사이트: https://soullab-tools.nikaya33.chatgpt.site
- 무료 프롬프트 추천기: `/prompts`
- 주문 관리: `/admin`
- CSV·JSON 백업: `/admin/backup`
- 테스트 스토어: `/#store`
- 소울랩 안내 챗봇: `/chat`
- 지식 임베딩 확인: `/admin/embeddings`
- 학습 목표·피드백 예제: `/admin/learning`

## 테스트 데이터 전용

관리자·백업 화면은 강의 과제 확인을 위해 로그인 없이 공개되어 있습니다. 실제 고객 데이터나 실결제 운영 용도로 사용하지 마세요. 결제는 테스트 키만 허용하며, PDF 파일을 판매·전달하는 기능은 포함하지 않습니다.

출강 문의 입력은 브라우저 메모리에서만 처리합니다. 주문 DB와 분리되어 있으며 저장하거나 전송하지 않습니다.

## DB와 백업 범위

Cloudflare D1의 `test_orders` 테이블에는 다음 다섯 컬럼만 있습니다.

| 컬럼 | 내용 |
| --- | --- |
| `order_id` | 테스트 주문번호, 기본키 |
| `product_name` | 상품명 |
| `amount` | 금액, 19,000원으로 고정 |
| `status` | READY / DONE / FAILED / CANCELED / UNKNOWN |
| `recorded_at` | 상태 기록 시각, UTC ISO 8601 |

이름·이메일·연락처·카드 정보·결제 키는 테이블과 백업에 없습니다. 결제 키는 승인 요청 처리 중 메모리에서만 사용합니다. 서버의 비밀번호·API 키·환경변수도 백업하지 않습니다. CSV와 JSON은 명시된 다섯 필드를 허용 목록으로 선택합니다. CSV는 Excel용 UTF-8 BOM과 수식 실행 방지 처리를 포함합니다.

- `[샘플 주문 3건 넣기]`: 고정된 가상 주문 3건을 DB에 저장합니다. 반복 실행해도 중복되지 않습니다.
- `[백업]`: 같은 데이터 스냅샷의 CSV·JSON 다운로드를 시작합니다. 브라우저가 여러 파일 다운로드를 막으면 나타난 개별 링크로 내려받으세요.
- 데이터가 없어도 헤더만 있는 CSV와 빈 배열 JSON을 받을 수 있습니다.
- 결제창을 닫고 복귀하지 않은 주문은 READY로 남을 수 있습니다. DONE은 서버에서 토스 승인 상태·주문·금액을 확인한 경우에만 기록합니다.

## 실행과 확인

Node.js 22.13 이상과 npm을 사용합니다.

```sh
npm ci
npm run dev
node --test tests/*.test.mjs
npm run build
```

Sites 게시 환경은 `.openai/hosting.json`의 `DB` 바인딩을 프로비저닝하고 `drizzle/`의 마이그레이션을 적용합니다. 로컬 DB와 게시된 DB는 별개입니다. 스키마를 바꾸면 `npm run db:generate`로 새 마이그레이션을 만들고 기존 적용 파일은 변경하지 않습니다.

## 환경변수와 비밀값

결제용 환경변수 이름은 `TOSS_CLIENT_KEY`, `TOSS_SECRET_KEY`, `ORDER_SIGNING_SECRET`입니다. 값은 저장소에 없습니다. Sites의 서버 런타임 환경변수에서 설정하며 시크릿 키와 서명 키는 secret으로 저장합니다. 클라이언트 키만 결제 준비 API에서 브라우저에 반환합니다.

`.env*`, `.dev.vars*`, 개인키, 자격증명 파일, 로컬 DB, 백업 파일, 의존성과 빌드 산출물은 `.gitignore`로 제외합니다. 테스트 코드의 인공 값은 실제 서비스 자격증명이 아닙니다.

## 결제 문서

공식 연동 흐름: https://docs.tosspayments.com/guides/v2/payment-window/integration

테스트 전용 결제 모듈은 라이브 키를 거부합니다. 운영 결제로 전환하려면 별도의 보안·인증·주문 관리 설계가 필요합니다.

## v0.2 · 직무별 AI 프롬프트 추천기

`feature/prompt-recommender` 브랜치를 별도 Git worktree에서 개발하고 main에 병합했습니다. 병합 커밋의 태그는 `v0.2-prompt-recommender`입니다.

광고·방송·IT 기획·소상공인 4개 직무와 각각 3개 과제(총 12개 조합)를 제공합니다. 조합마다 첫 초안, 검토·개선, 상황별 변형의 프롬프트 3개(총 36개)를 추천하고 복사할 수 있습니다. 외부 AI API 없이 브라우저에서 템플릿을 조합하며, 사용자 정보를 저장하지 않습니다. 첫 페이지와 PDF 테스트 스토어를 연결합니다.

```sh
git worktree add -b feature/prompt-recommender ../soullab-prompt-recommender
# 별도 작업 디렉터리에서 개발·커밋
git merge --no-ff feature/prompt-recommender -m "Merge feature/prompt-recommender: launch free job-based AI prompt recommender (v0.2)"
git tag -a v0.2-prompt-recommender -m "v0.2: launch free job-based AI prompt recommender"
```

## 지식 임베딩·학습 데이터·검색 챗봇

실행 환경과 Sites 런타임에 OpenAI API 키가 설정되어 있지 않아, 실제 사용 방식은 `local-hash-ko-word-char-ngram-v1`입니다. 512차원 로컬 해싱 벡터이며 OpenAI 임베딩이나 학습된 신경망 모델이 아닙니다. 단어와 글자 2·3그램의 빈도를 FNV-1a 해시 버킷에 넣고 로그 가중치·L2 정규화를 적용합니다. 해시 충돌과 동의어 검색의 한계가 있습니다.

- 원천: `brand/identity.md`, `voice.md`, `audience.md`, `content.md`, `server/products.json`의 상품 4개.
- `node scripts/prepare-knowledge.mjs`: 문단·표 행 단위로 분리하고 변경 기록을 제외해 `server/knowledge-data.json`을 재생성합니다. 현재 30개 문단입니다. `npm run build` 전에 자동 실행합니다.
- `knowledge_embeddings`: `id, source, title, chunk, model, dims, embedding, created_at`. 벡터는 JSON 숫자 배열로 저장합니다.
- D1은 SQLite이므로 별도 스키마 대신 `agent_learning_` 접두어를 사용합니다. `agent_learning_goals`, `agent_learning_feedback`, `agent_learning_feedback_embeddings`를 외래키로 연결했습니다.
- 목표 1개와 피드백 5개는 가상 테스트 데이터입니다. 실제 사용자 피드백이나 실제 성과 지표가 아닙니다. 목표에도 벡터를 저장하고, 피드백 벡터는 글 초안·평가·이유를 함께 벡터화합니다. 모델 재학습·자동 승격 기능은 없습니다.
- 스키마만 Drizzle 마이그레이션으로 적용합니다. 공개 지식과 고정 샘플은 첫 홈페이지·새 페이지·지식 API 요청에서 서버가 멱등하게 DB에 저장합니다. 실패하면 다음 요청에서 재시도합니다. 샘플 등록으로 기존 주문은 바꾸지 않습니다.
- `/admin/embeddings`, `/admin/learning`은 DB를 읽어 모델·차원·목록·벡터 앞 5개 값을 표시합니다. 학습 화면은 로그인 없는 테스트 데이터 전용 읽기 화면입니다. 향후 실제 피드백 입력 기능에는 별도의 접근 제어가 필요합니다.
- `/api/chat`은 질문을 같은 방식으로 벡터화하고, 이번 빌드의 문단 ID에 해당하는 DB 벡터와 코사인 유사도를 비교해 상위 3개를 반환합니다. 외부 LLM은 사용하지 않습니다. 검색된 원문과 출처를 제시하며, 근거가 약하면 불확실함을 표시합니다. 유사도는 정답 확률이 아닙니다.
- 채팅 질문은 검색 요청 처리 중 메모리에서만 사용합니다. 앱의 DB·파일·로그·브라우저 저장소에 기록하지 않으며, 외부 AI 서비스에 전송하지 않습니다. 요청은 POST 본문, 응답은 `Cache-Control: no-store`를 사용합니다. 페이지 이탈·새로고침 시 화면 내용을 지웁니다. 호스팅 플랫폼 자체의 운영 로그 정책과는 별개입니다.
- 기존 주문 백업의 다섯 필드 허용 목록은 유지합니다. 환경변수나 결제 비밀값을 임베딩·학습 자료·챗봇 답변에 포함하지 않습니다.

검증: `node scripts/prepare-knowledge.mjs --check`와 `node --test tests/*.test.mjs`. 실제 SQLite 스키마·벡터 저장·중복 방지·상품 근거 검색·범위 밖 질문·채팅 비저장을 확인합니다.

## 공통 피드백·자가 개선 구조 (소스 준비, 운영 미배포)

`AGENTS.md` → [작업 인계](docs/learning/HANDOFF.md) → [운영 규약](docs/learning/PROTOCOL.md)을 읽습니다. GitHub는 코드·기준·인계 원본, Sites D1은 선별 결과·피드백·학습 이력 원본입니다. 기존 예제와 별도로 `agent_learning_records`와 인증된 `/api/agent-learning`, `/mcp`를 추가했습니다. 단순 저장·검색을 실제 반영·성과 개선으로 표시하지 않습니다.

검증: `node --test tests/*.test.mjs`. 도구 공통 실행기는 `automation/learning/client.mjs`, GitHub 최신성 확인은 `automation/learning/source-status.mjs`입니다. 현재 작업은 사이트를 재게시하지 않으므로 새 경로·마이그레이션·비밀 설정·MCP 연결은 후속 운영 적용 대상입니다. [전후 점검](docs/learning/AUDIT-2026-10-12.md)을 참고하세요.
