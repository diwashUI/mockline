/* Mockline service worker — intercepts same-origin /mock-api/* requests and
   responds from the endpoint config stored in IndexedDB. Standalone file:
   matcher / templating / faker logic is duplicated here on purpose so the
   worker stays a single static asset with zero imports. */

"use strict";

var DB_NAME = "mockline";
var DB_VERSION = 1;
var EP_STORE = "endpoints";
var LOG_STORE = "logs";
var MAX_LOGS = 200;
var MAX_BODY = 20000;

/* ---------- IndexedDB ---------- */

function openDb() {
  return new Promise(function (resolve, reject) {
    var req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = function () {
      var db = req.result;
      if (!db.objectStoreNames.contains(EP_STORE)) db.createObjectStore(EP_STORE, { keyPath: "id" });
      if (!db.objectStoreNames.contains(LOG_STORE)) {
        var logs = db.createObjectStore(LOG_STORE, { keyPath: "id" });
        logs.createIndex("ts", "ts", { unique: false });
      }
    };
    req.onsuccess = function () { resolve(req.result); };
    req.onerror = function () { reject(req.error); };
  });
}

function getAllEndpoints(db) {
  return new Promise(function (resolve, reject) {
    var t = db.transaction(EP_STORE, "readonly");
    var req = t.objectStore(EP_STORE).getAll();
    req.onsuccess = function () { resolve(req.result || []); };
    req.onerror = function () { reject(req.error); };
  });
}

function putLog(db, entry) {
  return new Promise(function (resolve) {
    try {
      var t = db.transaction(LOG_STORE, "readwrite");
      var store = t.objectStore(LOG_STORE);
      store.put(entry);
      var idx = store.index("ts");
      var countReq = idx.count();
      countReq.onsuccess = function () {
        var excess = countReq.result - MAX_LOGS;
        if (excess > 0) {
          var removed = 0;
          var cursor = idx.openCursor();
          cursor.onsuccess = function () {
            var c = cursor.result;
            if (c && removed < excess) { c.delete(); removed++; c.continue(); }
          };
        }
      };
      t.oncomplete = function () { resolve(); };
      t.onerror = function () { resolve(); };
    } catch (e) { resolve(); }
  });
}

/* ---------- path matching ---------- */

function compilePath(pattern) {
  var paramNames = [];
  var src = pattern.split("/").map(function (seg) {
    if (seg.charAt(0) === ":" && seg.length > 1) {
      paramNames.push(seg.slice(1));
      return "([^/]+)";
    }
    return seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }).join("/");
  return { regex: new RegExp("^" + src + "$"), paramNames: paramNames };
}

function matchPath(pattern, pathname) {
  var c = compilePath(pattern);
  var m = c.regex.exec(pathname);
  if (!m) return null;
  var params = {};
  c.paramNames.forEach(function (name, i) {
    try { params[name] = decodeURIComponent(m[i + 1]); }
    catch (e) { params[name] = m[i + 1]; }
  });
  return params;
}

function findEndpoint(endpoints, method, pathname) {
  var upper = String(method).toUpperCase();
  var pathOnly = null;
  for (var i = 0; i < endpoints.length; i++) {
    var ep = endpoints[i];
    if (!ep.enabled) continue;
    var params = matchPath(ep.path, pathname);
    if (!params) continue;
    if (ep.method === upper) return { endpoint: ep, params: params, methodMismatch: false };
    if (!pathOnly) pathOnly = { endpoint: ep, params: params };
  }
  if (pathOnly) return { endpoint: pathOnly.endpoint, params: pathOnly.params, methodMismatch: true };
  return null;
}

/* ---------- tiny faker ---------- */

function rand(n) { return Math.floor(Math.random() * n); }
var FIRST = ["Aarav","Diya","Kabir","Meera","Arjun","Sana","Vivaan","Isha","Rohan","Priya","Aditi","Kiran","Nisha","Sagar","Pooja","Ramesh","Anisha","Bibek","Sujata","Nabin","Prerana","Sabin","Ritu","Aashish"];
var LAST = ["Sharma","Thapa","Gurung","Karki","Shrestha","Adhikari","Rai","Tamang","Khadka","Poudel","Singh","Khanal","Basnet","Magar"];
var WORDS = ["harbor","lantern","meadow","compass","ember","willow","cobalt","sonar","juniper","pixel","tundra","marble","zephyr","onyx"];
var DOMAINS = ["example.com","mail.test","demo.dev","mockline.io"];

function fakeInt(min, max) {
  var lo = Math.min(min, max), hi = Math.max(min, max);
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}
function fakeUuid() {
  function h() { return Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, "0"); }
  var s = h() + h();
  return s.slice(0,8)+"-"+s.slice(8,12)+"-4"+s.slice(13,16)+"-a"+s.slice(17,20)+"-"+s.slice(20,32);
}
function fakeName() { return FIRST[rand(FIRST.length)] + " " + LAST[rand(LAST.length)]; }
function fakeEmail() {
  var n = fakeName().toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "");
  return n + fakeInt(1, 999) + "@" + DOMAINS[rand(DOMAINS.length)];
}
function fakeWord() { return WORDS[rand(WORDS.length)]; }
function fakeBool() { return Math.random() < 0.5; }

