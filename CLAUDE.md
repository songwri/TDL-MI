# TDL Trend (테크이노베이션 Market Intelligence Report)

CL사업부 대상 격주 물류·로봇 Market Intelligence 리포트 생성 도구. 비즈니스 톤, 메일 본문(아웃룩)에 붙여 넣는 형태.

- 흐름: 기사 수집(매일 08:00, GitHub Actions) → 웹에서 후보 선정 → 작성 의뢰 저장 → **Claude Code 가 `/write-report` 로 작성**(API 토큰 사용 안 함) → 웹에서 미리보기·복사·발행
- 데이터: 구글 시트가 원본(`STORE_MODE=sheets`) 또는 내 PC(`data/db.json`). 탭: Raw_Articles, Newsletter_Issues, Article_Bodies, Handoffs
- 시트 연결은 무료 Apps Script 방식이 기본(`apps-script/Code.gs`, `SHEETS_WEBAPP_URL/TOKEN`). 구글 클라우드·유료 서비스를 새로 요구하지 않는다. Anthropic API 도 쓰지 않는다
- 생성 규칙(문체·구성·사실 처리): `src/config/report-rules.ts`. 호수 표기 "제N호", 이름·색상: `src/config/brand.ts`
- 통계·인포그래픽은 코드가 계산·렌더링(`src/lib/report/stats.ts`, `src/lib/email/charts.ts`). 아웃룩 호환을 위해 이미지·SVG 없이 표(table)로 그린다. 모델이 숫자를 만들지 않는다.
- 템플릿(`src/lib/email/template.ts`)은 table + 인라인 스타일만 사용. 이미지·class·div 금지.
- 웹 인터랙티브 리포트(`src/components/report/`)는 메일 HTML 과 같은 데이터(ReportContent + ViewerData)를 쓴다. 차트 색은 `src/config/brand.ts` 의 검증된 팔레트(카테고리 색은 항목에 고정, 브랜드 레드는 강조 한 가지에만)
- 확인: `npm test`, `npm run typecheck`, `npm run lint`
