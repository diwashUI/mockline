import type { MockEndpoint, RequestLogEntry } from "./types";

const DB_NAME = "mockline";
const DB_VERSION = 1;
const EP_STORE = "endpoints";
const LOG_STORE = "logs";
const MAX_LOGS = 200;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(EP_STORE)) {
        db.createObjectStore(EP_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(LOG_STORE)) {
        const logs = db.createObjectStore(LOG_STORE, { keyPath: "id" });
        logs.createIndex("ts", "ts", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode);
        const req = fn(t.objectStore(store));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        t.oncomplete = () => db.close();
        t.onerror = () => db.close();
      })
  );
}

export async function getEndpoints(): Promise<MockEndpoint[]> {
  const all = await tx<MockEndpoint[]>(EP_STORE, "readonly", (s) => s.getAll());
  return (all || []).sort((a, b) => a.createdAt - b.createdAt);
}

export async function saveEndpoint(ep: MockEndpoint): Promise<void> {
  await tx(EP_STORE, "readwrite", (s) => s.put(ep));
}

export async function deleteEndpoint(id: string): Promise<void> {
  await tx(EP_STORE, "readwrite", (s) => s.delete(id));
}

export async function replaceEndpoints(eps: MockEndpoint[]): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction(EP_STORE, "readwrite");
    const store = t.objectStore(EP_STORE);
    store.clear();
    eps.forEach((ep) => store.put(ep));
    t.oncomplete = () => {
      db.close();
      resolve();
    };
    t.onerror = () => {
      db.close();
      reject(t.error);
    };
  });
}

export async function addLog(entry: RequestLogEntry): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction(LOG_STORE, "readwrite");
    const store = t.objectStore(LOG_STORE);
    store.put(entry);
    // prune to MAX_LOGS newest
    const idx = store.index("ts");
    const countReq = idx.count();
    countReq.onsuccess = () => {
      const excess = countReq.result - MAX_LOGS;
      if (excess > 0) {
        const cursor = idx.openCursor();
        let removed = 0;
        cursor.onsuccess = () => {
          const c = cursor.result;
          if (c && removed < excess) {
            c.delete();
            removed++;
            c.continue();
          }
        };
      }
    };
    t.oncomplete = () => {
      db.close();
      resolve();
    };
    t.onerror = () => {
      db.close();
      reject(t.error);
    };
  });
}

export async function getLogs(): Promise<RequestLogEntry[]> {
  const all = await tx<RequestLogEntry[]>(LOG_STORE, "readonly", (s) => s.getAll());
  return (all || []).sort((a, b) => b.ts - a.ts);
}

export async function clearLogs(): Promise<void> {
  await tx(LOG_STORE, "readwrite", (s) => s.clear());
}
