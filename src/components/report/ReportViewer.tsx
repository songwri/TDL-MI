"use client";

import { useEffect, useMemo, useState } from "react";
import { issueLabel } from "@/config/brand";
import { CATEGORIES, type ReportContent, type ViewerData } from "@/lib/types";
import { Heat, InsightMap, Legend, RankBars, SegBar, TipRow, TrendBars, catColor, useTip, type SegItem } from "./parts";

const NAV = [
  { id: "sec-summary", label: "핵심 요약" },
  { id: "sec-overview", label: "한눈에" },
  { id: "sec-insights", label: "핵심 인사이트" },
  { id: "sec-trend", label: "추세" },
  { id: "sec-reco", label: "제언" },
  { id: "sec-refs", label: "참고 기사" },
] as const;

const day = (iso: string) => iso.slice(0, 10).replaceAll("-", ".");

function H2({ id, no, children, right }: { id: string; no: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div id={id} className="scroll-mt-32 flex items-end justify-between gap-3 border-b border-[var(--rv-ink)] pb-2">
      <h2 className="text-lg font-bold">
        <span className="mr-2 text-[var(--rv-accent)]">{no}</span>
        {children}
      </h2>
      {right}
    </div>
  );
}

function ViewToggle({ table, onChange }: { table: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="inline-flex rounded border border-[var(--rv-line)] p-0.5 text-xs" role="group" aria-label="보기 방식">
      {[false, true].map((t) => (
        <button key={String(t)} type="button" aria-pressed={table === t} onClick={() => onChange(t)} className={`rounded px-2.5 py-1 ${table === t ? "bg-[var(--rv-ink)] text-white" : "text-[var(--rv-soft)]"}`}>
          {t ? "표" : "차트"}
        </button>
      ))}
    </div>
  );
}

const Table = ({ head, rows }: { head: string[]; rows: (string | number)[][] }) => (
  <div className="overflow-x-auto">
    <table className="w-full min-w-[420px] border-collapse text-sm">
      <thead>
        <tr className="bg-[#f4f3ef] text-left text-xs text-[var(--rv-soft)]">{head.map((h, i) => <th key={i} className="border border-[var(--rv-line)] px-3 py-1.5">{h}</th>)}</tr>
      </thead>
      <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className="border border-[var(--rv-line)] px-3 py-1.5 tabular-nums">{c}</td>)}</tr>)}</tbody>
    </table>
  </div>
);

