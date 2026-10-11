# 사이트 코드 위치 안내

이 폴더는 사이트 작업의 출발점입니다. 기존 코드는 저장소 최상위의 원래 위치에 있으며 이 폴더로 이동하지 않습니다.

| 위치 | 역할 |
| --- | --- |
| `../app/` | 페이지 라우트와 서버 API |
| `../content/`의 기존 HTML 파일 | 메인·관리자·백업·추천기 화면 |
| `../public/` | 브라우저 JS, CSS, 정적 결제 화면 |
| `../server/` | 테스트 주문·결제 승인·백업 서버 로직 |
| `../db/`, `../drizzle/` | DB 스키마와 마이그레이션 |
| `../lib/`, `../build/`, `../scripts/` | 기존 공통 모듈·Sites 연동·개발 도구 |
| `../tests/` | 기존 기능 검증 |
| `../package.json`, `../vite.config.ts`, `../.openai/hosting.json` | 실행·빌드·Sites 프로젝트 설정 |

실행 방법과 테스트 데이터 범위는 최상위 `README.md`를 참고합니다. 작업 전에 최상위 및 대상 폴더의 `AGENTS.md`를 읽습니다.

- 이 프로젝트: https://soullab-tools.nikaya33.chatgpt.site
- 별도 브랜드 사이트: https://soullab.kr — 이 프로젝트 작업에서 수정하지 않습니다.

이 폴더에는 이 안내 README만 둡니다.
