"use client";

import { useEffect, useState } from "react";
import { EXTERNAL_REPORTS } from "@/config/insights";
import { curveY, type InsightsData } from "@/lib/insights/compute";
import type { Indicator } from "@/lib/indicators";
import { catColor, useTip } from "@/components/report/parts";
import { api } from "@/components/ui";
import { HypeMap, IndicatorCard, MoverList, PeerHeat, SIGNAL_ORDER, SignalBar, WeeklyBars, pct, signalLabel } from "./charts";

const day = (iso?: string) => (iso ? iso.slice(0, 10).replaceAll("-", ".") : "-");
const REL_LABEL = { 3: "연관 높음", 2: "연관 중간", 1: "연관 낮음" } as const;

function Section({ id, title, desc, right, children }: { id: string; title: string; desc?: React.ReactNode; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="min-w-0 rounded-lg border border-[var(--rv-line)] bg-white p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-[var(--rv-ink)] pb-2">
        <div>
          <h2 id={id} className="text-lg font-bold">
            <span className="mr-2 text-[var(--rv-accent)]">■</span>
            {title}
          </h2>
          {desc && <p className="mt-0.5 text-xs text-[var(--rv-soft)]">{desc}</p>}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

export function InsightsPage() {
  const tip = useTip();
  const [days, setDays] = useState(180);
  const [data, setData] = useState<{ insights: InsightsData; indicators: Indicator[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string>();
  const [tableView, setTableView] = useState(false);

  useEffect(() => {
    setError(null);
    api<{ insights: InsightsData; indicators: Indicator[] }>(`/api/insights?days=${days}`)
      .then((d) => {
        setData(d);
        setSelected((s) => (s && d.insights.hype.some((h) => h.name === s) ? s : [...d.insights.hype].sort((a, b) => b.count - a.count)[0]?.name));
      })
      .catch((e) => setError((e as Error).message));
  }, [days]);

  if (error) return <p className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>;
  if (!data) return <p className="p-8 text-center text-sm text-slate-500">수집 기사로 트렌드를 계산하는 중…</p>;

  const { insights: d, indicators } = data;
  const sel = d.hype.find((h) => h.name === selected);
  const thin = d.coverage.inWindow < 60;

  return (
    <div className="rv mx-auto max-w-[1180px] break-keep text-[15px] leading-7">
      {tip.view}

      {/* 머리 */}
      <header className="mb-6 border-t-4 border-[var(--rv-accent)] pt-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-widest text-[var(--rv-accent)]">LOGISTICS TREND INSIGHT</p>
            <h1 className="text-[30px] font-bold leading-tight tracking-tight">물류 트렌드 인사이트</h1>
            <p className="mt-1 text-sm text-[var(--rv-soft)]">
              매일 수집하는 물류·로봇 기사 <b className="text-[var(--rv-ink)]">{d.coverage.total.toLocaleString()}건</b>을 코드가 세어 만든 화면입니다. 기간 내 {d.coverage.inWindow.toLocaleString()}건 · 수집 기간 {day(d.coverage.first)} ~ {day(d.coverage.last)}
            </p>
          </div>
          <div className="inline-flex rounded border border-[var(--rv-line)] bg-white p-0.5 text-xs" role="group" aria-label="분석 기간">
            {[90, 180, 365].map((n) => (
              <button key={n} type="button" aria-pressed={days === n} onClick={() => setDays(n)} className={`rounded px-3 py-1.5 ${days === n ? "bg-[var(--rv-ink)] font-bold text-white" : "text-[var(--rv-soft)]"}`}>
                최근 {n === 365 ? "1년" : `${n}일`}
              </button>
            ))}
          </div>
        </div>
        {thin && (
          <p className="mt-3 rounded border border-[#f1d8d4] bg-[var(--rv-tint)] px-3 py-2 text-xs text-[var(--rv-soft)]">
            <b className="text-[var(--rv-accent)]">데이터 쌓는 중</b> · 기간 내 기사가 {d.coverage.inWindow}건이라 단계 위치와 증감이 크게 흔들릴 수 있습니다. 수집이 이어질수록 정확해집니다.
          </p>
        )}
      </header>

      <div className="space-y-6">
        {/* 1. 기술 성숙도 맵 */}
        <Section
          id="hype"
          title="기술 성숙도 맵"
          desc="기사 속 신호(공개·투자·실증·도입·회의)로 각 기술이 어느 단계에 있는지 계산했습니다. 하이프 사이클 형식을 빌렸지만 Gartner 의 평가가 아니라 우리 수집 기사 기준입니다."
          right={
            <div className="inline-flex rounded border border-[var(--rv-line)] p-0.5 text-xs" role="group" aria-label="보기 방식">
              {[false, true].map((t) => (
                <button key={String(t)} type="button" aria-pressed={tableView === t} onClick={() => setTableView(t)} className={`rounded px-2.5 py-1 ${tableView === t ? "bg-[var(--rv-ink)] text-white" : "text-[var(--rv-soft)]"}`}>
                  {t ? "표" : "맵"}
                </button>
              ))}
            </div>
          }
        >
          {d.hype.length === 0 ? (
            <p className="py-10 text-center text-sm text-[var(--rv-mute)]">기간 내 추적 기술이 언급된 기사가 없습니다.</p>
          ) : tableView ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead>
                  <tr className="bg-[#f4f3ef] text-left text-xs text-[var(--rv-soft)]">
                    {["기술", "단계", "기사", "최근 30일", "속도", ...SIGNAL_ORDER.map(signalLabel)].map((h) => <th key={h} className="border border-[var(--rv-line)] px-2 py-1.5">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {[...d.hype].sort((a, b) => a.x - b.x).map((h) => (
                    <tr key={h.name}>
                      <td className="border border-[var(--rv-line)] px-2 py-1.5 font-medium"><span aria-hidden className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: catColor(h.category) }} />{h.name}</td>
                      <td className="border border-[var(--rv-line)] px-2 py-1.5">{h.stage}{!h.confident && <span className="text-[var(--rv-mute)]"> (신호 적음)</span>}</td>
                      {[h.count, h.recent, pct(h.momentum), ...SIGNAL_ORDER.map((k) => h.signals[k])].map((v, i) => <td key={i} className="border border-[var(--rv-line)] px-2 py-1.5 tabular-nums">{v}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <>
              {/* 좁은 화면에서는 맵을 줄이지 않고 옆으로 밀어 본다 */}
              <div className="-mx-4 overflow-x-auto px-4 sm:-mx-5 sm:px-5">
                <div className="min-w-[760px]">
                  <HypeMap points={d.hype} curve={curveY} selected={selected} onSelect={setSelected} tip={tip} />
                </div>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--rv-soft)]">
                {[...new Set(d.hype.map((h) => h.category))].map((c) => (
                  <span key={c} className="inline-flex items-center gap-1.5"><span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: catColor(c) }} />{c}</span>
                ))}
                <span className="inline-flex items-center gap-1.5"><span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full border-2 border-[#898781] bg-white" />속이 빈 점 = 신호 3건 미만</span>
                <span>점 크기 = 기사 수 · 점을 누르면 근거 기사</span>
              </div>
            </>
          )}

          {sel && !tableView && (
            <div className="mt-5 grid gap-5 rounded-md bg-[#f6f5f2] p-4 md:grid-cols-[1fr_1.4fr]">
              <div>
                <p className="text-xs font-bold text-[var(--rv-accent)]">선택한 기술</p>
                <p className="text-xl font-bold">{sel.name}</p>
                <p className="text-sm text-[var(--rv-soft)]">
                  <b className="text-[var(--rv-ink)]">{sel.stage}</b> · 기사 {sel.count}건 · 최근 30일 {sel.recent}건 ({pct(sel.momentum)})
                </p>
                <p className="mb-2 mt-3 text-xs font-bold text-[var(--rv-soft)]">단계 신호 구성</p>
                <SignalBar p={sel} tip={tip} />
              </div>
              <div>
                <p className="mb-1 text-xs font-bold text-[var(--rv-soft)]">근거 기사 (최근순)</p>
                <ul className="space-y-1.5 text-sm">
                  {sel.articles.map((a) => (
                    <li key={a.id} className="leading-snug">
                      <a href={a.link} target="_blank" rel="noreferrer" className="underline decoration-[var(--rv-line)] underline-offset-2 hover:decoration-[var(--rv-accent)]">{a.titleKo ?? a.title}</a>
                      <span className="ml-1 text-xs text-[var(--rv-mute)]">{a.source} · {day(a.publishedAt)}{a.signals.length ? ` · ${a.signals.map(signalLabel).join("·")}` : ""}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </Section>

        {/* 2. CL사업부 우선 검토 보드 + 급상승 키워드 */}
        <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
          <Section id="board" title="CL사업부 우선 검토 보드" desc="열 = 계약물류 센터 운영과의 연관도(팀 설정값) · 열 안 순서 = 최근 30일 기사 수. 왼쪽 위에 있을수록 지금 볼 기술입니다.">
            <div className="grid gap-3 sm:grid-cols-3">
              {d.board.map((col) => (
                <div key={col.relevance} className="rounded-md bg-[#f6f5f2] p-2.5">
                  <p className="mb-2 flex items-center justify-between text-xs font-bold">
                    <span>{REL_LABEL[col.relevance]}</span>
                    <span className="tabular-nums text-[var(--rv-mute)]">{col.items.length}</span>
                  </p>
                  <ul className="space-y-1.5">
                    {col.items.length === 0 && <li className="py-2 text-center text-xs text-[var(--rv-mute)]">기간 내 언급 없음</li>}
                    {col.items.map((it) => (
                      <li key={it.name}>
                        <button type="button" onClick={() => { setSelected(it.name); setTableView(false); document.getElementById("hype")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} className="w-full rounded border border-[var(--rv-line)] bg-white px-2.5 py-2 text-left hover:border-[var(--rv-accent)]">
                          <span className="flex items-center gap-1.5 text-sm font-bold"><span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: catColor(it.category) }} />{it.name}</span>
                          <span className="mt-0.5 block text-[11px] text-[var(--rv-soft)]">{it.stage} · {it.count}건 · {pct(it.momentum)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Section>

          <Section id="movers" title="급상승 키워드" desc="최근 14일 기사 수 − 이전 8주 속도로 예상한 수. 막대는 최근 8주 주별 기사 수">
            <MoverList rows={d.movers.rising} tip={tip} empty="최근 14일에 눈에 띄게 늘어난 키워드가 없습니다." />
            <p className="mt-4 text-xs font-bold text-[var(--rv-soft)]">주춤한 키워드</p>
            <MoverList rows={d.movers.falling} tip={tip} empty="이전보다 크게 줄어든 키워드가 없습니다." />
          </Section>
        </div>

        {/* 3. 동종사 레이더 */}
        <Section id="peers" title="동종사 레이더: 누가 무엇을 하고 있나" desc="국내 물류·유통 기업이 언급된 기사를 단계 신호별로 셌습니다. 자사(LX판토스) 줄을 기준으로 비교해 보세요.">
          <PeerHeat peers={d.peers} tip={tip} />
        </Section>

        {/* 4. 주간 카테고리 흐름 */}
        <Section id="weekly" title="주간 카테고리 흐름" desc="최근 12주, 주별 수집 기사 수 (한국 시간 월요일 시작)">
          {d.weekly.series.length ? (
            <>
              <WeeklyBars weekly={d.weekly} tip={tip} />
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--rv-soft)]">
                {d.weekly.series.map((s) => (
                  <span key={s.category} className="inline-flex items-center gap-1.5"><span aria-hidden className="inline-block h-2.5 w-2.5 rounded-[2px]" style={{ background: catColor(s.category) }} />{s.category} <span className="tabular-nums">{s.counts.reduce((a, b) => a + b, 0)}건</span></span>
                ))}
              </div>
            </>
          ) : (
            <p className="py-8 text-center text-sm text-[var(--rv-mute)]">최근 12주에 수집된 기사가 없습니다.</p>
          )}
        </Section>

        {/* 5. 공개 지표 */}
        <Section id="indicators" title="물동량·운임 공개 지표" desc="미국 세인트루이스 연준(FRED)의 무료 공개 데이터 · 매일 수집 때 갱신 · 월간 지표라 한두 달 늦게 반영됩니다">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {indicators.map((ind) => <IndicatorCard key={ind.id} ind={ind} tip={tip} />)}
          </div>
        </Section>

        {/* 6. 외부 리포트 */}
        <Section id="reports" title="함께 볼 외부 리포트" desc="수치는 옮기지 않고 원문 링크만 둡니다. 이 페이지의 맵과 비교해 보세요.">
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {EXTERNAL_REPORTS.map((r) => (
              <li key={r.name}>
                <a href={r.href} target="_blank" rel="noreferrer" className="block h-full rounded-md border border-[var(--rv-line)] p-3 hover:border-[var(--rv-accent)]">
                  <p className="text-[11px] font-bold text-[var(--rv-accent)]">{r.by}</p>
                  <p className="font-bold leading-snug">{r.name} ↗</p>
                  <p className="mt-1 text-xs text-[var(--rv-soft)]">{r.what}</p>
                </a>
              </li>
            ))}
          </ul>
        </Section>

        <p className="pb-6 text-xs leading-relaxed text-[var(--rv-mute)]">
          계산 방법: 단계 신호는 기사 제목·요약의 표현(예: 공개·출시 / 투자 유치 / 시범·실증 / 도입·증설·수주 / 중단·지연)으로 찾고, 기술의 위치는 신호 위치의 평균입니다. 숫자는 모두 수집 기사를 센 결과이며 언론 보도량이 많은 기술이 크게 보입니다. 설정은 <code>src/config/insights.ts</code>(추적 기술·신호 표현·동종사·CL사업 연관도)에서 바꿉니다.
        </p>
      </div>
    </div>
  );
}
