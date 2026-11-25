import { describe, expect, it } from "vitest";
import { CURVE_STAGES, type StageKey } from "@/config/insights";
import { classifyStage, curveY, computeInsights, detectSignals, stageOf, weekStart, type Signals } from "@/lib/insights/compute";
import { parseFredCsv, summarize } from "@/lib/indicators";
import type { Article } from "@/lib/types";

const NOW = new Date("2026-11-24T00:00:00Z");
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86_400_000).toISOString();
let n = 0;
const art = (title: string, d: number, extra: Partial<Article> = {}): Article => ({
  id: `T${++n}`, collectedAt: daysAgo(d), publishedAt: daysAgo(d), source: "s", region: "KR", title, link: `https://x/${n}`,
  summary: "", category: "AMR/AGV", keywords: [], selected: false, ...extra,
});

describe("트렌드 인사이트 계산 (수집 기사만으로)", () => {
  it("단계 신호: 제목·요약의 표현으로 공개·투자·실증·도입·리스크를 찾음", () => {
    expect(detectSignals("A사, 신형 AMR 공개")).toEqual(["launch"]);
    expect(detectSignals("Agility Robotics raises $400M")).toEqual(["invest"]);
    expect(detectSignals("CJ대한통운, 곤지암에 AMR 200대 추가 도입")).toEqual(["adopt"]);
    expect(detectSignals("휴머노이드 시범 운영 시작")).toEqual(["pilot"]);
    expect(detectSignals("Robot startup halts operations amid layoffs")).toEqual(["doubt"]);
    expect(detectSignals("in order to cut costs")).not.toContain("adopt");
  });

  it("곡선: 기대 정점이 가장 높고, 골이 가장 낮고, 안정 구간이 중간", () => {
    expect(curveY(0.3)).toBeGreaterThan(curveY(0.9));
    expect(curveY(0.5)).toBeLessThan(curveY(0.15));
    expect(curveY(0.5)).toBeLessThan(curveY(0.9));
    expect(stageOf(0.1)).toBe("기술 태동");
    expect(stageOf(0.3)).toBe("기대 정점");
    expect(stageOf(0.88)).toBe("생산성 안정");
  });

  it("기사 수·최근 30일·모멘텀·단계(증거 비율) 계산", () => {
    const arts = [
      art("CJ대한통운, AMR 200대 추가 도입", 5),
      art("물류센터 AMR 증설 확대", 10),
      art("AMR 신제품 공개", 100),
      art("휴머노이드 기업 투자 유치", 3, { category: "로봇 피킹/매니퓰레이션" }),
      art("휴머노이드 신모델 공개", 40, { category: "로봇 피킹/매니퓰레이션" }),
      art("오래된 AMR 도입 기사", 400),
    ];
    const r = computeInsights(arts, { now: NOW, days: 180 });
    const amr = r.hype.find((h) => h.name === "AMR")!;
    expect(amr.count).toBe(3); // 180일 밖 기사 제외
    expect(amr.recent).toBe(2);
    expect(amr.signals).toMatchObject({ adopt: 2, launch: 1 });
    expect(amr.stage).toBe("실증 확산"); // 증거 2/3 = 67%
    expect(amr.x).toBeCloseTo(0.62 + ((2 / 3 - 0.5) / 0.25) * 0.16, 5);
    expect(amr.why).toContain("시범·도입 증거가 67%");
    expect(amr.confident).toBe(true);
    expect(amr.momentum).toBeCloseTo(2 / 30 / (1 / 150) - 1, 5);
    const hum = r.hype.find((h) => h.name === "휴머노이드")!;
    expect(hum.stage).toBe("기술 태동"); // 공개·투자 우세지만 기사 2건뿐
    expect(hum.confident).toBe(false);
    expect(r.hype.find((h) => h.name === "드론 배송")).toBeUndefined(); // 언급 없는 기술은 표시 안 함
    expect(r.coverage).toMatchObject({ total: 6, inWindow: 5 });
  });

  it("동종사 레이더: 자사(LX판토스) 강조, 사전이 바뀌어도 예전 기사에서 다시 찾음", () => {
    const arts = [art("LX판토스, 신규 풀필먼트센터에 AMR 도입", 2), art("한진, AMR 구축", 8), art("한진 AMR 시범 운영", 20), art("한진, 택배 요금 확대", 25)];
    const r = computeInsights(arts, { now: NOW });
    const self = r.peers.find((p) => p.self)!;
    expect(self.name).toBe("LX판토스");
    expect(self.total).toBe(1);
    expect(self.latest?.title).toContain("LX판토스");
    const hanjin = r.peers.find((p) => p.name === "한진")!;
    expect(hanjin.signals).toMatchObject({ adopt: 1, pilot: 1 }); // 기술(AMR) 언급 기사만 단계로 센다
    expect(hanjin.total).toBe(3);
  });

  it("기술 위주 분류: 추적 기술이 없는 기사는 도입·확대 같은 말이 있어도 단계 신호가 없음, 노조 반발은 리스크", () => {
    const r = computeInsights([art("쿠팡, 물류센터 확대 도입", 3), art("택배 속도 경쟁, 택배노조 강력 반발", 4), art("AMR 도입 노조 반발", 5)], { now: NOW });
    expect(r.now.mix.find((m) => m.key === "none")!.count).toBe(2);
    expect(r.now.mix.find((m) => m.key === "doubt")!.count).toBe(1);
    expect(detectSignals("택배노조 강력 반발")).toContain("doubt");
  });

  it("급상승 키워드: 최근 14일이 이전 속도보다 많은 것", () => {
    const arts = [art("AMR 공개", 1), art("AMR 도입", 2), art("AMR 확대", 3), art("소터 도입", 30), art("소터 공개", 40), art("소터 증설", 50)];
    const r = computeInsights(arts, { now: NOW });
    expect(r.movers.rising[0].name).toBe("AMR");
    expect(r.movers.rising[0].weeks.reduce((a, b) => a + b, 0)).toBe(3);
    expect(r.movers.falling.map((m) => m.name)).toContain("소터");
  });

  it("주간 흐름: 12주, 월요일 시작 (한국 시간)", () => {
    expect(weekStart("2026-11-23T15:30:00Z")).toBe("2026-11-23"); // 한국 시간 11/24(화) 00:30
    expect(weekStart("2026-11-22T16:00:00Z")).toBe("2026-11-23"); // 한국 시간 11/23(월) 01:00
    const r = computeInsights([art("AMR 도입", 1)], { now: NOW });
    expect(r.weekly.weeks).toHaveLength(12);
    expect(r.weekly.series).toEqual([{ category: "AMR/AGV", counts: [...Array(11).fill(0), 1] }]);
  });

  it("우선 검토 보드: CL사업 연관도 열(3→1)에 최근 기사 많은 순", () => {
    const r = computeInsights([art("AMR 도입", 1), art("드론 배송 시범", 2, { category: "글로벌 트렌드" })], { now: NOW });
    expect(r.board.map((c) => c.relevance)).toEqual([3, 2, 1]);
    expect(r.board[0].items.map((i) => i.name)).toEqual(["AMR"]);
    expect(r.board[2].items.map((i) => i.name)).toEqual(["드론 배송"]);
  });
});

