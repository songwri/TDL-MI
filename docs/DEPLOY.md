# 웹으로 운영하기 (구글 시트 + Vercel + GitHub Actions)

내 컴퓨터 없이 쓰는 구성입니다.

```
[GitHub Actions]  매일 06:00 뉴스 사이트 수집 ─┐
                                               ├─▶  [구글 시트]  ◀── 유일한 원본
[웹 서버(Vercel)] 기사 선정 · 작성 의뢰 · 미리보기 ─┤        Raw_Articles / Newsletter_Issues
                                               │        Article_Bodies / Handoffs
[Claude Code]     /write-letter 로 레터 작성  ───┘
```

- 기사, 선정 결과, 작성 의뢰서, 작성본, 발행 이력이 **모두 구글 시트에 쌓입니다.** 웹 서버에는 아무것도 저장하지 않습니다.
- 시트를 열어 보고 직접 고쳐도 됩니다(카테고리, 선정여부 칸 등). 웹은 20초마다 시트를 다시 읽습니다.

> 개인 구글 계정·개인 GitHub 계정으로 진행하는 것을 기준으로 합니다. 화면 문구는 바뀔 수 있습니다.

---

## 1. 구글 시트 준비 (약 15분)

**① 서비스 계정 만들기** (웹 서버가 시트에 쓰기 위한 "로봇 계정")

1. https://console.cloud.google.com 접속 → 개인 구글 계정으로 로그인 (처음이면 약관 동의 화면이 나옵니다)
2. 위쪽 프로젝트 선택 → **새 프로젝트** → 이름 `news-inbound` → 만들기
3. 왼쪽 메뉴 **API 및 서비스 → 라이브러리** → `Google Sheets API` 검색 → **사용**
4. **IAM 및 관리자 → 서비스 계정 → 서비스 계정 만들기** → 이름 `news-inbound` → 역할은 건너뛰고 **완료**
5. 만든 서비스 계정을 눌러 **키** 탭 → **키 추가 → 새 키 만들기 → JSON → 만들기**
   - JSON 파일이 내려받아집니다. **이 파일은 비밀번호와 같습니다.** 메신저·메일·채팅에 붙여 넣지 마세요.
6. 서비스 계정 상세 화면의 이메일(`news-inbound@…iam.gserviceaccount.com`)을 복사해 둡니다.

**② 스프레드시트 만들기**

1. https://sheets.google.com → 빈 스프레드시트 → 이름 `NEWS/INBOUND 데이터`
2. 오른쪽 위 **공유** → 위에서 복사한 서비스 계정 이메일을 **편집자**로 추가 (알림 메일 보내기는 꺼도 됨)
3. 브라우저 주소 `https://docs.google.com/spreadsheets/d/`**`여기 긴 글자`**`/edit` 의 **긴 글자**가 스프레드시트 ID입니다.

시트의 탭(Raw_Articles 등)은 만들지 않아도 됩니다. 앱이 처음 접속할 때 알아서 만듭니다.

> 서비스 계정과 키 만들기, 시트 공유는 개인 구글 계정에서 별도 승인 없이 할 수 있습니다. 클라우드 콘솔에서 결제 정보 등록을 요구하더라도 Google Sheets API와 서비스 계정 사용에는 요금이 들지 않습니다.

---

## 2. 웹 서버 올리기 (Vercel, 약 10분)

1. https://vercel.com → **Continue with GitHub**로 가입
2. **Add New → Project** → `songwri/TDL-MI` 선택 → **Import**
3. **Environment Variables**에 아래를 입력한 뒤 **Deploy**

| 이름 | 값 |
|---|---|
| `GOOGLE_SHEETS_SPREADSHEET_ID` | 1-② 에서 복사한 ID |
| `GOOGLE_SERVICE_ACCOUNT_KEY_JSON` | 1-① 에서 받은 JSON 파일을 메모장으로 열어 **내용 전체**를 붙여 넣기 |
| `APP_PASSWORD` | 접속 비밀번호 (직접 정하세요. 아래 주소를 아는 누구나 들어올 수 있어서 꼭 설정) |
| `NEWSLETTER_FEEDBACK_EMAIL` | (선택) 답장·설문을 받을 공용 메일 주소 |

