import { LETTERS, markLetters } from "@/lib/brand/mark";

/**
 * TDL TREND 로고 (TDL LAB 로고 응용): 굵은 기하학 TDL + 오른쪽 아래 TREND.
 * LAB 자리에 TREND 를 같은 폭 넓은 글씨(Archivo Expanded)로 둔다. 색은 currentColor.
 */
export function BrandMark({ className, label = "TREND" }: { className?: string; label?: string }) {
  const W = LETTERS.width;
  const H = LETTERS.height + 30;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} role="img" aria-label={`TDL ${label}`}>
      <g fill="currentColor" dangerouslySetInnerHTML={{ __html: markLetters(0, 0) }} />
      <rect x={0} y={LETTERS.height + 14} width={24} height={5} fill="#A72B2B" />
      <text
        x={W}
        y={H - 2}
        textAnchor="end"
        fill="currentColor"
        style={{ fontFamily: "'Archivo Variable', 'Wanted Sans Variable', sans-serif", fontStretch: "125%", fontWeight: 800, fontSize: 25, letterSpacing: "1px" }}
      >
        {label}
      </text>
    </svg>
  );
}

/**
 * 가로형 로고 (헤더용): TDL 옆에 TREND 를 같은 바닥선에 붙인다.
 * TREND 폭을 textLength 로 고정해 글꼴이 늦게 불려도 잘리거나 밀리지 않는다.
 */
export function BrandMarkInline({ className }: { className?: string }) {
  const H = LETTERS.height;
  const gap = 18;
  const tw = 236;
  const W = LETTERS.width + gap + tw;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} role="img" aria-label="TDL TREND">
      <g fill="currentColor" dangerouslySetInnerHTML={{ __html: markLetters(0, 0) }} />
      <text
        x={LETTERS.width + gap}
        y={H}
        textLength={tw}
        lengthAdjust="spacingAndGlyphs"
        fill="currentColor"
        style={{ fontFamily: "'Archivo Variable', 'Wanted Sans Variable', sans-serif", fontStretch: "125%", fontWeight: 800, fontSize: 56 }}
      >
        TREND
      </text>
    </svg>
  );
}