describe("공개 지표 (FRED CSV)", () => {
  it("새·옛 머리글 모두 읽고 빈 값('.')은 건너뜀", () => {
    expect(parseFredCsv("observation_date,TSIFRGHT\n2025-09-01,140.1\n2025-10-01,.\n2026-09-01,145.2\n")).toEqual([
      { date: "2025-09-01", value: 140.1 },
      { date: "2026-09-01", value: 145.2 },
    ]);
    expect(parseFredCsv("DATE,X\r\n2026-01-01,1\r\n")).toEqual([{ date: "2026-01-01", value: 1 }]);
    expect(() => parseFredCsv("<html>error</html>")).toThrow(/CSV/);
  });

  it("최신값과 전년 동월 대비 변화율", () => {
    const pts = [{ date: "2025-09-01", value: 100 }, { date: "2026-08-01", value: 104 }, { date: "2026-09-01", value: 110 }];
    expect(summarize(pts)).toEqual({ latest: { date: "2026-09-01", value: 110 }, yoy: 10 });
    expect(summarize([])).toEqual({ yoy: null });
    expect(summarize([{ date: "2026-09-01", value: 1 }]).yoy).toBeNull();
  });
});

describe("LX판토스 기술 포트폴리오 · 최근 근황", () => {
  it("성숙도 지수: 공개 0 · 투자 0.25 · 실증 0.6 · 도입 1, 리스크 신호는 제외", async () => {
    const { maturityOf } = await import("@/lib/insights/compute");
    expect(maturityOf({ launch: 1, invest: 0, doubt: 5, pilot: 0, adopt: 1 })).toBe(0.5);
    expect(maturityOf({ launch: 0, invest: 0, doubt: 3, pilot: 0, adopt: 0 })).toBeNull();
  });

  it("기간을 반으로 나눠 과거 → 최근 위치를 계산하고, 사분면 기준은 최근 중앙값", () => {
    const arts = [
      art("AMR 신제품 공개", 150), art("AMR 도입", 20), art("AMR 증설 확대", 10), art("AMR 수주", 5),
      art("휴머노이드 공개", 30, { category: "로봇 피킹/매니퓰레이션" }),
      art("소터 도입", 100, { category: "소팅/보관설비" }), art("소터 시범", 40, { category: "소팅/보관설비" }),
      art("이번에 중단된 드론 배송", 7, { category: "글로벌 트렌드" }),
    ];
    const r = computeInsights(arts, { now: NOW, days: 180 });
    const amr = r.portfolio.points.find((p) => p.name === "AMR")!;
    expect(amr.recent).toEqual({ count: 3, share: 3 / 6, maturity: 1 });
    expect(amr.past).toEqual({ count: 1, share: 1 / 2, maturity: 0 }); // 과거 기간: AMR 1 · 소터 1
    expect(amr.relevance).toBe(3);
    const sorter = r.portfolio.points.find((p) => p.name === "소터")!;
    expect(sorter.recent).toEqual({ count: 1, share: 1 / 6, maturity: 0.6 });
    const drone = r.portfolio.points.find((p) => p.name === "드론 배송")!;
    expect(drone.recent.maturity).toBeNull(); // 리스크 신호만 있으면 성숙도 없음
    expect(drone.doubtShare).toBe(1);
    expect(r.portfolio.median.maturity).toBe(0.6); // [1, 0, 0.6] 의 중앙값
  });

  it("최근 근황: 최근 30일 vs 직전 30일, 신호별 기사 묶음과 기술 태그", () => {
    const arts = [art("CJ대한통운, AMR 도입", 2), art("AMR 투자 유치", 3), art("소터 증설", 40, { category: "소팅/보관설비" })];
    const r = computeInsights(arts, { now: NOW });
    expect(r.now.kpis.find((k) => k.key === "all")).toMatchObject({ value: 2, prev: 1 });
    expect(r.now.kpis.find((k) => k.key === "adopt")).toMatchObject({ value: 1, prev: 1 });
    expect(r.now.feed.find((g) => g.signal === "adopt")!.items[0]).toMatchObject({ title: "CJ대한통운, AMR 도입", techs: ["AMR"] });
    expect(r.now.highlights[0]).toContain("AMR(2건, 직전 30일 0건)");
  });
});

