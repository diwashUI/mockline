import Workbench from "@/components/Workbench";

const STEPS = [
  {
    n: "01",
    title: "Define endpoints",
    text: "Add routes like /mock-api/users/:id with a method, status code, and a JSON body. Use {{params.id}}, {{query.q}} and built-in {{faker.*}} helpers to make responses feel alive.",
  },
  {
    n: "02",
    title: "The service worker takes over",
    text: "Mockline registers a service worker that intercepts every same-origin request under /mock-api/* — your fetch calls never leave the browser.",
  },
  {
    n: "03",
    title: "Build against the fake backend",
    text: "Your app code runs unchanged. Add latency, random failures, and watch every call land in the live request log.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 antialiased">
      {/* ── HERO ── */}
      <header className="mx-auto max-w-6xl px-4 pt-14 text-center sm:px-6 sm:pt-20">
        <p className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal-400" />
          Zero install · runs in your browser
        </p>
        <h1 className="mx-auto mt-6 max-w-3xl text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
          A mock API server that lives in a <span className="text-teal-400">service worker</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-zinc-400">
          Frontend devs need fake backends. Instead of running localhost, Mockline intercepts your
          app&apos;s <span className="font-mono text-sm text-zinc-200">fetch(&quot;/mock-api/*&quot;)</span> calls
          and answers them from the mocks you design — no server, no npm install, on any machine.
        </p>
        <div className="mt-8 flex justify-center">
          <a
            href="#workbench"
            className="rounded-full bg-teal-500 px-7 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-teal-400"
          >
            Open the workbench
          </a>
        </div>

        {/* 3 steps */}
        <div className="mx-auto mt-14 grid max-w-5xl gap-4 text-left md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
              <p className="font-mono text-xs font-bold text-teal-400">{s.n}</p>
              <h3 className="mt-2 font-semibold text-white">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{s.text}</p>
            </div>
          ))}
        </div>

        {/* code teaser */}
        <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 text-left">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
            Your app code doesn&apos;t change
          </p>
          <pre className="overflow-x-auto font-mono text-[13px] leading-relaxed text-zinc-300">
{`const res = await fetch("/mock-api/users/123");
const user = await res.json();
// → { id: "123", name: "…", email: "…" }  — mocked locally`}
          </pre>
        </div>
      </header>

      {/* ── WORKBENCH ── */}
      <main className="mt-16">
        <Workbench />
      </main>

      <footer className="border-t border-zinc-900 py-8 text-center text-xs text-zinc-600">
        Mockline — mock endpoints, request log, and test console, all client-side. Your mocks never
        leave this browser.
        <br />
        <span className="mt-2 inline-block">
          More free tools:{" "}
          <a href="https://privatepdfapp.vercel.app" className="underline hover:text-zinc-400">
            PrivatePDF
          </a>{" "}
          — PDF tools that never upload your files.
        </span>
      </footer>
    </div>
  );
}
