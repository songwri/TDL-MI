"use client";

import { useCallback, useState } from "react";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

type BtnVariant = "primary" | "secondary" | "ghost" | "accent" | "danger";

export function Button({
  variant = "secondary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant }) {
  const v: Record<BtnVariant, string> = {
    primary: "bg-brand text-white hover:bg-brand-dark disabled:bg-slate-300",
    accent: "bg-accent text-white hover:brightness-95 disabled:bg-slate-300",
    secondary: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:text-slate-300",
    ghost: "text-slate-600 hover:bg-slate-100 disabled:text-slate-300",
    danger: "border border-red-200 bg-white text-red-600 hover:bg-red-50",
  };
  return (
    <button
      {...props}
      className={cx(
        "inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed",
        v[variant],
        className,
      )}
    />
  );
}

export function Badge({ children, tone = "slate", title }: { children: React.ReactNode; tone?: string; title?: string }) {
  const tones: Record<string, string> = {
    slate: "bg-slate-100 text-slate-600",
    brand: "bg-blue-50 text-brand",
    accent: "bg-teal-50 text-teal-700",
    red: "bg-red-50 text-red-700 ring-1 ring-red-200",
    purple: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
    blue: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
    amber: "bg-amber-50 text-amber-700",
    green: "bg-emerald-50 text-emerald-700",
  };
  return (
    <span title={title} className={cx("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium", tones[tone] ?? tones.slate)}>
      {children}
    </span>
  );
}

export interface ToastMsg {
  id: number;
  text: string;
  tone: "info" | "error" | "success";
}

export function useToasts() {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const push = useCallback((text: string, tone: ToastMsg["tone"] = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === "error" ? 8000 : 4000);
  }, []);
  const view = (
    <div className="fixed bottom-4 right-4 z-50 flex max-w-md flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cx(
            "rounded-md px-4 py-2.5 text-sm shadow-lg",
            t.tone === "error" ? "bg-red-600 text-white" : t.tone === "success" ? "bg-emerald-600 text-white" : "bg-slate-800 text-white",
          )}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
  return { push, view };
}

export async function api<T>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const res = await fetch(url, {
    ...init,
    method: init?.method ?? (init?.json !== undefined ? "POST" : "GET"),
    headers: init?.json !== undefined ? { "Content-Type": "application/json" } : init?.headers,
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `요청 실패 (${res.status})`);
  return data as T;
}
