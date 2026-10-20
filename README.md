# 레포냥 레터 스튜디오 — 격주 물류·로봇 트렌드 레터 생성기

국내외 물류·로봇 자동화 기사를 수집 → 작업자가 3~5개를 선별하고 기획 콘셉트를 입력 → 캐릭터 **레포냥**(리포트+냥)의 말투로 Claude가 레터를 작성 → **아웃룩 데스크톱에 그대로 붙여넣을 수 있는** 테이블/인라인 CSS HTML로 출력합니다.

## 레포냥 레터 구성
가운데 정렬 600px 슬림 레터, 메인 컬러 `#A72B2B`, 친근한 해요체.

| 순서 | 섹션 | 캐릭터 포즈 | 내용 |
|---|---|---|---|
| 1 | 헤더 | 인사(wave) | 레터 이름·호수·날짜, 이번 호 오프닝 |
| 2 | 1분 냥스 | - | 짧은 소식 3~4건 (태그 \| 제목 이모지 + 2~3문장) |
| 3 | 오늘의 메인 리포트 | 가방 끈(stand) | 1건 심층: 본문, 핵심만 쏙, 우리 회사엔? |
| 4 | 츄르 스테이션 | 편지(letter) | 따끈한 소식 한 입 + 구독자 질문 + 답장 버튼 |
| 5 | 꼬리 뉴스 | 빼꼼(peek) | 지난 호와 이어지는 이야기 (MI 이력 매칭) |
| 6 | 오늘 레터 어땠냥? | 앉음(sit) | 좋았다냥 / 아쉬웠다냥 설문 |
| 7 | 마무리·푸터 | - | 레포냥의 한마디, 문의처, 키워드 |

대시보드에서 선택한 기사마다 **메인 리포트 / 1분 냥스 / 츄르 스테이션** 중 들어갈 섹션을 지정합니다. 츄르 기사를 지정하지 않으면 기획 콘셉트에서 질문을 뽑습니다.

캐릭터 이미지는 `assets/reponyang-sheet.png`(원본 시트)에서 잘라 낸 투명 PNG로 `public/character/`에 있습니다. 아웃룩은 붙여넣을 때 이미지 주소에서 그림을 받아 오므로, 앱을 사내에서 접속 가능한 주소로 띄우거나 `PUBLIC_ASSET_BASE_URL`을 지정하세요. 서버 없이 템플릿만 보려면 `npm run render:sample -- sample.html --inline-assets`. 발행 이력은 Google Sheets에 아카이빙되고, 새 기사를 고를 때마다 과거 호와의 중복·연관 여부를 자동으로 표시합니다.

## 빠른 시작

```bash
npm install
cp .env.example .env.local     # 키 입력 (없어도 로컬 캐시 + 기본 초안 모드로 동작)
npm run seed:demo              # (선택) 샘플 기사·과거 3개 호 적재 — 실제 운영 전 data/db.json 삭제
npm run dev                    # http://localhost:3000
```

| 환경변수 | 설명 |
|---|---|
| `ANTHROPIC_API_KEY` | Claude API 키. 없으면 기사 원문 기반 규칙 초안으로 생성 |
| `ANTHROPIC_MODEL` | 기본 `claude-opus-5-5` |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | 스프레드시트 ID (`/d/<ID>/edit`) |
| `GOOGLE_SERVICE_ACCOUNT_KEY_PATH` / `_BASE64` | 서비스 계정 JSON 키 경로 또는 base64 |
| `COLLECT_LOOKBACK_DAYS` | 수집 기간 (기본 14일) |
| `MI_LOOKBACK_DAYS` | 과거 이력 비교 기간 (기본 180일) |
| `NEWSLETTER_NAME`, `NEWSLETTER_TAGLINE`, `NEWSLETTER_FEEDBACK_CONTACT` | 헤더/푸터 문구 |
| `NEWSLETTER_FEEDBACK_EMAIL`, `NEWSLETTER_SURVEY_URL`, `NEWSLETTER_ARCHIVE_URL` | 답장·설문 버튼, 지난 레터 링크 |
| `PUBLIC_ASSET_BASE_URL` | 캐릭터 이미지 공개 기준 URL |

### Google Sheets 연동
1. GCP 콘솔에서 서비스 계정 생성 → JSON 키 다운로드 → 프로젝트 루트 `credentials.json` (gitignore 처리됨)
2. Google Sheets API 활성화
3. 스프레드시트를 서비스 계정 이메일(`...@...iam.gserviceaccount.com`)에 **편집자**로 공유
4. 앱의 **발행 이력 → 📗 시트 초기화** 클릭 → `Raw_Articles`, `Newsletter_Issues` 시트와 헤더 자동 생성
   - 기존 로컬 데이터를 올리려면 **⬆ 시트로 업로드**, 다른 작업자의 시트 내용을 받으려면 **⬇ 시트에서 불러오기**

## 사용 흐름

1. **🔄 기사 최신화** — 활성 채널에서 최근 2주 기사를 수집, URL/제목 중복 제거 후 적재
2. 카테고리(AMR/AGV · 풀필먼트 자동화 · 소팅/보관설비 · 로봇 피킹/매니퓰레이션 · 글로벌 트렌드)·지역·검색어로 필터
3. 기사 체크(최대 5개) — 각 기사에 과거 호 연관 태그 표시 (꼬리 뉴스 재료)
   - ⚠️ `3호(09/08)에서 이미 다룬 기사와 중복 가능성`
   - ↪ `1호(05/23)에서 다룬 AutoStore 솔루션의 후속 기사`
   - 🔗 `2호(07/12)에서 다룬 휴머노이드 주제와 연관`