/* ---------- templating ---------- */

function getPath(obj, path) {
  var cur = obj;
  var parts = path.split(".");
  for (var i = 0; i < parts.length; i++) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = cur[parts[i]];
  }
  return cur;
}

function evalExpr(expr, ctx) {
  var m = expr.match(/^params\.(.+)$/); if (m) return getPath(ctx.params, m[1]);
  m = expr.match(/^query\.(.+)$/); if (m) return getPath(ctx.query, m[1]);
  m = expr.match(/^body\.(.+)$/); if (m) return getPath(ctx.body, m[1]);
  m = expr.match(/^faker\.int\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)$/);
  if (m) return fakeInt(parseInt(m[1], 10), parseInt(m[2], 10));
  if (expr === "faker.uuid") return fakeUuid();
  if (expr === "faker.name") return fakeName();
  if (expr === "faker.email") return fakeEmail();
  if (expr === "faker.word") return fakeWord();
  if (expr === "faker.bool") return fakeBool();
  return "";
}

function renderTemplate(tpl, ctx) {
  return String(tpl).replace(/\{\{\s*([^}]+?)\s*\}\}/g, function (_full, expr) {
    var v = evalExpr(String(expr).trim(), ctx);
    if (v == null) return "";
    if (typeof v === "object") return JSON.stringify(v);
    return String(v);
  });
}

/* ---------- lifecycle ---------- */

self.addEventListener("install", function (e) { e.waitUntil(self.skipWaiting()); });
self.addEventListener("activate", function (e) { e.waitUntil(self.clients.claim()); });

self.addEventListener("message", function (e) {
  var data = e.data || {};
  if (data.type === "MOCKLINE_PING" && e.source) {
    e.source.postMessage({ type: "MOCKLINE_PONG" });
  }
});

/* ---------- request handling ---------- */

self.addEventListener("fetch", function (e) {
  var url;
  try { url = new URL(e.request.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;
  if (url.pathname.indexOf("/mock-api/") !== 0) return;
  e.respondWith(handleRequest(e.request, url));
});

function trunc(s) {
  s = String(s == null ? "" : s);
  return s.length > MAX_BODY ? s.slice(0, MAX_BODY) + "…[truncated]" : s;
}

function newId() {
  if (self.crypto && self.crypto.randomUUID) return self.crypto.randomUUID();
  return "sw-" + Date.now() + "-" + Math.floor(Math.random() * 1e9);
}

async function handleRequest(request, url) {
  var t0 = performance.now();
  var method = request.method;
  var pathname = url.pathname;
  var status = 200;
  var body = "";
  var headers = { "content-type": "application/json" };
  var match = null;
  var requestBody = "";

  try {
    var db = await openDb();
    var endpoints = await getAllEndpoints(db);
    endpoints.sort(function (a, b) { return (a.createdAt || 0) - (b.createdAt || 0); });
    match = findEndpoint(endpoints, method, pathname);

    if (!match) {
      status = 404;
      body = JSON.stringify({ error: "Mockline: no mock endpoint matched", method: method, path: pathname });
    } else if (match.methodMismatch) {
      status = 405;
      body = JSON.stringify({ error: "Mockline: method not allowed", method: method, path: pathname, allowed: match.endpoint.method });
    } else {
      var ep = match.endpoint;
      Object.keys(ep.headers || {}).forEach(function (k) { headers[String(k).toLowerCase()] = ep.headers[k]; });
      if (method !== "GET" && method !== "HEAD") {
        try { requestBody = await request.clone().text(); } catch (e) { requestBody = ""; }
      }
      if (Math.random() * 100 < (ep.failureRate || 0)) {
        status = 500;
        body = JSON.stringify({ error: "Mockline simulated failure", endpoint: ep.name });
      } else {
        status = ep.status || 200;
        var parsed = null;
        if (requestBody) { try { parsed = JSON.parse(requestBody); } catch (e) { parsed = null; } }
        var query = {};
        url.searchParams.forEach(function (v, k) { query[k] = v; });
        body = renderTemplate(ep.body || "", { params: match.params, query: query, body: parsed });
      }
      var delay = Math.max(0, Math.min(30000, ep.delayMs || 0));
      if (delay > 0) await new Promise(function (r) { setTimeout(r, delay); });
    }

    var durationMs = Math.round(performance.now() - t0);
    var entry = {
      id: newId(),
      ts: Date.now(),
      method: method,
      path: pathname + url.search,
      matchedEndpointId: match && !match.methodMismatch ? match.endpoint.id : (match ? match.endpoint.id : null),
      matchedEndpointName: match ? match.endpoint.name : null,
      methodMismatch: !!(match && match.methodMismatch),
      status: status,
      durationMs: durationMs,
      requestBody: trunc(requestBody),
      responseBody: trunc(body),
    };
    putLog(db, entry).catch(function () {});
    try {
      var clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      clients.forEach(function (c) {
        try { c.postMessage({ type: "MOCKLINE_LOG", entry: entry }); } catch (e) {}
      });
    } catch (e) {}

    return new Response(body, { status: status, headers: headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Mockline internal error", detail: String((err && err.message) || err) }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
