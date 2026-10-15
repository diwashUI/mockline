# Mockline

A mock API server that lives in a service worker — zero install, no localhost.

Define endpoints like `GET /mock-api/users/:id` with a status code and a JSON body
(supports `{{params.id}}`, `{{query.q}}`, `{{body.name}}` and built-in `{{faker.*}}`
helpers). Mockline registers a service worker that intercepts every same-origin
request under `/mock-api/*` and answers from your mocks. Your app code doesn't change.

## Features

- **Endpoint designer** — method, path patterns with `:params`, status code, response
  headers, JSON body templating, artificial delay, random failure rate
- **Live request log** — every intercepted request with method, path, status, duration;
  click to inspect request/response bodies
- **Test console** — fire requests from the page and see mocked responses
- **Export / import** mock configs as JSON, copy per-endpoint `fetch` snippets
- Config persists in IndexedDB; works fully offline after first load

## How it works

`public/mock-sw.js` is a standalone service worker (no imports). On each fetch to
`/mock-api/*` it reads the endpoint config from IndexedDB, matches method + path,
renders the body template, applies delay/failure simulation, responds, and logs the
call (persisted + broadcast to open tabs via `postMessage`).

## Develop

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # vitest unit tests (matcher, templating, snippets)
npm run build    # production build
```

## Stack

Next.js 16 (App Router) + TypeScript + Tailwind v4. No backend, no API keys, no runtime
dependencies beyond React/Next.