describe("최근 근황 원그래프: 기사마다 대표 신호 하나", () => {
  it("리스크 > 도입 > 실증 > 투자 > 공개 순서로 대표 신호, 원그래프 합 = 기간 기사 수, 묶음 건수 = 조각", async () => {
    const { primarySignal } = await import("@/lib/insights/compute");
    expect(primarySignal(["pilot", "doubt"])).toBe("doubt");
    expect(primarySignal(["launch", "adopt"])).toBe("adopt");
    expect(primarySignal([])).toBe("none");
    const arts = [art("드론 배송 시범 운영 지연", 3), art("AMR 도입", 4), art("AMR 공개 후 도입 확대", 5), art("물류 컨퍼런스 개최", 6)];
    const r = computeInsights(arts, { now: NOW });
    const mix = Object.fromEntries(r.now.mix.map((m) => [m.key, m.count]));
    expect(mix).toMatchObject({ doubt: 1, adopt: 2, none: 1, pilot: 0 });
    expect(r.now.mix.reduce((n, m) => n + m.count, 0)).toBe(4);
    expect(r.now.feed.find((g) => g.signal === "adopt")!.count).toBe(2);
    expect(r.now.feed.find((g) => g.signal === "pilot")!.count).toBe(0); // 지연 기사는 리스크 묶음에만
  });

  it("동종업계: 회사별 기사 목록 (최신순)", () => {
    const r = computeInsights([art("한진 자동화 센터 구축", 9), art("한진 로봇 시범", 2)], { now: NOW });
    expect(r.peers.find((p) => p.name === "한진")!.articles.map((a) => a.title)).toEqual(["한진 로봇 시범", "한진 자동화 센터 구축"]);
  });
});

