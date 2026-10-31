# TDL Trend: 테크이노베이션 Market Intelligence Report

CL사업부 대상 격주 물류·로봇 Market Intelligence 리포트 생성 도구입니다.
매일 아침 국내외 뉴스를 수집하고, 2주치 기사에서 후보를 골라 웹에서 선정하면, 선정한 기사 여러 건을 **주제별로 묶어 인사이트를 뽑은 기사형 리포트**(제N호)를 만듭니다. 통계 인포그래픽과 원문 링크가 포함되고, **메일 본문에 그대로 붙여 넣을 수 있는** 형태입니다.

> **웹으로 운영하려면(전부 무료)** [`docs/DEPLOY.md`](docs/DEPLOY.md): 구글 시트를 유일한 원본으로 쓰고(Apps Script 연결, 구글 클라우드 불필요), Vercel 또는 Render 무료 플랜에 웹을 올리고, GitHub Actions가 매일 08:00(한국시간)에 기사를 수집합니다.

## 흐름

```
[GitHub Actions 매일 08:00]  뉴스 수집 ─▶ 구글 시트 Raw_Articles
[웹]  최근 2주 기사에서 후보 선정(체크) · 기획 의도 입력 · 📝 작성 의뢰 저장 ─▶ 시트 Handoffs
[Claude Code]  /write-report N  ─ 의뢰서·통계·지난 호 이력을 읽고 리포트 작성 ─▶ 시트 Handoffs
[웹]  작성본 불러오기 ─▶ 미리보기·편집 ─▶ 📋 메일 본문용 복사(아웃룩에 Ctrl+V) ─▶ ✅ 발행 확정 ─▶ 시트 Newsletter_Issues
```

- API 토큰을 쓰지 않습니다. 글쓰기는 Claude Code가 합니다(Claude 대화창에 의뢰서를 붙여넣는 방식도 가능).
- 발행하면 기사에 `발행(제N호)`가 기록되어, 이후 선정 때 "제2호에서 다룬 AutoStore의 후속 기사" 같은 태그가 붙고 추세 통계에 반영됩니다.

## 리포트 구성 (제N호)

| 섹션 | 내용 |
|---|---|
| 헤더 | 테크이노베이션팀 · TDL Trend 제N호 · 발행일 · 배포 대상 · 제목 |
| 핵심 요약 | 결론 먼저, 3~5개 |
| 이번 호 한눈에 | 인포그래픽: 카테고리 구성, 국내·해외, 지난 호와의 관계(신규/연관/중복), 많이 언급된 기업·기술 |
| 핵심 인사이트 | 선정 기사를 주제 2~4개로 묶은 기사형 본문 + 핵심 인사이트 + CL사업부 시사점 + **근거 기사 [번호] 원문 링크** |
| 추세 분석 | 인포그래픽: 호별 카테고리 추이, 키워드 호별 등장 히트맵 + 해석 |
| 제언 및 향후 과제 | 실행 가능한 제언, 다음 호까지 확인할 사항 |
| 참고 기사 | 번호·제목(원문 링크)·출처·일자 표 |

- **인포그래픽은 표(table)로 그립니다.** 이미지·SVG·자바스크립트가 없어서 아웃룩 데스크톱에 붙여 넣어도 깨지지 않고, 받는 사람의 이미지 차단에도 영향이 없습니다. 통계 숫자는 코드가 구글 시트 이력에서 계산하며 Claude가 만들지 않습니다.
- **생성 규칙은 사전에 정의**되어 있습니다: `src/config/report-rules.ts` (문체: 합니다체·과장 금지, 구성, 사실 처리, 분량). 규칙을 바꾸려면 이 파일만 고칩니다.

## 빠른 시작 (내 PC)

```bash
npm install
cp .env.example .env.local     # 선택 설정 (비워 두면 로컬 캐시 모드)
npm run seed:demo              # (선택) 샘플 기사·과거 3개 호 (운영 전 data/db.json 삭제)
npm run dev                    # http://localhost:3000
```

| 환경변수 | 설명 |
|---|---|
| `STORE_MODE` | `sheets`: 구글 시트가 원본(웹 호스팅 기본값) · `local`: `data/db.json` 이 원본(내 PC 기본값) |
| `SHEETS_WEBAPP_URL`, `SHEETS_WEBAPP_TOKEN` | 시트에 붙인 Apps Script 웹 앱 주소와 토큰 (무료, 권장) |
| `GOOGLE_SHEETS_SPREADSHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_KEY_JSON` | (선택) 구글 클라우드 서비스 계정 방식 |
| `APP_PASSWORD` | 웹 접속 비밀번호 (비우면 잠금 없음) |
| `NEWSLETTER_NAME`, `NEWSLETTER_FEEDBACK_CONTACT`, `NEWSLETTER_AUDIENCE` | 리포트 이름(TDL Trend), 발행 팀(테크이노베이션팀), 배포 대상(CL사업부) |
| `NEWSLETTER_FEEDBACK_EMAIL` | 푸터에 표시할 문의 메일 |
| `LETTER_WRITER` | 비우면 Claude Code 작성 모드(토큰 없음). `api` 면 웹에서 API 로 바로 작성(`ANTHROPIC_API_KEY` 필요, 과금) |
| `COLLECT_LOOKBACK_DAYS`, `MI_LOOKBACK_DAYS` | 수집 기간(기본 14일), 지난 호 비교 기간(기본 180일) |

