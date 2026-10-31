# TDL Trend (테크이노베이션 Market Intelligence Report)

CL사업부 대상 격주 물류·로봇 Market Intelligence 리포트 생성 도구. 비즈니스 톤, 메일 본문(아웃룩)에 붙여 넣는 형태.

- 흐름: 기사 수집(매일 08:00, GitHub Actions) → 웹에서 후보 선정 → 작성 의뢰 저장 → **Claude Code 가 `/write-report` 로 작성**(API 토큰 사용 안 함) → 웹에서 미리보기·복사·발행
- 데이터: 구글 시트가 원본(`STORE_MODE=sheets`) 또는 내 PC(`data/db.json`). 탭: Raw_Articles, Newsletter_Issues, Article_Bodies, Handoffs
- 시트 연결은 무료 Apps Script 방식이 기본(`apps-script/Code.gs`, `SHEETS_WEBAPP_URL/TOKEN`). 구글 클라우드·유료 서비스를 새로 요구하지 않는다. Anthropic API 도 쓰지 않는다
- 생성 규칙(문체·구성·사실 처리): `src/config/report-rules.ts`. 호수 표기 "제N호", 이름·색상: `src/config/brand.ts`
- 통계·인포그래픽은 코드가 계산·렌더링한다. 모델이 숫자를 만들지 않는다. 메일 인포그래픽은 SVG→PNG 이미지(`src/lib/charts/`, 한글 폰트 Pretendard, `/api/charts/...png` 서명 주소)이고, 같은 내용의 표 버전(`src/lib/email/charts.ts`)을 예비로 함께 만든다.
- 문장 속 `**구절**` 은 하이라이트(형광펜). `issueTheme`(이번 호 주제, 맨 위 큰 제목), `teamNote`(테크이노베이션팀의 한마디: 위트+전문성), `keyTakeaway`(한 줄 결론), 테마별 `takeaway`(핵심 한 줄).
- 마크: `src/lib/brand/mark.ts` → `npm run make:mark` → `public/brand/tdl-trend-report.png`(미들웨어 비밀번호 제외). "이번 호 한눈에"·핵심 수치 타일은 쓰지 않는다.
- 수집 본문의 기자 서명·저작권 고지·사이트 UI 문구는 `stripBoilerplate`(`src/lib/utils/text.ts`)로 거른다.
- 템플릿(`src/lib/email/template.ts`)은 뼈대 table + 인라인 스타일. class·div·SVG 금지, 이미지는 인포그래픽에만(width·height·alt 필수).
- 웹 인터랙티브 리포트(`src/components/report/`)는 메일 HTML 과 같은 데이터(ReportContent + ViewerData)를 쓴다. 차트 색은 `src/config/brand.ts` 의 검증된 팔레트(카테고리 색은 항목에 고정, 브랜드 레드는 강조 한 가지에만)
- 확인: `npm test`, `npm run typecheck`, `npm run lint`
