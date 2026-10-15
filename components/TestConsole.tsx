"use client";

import { useState } from "react";
import { HTTP_METHODS, type HttpMethod, type MockEndpoint } from "@/lib/types";
import { MethodBadge, StatusBadge } from "./badges";

interface Result {
  status: number;
  ms: number;
  body: string;
  ok: boolean;
}

export default function TestConsole({ endpoints }: { endpoints: MockEndpoint[] }) {
  const [method, setMethod] = useState<HttpMethod>("GET");
  const [path, setPath] = useState("/mock-api/users");
  const [body, setBody] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [sending, setSending] = useState(false);

  const send = async () => {
    setSending(true);
    setResult(null);
    const t0 = performance.now();
    try {
      const res = await fetch(path, {
        method,
        headers: body.trim() ? { "Content-Type": "application/json" } : undefined,
        body: body.trim() && method !== "GET" && method !== "DELETE" ? body : undefined,
      });
      const text = await res.text();
      setResult({ status: res.status, ms: Math.round(performance.now() - t0), body: text, ok: true });
    } catch (e) {
      setResult({
        status: 0,
        ms: Math.round(performance.now() - t0),
        body: `Network error: ${e instanceof Error ? e.message : String(e)}`,
        ok: false,
      });
    }
    setSending(false);
  };

  const tryEndpoint = (ep: MockEndpoint) => {
    setMethod(ep.method);
    setPath(ep.path.replace(/:([A-Za-z0-9_]+)/g, "123"));
    if (ep.method === "POST" || ep.method === "PUT" || ep.method === "PATCH") {
      setBody(JSON.stringify({ name: "Ada" }, null, 2));
    } else {
      setBody("");
    }
    setResult(null);
  };

  const pretty = (text: string) => {
    try {
      return JSON.stringify(JSON.parse(text), null, 2);
    } catch {
      return text;
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
      <div>
        <div className="flex flex-wrap gap-2">
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as HttpMethod)}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-sm text-zinc-100 outline-none focus:border-teal-500"
          >
            {HTTP_METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <input
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="/mock-api/users"
            spellCheck={false}
            className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-teal-500"
          />
          <button
            onClick={send}
            disabled={sending}
            className="rounded-lg bg-teal-500 px-5 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-teal-400 disabled:opacity-50"
          >
            {sending ? "Sending…" : "Send"}
          </button>
        </div>

        <label className="mb-1 mt-4 block text-xs font-medium uppercase tracking-wide text-zinc-400">
          Request body (JSON)
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          spellCheck={false}
          placeholder={'{\n  "name": "Ada"\n}'}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-[13px] text-zinc-100 placeholder-zinc-600 outline-none focus:border-teal-500"
        />

        {result && (
          <div className="mt-4 overflow-hidden rounded-lg border border-zinc-800">
            <div className="flex items-center gap-3 border-b border-zinc-800 bg-zinc-900/60 px-3 py-2">
              {result.ok ? (
                <StatusBadge status={result.status} />
              ) : (
                <span className="rounded border border-rose-500/30 bg-rose-500/15 px-1.5 py-0.5 font-mono text-[11px] font-bold text-rose-300">
                  ERROR
                </span>
              )}
              <span className="font-mono text-[11px] text-zinc-500">{result.ms}ms</span>
              <span className="text-xs text-zinc-500">also logged in the Request log tab</span>
            </div>
            <pre className="max-h-80 overflow-auto bg-zinc-950 p-3 font-mono text-[12px] leading-relaxed text-zinc-200">
              {pretty(result.body)}
            </pre>
          </div>
        )}
      </div>

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
          Quick try — your endpoints
        </p>
        <div className="space-y-1.5">
          {endpoints
            .filter((e) => e.enabled)
            .map((ep) => (
              <button
                key={ep.id}
                onClick={() => tryEndpoint(ep)}
                className="flex w-full items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-left transition hover:border-zinc-600"
              >
                <MethodBadge method={ep.method} />
                <span className="min-w-0 flex-1 truncate font-mono text-xs text-zinc-300">{ep.path}</span>
              </button>
            ))}
          {endpoints.filter((e) => e.enabled).length === 0 && (
            <p className="text-xs text-zinc-600">No enabled endpoints.</p>
          )}
        </div>
      </div>
    </div>
  );
}
