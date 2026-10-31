"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, api, useToasts } from "./ui";

/** 구글 시트 스키마 생성 / 시트→캐시 동기화 / 캐시→시트 업로드 */
export function SheetsControls() {
  const { push, view } = useToasts();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const run = async (action: "init" | "pull" | "push", label: string) => {
    setBusy(action);
    try {
      const r = await api<{ created?: string[] }>("/api/sheets", { json: { action } });
      if (action === "init") {
        push(r.created?.length ? `시트 탭 ${r.created.length}개를 만들었습니다: ${r.created.join(", ")}` : "연결되었습니다. 필요한 탭이 모두 있습니다.", "success");
        router.refresh();
        return;
      }
      push(`${label} 완료`, "success");
      router.refresh();
    } catch (e) {
      push((e as Error).message, "error");
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className="flex gap-2">
      {view}
      <Button onClick={() => run("init", "시트 스키마 생성")} disabled={!!busy} title="Raw_Articles / Newsletter_Issues 시트와 헤더 생성">📗 연결 확인 · 시트 초기화</Button>
      <Button onClick={() => run("pull", "시트 → 캐시 동기화")} disabled={!!busy}>⬇ 시트에서 불러오기</Button>
      <Button onClick={() => run("push", "캐시 → 시트 업로드")} disabled={!!busy}>⬆ 시트로 업로드</Button>
    </div>
  );
}