### CLI (Claude Code용)

| 명령 | 설명 |
|---|---|
| `npm run report -- list` | 작성 의뢰서 목록 (작성 대기 / 완료) |
| `npm run report -- candidates [일수]` | 최근 기사 후보와 지난 호 연관 태그 |
| `npm run report -- request <N> --date … --concept … --articles ID,ID` | CLI로 의뢰서 만들기 |
| `npm run report -- prompt <N>` | 의뢰서를 `data/handoff/N/prompt.md` 로 내려받기 |
| `npm run report -- save <N>` | 작성본 검증·저장 (통계 붙임, 미인용 기사 경고) |
| `npm run report -- publish <N>` | 발행 이력 저장 |

## 구조

```
src/
├─ config/    brand.ts(이름·호수 표기·색)  report-rules.ts(생성 규칙)  sources.ts(수집 채널)  taxonomy.ts(카테고리·기업 사전)
├─ lib/
│  ├─ collector/   수집 (RSS 자동 탐지, HTML 링크 추정, 본문 추출)
│  ├─ store/       local(JSON 캐시) · sheets(구글 시트) · index(저장소 파사드)
│  ├─ mi/          지난 호 이력 매칭 (중복·후속·연관)
│  ├─ report/      stats.ts (카테고리·키워드·호별 추세 통계)
│  ├─ newsletter/  schema · prompt · handoff(작성 의뢰서) · fallback(규칙 초안)
│  └─ email/       template.ts(비즈니스 리포트) · charts.ts(표 기반 차트) · inline.ts
├─ app/ · components/   대시보드, 발행 이력, API
scripts/   report.ts(CLI) · collect.ts · sources.ts · seed-demo.ts · render-sample.ts
```

## 수집 채널: 사이트 주소만 넣기

`src/config/sources.ts` 에 사이트 주소만 넣으면(`type` 생략 = auto) 수집 방법을 스스로 찾습니다.

1. 홈페이지에 표시된 RSS(`<link rel="alternate" type="application/rss+xml">`)
2. 없으면 흔한 피드 경로: 국내 언론 CMS 공통 `/rss/allArticle.xml`, WordPress `/feed`, `/rss` 등
3. 그래도 없으면 홈페이지 링크 중 기사처럼 생긴 주소(`articleView.html?idxno=`, `/article/…`, `/2026/10/…`, 긴 숫자 ID)를 골라 원문을 읽음

새 사이트는 먼저 확인해 보세요.

```bash
npm run sources -- probe https://www.klnews.co.kr   # 수집 방식, 최근 기사 5건, 첫 기사 본문 길이
npm run sources -- check                            # 설정된 채널 전체 점검
```

| 사이트 유형 | 주소만으로 | 비고 |
|---|---|---|
| RSS 있는 언론사 (국내 대부분, Supply Chain Dive 등) | 가능 | 가장 안정적. 발행일·요약·썸네일이 정확 |
| RSS 없는 일반 뉴스 사이트 | 대체로 가능 | 기사 링크 추정. 홈에 안 보이는 기사는 빠질 수 있어 섹션 주소를 넣는 게 좋음 |
| 자바스크립트로만 그려지는 사이트 | 불가 | probe 가 이유를 알려 줌. `collector/http.ts` 를 브라우저(Puppeteer) 방식으로 바꿔야 함 |
| 봇 차단(Cloudflare 등)·유료 기사 | 제목·링크까지만 | 본문 없이 요약만 쓰거나 RSS 요약으로 대체 |
| 범용 매체 (SCM 전반, 로봇 전반) | 가능 | `requireRelevance: true` 로 물류·로봇 키워드 기사만 적재 |

수집은 사내 공유용 요약·링크 목적이며, 각 사이트의 이용약관과 robots.txt 를 확인하고 요청 간격을 과하게 줄이지 마세요(동시 요청 4개로 제한). 정기 수집은 `npm run collect -- 14` 를 작업 스케줄러에 등록합니다.

## 스크립트
`npm run dev` · `npm run build` · `npm test` · `npm run typecheck` · `npm run lint` · `npm run collect` · `npm run sources` · `npm run report` · `npm run seed:demo` · `npm run render:sample`
