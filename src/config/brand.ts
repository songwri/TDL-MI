/**
 * 레포냥 레터 브랜드 시스템 (프롬프트와 이메일 템플릿이 공유)
 * 메인 컬러 #A72B2B 하나에 힘을 주고, 나머지는 따뜻한 무채색으로 받친다.
 */
export const PERSONA = {
  name: "레포냥",
  intro: "리포트를 물어다 주는 고양이 로봇. TREND 고글로 2주마다 물류·로봇 현장을 훑고 와요",
  voice:
    "친근한 해요체. 동료에게 커피 한 잔 하며 설명하듯 가볍고 위트 있게, 하지만 사실과 수치는 정확하게. '~냥' 말투는 인사·질문·마무리에만 가끔(한 차수에 3회 이내) 쓰고 본문은 자연스러운 해요체로.",
};

/**
 * 발행 단위 = '입고'. 1호 → "1차 입고". 화면·메일·이력 태그 모두 이 함수로 표기한다.
 */
export const issueLabel = (n: number) => `${n}차 입고`;
export const issueShort = (n: number) => `${n}차`;

/** 섹션 명칭 (뉴닉식 레터 구조를 레포냥 세계관으로 옮김) */
export const SECTIONS = {
  quickNews: { label: "1분 냥스", sub: "바쁜 당신을 위한 한 줄 요약" },
  mainReport: { label: "오늘의 메인 리포트", sub: "한 가지 이슈를 깊게" },
  churuStation: { label: "츄르 스테이션", sub: "따끈한 소식 한 입, 그리고 여러분의 생각" },
  tailNews: { label: "꼬리 뉴스", sub: "꼬리에 꼬리를 무는 지난 이야기" },
  survey: { label: "오늘 레터 어땠냥?" },
} as const;

/** public/character/*.png — 첨부 캐릭터 시트에서 잘라낸 포즈 (원본 360px 높이, 투명 배경) */
export const CHARACTER = {
  wave: { src: "character/wave.png", w: 271, h: 360 }, // 헤더 인사
  walk: { src: "character/walk.png", w: 249, h: 360 },
  stand: { src: "character/stand.png", w: 241, h: 360 }, // 메인 리포트
  letter: { src: "character/letter.png", w: 281, h: 360 }, // 츄르 스테이션
  peek: { src: "character/peek.png", w: 229, h: 360 }, // 꼬리 뉴스
  sit: { src: "character/sit.png", w: 295, h: 360 }, // 설문
  run: { src: "character/run.png", w: 256, h: 360 },
} as const;
export type Pose = keyof typeof CHARACTER;

export const COLORS = {
  brand: "#A72B2B",
  brandDeep: "#7E1F1F",
  brandTint: "#FBF1EF", // 박스 배경
  brandLine: "#F1D8D4", // 구분선 오른쪽 옅은 선
  ink: "#2B2324", // 본문
  inkSoft: "#5E5455", // 보조 본문
  mute: "#9A8F90", // 캡션
  paper: "#FFFFFF",
  sand: "#F6F3F2", // 꼬리 뉴스 박스
  button: "#2F2728", // 설문 버튼
};
