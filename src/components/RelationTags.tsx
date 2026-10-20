import type { IssueRelation } from "@/lib/types";
import { Badge } from "./ui";

const TONE = { duplicate: "red", "follow-up": "purple", related: "blue" } as const;
const ICON = { duplicate: "⚠️", "follow-up": "↪", related: "🔗" } as const;

export function RelationTags({ relations }: { relations: IssueRelation[] }) {
  if (!relations.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {relations.map((r) => (
        <Badge
          key={r.issueNo}
          tone={TONE[r.kind]}
          title={`유사도 ${r.score}${r.articleTitle ? ` · 과거 기사: ${r.articleTitle}` : ""}${r.sharedKeywords.length ? ` · 공통 키워드: ${r.sharedKeywords.join(", ")}` : ""}`}
        >
          {ICON[r.kind]} {r.label}
        </Badge>
      ))}
    </div>
  );
}
