"use client";

import { useMemo } from "react";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { GeometryCollection, Topology } from "topojson-specification";
import world from "world-atlas/countries-110m.json";
import { RAMP } from "@/config/brand";
import { TipRow, type useTip } from "@/components/report/parts";

type TipApi = ReturnType<typeof useTip>;
type Country = Feature<Geometry, { name: string }> & { id?: string | number };

const W = 960, H = 480;
const topo = world as unknown as Topology<{ countries: GeometryCollection<{ name: string }> }>;
/**
 * 국가 도형. 남극 제외. 프랑스 도형에 들어 있는 해외 영토(남미의 프랑스령 기아나)는 본토와 헷갈리므로 뺀다.
 */
const COUNTRIES = (feature(topo, topo.objects.countries) as FeatureCollection<Geometry, { name: string }>).features
  .filter((f) => String((f as Country).id) !== "010")
  .map((f) => {
    if (String((f as Country).id) !== "250" || f.geometry.type !== "MultiPolygon") return f;
    const coordinates = f.geometry.coordinates.filter((poly) => poly[0][0][0] > -30);
    return { ...f, geometry: { ...f.geometry, coordinates } };
  }) as Country[];
const projection = geoNaturalEarth1().fitExtent([[4, 4], [W - 4, H - 4]], { type: "FeatureCollection", features: COUNTRIES } as FeatureCollection);
const path = geoPath(projection);
const PATHS = COUNTRIES.map((c) => ({ id: String(c.id), name: c.properties.name, d: path(c) ?? "" }));

/** 회사 수 → 파랑 한 가지 색 (많을수록 진함). 0 은 바탕 회색 */
const fill = (n: number, max: number) => (n <= 0 ? "#ecebe6" : RAMP[Math.min(RAMP.length - 1, 1 + Math.floor(((n - 1) / Math.max(max - 1, 1)) * (RAMP.length - 2)))]);

export function WorldMap({
  counts,
  names,
  label,
  selected,
  hovered,
  onSelect,
  tip,
}: {
  /** 왼쪽 나라 목록에서 마우스를 올린 나라 (지도에서 함께 강조) */
  hovered?: string;
  /** world-atlas 국가 번호 → 회사 수 */
  counts: Map<string, number>;
  /** 국가 번호 → 툴팁에 보여 줄 회사 이름들 */
  names: Map<string, string[]>;
  label: string;
  selected?: string;
  onSelect: (id?: string) => void;
  tip: TipApi;
}) {
  const max = Math.max(...counts.values(), 1);
  const sorted = useMemo(() => [...PATHS].sort((a, b) => (a.id === selected || a.id === hovered ? 1 : 0) - (b.id === selected || b.id === hovered ? 1 : 0)), [selected, hovered]);
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={`${label}: ${[...counts.entries()].filter(([, n]) => n > 0).length}개국`} onClick={() => onSelect(undefined)}>
        <rect width={W} height={H} fill="#fff" />
        {sorted.map((c) => {
          const n = counts.get(c.id) ?? 0;
          const sel = c.id === selected;
          const hov = c.id === hovered && !sel;
          const body = (
            <>
              <p className="font-bold">{c.name}</p>
              <TipRow value={`${n}개사`} label={label} color={n ? fill(n, max) : undefined} />
              {n > 0 && <p className="mt-1 text-[var(--rv-soft)]">{(names.get(c.id) ?? []).slice(0, 6).join(", ")}{(names.get(c.id)?.length ?? 0) > 6 ? " 외" : ""}</p>}
            </>
          );
          return (
            <path
              key={c.id + c.name}
              d={c.d}
              fill={fill(n, max)}
              stroke={sel ? "#232021" : hov ? "#A72B2B" : "#fff"}
              strokeWidth={sel ? 1.8 : hov ? 1.6 : 0.6}
              style={{ transition: "stroke 0.15s, stroke-width 0.15s" }}
              className={`outline-none ${n ? "wm-country cursor-pointer" : ""}`}
              tabIndex={n ? 0 : -1}
              role={n ? "button" : undefined}
              aria-label={n ? `${c.name} ${n}개사` : undefined}
              onClick={(e) => {
                e.stopPropagation();
                if (n) onSelect(sel ? undefined : c.id);
              }}
              onKeyDown={(e) => n && (e.key === "Enter" || e.key === " ") && onSelect(c.id)}
              onPointerMove={(e) => n && tip.show(e, body)}
              onPointerLeave={tip.hide}
              onFocus={(e) => tip.show(e, body)}
              onBlur={tip.hide}
            />
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-[var(--rv-soft)]">
        <span>{label}</span>
        <span className="ml-2">적음</span>
        {RAMP.slice(1).map((c) => <span key={c} aria-hidden className="inline-block h-2.5 w-4 rounded-[2px]" style={{ background: c }} />)}
        <span>많음 (최대 {max}개사)</span>
        <span className="ml-3">나라를 누르면 아래 목록이 그 나라로 좁혀집니다</span>
      </div>
    </div>
  );
}