export function ReportViewer({ content: c, viewer }: { content: ReportContent; viewer: ViewerData }) {
  const tip = useTip();
  const { articles, brand } = viewer;
  const stats = c.stats;

  const cats = useMemo(() => CATEGORIES.filter((k) => articles.some((a) => a.category === k)) as string[], [articles]);
  const [active, setActive] = useState<Set<string>>(() => new Set(cats));
  useEffect(() => setActive(new Set(cats)), [cats]);
  const [tableView, setTableView] = useState(false);
  const [open, setOpen] = useState<Set<number>>(() => new Set([0]));
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"no" | "date">("no");
  const [current, setCurrent] = useState<string>(NAV[0].id);

  const filtering = active.size < cats.length;
  const vis = articles.filter((a) => active.has(a.category));
  const visIds = new Set(vis.map((a) => a.id));
  const noOf = new Map(articles.map((a, i) => [a.id, i + 1]));
  const byId = new Map(articles.map((a) => [a.id, a]));
  const shownThemes = c.themes.map((t, i) => ({ t, i })).filter(({ t }) => !filtering || t.sourceArticleIds.some((id) => visIds.has(id)));

  // 스크롤 위치에 맞춰 목차 강조
  useEffect(() => {
    const els = NAV.map((n) => document.getElementById(n.id)).filter((e): e is HTMLElement => !!e);
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (hit) setCurrent(hit.target.id);
      },
      { rootMargin: "-140px 0px -65% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [shownThemes.length, stats]);

  const toggleCat = (k: string) =>
    setActive((s) => {
      const n = new Set(s);
      if (n.has(k) && n.size === 1) return n; // 최소 하나는 남김
      n.has(k) ? n.delete(k) : n.add(k);
      return n;
    });
  const soloCat = (k: string) => setActive(new Set(active.size === 1 && active.has(k) ? cats : [k]));
  const goTheme = (i: number) => {
    setOpen((s) => new Set(s).add(i));
    setTimeout(() => document.getElementById(`theme-${i}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
  };

  const catItems: SegItem[] = cats.map((k) => ({ key: k, label: k, value: articles.filter((a) => a.category === k).length, color: catColor(k), active: active.has(k) }));
  const kr = vis.filter((a) => a.region === "KR").length;
  const sources = new Set(vis.map((a) => a.source)).size;

  const refs = vis
    .map((a) => ({ a, no: noOf.get(a.id)! }))
    .filter(({ a }) => !q.trim() || `${a.title} ${a.source} ${a.category}`.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((x, y) => (sort === "no" ? x.no - y.no : y.a.publishedAt.localeCompare(x.a.publishedAt)));

  return (
    <div className="rv mx-auto max-w-[900px] text-[15px] leading-7">
      {tip.view}

      {/* 머리 */}
      <header className="border-t-4 border-[var(--rv-accent)] pb-4 pt-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-wide text-[var(--rv-soft)]">{brand.publisher} | Market Intelligence Report</p>
            <p className="text-3xl font-bold leading-tight tracking-tight">{brand.product}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold leading-tight text-[var(--rv-accent)]">{issueLabel(viewer.issueNo)}</p>
            <p className="text-xs text-[var(--rv-soft)]">{day(viewer.publishDate)} 발행 · 배포 대상 {brand.audience}</p>
          </div>
        </div>
        <h1 className="mt-4 border-t border-[var(--rv-line)] pt-4 text-xl font-bold leading-snug [text-wrap:balance]">{c.headline}</h1>
      </header>

      {/* 목차 + 필터: 아래 모든 내용이 이 줄의 선택에 맞춰 바뀜 */}
      <div className="sticky top-[53px] z-20 -mx-1 border-y border-[var(--rv-line)] bg-white/95 px-1 py-2 backdrop-blur">
        <nav aria-label="목차" className="flex gap-1 overflow-x-auto text-sm">
          {NAV.map((n) => (
            <a key={n.id} href={`#${n.id}`} aria-current={current === n.id ? "true" : undefined} className={`whitespace-nowrap rounded px-2.5 py-1 ${current === n.id ? "bg-[var(--rv-ink)] font-bold text-white" : "text-[var(--rv-soft)] hover:bg-[#f1f0ec]"}`}>
              {n.label}
            </a>
          ))}
        </nav>
        {cats.length > 1 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs" role="group" aria-label="카테고리 필터">
            <span className="mr-1 font-bold text-[var(--rv-soft)]">카테고리</span>
            {cats.map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={active.has(k)}
                onClick={() => toggleCat(k)}
                onDoubleClick={() => soloCat(k)}
                className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1"
                style={{ borderColor: active.has(k) ? catColor(k) : "var(--rv-line)", background: active.has(k) ? "#fff" : "#f4f3ef", color: active.has(k) ? "var(--rv-ink)" : "var(--rv-mute)" }}
              >
                <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: active.has(k) ? catColor(k) : "#c9c7c0" }} />
                {k}
              </button>
            ))}
            {filtering && (
              <button type="button" onClick={() => setActive(new Set(cats))} className="ml-1 text-[var(--rv-accent)] underline">전체 보기</button>
            )}
            <span className="ml-auto text-[var(--rv-mute)]">{filtering ? `${vis.length}/${articles.length}건 표시 중` : "더블클릭: 해당 카테고리만"}</span>
          </div>
        )}
      </div>

      <div className="space-y-12 pb-12 pt-8">
        {/* 핵심 수치 */}
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded border border-[var(--rv-line)] bg-[var(--rv-line)] sm:grid-cols-4">
          {[
            { v: `${vis.length}건`, l: "선정 기사", s: `${sources}개 매체${filtering ? ` · 전체 ${articles.length}건` : ""}` },
            { v: `${shownThemes.length}개`, l: "핵심 주제", s: filtering ? `전체 ${c.themes.length}개` : "기사를 묶어 분석" },
            { v: `${kr} : ${vis.length - kr}`, l: "국내 : 해외", s: "기사 수 비율" },
            { v: stats ? `${stats.repeat.followUp}건` : "-", l: "지난 호 연관", s: stats ? `신규 ${stats.repeat.fresh}건 · 전체 기준` : "" },
          ].map((k) => (
            <div key={k.l} className="bg-white px-4 py-3">
              <p className="text-3xl font-bold leading-9 tabular-nums">{k.v}</p>
              <p className="text-xs font-bold text-[var(--rv-soft)]">{k.l}</p>
              <p className="text-[11px] text-[var(--rv-mute)]">{k.s}</p>
            </div>
          ))}
        </div>

        {/* 핵심 요약 */}
        <section aria-labelledby="sec-summary" className="space-y-3">
          <H2 id="sec-summary" no="■">핵심 요약</H2>
          <ul className="space-y-2 border-l-[3px] border-[var(--rv-accent)] bg-[#f6f5f2] px-5 py-4">
            {c.executiveSummary.map((s, i) => (
              <li key={i} className="flex gap-2"><span aria-hidden className="text-[var(--rv-mute)]">▪</span><span>{s}</span></li>
            ))}
          </ul>
        </section>

        {/* 한눈에 */}
        {stats && (
          <section aria-labelledby="sec-overview" className="space-y-5">
            <H2 id="sec-overview" no="■" right={<ViewToggle table={tableView} onChange={setTableView} />}>이번 호 한눈에</H2>
            {tableView ? (
              <Table head={["카테고리", "기사 수", "비율"]} rows={catItems.map((i) => [i.label, i.value, `${Math.round((i.value / articles.length) * 100)}%`])} />
            ) : (
              <div>
                <p className="mb-1.5 text-sm font-bold">카테고리 구성 <span className="text-xs font-normal text-[var(--rv-mute)]">조각을 누르면 해당 카테고리만 봅니다</span></p>
                <SegBar items={catItems} height={32} onPick={soloCat} tip={tip} dimInactive />
                <Legend items={catItems} onPick={toggleCat} />
              </div>
            )}
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="mb-1.5 text-sm font-bold">국내·해외</p>
                <SegBar tip={tip} height={20} items={stats.byRegion.map((r, i) => ({ key: r.label, label: r.label, value: r.count, color: i === 0 ? "#52514e" : "#a9a7a0" }))} />
                <Legend items={stats.byRegion.map((r, i) => ({ key: r.label, label: r.label, value: r.count, color: i === 0 ? "#52514e" : "#a9a7a0" }))} />
              </div>
              <div>
                <p className="mb-1.5 text-sm font-bold">지난 호와의 관계</p>
                {(() => {
                  const rep: SegItem[] = [
                    { key: "f", label: "연관·후속", value: stats.repeat.followUp, color: "#a72b2b" },
                    { key: "n", label: "신규 주제", value: stats.repeat.fresh, color: "#a9a7a0" },
                    { key: "d", label: "중복 가능", value: stats.repeat.duplicate, color: "#d6d4cc" },
                  ];
                  return <><SegBar tip={tip} height={20} items={rep} /><Legend items={rep} /></>;
                })()}
              </div>
            </div>
            {stats.topKeywords.length > 0 && (
              <div>
                <p className="mb-1.5 text-sm font-bold">
                  많이 언급된 기업·기술
                  {stats.trend.issues.length > 1 && (
                    <span className="ml-3 text-xs font-normal text-[var(--rv-soft)]">
                      <span aria-hidden className="mr-1 inline-block h-2.5 w-2.5 rounded-[2px] bg-[#a72b2b]" />지난 호에서도 등장
                      <span aria-hidden className="ml-3 mr-1 inline-block h-2.5 w-2.5 rounded-[2px] bg-[#a9a7a0]" />이번 호 처음
                    </span>
                  )}
                </p>
                <RankBars tip={tip} rows={stats.topKeywords.map((k) => ({ label: k.label, value: k.count, color: k.seenBefore ? "#a72b2b" : "#a9a7a0", hint: k.seenBefore ? "지난 호에서도 등장" : "이번 호 처음" }))} />
              </div>
            )}
          </section>
        )}

        {/* 핵심 인사이트 */}
        <section aria-labelledby="sec-insights" className="space-y-5">
          <H2
            id="sec-insights"
            no="■"
            right={
              <button type="button" className="text-xs text-[var(--rv-soft)] underline" onClick={() => setOpen(open.size === c.themes.length ? new Set() : new Set(c.themes.map((_, i) => i)))}>
                {open.size === c.themes.length ? "모두 접기" : "모두 펼치기"}
              </button>
            }
          >
            핵심 인사이트
          </H2>
          {c.themes.length > 1 && articles.length > 1 && (
            <div>
              <p className="mb-1 text-sm font-bold">주제와 근거 기사의 연결</p>
              <InsightMap themes={c.themes} articles={articles} active={active} onTheme={goTheme} />
            </div>
          )}
          {shownThemes.length === 0 && <p className="rounded border border-dashed border-[var(--rv-line)] p-4 text-center text-sm text-[var(--rv-mute)]">선택한 카테고리에 해당하는 주제가 없습니다.</p>}
          {shownThemes.map(({ t, i }) => {
            const isOpen = open.has(i);
            return (
              <article key={i} id={`theme-${i}`} className="scroll-mt-32 rounded border border-[var(--rv-line)] bg-white">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpen((s) => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; })}
                  className="flex w-full items-start gap-3 px-5 py-4 text-left"
                >
                  <span className="mt-0.5 text-lg font-bold text-[var(--rv-accent)]">{i + 1}.</span>
                  <span className="flex-1">
                    <span className="block text-[17px] font-bold leading-snug">{t.title}</span>
                    <span className="mt-1 block text-sm text-[var(--rv-soft)]">{t.lead}</span>
                  </span>
                  <span aria-hidden className={`mt-1 text-[var(--rv-mute)] transition-transform ${isOpen ? "rotate-180" : ""}`}>▾</span>
                </button>
                {isOpen && (
                  <div className="space-y-4 border-t border-[var(--rv-line)] px-5 pb-5 pt-4">
                    {t.body.map((p, k) => <p key={k}>{p}</p>)}
                    <div>
                      <p className="text-sm font-bold">핵심 인사이트</p>
                      <ul className="mt-1 space-y-1">{t.insights.map((x, k) => <li key={k} className="flex gap-2"><span aria-hidden className="text-[var(--rv-mute)]">▪</span>{x}</li>)}</ul>
                    </div>
                    {t.implications.length > 0 && (
                      <div className="border-l-[3px] border-[var(--rv-accent)] bg-[#f6f5f2] px-4 py-3">
                        <p className="text-sm font-bold text-[var(--rv-accent)]">{brand.audience} 시사점</p>
                        <ul className="mt-1 space-y-1">{t.implications.map((x, k) => <li key={k} className="flex gap-2"><span aria-hidden className="text-[var(--rv-accent)]">→</span>{x}</li>)}</ul>
                      </div>
                    )}
                  </div>
                )}
                <footer className="flex flex-wrap items-center gap-1.5 border-t border-[var(--rv-line)] px-5 py-2.5 text-xs text-[var(--rv-mute)]">
                  근거 기사 (원문 링크)
                  {t.sourceArticleIds.map((id) => {
                    const a = byId.get(id);
                    if (!a) return null;
                    return (
                      <a
                        key={id}
                        href={a.link}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded border px-1.5 py-0.5 font-bold text-[var(--rv-accent)] hover:bg-[var(--rv-tint)]"
                        style={{ borderColor: catColor(a.category), opacity: active.has(a.category) ? 1 : 0.3 }}
                        onPointerMove={(e) => tip.show(e, <><p className="font-bold text-[var(--rv-ink)]">{a.title}</p><p className="text-[var(--rv-soft)]">{a.source} · {day(a.publishedAt)}</p><TipRow value={a.category} label="카테고리" color={catColor(a.category)} /></>)}
                        onFocus={(e) => tip.show(e, <p className="font-bold">{a.title}</p>)}
                        onPointerLeave={tip.hide}
                        onBlur={tip.hide}
                      >
                        [{noOf.get(id)}]
                      </a>
                    );
                  })}
                </footer>
              </article>
            );
          })}
        </section>

        {/* 추세 */}
        <section aria-labelledby="sec-trend" className="space-y-5">
          <H2 id="sec-trend" no="■">추세 분석</H2>
          <p>{c.trend.overview}</p>
          {c.trend.notes.length > 0 && <ul className="space-y-1">{c.trend.notes.map((n, i) => <li key={i} className="flex gap-2"><span aria-hidden className="text-[var(--rv-mute)]">▪</span>{n}</li>)}</ul>}
          {stats && stats.trend.issues.length > 1 ? (
            <>
              <div>
                <div className="mb-2 flex items-center justify-between"><p className="text-sm font-bold">호별 카테고리 추이</p>{filtering && <span className="text-xs text-[var(--rv-mute)]">선택한 카테고리만 표시</span>}</div>
                {tableView ? (
                  <Table
                    head={["카테고리", ...stats.trend.issues.map((i) => issueLabel(i.no))]}
                    rows={stats.trend.category.filter((k) => active.has(k.label)).map((k) => [k.label, ...k.counts])}
                  />
                ) : (
                  <>
                    <TrendBars stats={stats} active={active} tip={tip} />
                    <Legend items={stats.trend.category.filter((k) => active.has(k.label)).map((k) => ({ key: k.label, label: k.label, value: k.counts.reduce((n, v) => n + v, 0), color: catColor(k.label) }))} />
                  </>
                )}
              </div>
              <div>
                <p className="mb-2 text-sm font-bold">키워드 호별 등장</p>
                {tableView ? <Table head={["키워드", ...stats.trend.issues.map((i) => issueLabel(i.no))]} rows={stats.trend.keywords.map((k) => [k.label, ...k.counts])} /> : <Heat stats={stats} tip={tip} />}
              </div>
            </>
          ) : (
            <p className="text-sm text-[var(--rv-mute)]">첫 호로 비교 대상 없음. 다음 호부터 호별 추세를 제공합니다.</p>
          )}
        </section>

        {/* 제언 */}
        <section aria-labelledby="sec-reco" className="space-y-3">
          <H2 id="sec-reco" no="■">제언 및 향후 과제</H2>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-sm font-bold">제언</p>
              <ol className="space-y-2">
                {c.recommendations.map((r, i) => (
                  <li key={i} className="flex gap-2"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--rv-accent)] text-[11px] font-bold text-white">{i + 1}</span><span>{r}</span></li>
                ))}
              </ol>
            </div>
            <div>
              <p className="mb-1 text-sm font-bold">다음 호까지 확인할 사항</p>
              <ul className="space-y-1.5 text-[var(--rv-soft)]">{c.watchList.map((w, i) => <li key={i} className="flex gap-2"><span aria-hidden>◦</span>{w}</li>)}</ul>
            </div>
          </div>
        </section>

        {/* 참고 기사 */}
        <section aria-labelledby="sec-refs" className="space-y-3">
          <H2
            id="sec-refs"
            no="■"
            right={
              <div className="flex items-center gap-2 text-xs">
                <input aria-label="참고 기사 검색" value={q} onChange={(e) => setQ(e.target.value)} placeholder="제목·출처 검색" className="w-36 rounded border border-[var(--rv-line)] px-2 py-1" />
                <select aria-label="정렬" value={sort} onChange={(e) => setSort(e.target.value as "no" | "date")} className="rounded border border-[var(--rv-line)] bg-white px-1.5 py-1">
                  <option value="no">번호순</option>
                  <option value="date">최신순</option>
                </select>
              </div>
            }
          >
            참고 기사
          </H2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="bg-[#f4f3ef] text-left text-xs text-[var(--rv-soft)]">
                  {["No.", "기사 제목 (원문 링크)", "출처", "카테고리", "일자"].map((h) => <th key={h} className="border border-[var(--rv-line)] px-3 py-1.5">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {refs.map(({ a, no }) => (
                  <tr key={a.id} className="hover:bg-[var(--rv-tint)]">
                    <td className="border border-[var(--rv-line)] px-3 py-2 tabular-nums text-[var(--rv-soft)]">{no}</td>
                    <td className="border border-[var(--rv-line)] px-3 py-2"><a href={a.link} target="_blank" rel="noreferrer" className="underline decoration-[var(--rv-line)] underline-offset-2 hover:decoration-[var(--rv-accent)]">{a.title}</a></td>
                    <td className="border border-[var(--rv-line)] px-3 py-2 text-[var(--rv-soft)]">{a.source}</td>
                    <td className="border border-[var(--rv-line)] px-3 py-2 whitespace-nowrap"><span aria-hidden className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: catColor(a.category) }} />{a.category}</td>
                    <td className="border border-[var(--rv-line)] px-3 py-2 whitespace-nowrap tabular-nums text-[var(--rv-soft)]">{day(a.publishedAt)}</td>
                  </tr>
                ))}
                {refs.length === 0 && <tr><td colSpan={5} className="border border-[var(--rv-line)] px-3 py-6 text-center text-[var(--rv-mute)]">조건에 맞는 기사가 없습니다.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
