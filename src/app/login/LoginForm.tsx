"use client";

import { useState } from "react";
import { BrandMark } from "@/components/BrandMark";
import { safeNext } from "@/lib/auth/session";

/** 비밀번호만 넣는 로그인 화면. 30일간 기억한다 */
export function LoginForm({ next }: { next?: string }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "로그인하지 못했습니다.");
      // 주소의 #보기(예: #world)는 서버에 오지 않으므로 로그인 화면 주소에 남은 것을 이어 붙인다
      const dest = safeNext(next);
      window.location.href = dest.includes("#") ? dest : dest + window.location.hash;
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="view-enter -mt-5 grid min-h-[calc(100vh-40px)] place-items-center">
      <form onSubmit={submit} className="w-full max-w-[380px] rounded-xl border border-[var(--line)] bg-white p-8 shadow-[0_20px_50px_-30px_rgb(28_26_25/0.45)]">
        <BrandMark className="h-12 w-auto text-[var(--ink)]" />
        <p className="mt-5 text-lg font-bold">테크이노베이션팀 Market Intelligence</p>
        <p className="mt-1 text-sm text-[var(--soft)]">팀에서 받은 접속 비밀번호를 입력하세요. 이 브라우저에서 30일간 다시 묻지 않습니다.</p>
        <label htmlFor="pw" className="mt-6 block text-xs font-bold text-[var(--soft)]">비밀번호</label>
        <input
          id="pw"
          type="password"
          autoFocus
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-md border border-[var(--line)] px-3 py-2.5 text-[15px] outline-none focus:border-[var(--ink)] focus:ring-2 focus:ring-[var(--ink)]/10"
        />
        {error && <p role="alert" className="mt-2 text-sm text-[var(--brand)]">{error}</p>}
        <button type="submit" disabled={busy || !password} className="mt-5 w-full rounded-md bg-[var(--ink)] py-2.5 text-sm font-bold text-white transition-opacity disabled:opacity-40">
          {busy ? "확인 중…" : "들어가기"}
        </button>
      </form>
    </div>
  );
}
