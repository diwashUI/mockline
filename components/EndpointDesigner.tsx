"use client";

import { useEffect, useState } from "react";
import { HTTP_METHODS, newId, type HttpMethod, type MockEndpoint } from "@/lib/types";
import { buildFetchSnippet } from "@/lib/snippets";
import { MethodBadge } from "./badges";

interface Props {
  endpoints: MockEndpoint[];
  onSave: (ep: MockEndpoint) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onToggle: (id: string) => Promise<void>;
}

function blankEndpoint(): MockEndpoint {
  return {
    id: newId(),
    name: "New endpoint",
    method: "GET",
    path: "/mock-api/",
    status: 200,
    headers: {},
    body: '{\n  "id": "{{faker.uuid}}",\n  "name": "{{faker.name}}"\n}',
    delayMs: 0,
    failureRate: 0,
    enabled: true,
    createdAt: Date.now(),
  };
}

function headersToText(h: Record<string, string>): string {
  return Object.entries(h)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
}

function textToHeaders(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const i = line.indexOf(":");
    if (i > 0) {
      const k = line.slice(0, i).trim();
      const v = line.slice(i + 1).trim();
      if (k) out[k] = v;
    }
  }
  return out;
}

const inputCls =
  "w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition focus:border-teal-500";
const labelCls = "mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-400";

