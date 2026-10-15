export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface MockEndpoint {
  id: string;
  name: string;
  method: HttpMethod;
  /** Path pattern, e.g. /mock-api/users/:id */
  path: string;
  status: number;
  headers: Record<string, string>;
  /** JSON template — supports {{params.id}}, {{query.q}}, {{body.name}}, {{faker.*}} */
  body: string;
  delayMs: number;
  /** 0–100 — chance of a random simulated 500 */
  failureRate: number;
  enabled: boolean;
  createdAt: number;
}

export interface RequestLogEntry {
  id: string;
  ts: number;
  method: string;
  /** full path including query string */
  path: string;
  matchedEndpointId: string | null;
  matchedEndpointName: string | null;
  methodMismatch: boolean;
  status: number;
  durationMs: number;
  requestBody: string;
  responseBody: string;
}

export const HTTP_METHODS: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}