4. 배포가 끝나면 `https://○○○.vercel.app` 주소가 나옵니다. 열면 비밀번호 창이 뜹니다(사용자 이름은 아무거나, 비밀번호만 입력).
5. 화면 위쪽 배지에 **📗 구글 시트가 원본 (웹 모드)** 가 보이면 연결된 것입니다.

> 무료(Hobby) 플랜으로 시작할 수 있습니다. 다른 호스팅(Cloud Run, Render 등)에도 같은 환경변수로 올릴 수 있습니다.
> 웹 서버의 요청 시간 제한(60초) 때문에 **🔄 기사 최신화** 버튼은 채널을 하나씩 나눠서 요청합니다. 대량 수집은 아래 3번 자동 수집이 맡습니다.

---

## 3. 매일 자동 수집 (GitHub Actions, 약 5분)

1. GitHub 저장소 → **Settings → Secrets and variables → Actions → New repository secret**
2. 두 개를 만듭니다. 값은 Vercel에 넣은 것과 같습니다.
   - `GOOGLE_SHEETS_SPREADSHEET_ID`
   - `GOOGLE_SERVICE_ACCOUNT_KEY_JSON`
3. **Actions** 탭 → 왼쪽 `collect-articles` → **Run workflow**로 한 번 실행해 봅니다.
4. 끝나면 구글 시트 `Raw_Articles`에 기사가 쌓여 있어야 합니다. 이후 매일 06:00(한국시간)에 자동 실행됩니다.
5. 실행 로그에 사이트별 `✔/✘`와 실패 이유가 나옵니다. 모든 사이트가 실패하면 실행이 실패로 표시되고 GitHub가 알림을 보냅니다.

일부 국내 언론사는 해외 데이터센터 접속을 막기도 합니다. 로그에서 `HTTP 403` 등이 보이는 사이트는 알려 주시면 대체 방법(Google News 검색 등)을 붙입니다.

---

## 4. Claude Code로 글쓰기 연결

글쓰기는 Claude Code가 하고, 의뢰서와 작성본은 구글 시트를 통해 오갑니다.

1. Claude Code 환경 설정(웹: 세션 제목 줄의 환경 메뉴 → Edit)에서 환경변수를 넣습니다.
   `STORE_MODE=sheets`, `GOOGLE_SHEETS_SPREADSHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_KEY_JSON`
2. 네트워크 접근에 `sheets.googleapis.com`, `oauth2.googleapis.com`이 허용되어야 합니다.
3. 새 세션에서 이 저장소를 열고 `/write-letter 4`(또는 "이번 입고 기사 골라줘").

순서: 웹에서 **📝 작성 의뢰 저장** → Claude Code `/write-letter 4` → 웹 **작성 의뢰서 → 작성본 불러오기** → **✅ 발행 확정**.

---

## 환경변수 한눈에

| 이름 | 필요 | 설명 |
|---|---|---|
| `GOOGLE_SHEETS_SPREADSHEET_ID` | 필수 | 스프레드시트 ID |
| `GOOGLE_SERVICE_ACCOUNT_KEY_JSON` | 필수 | 서비스 계정 키 JSON 내용 (파일 경로 `…_KEY_PATH`, base64 `…_KEY_BASE64` 방식도 지원) |
| `APP_PASSWORD` | 권장 | 웹 접속 비밀번호 |
| `STORE_MODE` | 자동 | Vercel 등 서버리스에서는 자동으로 `sheets`. 내 PC에서 시트를 원본으로 쓰려면 `sheets` |
| `SHEETS_CACHE_SECONDS` | 선택 | 시트를 다시 읽는 간격(기본 20초) |

## 문제 해결

| 증상 | 원인 |
|---|---|
| 화면에 "웹 모드에는 구글 시트 설정이 필요합니다" | 환경변수 두 개가 빠짐. 입력 후 Vercel에서 **Redeploy** |
| `The caller does not have permission` | 시트를 서비스 계정 이메일에 **편집자**로 공유하지 않음 |
| `Google Sheets API has not been used in project…` | 1-① 3번 API 사용 설정이 안 됨 |
| `invalid_grant` / JSON 오류 | 키 JSON을 일부만 붙여 넣음. 파일 내용 **전체**(`{`부터 `}`까지)를 다시 입력 |
| 기사가 0건 | Actions 로그에서 사이트별 오류 확인 |
