import type { HttpMethod } from "@/lib/types";

const METHOD_STYLES: Record<HttpMethod, string> = {
  GET: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  POST: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  PUT: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  PATCH: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  DELETE: "bg-rose-500/15 text-rose-300 border-rose-500/30",
};

export function MethodBadge({ method, className = "" }: { method: string; className?: string }) {
  const style = METHOD_STYLES[method as HttpMethod] ?? "bg-zinc-500/15 text-zinc-300 border-zinc-500/30";
  return (
    <span
      className={`inline-block rounded border px-1.5 py-0.5 font-mono text-[11px] font-bold tracking-wide ${style} ${className}`}
    >
      {method}
    </span>
  );
}

export function StatusBadge({ status }: { status: number }) {
  const style =
    status >= 200 && status < 300
      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
      : status >= 400 && status < 500
        ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
        : status >= 500
          ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
          : "bg-zinc-500/15 text-zinc-300 border-zinc-500/30";
  return (
    <span
      className={`inline-block rounded border px-1.5 py-0.5 font-mono text-[11px] font-bold ${style}`}
    >
      {status}
    </span>
  );
}
