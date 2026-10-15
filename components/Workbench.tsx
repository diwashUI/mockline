"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MockEndpoint, RequestLogEntry } from "@/lib/types";
import {
  clearLogs,
  deleteEndpoint,
  getEndpoints,
  getLogs,
  replaceEndpoints,
  saveEndpoint,
} from "@/lib/mockdb";
import { seedEndpoints } from "@/lib/seed";
import EndpointDesigner from "./EndpointDesigner";
import RequestLog from "./RequestLog";
import TestConsole from "./TestConsole";

export type SwStatus = "unsupported" | "registering" | "active" | "error";
type Tab = "endpoints" | "logs" | "console";

const TABS: { id: Tab; label: string }[] = [
  { id: "endpoints", label: "Endpoints" },
  { id: "logs", label: "Request log" },
  { id: "console", label: "Test console" },
];

function useServiceWorker(): SwStatus {
  const [status, setStatus] = useState<SwStatus>("registering");

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      setStatus("unsupported");
      return;
    }
    let cancelled = false;
    const onControllerChange = () => {
      if (!cancelled) setStatus("active");
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    if (navigator.serviceWorker.controller) {
      setStatus("active");
    } else {
      navigator.serviceWorker
        .register("/mock-sw.js", { scope: "/" })
        .then(() => navigator.serviceWorker.ready)
        .then(() => {
          if (!cancelled && navigator.serviceWorker.controller) setStatus("active");
        })
        .catch(() => {
          if (!cancelled) setStatus("error");
        });
    }
    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  return status;
}

const STATUS_META: Record<SwStatus, { label: string; dot: string }> = {
  unsupported: { label: "Service workers unsupported", dot: "bg-zinc-500" },
  registering: { label: "Starting mock server…", dot: "bg-amber-400 animate-pulse" },
  active: { label: "Mock server active", dot: "bg-emerald-400" },
  error: { label: "Mock server failed to start", dot: "bg-rose-400" },
};

export default function Workbench() {
  const swStatus = useServiceWorker();
  const [tab, setTab] = useState<Tab>("endpoints");
  const [endpoints, setEndpoints] = useState<MockEndpoint[]>([]);
  const [logs, setLogs] = useState<RequestLogEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // initial load + seed
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let eps = await getEndpoints();
      if (eps.length === 0) {
        const seeds = seedEndpoints();
        await replaceEndpoints(seeds);
        eps = seeds;
      }
      const ls = await getLogs();
      if (!cancelled) {
        setEndpoints(eps);
        setLogs(ls);
        setLoaded(true);
      }
    })().catch(() => {
      if (!cancelled) setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // live log entries pushed by the service worker
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const onMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === "MOCKLINE_LOG" && e.data.entry) {
        const entry = e.data.entry as RequestLogEntry;
        setLogs((prev) =>
          prev.some((l) => l.id === entry.id) ? prev : [entry, ...prev].slice(0, 200)
        );
      }
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, []);

  const handleSave = useCallback(async (ep: MockEndpoint) => {
    await saveEndpoint(ep);
    setEndpoints((prev) => {
      const i = prev.findIndex((e) => e.id === ep.id);
      if (i >= 0) {
        const next = [...prev];
        next[i] = ep;
        return next;
      }
      return [...prev, ep];
    });
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    await deleteEndpoint(id);
    setEndpoints((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const handleToggle = useCallback(
    async (id: string) => {
      const ep = endpoints.find((e) => e.id === id);
      if (!ep) return;
      await handleSave({ ...ep, enabled: !ep.enabled });
    },
    [endpoints, handleSave]
  );

  const handleClearLogs = useCallback(async () => {
    await clearLogs();
    setLogs([]);
  }, []);

  const handleExport = useCallback(async () => {
    const eps = await getEndpoints();
    const blob = new Blob([JSON.stringify(eps, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "mockline-endpoints.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }, []);

  const handleImportFile = useCallback(
    async (file: File) => {
      const text = await file.text();
      const parsed: unknown = JSON.parse(text);
      if (!Array.isArray(parsed)) throw new Error("Import file must contain an array of endpoints.");
      const eps: MockEndpoint[] = [];
      for (const raw of parsed) {
        const r = raw as Record<string, unknown>;
        if (typeof r.path !== "string" || typeof r.method !== "string") continue;
        eps.push({
          id: typeof r.id === "string" ? r.id : `imp-${Date.now()}-${eps.length}`,
          name: typeof r.name === "string" ? r.name : "Imported endpoint",
          method: (["GET", "POST", "PUT", "PATCH", "DELETE"] as string[]).includes(r.method)
            ? (r.method as MockEndpoint["method"])
            : "GET",
          path: r.path.startsWith("/") ? r.path : `/${r.path}`,
          status: typeof r.status === "number" ? r.status : 200,
          headers:
            r.headers && typeof r.headers === "object"
              ? (r.headers as Record<string, string>)
              : {},
          body: typeof r.body === "string" ? r.body : "{}",
          delayMs: typeof r.delayMs === "number" ? Math.max(0, r.delayMs) : 0,
          failureRate:
            typeof r.failureRate === "number"
              ? Math.min(100, Math.max(0, r.failureRate))
              : 0,
          enabled: r.enabled !== false,
          createdAt: typeof r.createdAt === "number" ? r.createdAt : Date.now(),
        });
      }
      if (eps.length === 0) throw new Error("No valid endpoints found in file.");
      if (!window.confirm(`Replace all ${endpoints.length} endpoints with ${eps.length} imported?`)) return;
      await replaceEndpoints(eps);
      setEndpoints(eps);
    },
    [endpoints.length]
  );

  const meta = STATUS_META[swStatus];

  return (
    <section id="workbench" className="mx-auto w-full max-w-6xl px-4 pb-24 sm:px-6">
      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl">
        {/* toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  tab === t.id
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                }`}
              >
                {t.label}
                {t.id === "logs" && logs.length > 0 && (
                  <span className="ml-1.5 rounded-full bg-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-200">
                    {logs.length}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-300">
              <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
              {meta.label}
            </span>
            <button
              onClick={handleExport}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-zinc-500 hover:text-white"
            >
              Export
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-zinc-500 hover:text-white"
            >
              Import
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) handleImportFile(f).catch((err) => alert(`Import failed: ${err.message}`));
              }}
            />
          </div>
        </div>

        {/* panels */}
        <div className="min-h-[420px] p-4 sm:p-5">
          {!loaded ? (
            <p className="py-16 text-center text-sm text-zinc-500">Loading mock server…</p>
          ) : tab === "endpoints" ? (
            <EndpointDesigner
              endpoints={endpoints}
              onSave={handleSave}
              onDelete={handleDelete}
              onToggle={handleToggle}
            />
          ) : tab === "logs" ? (
            <RequestLog logs={logs} onClear={handleClearLogs} />
          ) : (
            <TestConsole endpoints={endpoints} />
          )}
        </div>
      </div>
      {swStatus === "unsupported" && (
        <p className="mt-3 text-center text-sm text-amber-300">
          This browser does not support service workers — mocking needs Chrome, Edge, Firefox or Safari.
        </p>
      )}
    </section>
  );
}
