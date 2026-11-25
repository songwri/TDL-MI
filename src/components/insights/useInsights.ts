"use client";

import { useCallback, useEffect, useState } from "react";
import type { Indicator } from "@/lib/indicators";
import type { InsightsData } from "@/lib/insights/compute";
import type { Vendor } from "@/config/vendors";
import { api } from "@/components/ui";

export interface InsightsPayload {
  insights: InsightsData;
  indicators: Indicator[];
  vendors: { vendors: (Vendor & { fromSheet?: boolean })[]; sheetRows: number; warning?: string };
  servedAt?: string;
}

/**
 * 인사이트 데이터 캐시. 모듈 변수라 다른 화면(MI 리포트 등)으로 갔다가 돌아와도 남아 있다.
 * 돌아오면 저장된 값을 바로 보여 주고, 오래됐을 때만 뒤에서 조용히 새로 받는다.
 */
const cache = new Map<number, { at: number; data: InsightsPayload }>();
const inflight = new Map<string, Promise<InsightsPayload>>();
/** 이 시간 안이면 새로 받지 않는다 */
const FRESH_MS = 60_000;

function load(days: number, fresh = false): Promise<InsightsPayload> {
  const key = `${days}:${fresh}`;
  let p = inflight.get(key);
  if (!p) {
    p = api<InsightsPayload>(`/api/insights?days=${days}${fresh ? "&fresh=1" : ""}`, fresh ? { cache: "no-store" } : undefined)
      .then((data) => {
        cache.set(days, { at: Date.now(), data });
        return data;
      })
      .finally(() => inflight.delete(key));
    inflight.set(key, p);
  }
  return p;
}

/** 다른 화면에 있는 동안 미리 받아 둔다 (인사이트로 넘어갈 때 바로 보이도록) */
export function prefetchInsights(days = 180) {
  const c = cache.get(days);
  if (c && Date.now() - c.at < FRESH_MS) return;
  load(days).catch(() => {});
}

export function useInsights(days: number) {
  const [data, setData] = useState<InsightsPayload | null>(() => cache.get(days)?.data ?? null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(() => cache.get(days)?.at ?? null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const run = useCallback((d: number, fresh: boolean, alive: () => boolean) => {
    setRefreshing(true);
    load(d, fresh)
      .then((next) => {
        if (!alive()) return;
        setData(next);
        setUpdatedAt(cache.get(d)?.at ?? Date.now());
        setError(null);
      })
      .catch((e) => alive() && !cache.get(d) && setError((e as Error).message))
      .finally(() => alive() && setRefreshing(false));
  }, []);

  useEffect(() => {
    let live = true;
    const alive = () => live;
    const c = cache.get(days);
    if (c) {
      setData(c.data);
      setUpdatedAt(c.at);
    }
    // 저장된 값이 충분히 새것이면 요청하지 않는다. 오래됐으면 화면은 그대로 두고 뒤에서 새로 받는다
    if (!c || Date.now() - c.at >= FRESH_MS) run(days, false, alive);
    return () => {
      live = false;
    };
  }, [days, run]);

  /** 새로고침 버튼: 서버 캐시도 건너뛰고 시트에서 다시 읽는다 */
  const reload = useCallback(() => run(days, true, () => true), [days, run]);
  return { data, error, refreshing, updatedAt, reload };
}
