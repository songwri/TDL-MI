# TDL Trend (Market Intelligence Report)

CL사업부 대상 격주 물류·로봇 Market Intelligence 리포트 생성 도구. 비즈니스 톤, 메일 본문(아웃룩)에 붙여 넣는 형태.

- 흐름: 기사 수집(매일 새벽 01:17·예비 05:43 KST, GitHub Actions) → 웹에서 후보 선정 → 작성 의뢰 저장 → **Claude Code 가 `/write-report` 로 작성**(API 토큰 사용 안 함) → 웹에서 미리보기·복사·발행
- 데이터: 구글 시트가 원본(`STORE_MODE=sheets`) 또는 내 PC(`data/db.json`). 탭: Raw_Articles, Newsletter_Issues, Article_Bodies, Handoffs
- 시트 연결은 무료 Apps Script 방식이 기본(`apps-script/Code.gs`, `SHEETS_WEBAPP_URL/TOKEN`). 구글 클라우드·유료 서비스를 새로 요구하지 않는다. Anthropic API 도 쓰지 않는다
- 생성 규칙(문체·구성·사실 처리): `src/config/report-rules.ts`. 호수 표기 "제N호", 이름·색상: `src/config/brand.ts`
- 통계·인포그래픽은 코드가 계산·렌더링한다. 모델이 숫자를 만들지 않는다. 메일 인포그래픽은 SVG→PNG 이미지(`src/lib/charts/`, 한글 폰트 Pretendard, `/api/charts/...png` 서명 주소)이고, 같은 내용의 표 버전(`src/lib/email/charts.ts`)을 예비로 함께 만든다.
- 문장 속 `**구절**` 은 하이라이트(형광펜). `issueTheme`(이번 호 주제, 맨 위 큰 제목), `teamNote`(에디터의 한마디: 위트+전문성), `keyTakeaway`(한 줄 결론), 테마별 `takeaway`(핵심 한 줄).
- 마크: `src/lib/brand/mark.ts` → `npm run make:mark` → `public/brand/tdl-trend-report.png`(미들웨어 비밀번호 제외). "이번 호 한눈에"·핵심 수치 타일은 쓰지 않는다.
- 수집 본문의 기자 서명·저작권 고지·사이트 UI 문구는 `stripBoilerplate`(`src/lib/utils/text.ts`)로 거른다.
- 템플릿(`src/lib/email/template.ts`)은 뼈대 table + 인라인 스타일. class·div·SVG 금지, 이미지는 인포그래픽에만(width·height·alt 필수).
- 웹 인터랙티브 리포트(`src/components/report/`)는 메일 HTML 과 같은 데이터(ReportContent + ViewerData)를 쓴다. 차트 색은 `src/config/brand.ts` 의 검증된 팔레트(카테고리 색은 항목에 고정, 브랜드 레드는 강조 한 가지에만)
- 물류기술 인텔리전스(`/insights`, 사이드바 대시보드): 최근 근황(첫 화면, 대표 신호 원그래프↔기사 묶음)·기술 포지션 맵(시장 기준 성숙도×관심도 버블, 과거→최근 화살표, 겹침은 relax+실제 위치 점, 사분면 이름은 그래프 밖 위·아래 줄에 고정)·성숙도 곡선(Gartner 평가 아님, 단계는 `classifyStage` 규칙으로 판정하며 신호 위치의 평균을 쓰지 않는다, 점은 곡선 위 실제 위치에 그대로 찍고 옮기지 않는다 — 겹침은 큰 원 아래·작은 원 위 순서와 툴팁의 "같은 자리에 겹침"으로 알리고 이름표는 원 바로 위 수직선상에 성숙도 순서대로 계단처럼 쌓는다)·글로벌 공급사 지도(d3-geo+world-atlas, 본사→공급·적용 국가 경로선)·중국 기업·동종사·흐름·FRED 지표·방법론. 계산 `src/lib/insights/compute.ts`, 설정 `src/config/insights.ts`. 공급사는 `src/config/vendors.ts`(출처·확인 상태 필수, 순위는 근거 있을 때만) + 시트 Vendors 탭(`src/lib/vendors.ts`, 매출·레퍼런스 칸 포함). 외부 리포트(사이드바: Gartner·DHL·McKinsey·MHI·KCCI)는 `EXTERNAL_SOURCES` 에 공개 발표 사실만 날짜·출처와 함께 적고(유료 본문·자동 수집 불가), 수집 기사 속 언급은 자동 집계. 공급사 지도는 왼쪽 나라 목록(선택·마우스 올림이 지도와 연동) + 오른쪽 지도·기업 표, 경로선 없이 국가 색만. 버블 툴팁은 `TipCard`(이름·상태 → 핵심 숫자 3개 → 부가 설명)
- 화면: 상단 메뉴 `SiteHeader`(인사이트 대시보드 / MI 리포트[작성·발행 이력] / 수집 채널 설정), 로고 `BrandMark`/`BrandMarkInline`(TDL LAB 응용, 헤더는 가로형. "by LX Pantos" 문구는 쓰지 않음), 활성 메뉴는 연한 레드 바탕+레드 글씨, 글꼴 Wanted Sans(본문)+Archivo Expanded(영문·숫자). 접속은 로그인 화면+쿠키(`src/lib/auth/session.ts`, 미들웨어), 브라우저 기본 인증 창 금지
- 화면·리포트에 "테크이노베이션팀" 같은 조직명을 쓰지 않는다 (발행 조직명은 `NEWSLETTER_FEEDBACK_CONTACT` 를 넣었을 때만 표시)
- 버블 차트(포지션 맵·성숙도 곡선): SVG 에서 나중에 그린 요소가 앞의 원을 덮으면 마우스가 막힌다. 이름표·선은 원 아래 층에 두고, 묶음은 `pointerEvents="none"` + 원만 `all`, 큰 원 먼저·작은 원 나중 순서로 그린다. 투명 확대 원(halo)은 쓰지 않는다
- 로딩: 인사이트 데이터는 서버 캐시(`src/lib/cache.ts`: 지표 30분·공급사 2분, 기사는 `getAllArticlesSoft` 5분, 오래되면 옛 값을 주고 뒤에서 갱신) + 화면 캐시(`useInsights`, 다른 화면에 다녀와도 유지, 60초) + MI 리포트에서 3초 뒤 미리 받기. `/api/insights` 에 시트 읽기를 더할 때는 반드시 `cached()` 로 감싼다(방문마다 구글 시트를 읽으면 몇 초씩 느려짐). 새로고침 버튼은 `fresh=1`. 세계 지도 데이터는 지도 화면을 열 때만 불러온다(`next/dynamic`)
- 확인: `npm test`, `npm run typecheck`, `npm run lint`
