/**
 * 겹침 풀기 (기술 포지션 맵과 성숙도 곡선이 함께 씀).
 * 원끼리 겹치면 서로 밀어내고 실제 위치(tx, ty)로 약하게 당긴다.
 * 각 원은 자기 범위(minX~maxX, minY~maxY) 밖으로 나가지 않는다. 성숙도 곡선에서는 이 범위가 그 단계 구간이라,
 * 점이 다른 단계 칸으로 밀려가 '다른 단계에 있는 것처럼' 보이는 일이 없다.
 */
export interface RelaxNode {
  tx: number;
  ty: number;
  r: number;
  minX?: number;
  maxX?: number;
  minY?: number;
  maxY?: number;
  /** 이 원 둘레에 둘 여백 (없으면 옵션 gap). 두 원 사이는 더 큰 쪽 여백을 쓴다 */
  gap?: number;
}

export function relax<T extends RelaxNode>(nodes: T[], opts: { gap?: number; pull?: number; iterations?: number } = {}): (T & { cx: number; cy: number })[] {
  const { gap = 3, pull = 0.04, iterations = 200 } = opts;
  const n = nodes.map((d, i) => ({ ...d, cx: d.tx + (i % 3) * 0.01, cy: d.ty + (i % 2) * 0.01 }));
  const clampNode = (d: (typeof n)[number]) => {
    d.cx = Math.min(Math.max(d.cx, (d.minX ?? -Infinity) + d.r), (d.maxX ?? Infinity) - d.r);
    d.cy = Math.min(Math.max(d.cy, (d.minY ?? -Infinity) + d.r), (d.maxY ?? Infinity) - d.r);
  };
  for (let it = 0; it < iterations; it++) {
    for (let i = 0; i < n.length; i++)
      for (let j = i + 1; j < n.length; j++) {
        const a = n[i], b = n[j];
        let dx = b.cx - a.cx, dy = b.cy - a.cy;
        let d = Math.hypot(dx, dy);
        const min = a.r + b.r + Math.max(a.gap ?? gap, b.gap ?? gap);
        if (d >= min) continue;
        if (d < 1e-6) {
          const ang = (j * 2.4) % (Math.PI * 2);
          dx = Math.cos(ang);
          dy = Math.sin(ang);
          d = 1;
        }
        const push = (min - d) / 2;
        a.cx -= (dx / d) * push;
        a.cy -= (dy / d) * push;
        b.cx += (dx / d) * push;
        b.cy += (dy / d) * push;
      }
    for (const d of n) {
      d.cx += (d.tx - d.cx) * pull;
      d.cy += (d.ty - d.cy) * pull;
      clampNode(d);
    }
  }
  return n;
}
