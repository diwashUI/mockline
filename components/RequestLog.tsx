"use client";

import { useState } from "react";
import type { RequestLogEntry } from "@/lib/types";
import { MethodBadge, StatusBadge } from "./badges";

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour12: false });
}

export default function RequestLog({
  logs,
  onClear,
}: {
  logs: RequestLogEntry[];
  onClear: () => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-zinc-400">
          <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-emerald-400 align-middle" />
          Live — every request the worker intercepts appears here.
        </p>
        <button
          onClick={onClear}
          disabled={logs.length === 0}
          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-zinc-500 hover:text-white disabled:opacity-40"
        >
          Clear
        </button>
      </div>

      {logs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-800 py-16 text-center">
          <p className="text-sm text-zinc-500">No requests intercepted yet.</p>
          <p className="mt-1 font-mono text-xs text-zinc-600">
            Try: fetch(&quot;/mock-api/users&quot;).then(r =&gt; r.json())
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {logs.map((l) => (
            <div key={l.id} className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/50">
              <button
                className="flex w-full items-center gap-3 px-3 py-2 text-left"
                onClick={() => setOpenId(openId === l.id ? null : l.id)}
              >
                <span className="w-16 shrink-0 font-mono text-[11px] text-zinc-500">{fmtTime(l.ts)}</span>
                <MethodBadge method={l.method} />
                <span className="min-w-0 flex-1 truncate font-mono text-xs text-zinc-200">{l.path}</span>
                <span className="hidden font-mono text-[11px] text-zinc-500 sm:block">
                  {l.durationMs}ms
                </span>
                <StatusBadge status={l.status} />
              </button>
              {openId === l.id && (
                <div className="border-t border-zinc-800 px-3 py-3">
                  <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400">
                    <span>
                      Matched:{" "}
                      <span className="font-mono text-zinc-300">
                        {l.matchedEndpointName ?? "none (404)"}
                      </span>
                    </span>
                    {l.methodMismatch && <span className="text-amber-300">method mismatch (405)</span>}
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                        Request body
                      </p>
                      <pre className="max-h-48 overflow-auto rounded bg-zinc-950 p-2.5 font-mono text-[11px] leading-relaxed text-zinc-300">
                        {l.requestBody || "(empty)"}
                      </pre>
                    </div>
                    <div>
                      <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                        Response body
                      </p>
                      <pre className="max-h-48 overflow-auto rounded bg-zinc-950 p-2.5 font-mono text-[11px] leading-relaxed text-zinc-300">
                        {l.responseBody || "(empty)"}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
