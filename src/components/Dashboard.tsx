"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CATEGORIES, type ReportContent, type RefreshResult, type ViewerData } from "@/lib/types";
import { copyText } from "@/lib/clipboard";
import { ArticleCard, type ArticleView } from "./ArticleCard";
import { ContentEditor } from "./ContentEditor";
import { EmailPreview, ReportActions } from "./EmailPreview";
import { ReportViewer } from "./report/ReportViewer";
import { RelationTags } from "./RelationTags";
import { Badge, Button, api, cx, useToasts } from "./ui";

interface Status {
  store: "sheets" | "local";
  sheetsVia: "apps-script" | "service-account" | null;
  llm: string | null;
  writer: "claude-code" | "api";
  sheets: boolean;
  lookbackDays: number;
  lastRefreshAt?: string;
  lastSheetsSyncAt?: string;
  articleCount: number;
  issueCount: number;
  sources: { id: string; name: string; region: string; enabled: boolean }[];
}

interface HandoffSummary {
  issueNo: number;
  publishDate: string;
  concept: string;
  articleIds: string[];
  createdAt: string;
  hasContent: boolean;
  contentSavedAt?: string;
}

interface Generated {
  content: ReportContent;
  mode: "llm" | "draft" | "claude-code";
  model?: string;
  notice?: string;
  html: string;
  fragment: string;
  text: string;
  /** 인터랙티브 리포트 화면용. 예전에 저장된 초안에는 없을 수 있음 */
  viewer?: ViewerData;
  tables?: { html: string; fragment: string };
  issueNo: number;
  publishDate: string;
  articleIds: string[];
  concept: string;
}