describe("외부 리포트: 수집 기사 속 기관 언급", () => {
  it("Gartner·DHL·McKinsey 언급 기사를 따로 모음 (한글 표기 포함)", () => {
    const r = computeInsights([art("가트너, 공급망 기술 하이프 사이클 발표", 2), art("DHL expands robotics", 3), art("맥킨지 공급망 설문", 4), art("AMR 도입", 5)], { now: NOW });
    expect(Object.fromEntries(r.external.map((e) => [e.id, e.count]))).toEqual({ gartner: 1, dhl: 1, mckinsey: 1, mhi: 0, kcci: 0 });
    expect(r.external.find((e) => e.id === "dhl")!.articles[0].title).toBe("DHL expands robotics");
  });
});

describe("외부 리포트: KCCI 주간 보도 모으기", () => {
  it("KCCI·한국형 컨테이너 운임 기사를 찾음", () => {
    const r = computeInsights([art("KCCI 3주 연속 상승, 미주 항로 강세", 1), art("한국형 컨테이너 운임지수 하락", 8)], { now: NOW });
    expect(r.external.find((e) => e.id === "kcci")!.count).toBe(2);
  });
});

describe("하이프 사이클 단계 판정 (평균이 아니라 우세한 신호로)", () => {
  const sig = (o: Partial<Record<StageKey, number>>): Signals => ({ launch: 0, invest: 0, pilot: 0, adopt: 0, doubt: 0, ...o });

  it("공개·투자·시범·도입이 고루 섞인 기술을 가운데(검증의 골)로 몰지 않음", () => {
    // 예전 방식(위치 평균)은 x=0.50 → 검증의 골이었다. 리스크 신호는 5%뿐이다.
    const c = classifyStage(sig({ launch: 10, invest: 10, pilot: 10, adopt: 10, doubt: 2 }), 40, 8);
    expect(c.stage).not.toBe("검증의 골");
    expect(c.stage).toBe("실증 확산");
  });

  it("검증의 골은 리스크(중단·지연) 신호가 25% 이상이고 3건 이상일 때만", () => {
    expect(classifyStage(sig({ launch: 4, invest: 2, pilot: 3, adopt: 3, doubt: 6 }), 18, 8).stage).toBe("검증의 골");
    expect(classifyStage(sig({ launch: 4, invest: 2, pilot: 3, adopt: 3, doubt: 2 }), 14, 8).stage).not.toBe("검증의 골"); // 2건
    expect(classifyStage(sig({ launch: 10, invest: 10, pilot: 5, adopt: 5, doubt: 5 }), 35, 8).stage).not.toBe("검증의 골"); // 14%
    // 리스크가 많을수록 골 깊숙이
    expect(classifyStage(sig({ pilot: 2, doubt: 8 }), 10, 8).x).toBeGreaterThan(classifyStage(sig({ pilot: 6, doubt: 3 }), 9, 8).x);
  });

  it("공개·투자가 우세하고 기사가 많으면 기대 정점, 적으면 기술 태동", () => {
    const hot = classifyStage(sig({ launch: 14, invest: 12, pilot: 4, adopt: 2, doubt: 1 }), 33, 8);
    expect(hot.stage).toBe("기대 정점");
    expect(classifyStage(sig({ launch: 14, invest: 4, pilot: 4, adopt: 2, doubt: 1 }), 25, 8).x).toBeLessThan(hot.x); // 투자 비중이 클수록 정점 쪽
    expect(classifyStage(sig({ launch: 2, invest: 1 }), 3, 2).stage).toBe("기술 태동");
  });

  it("도입 증거가 75% 이상이면 생산성 안정, 신호가 없으면 태동·신뢰 낮음", () => {
    expect(classifyStage(sig({ launch: 2, pilot: 3, adopt: 25 }), 30, 8).stage).toBe("생산성 안정");
    expect(classifyStage(sig({}), 5, 8)).toMatchObject({ stage: "기술 태동", x: 0.1 });
  });

  it("단계 안에서의 위치는 항상 그 단계 구간 안", () => {
    const samples = [sig({ launch: 10, invest: 2 }), sig({ doubt: 5, pilot: 2 }), sig({ adopt: 9 }), sig({ pilot: 5, adopt: 5 }), sig({ launch: 1 })];
    for (const s of samples) {
      const c = classifyStage(s, 20, 8);
      const band = CURVE_STAGES.find((st) => c.x >= st.from && c.x < st.to)!;
      expect(band.label).toBe(c.stage);
    }
  });
});