4. 기사별 섹션(메인 리포트/1분 냥스/츄르 스테이션) 지정, 순서 조정, **기획 콘셉트** 입력 → **🐾 레포냥 레터 생성**
5. 데스크톱/모바일 미리보기 → 필요 시 **섹션 편집** → **📋 아웃룩용 본문 복사** → 아웃룩 새 메일에 `Ctrl+V`
6. **✅ 발행 확정** — `Newsletter_Issues`에 호수/발행일/콘셉트/기사 ID/완성 HTML/키워드 저장, 기사 선정여부에 `발행(N호)` 기록

## 구조

```
src/
├─ config/
│  ├─ sources.ts        수집 채널 (RSS / HTML 목록 스크랩) — 여기서 추가·비활성화
│  ├─ taxonomy.ts       카테고리 규칙, 관련성 키워드, MI 엔티티 사전(기업·솔루션·기술)
│  └─ brand.ts          레포냥 페르소나·말투, 섹션 명칭, 캐릭터 포즈, 색상
├─ lib/
│  ├─ collector/        http(EUC-KR 대응) · parse(RSS/목록/본문 추출) · index(수집 파이프라인)
│  ├─ store/            local(JSON 캐시) · sheets(Google Sheets) · index(write-through 파사드)
│  ├─ mi/               matcher(키워드/분류) · index(과거 호 매칭, 키워드 타임라인)
│  ├─ newsletter/       schema(zod) · prompt · synthesizer(Claude) · fallback(규칙 초안) · render
│  ├─ email/            inline(테이블/인라인 CSS 빌더) · template(아웃룩 호환 템플릿)
│  └─ clipboard.ts      text/html + text/plain 동시 복사
├─ app/                 대시보드(/), 아카이브(/issues, /issues/[no]), API 라우트
└─ components/
scripts/                collect.ts(CLI 수집, 스케줄러용) · seed-demo.ts
tests/                  vitest (파서·MI·템플릿·시트 직렬화·저장소)
```

### 데이터 저장
- **Google Sheets가 원장**, `data/db.json`은 로컬 캐시(기사 본문·구조화 콘텐츠 보관). 쓰기는 캐시 반영 후 시트에 write-through하며, 시트 오류는 화면에 경고로 표시됩니다.
- 시트 셀 5만 자 제한 때문에 완성된 HTML은 `완성된 HTML` + `HTML(이어짐1~3)` 열에 나눠 저장되고, 불러올 때 다시 합쳐집니다.
- 시트에는 `valueInputOption=RAW`로 기록하여 `=`로 시작하는 제목이 수식으로 실행되지 않습니다.

### Market Intelligence 매칭
`score = 0.6 × min(1, 공통 엔티티 가중치 / 2) + 0.4 × TF-IDF 코사인`
- 엔티티: `taxonomy.ts`의 기업·솔루션(가중치 1.0), 기술(0.5). 영문 약어는 단어 경계로 매칭(“Camry”≠AMR)
- 토큰: 영문 단어 + 한글 2-gram (형태소 분석기 없이 한·영 혼용 대응)
- 같은 URL 또는 코사인 > 0.6 → 중복 / 공통 기업·솔루션 + 이후 발행 → 후속 / 그 외 score ≥ 0.3 → 연관
- 과거 호의 키워드 등장 이력은 Claude 프롬프트에 함께 전달되어 MI 코너 작성에 사용됩니다.

### Claude 작성 엔진
- 구조화 출력(`output_config.format` JSON Schema) → zod 검증 → 템플릿 렌더. 모델이 HTML을 직접 만들지 않으므로 아웃룩 깨짐이 없습니다.
- 링크·출처는 모델 출력이 아니라 원본 기사 데이터로 덮어써 잘못된 링크를 방지합니다.
- 적응형 사고(adaptive thinking) + effort `high`, 스트리밍, 서버 측 거절 시 폴백(`fallbacks: "default"`)을 사용합니다.

### 아웃룩 호환 규칙 (template.ts)
- `<table role="presentation">` 레이아웃만 사용, `div/p/ul` 미사용, 클래스·`<style>` 없음
- 모든 셀에 인라인 `font-family`(맑은 고딕 우선), `width`/`bgcolor` HTML 속성 병행, `mso-line-height-rule`
- 600px 고정 폭(본문 520px). 전체 HTML 문서에는 모바일 메일 앱용 media query 포함
- 아웃룩 데스크톱은 border-radius 를 그리지 않아 알약 라벨·버튼이 각지게 보입니다
- 이모지는 아웃룩 데스크톱의 Segoe UI Emoji로 렌더링됩니다

## 수집 채널 메모
- 물류신문·로봇신문·카고뉴스: ndsoft CMS 공통 RSS(`/rss/allArticle.xml`) + 본문 `#article-view-content-div`
- Supply Chain Dive: RSS (범용 SCM 매체라 관련성 필터 적용)
- Robotics 24/7, Modern Materials Handling: 카테고리 목록 페이지에서 `/article/` 링크 추출 후 원문 스크랩
- LogiMAT/CeMAT: Google News RSS 검색
- 사이트 구조가 바뀌면 `src/config/sources.ts`의 URL/`linkPattern`만 수정하면 됩니다. JS 렌더링이 필요한 사이트가 생기면 `collector/http.ts`의 `fetchText`를 Puppeteer 구현으로 교체할 수 있습니다.
- 정기 수집: `npm run collect -- 14` 를 작업 스케줄러/cron에 등록

## 스크립트
`npm run dev` · `npm run build` · `npm test` · `npm run typecheck` · `npm run lint` · `npm run collect` · `npm run seed:demo` · `npm run render:sample`