export default function EndpointDesigner({ endpoints, onSave, onDelete, onToggle }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<MockEndpoint | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [headersText, setHeadersText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // keep selection valid when the list changes (skip while editing a not-yet-saved new endpoint)
  useEffect(() => {
    if (selectedId && !isNew && !endpoints.some((e) => e.id === selectedId)) {
      setSelectedId(null);
      setDraft(null);
    }
  }, [endpoints, selectedId, isNew]);

  const select = (ep: MockEndpoint) => {
    setSelectedId(ep.id);
    setIsNew(false);
    setDraft({ ...ep, headers: { ...ep.headers } });
    setHeadersText(headersToText(ep.headers));
    setError(null);
    setCopied(false);
  };

  const startNew = () => {
    const ep = blankEndpoint();
    setSelectedId(ep.id);
    setIsNew(true);
    setDraft(ep);
    setHeadersText("");
    setError(null);
    setCopied(false);
  };

  const set = <K extends keyof MockEndpoint>(key: K, value: MockEndpoint[K]) => {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
  };

  const save = async () => {
    if (!draft) return;
    if (!draft.path.startsWith("/")) {
      setError("Path must start with / (tip: keep it under /mock-api/ so the worker intercepts it).");
      return;
    }
    if (!draft.path.startsWith("/mock-api/")) {
      setError("Only paths under /mock-api/ are intercepted by the service worker.");
      return;
    }
    try {
      if (draft.body.trim()) JSON.parse(draft.body.replace(/\{\{[^}]+\}\}/g, '"x"'));
    } catch {
      setError("Body is not valid JSON (after ignoring {{…}} placeholders).");
      return;
    }
    setError(null);
    await onSave({ ...draft, headers: textToHeaders(headersText) });
    setSelectedId(null);
    setDraft(null);
    setIsNew(false);
  };

  const copySnippet = async () => {
    if (!draft) return;
    const snippet = buildFetchSnippet({ ...draft, headers: textToHeaders(headersText) });
    try {
      await navigator.clipboard.writeText(snippet);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = snippet;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
      {/* list */}
      <div>
        <button
          onClick={startNew}
          className="mb-3 w-full rounded-lg border border-dashed border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-300 transition hover:border-teal-500 hover:text-white"
        >
          + New endpoint
        </button>
        <div className="space-y-2">
          {endpoints.map((ep) => (
            <div
              key={ep.id}
              className={`rounded-lg border p-3 transition ${
                selectedId === ep.id
                  ? "border-teal-500/60 bg-zinc-900"
                  : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-600"
              } ${ep.enabled ? "" : "opacity-50"}`}
            >
              <button className="block w-full text-left" onClick={() => select(ep)}>
                <div className="flex items-center gap-2">
                  <MethodBadge method={ep.method} />
                  <span className="truncate font-mono text-xs text-zinc-200">{ep.path}</span>
                </div>
                <p className="mt-1 truncate text-xs text-zinc-500">{ep.name}</p>
              </button>
              <div className="mt-2 flex items-center gap-2">
                <button
                  onClick={() => onToggle(ep.id)}
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition ${
                    ep.enabled
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "bg-zinc-700/40 text-zinc-400"
                  }`}
                >
                  {ep.enabled ? "Enabled" : "Disabled"}
                </button>
                <button
                  onClick={() => {
                    if (window.confirm(`Delete "${ep.name}"?`)) onDelete(ep.id);
                  }}
                  className="text-[11px] text-zinc-500 transition hover:text-rose-300"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {endpoints.length === 0 && (
            <p className="py-8 text-center text-sm text-zinc-500">
              No endpoints yet — create your first one.
            </p>
          )}
        </div>
      </div>

      {/* editor */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
        {!draft ? (
          <p className="py-16 text-center text-sm text-zinc-500">
            Select an endpoint to edit, or create a new one.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Name</label>
                <input
                  className={inputCls}
                  value={draft.name}
                  onChange={(e) => set("name", e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Method</label>
                  <select
                    className={inputCls}
                    value={draft.method}
                    onChange={(e) => set("method", e.target.value as HttpMethod)}
                  >
                    {HTTP_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Status</label>
                  <input
                    className={inputCls}
                    type="number"
                    min={100}
                    max={599}
                    value={draft.status}
                    onChange={(e) => set("status", parseInt(e.target.value || "200", 10))}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className={labelCls}>Path pattern (use :params, must start with /mock-api/)</label>
              <input
                className={`${inputCls} font-mono`}
                value={draft.path}
                placeholder="/mock-api/users/:id"
                onChange={(e) => set("path", e.target.value)}
              />
            </div>

            <div>
              <label className={labelCls}>Response headers (one per line, Key: Value)</label>
              <textarea
                className={`${inputCls} font-mono`}
                rows={2}
                value={headersText}
                placeholder={"X-Rate-Limit: 100"}
                onChange={(e) => setHeadersText(e.target.value)}
              />
            </div>

            <div>
              <label className={labelCls}>
                JSON body — supports {"{{params.id}}"}, {"{{query.q}}"}, {"{{body.name}}"},
                {"{{faker.int(1,100)}}"}, {"{{faker.uuid}}"}, {"{{faker.name}}"}, {"{{faker.email}}"}
              </label>
              <textarea
                className={`${inputCls} font-mono text-[13px] leading-relaxed`}
                rows={8}
                value={draft.body}
                onChange={(e) => set("body", e.target.value)}
                spellCheck={false}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Artificial delay (ms): {draft.delayMs}</label>
                <input
                  type="range"
                  min={0}
                  max={3000}
                  step={50}
                  value={draft.delayMs}
                  onChange={(e) => set("delayMs", parseInt(e.target.value, 10))}
                  className="w-full accent-teal-500"
                />
              </div>
              <div>
                <label className={labelCls}>Failure rate (% random 500s): {draft.failureRate}</label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={draft.failureRate}
                  onChange={(e) => set("failureRate", parseInt(e.target.value, 10))}
                  className="w-full accent-rose-500"
                />
              </div>
            </div>

            {error && (
              <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                {error}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                onClick={save}
                className="rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-teal-400"
              >
                Save endpoint
              </button>
              <button
                onClick={copySnippet}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-zinc-500 hover:text-white"
              >
                {copied ? "Copied!" : "Copy fetch snippet"}
              </button>
              <button
                onClick={() => {
                  setDraft(null);
                  setSelectedId(null);
                  setIsNew(false);
                }}
                className="rounded-lg px-4 py-2 text-sm text-zinc-500 transition hover:text-zinc-300"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
