---
name: write-letter
description: NEWS/INBOUND 뉴스레터를 레포냥 말투로 작성한다. 웹 대시보드(또는 CLI)에서 저장한 작성 의뢰서 data/handoff/<차수>/prompt.md 를 읽고 content.json 을 써서 검증·저장한다. "레터 써줘", "N차 입고 작성", "이번 입고 기사 골라줘", /write-letter 요청에 사용. Anthropic API 를 호출하지 않는다.
argument-hint: "[차수]"
---

# NEWS/INBOUND 레터 작성

이 저장소의 웹 앱은 API 토큰을 쓰지 않도록 설정되어 있다. 기사 선정과 콘셉트는 웹에서 저장되고, 글쓰기는 여기(Claude Code)에서 한다.
`ANTHROPIC_API_KEY` 를 요구하거나 SDK 로 API 를 호출하는 방법을 쓰지 않는다.

## 1. 의뢰서 확인

```bash
npm run letter -- list
```

- 인자로 차수가 오면 그 차수를, 없으면 `작성 대기` 중 가장 최근 차수를 고른다.
- 의뢰서가 하나도 없으면 두 가지 중 하나를 사용자에게 묻는다.
  - 웹 대시보드에서 기사를 고르고 **📝 작성 의뢰 저장**을 누른다.
  - 여기서 같이 고른다: `npm run letter -- candidates 14` 로 후보를 보여 주고, 사용자와 메인 리포트 1건 · 1분 냥스 2~4건 · (선택) 츄르 스테이션 1건 · 기획 콘셉트 · 발행일을 정한 뒤
    `npm run letter -- request <차수> --date YYYY-MM-DD --concept "..." --main ID --quick ID,ID --churu ID` 로 의뢰서를 만든다.
    기사가 비어 있으면 `npm run collect -- 14` 로 먼저 수집한다(네트워크 필요).

## 2. 의뢰서 읽기

`data/handoff/<차수>/prompt.md` 를 처음부터 끝까지 읽는다. 작성 지침, 기사 원문(자료), 지난 입고 이력, 출력 JSON 스키마가 모두 들어 있다.

## 3. 작성

`data/handoff/<차수>/content.json` 에 JSON 하나만 쓴다(코드블록 표시 없이).

- 스키마의 모든 필드를 채운다. `articleId`, `source`, `url` 은 자료의 값을 그대로 복사한다.
- `quickNews` 는 role="quickNews" 기사 전부를 자료 순서대로 넣는다.
- 츄르 기사가 없으면 `churuStation` 의 `articleId`·`source`·`url` 은 빈 문자열.
- 자료에 없는 숫자·사실은 쓰지 않는다. `tailNews` 는 자료의 지난 입고 이력에 있는 연결만 쓴다.

## 4. 저장·검증

```bash
npm run letter -- save <차수>
```

오류가 나오면 메시지에 적힌 필드를 고쳐 다시 저장한다. 통과하면 링크·출처가 원본 데이터로 고정되고 `data/handoff/<차수>/letter.html` 미리보기가 생긴다.

## 5. 스스로 점검

저장 후 content.json 을 다시 읽고 확인한다. 고칠 게 있으면 고쳐서 다시 save.

- 본문은 해요체, ‘~냥’은 인사·질문·마무리에만 3회 이내
- 메인 리포트 문단 3~5개, 배경 → 무슨 일 → 왜 중요한가 흐름
- ‘우리 CL사업부엔?’(forUs) 이 CL사업부 물류센터 운영·자동화 검토에 바로 쓸 수 있을 만큼 구체적인가
- 츄르 스테이션 질문이 답장을 부를 만큼 구체적인가
- closing 에 다음 입고 예정일이 들어 있는가

## 6. 보고

사용자에게 짧게 알린다: 헤드라인, 섹션별 한 줄 요약, 그리고
“웹 대시보드 › 작성 의뢰서 › **작성본 불러오기**로 미리보기·편집 후 **발행 확정**을 누르세요.”
사용자가 여기서 발행까지 원하면 `npm run letter -- publish <차수>` 를 실행한다.
git commit·push 는 사용자가 요청할 때만 한다.
