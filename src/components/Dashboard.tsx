"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CATEGORIES, type NewsletterContent, type RefreshResult } from "@/lib/types";
import { ArticleCard, type ArticleView } from "./ArticleCard";
import { ContentEditor } from "./ContentEditor";
import { EmailPreview } from "./EmailPreview";
import { RelationTags } from "./RelationTags";
import { Badge, Button, api, cx, useToasts } from "./ui";

interface Status {
  llm: string | null;
  sheets: boolean;
  lookbackDays: number;
  lastRefreshAt?: string;
  lastSheetsSyncAt?: string;
  articleCount: number;
  issueCount: number;
  sources: { id: string; name: string; region: string; enabled: boolean }[];
}

interface Generated {
  content: NewsletterContent;
  mode: "llm" | "draft";
  model?: string;
  notice?: string;
  html: string;
  fragment: string;
  text: string;
  issueNo: number;
  publishDate: string;
  articleIds: string[];
  concept: string;
}

const MAX_SELECT = 5;
const DRAFT_KEY = "tdl-mi:draft";
const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10);

function loadDraft(): Generated | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Generated) : null;
  } catch {
    return null;
  }
}
function saveDraft(d: Generated | null) {
  try {
    if (d) localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    else localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* storage unavailable */
  }
}

export function Dashboard() {
  const { push, view: toasts } = useToasts();
  const [status, setStatus] = useState<Status | null>(null);
  const [articles, setArticles] = useState<ArticleView[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<RefreshResult | null>(null);

  // filters
  const [days, setDays] = useState(14);
  const [category, setCategory] = useState<string>("전체");
  const [region, setRegion] = useState<"ALL" | "KR" | "GLOBAL">("ALL");
  const [query, setQuery] = useState("");
  const [onlySelected, setOnlySelected] = useState(false);
  const [hidePublished, setHidePublished] = useState(true);

  // composer
  const [order, setOrder] = useState<string[]>([]); // 선택 순서
  const [mainId, setMainId] = useState<string | null>(null);
  const [issueNo, setIssueNo] = useState(1);
  const [publishDate, setPublishDate] = useState(today());
  const [concept, setConcept] = useState("");
  const [generating, setGenerating] = useState(false);
  const [gen, setGen] = useState<Generated | null>(null);
  const [tab, setTab] = useState<"preview" | "edit">("preview");
  const [rendering, setRendering] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, a] = await Promise.all([
        api<Status>("/api/status"),
        api<{ articles: ArticleView[]; nextIssueNo: number }>(`/api/articles?days=${days}`),
      ]);
      setStatus(s);
      setArticles(a.articles);
      setIssueNo((n) => (n <= 1 ? a.nextIssueNo : n));
      setOrder((prev) => {
        const selected = a.articles.filter((x) => x.selected).map((x) => x.id);
        const kept = prev.filter((id) => selected.includes(id));
        return [...kept, ...selected.filter((id) => !kept.includes(id))];
      });
    } catch (e) {
      push((e as Error).message, "error");
    } finally {
      setLoading(false);
    }
  }, [days, push]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    const d = loadDraft();
    if (d) {
      setGen(d);
      setConcept(d.concept);
      setIssueNo(d.issueNo);
      setPublishDate(d.publishDate);
    }
  }, []);

  const byId = useMemo(() => new Map(articles.map((a) => [a.id, a])), [articles]);
  const selected = order.map((id) => byId.get(id)).filter((a): a is ArticleView => !!a);
  const effectiveMain = mainId && order.includes(mainId) ? mainId : order[0] ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return articles.filter(
      (a) =>
        (category === "전체" || a.category === category) &&
        (region === "ALL" || a.region === region) &&
        (!onlySelected || order.includes(a.id)) &&
        (!hidePublished || !a.publishedInIssue || order.includes(a.id)) &&
        (!q || `${a.title} ${a.summary} ${a.source} ${a.keywords.join(" ")}`.toLowerCase().includes(q)),
    );
  }, [articles, category, region, query, onlySelected, hidePublished, order]);

  const counts = useMemo(() => {
    const m: Record<string, number> = { 전체: articles.length };
    for (const a of articles) m[a.category] = (m[a.category] ?? 0) + 1;
    return m;
  }, [articles]);

  const toggle = async (id: string) => {
    const next = !order.includes(id);
    if (next && order.length >= MAX_SELECT) {
      push(`이번 호 기사는 최대 ${MAX_SELECT}개까지 선택할 수 있습니다.`, "error");
      return;
    }
    setOrder((o) => (next ? [...o, id] : o.filter((x) => x !== id)));
    try {
      const r = await api<{ warning?: string }>("/api/articles/selection", { json: { ids: [id], selected: next } });
      if (r.warning) push(r.warning, "error");
    } catch (e) {
      push((e as Error).message, "error");
    }
  };

  const move = (id: string, dir: -1 | 1) =>
    setOrder((o) => {
      const i = o.indexOf(id);
      const j = i + dir;
      if (j < 0 || j >= o.length) return o;
      const c = [...o];
      [c[i], c[j]] = [c[j], c[i]];
      return c;
    });

  const refresh = async () => {
    setRefreshing(true);
    try {
      const r = await api<RefreshResult & { warning?: string }>("/api/articles/refresh", { json: { days } });
      setLastRefresh(r);
      const failed = r.perSource.filter((s) => s.error).length;
      push(`신규 ${r.added}건 적재 · 중복 ${r.duplicates}건 · 제외 ${r.filtered}건${failed ? ` · 실패 채널 ${failed}곳` : ""}`, failed ? "error" : "success");
      if (r.warning) push(r.warning, "error");
      await load();
    } catch (e) {
      push((e as Error).message, "error");
    } finally {
      setRefreshing(false);
    }
  };

  const generate = async () => {
    if (!order.length) return push("기사를 선택하세요.", "error");
    if (!concept.trim()) return push("이번 호 기획 콘셉트를 입력하세요.", "error");
    setGenerating(true);
    try {
      const articleIds = [effectiveMain!, ...order.filter((x) => x !== effectiveMain)];
      const r = await api<Omit<Generated, "issueNo" | "publishDate" | "articleIds" | "concept">>("/api/newsletter/generate", {
        json: { issueNo, publishDate, concept, articleIds, mainArticleId: effectiveMain },
      });
      const g: Generated = { ...r, issueNo, publishDate, articleIds, concept };
      setGen(g);
      saveDraft(g);
      setTab("preview");
      push(r.notice ?? `뉴스레터 생성 완료 (${r.model ?? "LLM"})`, r.mode === "draft" ? "info" : "success");
      setTimeout(() => document.getElementById("preview")?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (e) {
      push((e as Error).message, "error");
    } finally {
      setGenerating(false);
    }
  };

  const applyEdits = async () => {
    if (!gen) return;
    setRendering(true);
    try {
      const r = await api<{ html: string; fragment: string; text: string }>("/api/newsletter/render", {
        json: { content: gen.content, issueNo: gen.issueNo, publishDate: gen.publishDate, articleIds: gen.articleIds },
      });
      const g = { ...gen, ...r };
      setGen(g);
      saveDraft(g);
      setTab("preview");
      push("편집 내용을 미리보기에 반영했습니다.", "success");
    } catch (e) {
      push((e as Error).message, "error");
    } finally {
      setRendering(false);
    }
  };

  const publish = async () => {
    if (!gen) return;
    if (!confirm(`${gen.issueNo}호를 발행 이력(Newsletter_Issues)에 저장할까요? 같은 호수가 있으면 덮어씁니다.`)) return;
    setPublishing(true);
    try {
      const r = await api<{ issueNo: number; warning?: string }>("/api/issues", {
        json: { issueNo: gen.issueNo, publishDate: gen.publishDate, concept: gen.concept, articleIds: gen.articleIds, content: gen.content },
      });
      push(`${r.issueNo}호 발행 이력을 저장했습니다.`, "success");
      if (r.warning) push(r.warning, "error");
      saveDraft(null);
      setOrder([]);
      setMainId(null);
      setIssueNo(r.issueNo + 1);
      await load();
    } catch (e) {
      push((e as Error).message, "error");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-6">
      {toasts}
      {/* 상태 바 */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge tone={status?.llm ? "green" : "amber"}>{status?.llm ? `🧠 Claude 연결됨 · ${status.llm}` : "🧠 LLM 미설정 (기본 초안 모드)"}</Badge>
        <Badge tone={status?.sheets ? "green" : "amber"}>{status?.sheets ? "📗 Google Sheets 연동" : "📗 Sheets 미설정 (로컬 캐시만 사용)"}</Badge>
        <Badge>기사 {status?.articleCount ?? 0}건 · 발행 {status?.issueCount ?? 0}호</Badge>
        {status?.lastRefreshAt && <Badge>최근 수집 {new Date(status.lastRefreshAt).toLocaleString("ko-KR")}</Badge>}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        {/* ── 기사 목록 ── */}
        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-3">
            <Button variant="primary" onClick={refresh} disabled={refreshing}>
              {refreshing ? "⏳ 수집 중…" : "🔄 기사 최신화"}
            </Button>
            <select className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" value={days} onChange={(e) => setDays(Number(e.target.value))}>
              <option value={7}>최근 1주</option>
              <option value={14}>최근 2주</option>
              <option value={30}>최근 30일</option>
              <option value={0}>전체 기간</option>
            </select>
            <select className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" value={region} onChange={(e) => setRegion(e.target.value as typeof region)}>
              <option value="ALL">국내+해외</option>
              <option value="KR">국내</option>
              <option value="GLOBAL">해외</option>
            </select>
            <input
              className="min-w-40 flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              placeholder="제목·키워드·언론사 검색"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <label className="flex items-center gap-1 text-sm text-slate-600">
              <input type="checkbox" checked={onlySelected} onChange={(e) => setOnlySelected(e.target.checked)} /> 선택만
            </label>
            <label className="flex items-center gap-1 text-sm text-slate-600">
              <input type="checkbox" checked={hidePublished} onChange={(e) => setHidePublished(e.target.checked)} /> 발행된 기사 숨김
            </label>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {["전체", ...CATEGORIES].map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={cx(
                  "rounded-full border px-3 py-1 text-xs font-medium",
                  category === c ? "border-brand bg-brand text-white" : "border-slate-300 bg-white text-slate-600 hover:border-brand",
                )}
              >
                {c} <span className="opacity-70">{counts[c] ?? 0}</span>
              </button>
            ))}
          </div>

          {lastRefresh && (
            <details className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
              <summary className="cursor-pointer">
                최근 수집 결과: 신규 {lastRefresh.added} · 중복 {lastRefresh.duplicates} · 관련성/기간 제외 {lastRefresh.filtered}
              </summary>
              <ul className="mt-2 space-y-0.5">
                {lastRefresh.perSource.map((s) => (
                  <li key={s.source}>
                    <b>{s.source}</b>: 피드 {s.fetched}건 → 적재 {s.added}건 {s.error && <span className="text-red-600">· 오류: {s.error}</span>}
                  </li>
                ))}
              </ul>
            </details>
          )}

          {loading ? (
            <p className="py-10 text-center text-slate-500">불러오는 중…</p>
          ) : filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white py-12 text-center text-slate-500">
              표시할 기사가 없습니다. <b>기사 최신화</b>를 눌러 최근 기사를 수집하세요.
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((a) => (
                <ArticleCard key={a.id} article={a} checked={order.includes(a.id)} onToggle={() => toggle(a.id)} disabled={order.length >= MAX_SELECT} />
              ))}
            </div>
          )}
        </section>

        {/* ── 작성 패널 ── */}
        <aside className="space-y-4 lg:sticky lg:top-16 lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto">
          <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="font-bold text-brand">✍️ 이번 호 작성</h2>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <label className="space-y-1">
                <span className="text-xs font-semibold text-slate-600">호수</span>
                <input type="number" min={1} className="w-full rounded border border-slate-300 px-2 py-1.5" value={issueNo} onChange={(e) => setIssueNo(Number(e.target.value))} />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold text-slate-600">발행일</span>
                <input type="date" className="w-full rounded border border-slate-300 px-2 py-1.5" value={publishDate} onChange={(e) => setPublishDate(e.target.value)} />
              </label>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-600">
                <span>선택 기사 ({selected.length}/{MAX_SELECT}) · 권장 3~5개</span>
                {selected.length > 0 && <span className="font-normal text-slate-400">◉ = 메인 딥다이브</span>}
              </div>
              {selected.length === 0 ? (
                <p className="rounded border border-dashed border-slate-300 p-3 text-center text-xs text-slate-500">왼쪽 목록에서 기사를 체크하세요.</p>
              ) : (
                <ol className="space-y-1.5">
                  {selected.map((a, i) => (
                    <li key={a.id} className={cx("rounded border p-2 text-xs", a.id === effectiveMain ? "border-brand bg-blue-50/50" : "border-slate-200")}>
                      <div className="flex items-start gap-2">
                        <input type="radio" name="main" className="mt-0.5 accent-[#0b3d91]" checked={a.id === effectiveMain} onChange={() => setMainId(a.id)} title="메인 딥다이브로 지정" />
                        <div className="min-w-0 flex-1">
                          <div className="line-clamp-2 font-medium text-slate-800">{a.title}</div>
                          <div className="text-slate-500">{a.source} · {a.category}</div>
                        </div>
                        <div className="flex shrink-0 flex-col">
                          <button className="px-1 text-slate-400 hover:text-brand" onClick={() => move(a.id, -1)} disabled={i === 0}>▲</button>
                          <button className="px-1 text-slate-400 hover:text-brand" onClick={() => move(a.id, 1)} disabled={i === selected.length - 1}>▼</button>
                        </div>
                        <button className="text-slate-400 hover:text-red-600" onClick={() => toggle(a.id)} title="선택 해제">✕</button>
                      </div>
                      {a.relations.length > 0 && <div className="mt-1.5 pl-5"><RelationTags relations={a.relations} /></div>}
                    </li>
                  ))}
                </ol>
              )}
              {selected.some((a) => a.relations.some((r) => r.kind === "duplicate")) && (
                <p className="mt-2 rounded bg-red-50 px-2 py-1.5 text-xs text-red-700">⚠️ 과거 호와 중복 가능성이 있는 기사가 포함되어 있습니다.</p>
              )}
            </div>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-600">이번 호 기획 콘셉트 및 메시지</span>
              <textarea
                rows={5}
                className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm leading-relaxed"
                placeholder={"예) 피지컬 AI가 물류센터 피킹 현장으로 들어오는 속도 점검.\n당사 ○○센터 피킹 자동화 검토에 참고할 포인트 중심으로."}
                value={concept}
                onChange={(e) => setConcept(e.target.value)}
              />
            </label>
            <Button variant="primary" className="w-full py-2" onClick={generate} disabled={generating || !selected.length}>
              {generating ? "⏳ 로지봇이 작성 중… (최대 1~2분)" : "🤖 뉴스레터 생성"}
            </Button>
          </div>
          <p className="px-1 text-xs text-slate-500">
            과거 발행 이력과 비교한 연관 태그는 최근 6개월 내 호수를 기준으로 표시됩니다. 전체 이력은{" "}
            <Link href="/issues" className="text-brand underline">MI 아카이브</Link>에서 확인하세요.
          </p>
        </aside>
      </div>

      {/* ── 미리보기 ── */}
      {gen && (
        <section id="preview" className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-bold text-brand">📧 {gen.issueNo}호 미리보기</h2>
            <Badge tone={gen.mode === "llm" ? "green" : "amber"}>{gen.mode === "llm" ? `Claude 생성 · ${gen.model ?? ""}` : "기본 초안 (LLM 미사용)"}</Badge>
            <div className="inline-flex rounded-md border border-slate-300 p-0.5 text-sm">
              {(["preview", "edit"] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)} className={cx("rounded px-3 py-1", tab === t ? "bg-slate-800 text-white" : "text-slate-600")}>
                  {t === "preview" ? "미리보기" : "섹션 편집"}
                </button>
              ))}
            </div>
            <Button variant="ghost" className="ml-auto" onClick={() => { setGen(null); saveDraft(null); }}>초안 닫기</Button>
          </div>
          {tab === "edit" ? (
            <div className="space-y-3">
              <ContentEditor value={gen.content} onChange={(content) => setGen({ ...gen, content })} />
              <Button variant="primary" onClick={applyEdits} disabled={rendering}>{rendering ? "반영 중…" : "✔ 미리보기에 반영"}</Button>
            </div>
          ) : (
            <EmailPreview
              html={gen.html}
              fragment={gen.fragment}
              text={gen.text}
              fileName={`TDL-MI-${gen.issueNo}호-${gen.publishDate}.html`}
              onToast={push}
              extraActions={
                <Button variant="primary" onClick={publish} disabled={publishing}>
                  {publishing ? "저장 중…" : "✅ 발행 확정 (이력 저장)"}
                </Button>
              }
            />
          )}
        </section>
      )}
    </div>
  );
}
