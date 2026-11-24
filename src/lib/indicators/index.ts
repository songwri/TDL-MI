import fs from "node:fs/promises";
import path from "node:path";
import { FRED_SERIES } from "@/config/insights";
import { config, sheetsEnabled, storeMode } from "@/lib/config";
import * as sheets from "@/lib/store/sheets";

/**
 * 공개 경제 지표 (FRED). 무료 CSV 를 받아 sheets 모드면 시트 Indicators 탭, 아니면 data/indicators.json 에 저장한다.
 * 받는 일은 GitHub Actions(npm run indicators)가 하고, 웹은 저장된 값만 읽는다.
 */

export interface Observation {
  date: string;
  value: number;
}

export interface Indicator {
  id: string;
  name: string;
  note: string;
  unit: string;
  source: string;
  updatedAt?: string;
  points: Observation[];
  /** 최신값, 전년 같은 달 대비 변화율(%) */
  latest?: Observation;
  yoy?: number | null;
}

/** FRED CSV: 첫 줄 머리글(observation_date 또는 DATE, 시리즈ID), 빈 값은 "." */
export function parseFredCsv(csv: string): Observation[] {
  const lines = csv.trim().split(/\r?\n/);
  if (!lines.length || !/date/i.test(lines[0])) throw new Error("FRED 응답이 CSV 형식이 아닙니다.");
  return lines
    .slice(1)
    .map((l) => l.split(","))
    .filter(([d, v]) => /^\d{4}-\d{2}-\d{2}$/.test(d) && v !== undefined && v.trim() !== "." && v.trim() !== "")
    .map(([d, v]) => ({ date: d, value: Number(v) }))
    .filter((o) => Number.isFinite(o.value));
}

export async function fetchFred(id: string, fetchImpl: typeof fetch = fetch): Promise<Observation[]> {
  const res = await fetchImpl(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${encodeURIComponent(id)}`, { headers: { "User-Agent": "TDL-Trend/1.0" } });
  if (!res.ok) throw new Error(`FRED ${id}: HTTP ${res.status}`);
  return parseFredCsv(await res.text());
}

/** 최신값과 1년 전(같은 달 또는 가장 가까운 이전 관측) 대비 변화율 */
export function summarize(points: Observation[]): { latest?: Observation; yoy: number | null } {
  const latest = points[points.length - 1];
  if (!latest) return { yoy: null };
  const target = `${Number(latest.date.slice(0, 4)) - 1}${latest.date.slice(4)}`;
  const base = [...points].reverse().find((p) => p.date <= target);
  return { latest, yoy: base && base.value ? Math.round(((latest.value - base.value) / base.value) * 1000) / 10 : null };
}

const KEEP = 60; // 최근 60개 관측 (월간 5년)
const localPath = () => path.join(config.dataDir, "indicators.json");
const inSheets = () => storeMode() === "sheets" && sheetsEnabled();

async function readStored(): Promise<Map<string, { updatedAt: string; points: Observation[] }>> {
  const out = new Map<string, { updatedAt: string; points: Observation[] }>();
  if (inSheets()) {
    await sheets.ensureSchemaOnce();
    for (const r of await sheets.listIndicatorRows()) {
      try {
        out.set(r.id, { updatedAt: r.updatedAt, points: JSON.parse(r.json) });
      } catch {
        /* 깨진 줄은 건너뜀 */
      }
    }
    return out;
  }
  try {
    const raw = JSON.parse(await fs.readFile(localPath(), "utf8")) as Record<string, { updatedAt: string; points: Observation[] }>;
    for (const [k, v] of Object.entries(raw)) out.set(k, v);
  } catch {
    /* 아직 없음 */
  }
  return out;
}

async function store(id: string, name: string, points: Observation[]) {
  const updatedAt = new Date().toISOString();
  const kept = points.slice(-KEEP);
  if (inSheets()) {
    await sheets.ensureSchemaOnce();
    await sheets.upsertIndicatorRow({ id, name, updatedAt, json: JSON.stringify(kept) });
    return;
  }
  const all = Object.fromEntries(await readStored());
  all[id] = { updatedAt, points: kept };
  await fs.mkdir(config.dataDir, { recursive: true });
  await fs.writeFile(localPath(), JSON.stringify(all, null, 2), "utf8");
}

/** 설정된 지표를 모두 받아 저장. 실패한 지표는 건너뛰고 결과에 남긴다 */
export async function refreshIndicators(fetchImpl?: typeof fetch) {
  const results: { id: string; ok: boolean; count?: number; error?: string }[] = [];
  for (const s of FRED_SERIES) {
    try {
      const points = await fetchFred(s.id, fetchImpl);
      if (!points.length) throw new Error("관측값이 없습니다.");
      await store(s.id, s.name, points);
      results.push({ id: s.id, ok: true, count: points.length });
    } catch (e) {
      results.push({ id: s.id, ok: false, error: (e as Error).message });
    }
  }
  return results;
}

/** 화면용: 설정 순서대로, 저장된 값이 없으면 points 가 빈 배열 */
export async function listIndicators(): Promise<Indicator[]> {
  const stored = await readStored().catch(() => new Map<string, { updatedAt: string; points: Observation[] }>());
  return FRED_SERIES.map((s) => {
    const st = stored.get(s.id);
    const points = st?.points ?? [];
    return { id: s.id, name: s.name, note: s.note, unit: s.unit, source: `https://fred.stlouisfed.org/series/${s.id}`, updatedAt: st?.updatedAt, points, ...summarize(points) };
  });
}
