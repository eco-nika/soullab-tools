# Soul;Lab Tools

소울랩의 출강 문의 회신 작성기, 토스페이먼츠 테스트 결제, 테스트 주문 관리·백업, 직무별 AI 프롬프트 추천기입니다.

- 사이트: https://soullab-tools.nikaya33.chatgpt.site
- 무료 프롬프트 추천기: `/prompts`
- 주문 관리: `/admin`
- CSV·JSON 백업: `/admin/backup`
- 테스트 스토어: `/#store`

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