const MAX_SELECT = 12;
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
  const [refreshNote, setRefreshNote] = useState("");
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
  const [issueNo, setIssueNo] = useState(1);
  const [publishDate, setPublishDate] = useState(today());
  const [concept, setConcept] = useState("");
  const [generating, setGenerating] = useState(false);
  const [gen, setGen] = useState<Generated | null>(null);
  const [tab, setTab] = useState<"view" | "mail" | "edit">("view");
  const [rendering, setRendering] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [handoffs, setHandoffs] = useState<HandoffSummary[]>([]);
  const [savingHandoff, setSavingHandoff] = useState(false);
  const [pasteFor, setPasteFor] = useState<number | null>(null);
  const [pasteText, setPasteText] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, a, h] = await Promise.all([
        api<Status>("/api/status"),
        api<{ articles: ArticleView[]; nextIssueNo: number }>(`/api/articles?days=${days}`),
        api<{ handoffs: HandoffSummary[] }>("/api/handoff"),
      ]);
      setStatus(s);
      setHandoffs(h.handoffs);
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
      // 채널을 하나씩 요청해 웹 서버의 실행 시간 제한(60초)을 넘지 않게 한다
      const total: RefreshResult = { added: 0, duplicates: 0, filtered: 0, perSource: [] };
      const sources = (status?.sources ?? []).filter((s) => s.enabled);
      for (const [i, s] of sources.entries()) {
        setRefreshNote(`${s.name} 수집 중 (${i + 1}/${sources.length})`);
        try {
          const r = await api<RefreshResult & { warning?: string }>("/api/articles/refresh", { json: { days, sourceIds: [s.id] } });
          total.added += r.added;
          total.duplicates += r.duplicates;
          total.filtered += r.filtered;
          total.perSource.push(...r.perSource);
          if (r.warning) push(r.warning, "error");
        } catch (e) {
          total.perSource.push({ source: s.name, fetched: 0, added: 0, error: (e as Error).message });
        }
      }
      setLastRefresh(total);
      const failed = total.perSource.filter((s) => s.error).length;
      push(`신규 ${total.added}건 적재 · 중복 ${total.duplicates}건 · 제외 ${total.filtered}건${failed ? ` · 실패 채널 ${failed}곳` : ""}`, failed ? "error" : "success");
      await load();
    } catch (e) {
      push((e as Error).message, "error");
    } finally {
      setRefreshing(false);
    }
  };

  const generate = async () => {
    if (!order.length) return push("기사를 선택하세요.", "error");
    if (!concept.trim()) return push("이번 호 기획 의도를 입력하세요.", "error");
    setGenerating(true);
    try {
      const articleIds = order;
      const r = await api<Omit<Generated, "issueNo" | "publishDate" | "articleIds" | "concept">>("/api/newsletter/generate", {
        json: { issueNo, publishDate, concept, articleIds },
      });
      const g: Generated = { ...r, issueNo, publishDate, articleIds, concept };
      setGen(g);
      saveDraft(g);
      setTab("view");
      push(r.notice ?? `뉴스레터 생성 완료 (${r.model ?? "LLM"})`, r.mode === "draft" ? "info" : "success");
      setTimeout(() => document.getElementById("preview")?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (e) {
      push((e as Error).message, "error");
    } finally {
      setGenerating(false);
    }
  };

  /** 토큰 없이 쓰는 기본 흐름: 선정 결과를 서버에 의뢰서로 저장 → Claude Code 에서 작성 */
  const saveHandoff = async () => {
    if (!order.length) return push("기사를 선택하세요.", "error");
    if (!concept.trim()) return push("이번 호 기획 의도를 입력하세요.", "error");
    setSavingHandoff(true);
    try {
      await api("/api/handoff", {
        json: { issueNo, publishDate, concept, articleIds: order },
      });
      push(`제${issueNo}호 작성 의뢰서를 저장했습니다. Claude Code에서 /write-report ${issueNo} 를 실행하세요.`, "success");
      const h = await api<{ handoffs: HandoffSummary[] }>("/api/handoff");
      setHandoffs(h.handoffs);
    } catch (e) {
      push((e as Error).message, "error");
    } finally {
      setSavingHandoff(false);
    }
  };

  const copyHandoffPrompt = async (n: number) => {
    try {
      const h = await api<{ prompt: string }>(`/api/handoff/${n}`);
      await copyText(h.prompt);
      push("의뢰서를 복사했어요. Claude 대화창에 붙여넣고, 받은 JSON 을 '작성본 붙여넣기'에 넣으세요.", "success");
    } catch (e) {
      push((e as Error).message, "error");
    }
  };

  const showHandoffResult = (r: { request: HandoffSummary; content: ReportContent; html: string; fragment: string; text: string; viewer: ViewerData; tables: { html: string; fragment: string } }) => {
    const g: Generated = {
      content: r.content,
      mode: "claude-code",
      html: r.html,
      fragment: r.fragment,
      text: r.text,
      viewer: r.viewer,
      tables: r.tables,
      issueNo: r.request.issueNo,
      publishDate: r.request.publishDate,
      articleIds: r.request.articleIds,
      concept: r.request.concept,
    };
    setGen(g);
    saveDraft(g);
    setTab("view");
    // 작성 패널도 의뢰서 기준으로 맞춘다 (CLI 에서 만든 의뢰서 포함)
    setIssueNo(r.request.issueNo);
    setPublishDate(r.request.publishDate);
    setConcept(r.request.concept);
    setOrder(r.request.articleIds);
    setTimeout(() => document.getElementById("preview")?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const loadHandoff = async (n: number) => {
    try {
      const r = await api<{ request: HandoffSummary; content: ReportContent | null; html: string; fragment: string; text: string; viewer: ViewerData; tables: { html: string; fragment: string } }>(`/api/handoff/${n}`);
      if (!r.content) return push(`제${n}호 작성본이 아직 없습니다. Claude Code에서 /write-report ${n} 를 실행하세요.`, "error");
      showHandoffResult({ ...r, content: r.content });
      push(`제${n}호 작성본을 불러왔습니다.`, "success");
    } catch (e) {
      push((e as Error).message, "error");
    }
  };

  const submitPaste = async () => {
    if (pasteFor === null) return;
    try {
      const r = await api<{ request: HandoffSummary; content: ReportContent; html: string; fragment: string; text: string; viewer: ViewerData; tables: { html: string; fragment: string } }>(
        `/api/handoff/${pasteFor}/content`,
        { json: { json: pasteText } },
      );
      showHandoffResult(r);
      setPasteFor(null);
      setPasteText("");
      push("작성본을 저장하고 미리보기에 띄웠습니다.", "success");
      const h = await api<{ handoffs: HandoffSummary[] }>("/api/handoff");
      setHandoffs(h.handoffs);
    } catch (e) {
      push((e as Error).message, "error");
    }
  };

  const applyEdits = async () => {
    if (!gen) return;
    setRendering(true);
    try {
      const r = await api<{ html: string; fragment: string; text: string; viewer: ViewerData; tables: { html: string; fragment: string } }>("/api/newsletter/render", {
        json: { content: gen.content, issueNo: gen.issueNo, publishDate: gen.publishDate, articleIds: gen.articleIds },
      });
      const g = { ...gen, ...r };
      setGen(g);
      saveDraft(g);
      setTab("view");
      push("편집 내용을 미리보기에 반영했습니다.", "success");
    } catch (e) {
      push((e as Error).message, "error");
    } finally {
      setRendering(false);
    }
  };

  const publish = async () => {
    if (!gen) return;
    if (!confirm(`제${gen.issueNo}호를 발행 이력(Newsletter_Issues)에 저장할까요? 같은 호수가 있으면 덮어씁니다.`)) return;
    setPublishing(true);
    try {
      const r = await api<{ issueNo: number; warning?: string }>("/api/issues", {
        json: { issueNo: gen.issueNo, publishDate: gen.publishDate, concept: gen.concept, articleIds: gen.articleIds, content: gen.content },
      });
      push(`제${r.issueNo}호 발행 이력을 저장했습니다.`, "success");
      if (r.warning) push(r.warning, "error");
      saveDraft(null);
      setOrder([]);
      setIssueNo(r.issueNo + 1);
      await load();
    } catch (e) {
      push((e as Error).message, "error");
    } finally {
      setPublishing(false);
    }
  };

  const publishButton = (
    <Button onClick={publish} disabled={publishing}>
      {publishing ? "저장 중…" : "✅ 발행 확정"}
    </Button>
  );

  return (
    <div className="space-y-6">
      {toasts}
      {/* 상태 줄: 작업에 필요한 사실만. 연결 문제가 있을 때만 경고를 보인다 */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
        <span>기사 {status?.articleCount ?? 0}건</span>
        <span>발행 {status?.issueCount ?? 0}호</span>
        {status?.lastRefreshAt && <span>최근 수집 {new Date(status.lastRefreshAt).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" })}</span>}
        {status && !status.sheets && status.store === "sheets" && (
          <span className="font-semibold text-red-700">구글 시트 연결 설정이 필요합니다. 관리자에게 문의해 주세요.</span>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        {/* ── 기사 목록 ── */}
        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-3">
            <Button variant="primary" onClick={refresh} disabled={refreshing}>
              {refreshing ? `⏳ ${refreshNote || "수집 중…"}` : "🔄 기사 최신화"}
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
            <h2 className="font-bold text-brand">제{issueNo}호 작성</h2>
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
                <span>선택 기사 ({selected.length}/{MAX_SELECT}) · 권장 4~8건</span>
                {selected.length > 0 && <span className="font-normal text-slate-400">번호 = 참고 기사 번호</span>}
              </div>
              {selected.length === 0 ? (
                <p className="rounded border border-dashed border-slate-300 p-3 text-center text-xs text-slate-500">왼쪽 목록에서 기사를 체크하세요.</p>
              ) : (
                <ol className="space-y-1.5">
                  {selected.map((a, i) => (
                    <li key={a.id} className="rounded border border-slate-200 p-2 text-xs">
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 w-4 shrink-0 text-center font-bold text-brand">{i + 1}</span>
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
                <p className="mt-2 rounded bg-red-50 px-2 py-1.5 text-xs text-red-700">⚠️ 지난 호와 중복 가능성이 있는 기사가 포함되어 있습니다.</p>
              )}
            </div>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-600">이번 호 기획 의도 (다루려는 질문·관점)</span>
              <textarea
                rows={5}
                className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm leading-relaxed"
                placeholder={"예) 로봇 피킹이 상용화 단계에 들어섰는지 점검하고, 운영 센터 피킹 자동화 검토에 필요한 판단 기준을 정리한다."}
                value={concept}
                onChange={(e) => setConcept(e.target.value)}
              />
            </label>
            <Button variant="primary" className="w-full py-2" onClick={saveHandoff} disabled={savingHandoff || !selected.length}>
              {savingHandoff ? "저장 중…" : "📝 작성 의뢰 저장"}
            </Button>
            {status?.writer === "api" && (
              <Button className="w-full" onClick={generate} disabled={generating || !selected.length}>
                {generating ? "작성 중…" : "바로 작성"}
              </Button>
            )}
          </div>

          <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="font-bold text-brand">리포트 작성 현황</h2>
            <ol className="space-y-1 text-xs text-slate-600">
              <li><b className="text-slate-800">1.</b> 위에서 기사를 고르고 <b>작성 의뢰 저장</b></li>
              <li><b className="text-slate-800">2.</b> 작성 담당자가 Claude Code에서 <code className="rounded bg-slate-100 px-1">/write-report 호수</code> 실행</li>
              <li><b className="text-slate-800">3.</b> 상태가 <b>작성 완료</b>가 되면 <b>작성본 불러오기</b>로 확인하고 발송</li>
            </ol>
            {handoffs.length === 0 ? (
              <p className="rounded border border-dashed border-slate-300 p-3 text-center text-xs text-slate-500">아직 저장된 의뢰서가 없습니다.</p>
            ) : (
              <ul className="space-y-1.5">
                {handoffs.slice(0, 4).map((h) => (
                  <li key={h.issueNo} className="rounded border border-slate-200 p-2 text-xs">
                    <div className="flex items-center gap-2">
                      <b className="text-slate-800">제{h.issueNo}호</b>
                      <Badge tone={h.hasContent ? "green" : "amber"}>{h.hasContent ? "작성 완료" : "작성 대기"}</Badge>
                      <span className="text-slate-400">{h.publishDate}</span>
                    </div>
                    <div className="mt-0.5 line-clamp-1 text-slate-500">{h.concept}</div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <Button className="px-2 py-1 text-xs" variant={h.hasContent ? "primary" : "secondary"} onClick={() => loadHandoff(h.issueNo)} disabled={!h.hasContent}>
                        작성본 불러오기
                      </Button>
                    </div>
                    <details className="mt-1.5 text-slate-500">
                      <summary className="cursor-pointer select-none">다른 방법으로 작성</summary>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <Button className="px-2 py-1 text-xs" onClick={() => copyHandoffPrompt(h.issueNo)}>의뢰서 복사</Button>
                        <Button className="px-2 py-1 text-xs" variant="ghost" onClick={() => setPasteFor(pasteFor === h.issueNo ? null : h.issueNo)}>
                          작성본 붙여넣기
                        </Button>
                      </div>
                    </details>
                    {pasteFor === h.issueNo && (
                      <div className="mt-2 space-y-1.5">
                        <textarea
                          id={`paste-${h.issueNo}`}
                          rows={6}
                          className="w-full rounded border border-slate-300 p-2 font-mono text-[11px]"
                          placeholder="Claude가 답한 JSON 을 그대로 붙여넣으세요"
                          value={pasteText}
                          onChange={(e) => setPasteText(e.target.value)}
                        />
                        <Button variant="primary" className="px-2 py-1 text-xs" onClick={submitPaste} disabled={!pasteText.trim()}>
                          검증하고 저장
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <Button variant="ghost" className="w-full text-xs" onClick={load}>↻ 새로고침</Button>
          </div>
          <p className="px-1 text-xs text-slate-500">
            기사의 <b>제N호 후속·연관</b> 태그는 최근 6개월 발행분과 비교한 결과입니다. 전체 이력은{" "}
            <Link href="/issues" className="text-brand underline">발행 이력</Link>에서 확인하세요.
          </p>
        </aside>
      </div>

      {/* ── 미리보기 ── */}
      {gen && (
        <section id="preview" className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-bold text-brand">제{gen.issueNo}호 미리보기</h2>
            <div className="inline-flex rounded-md border border-slate-300 p-0.5 text-sm">
              {([["view", "리포트 보기"], ["mail", "메일 본문"], ["edit", "내용 수정"]] as const)
                .filter(([k]) => k !== "view" || gen.viewer)
                .map(([k, label]) => (
                  <button key={k} onClick={() => setTab(k)} className={cx("rounded px-3 py-1", tab === k || (k === "mail" && tab === "view" && !gen.viewer) ? "bg-slate-800 text-white" : "text-slate-600")}>
                    {label}
                  </button>
                ))}
            </div>
            <Button variant="ghost" className="ml-auto" onClick={() => { setGen(null); saveDraft(null); }}>닫기</Button>
          </div>
          {tab === "edit" ? (
            <div className="space-y-3">
              <ContentEditor value={gen.content} onChange={(content) => setGen({ ...gen, content })} />
              <Button variant="primary" onClick={applyEdits} disabled={rendering}>{rendering ? "반영 중…" : "✔ 수정 내용 반영"}</Button>
            </div>
          ) : tab === "view" && gen.viewer ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <span>화면에서 필터·펼침으로 살펴보는 보기입니다. 메일에는 <b>메일 본문용 복사</b>로 같은 내용의 정지된 표 버전이 붙습니다.</span>
                <ReportActions html={gen.html} fragment={gen.fragment} text={gen.text} fileName={`TDL-Trend-제${gen.issueNo}호-${gen.publishDate}.html`} onToast={push} extra={publishButton} />
              </div>
              <ReportViewer content={gen.content} viewer={gen.viewer} />
            </div>
          ) : (
            <EmailPreview
              html={gen.html}
              fragment={gen.fragment}
              text={gen.text}
              tables={gen.tables}
              fileName={`TDL-Trend-제${gen.issueNo}호-${gen.publishDate}.html`}
              onToast={push}
              extraActions={publishButton}
            />
          )}
        </section>
      )}
    </div>
  );
}
