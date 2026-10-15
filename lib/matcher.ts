import type { HttpMethod, MockEndpoint } from "./types";

/** Compile a path pattern like /mock-api/users/:id into a regex + param names. */
export function compilePath(pattern: string): { regex: RegExp; paramNames: string[] } {
  const paramNames: string[] = [];
  const src = pattern
    .split("/")
    .map((seg) => {
      if (seg.startsWith(":") && seg.length > 1) {
        paramNames.push(seg.slice(1));
        return "([^/]+)";
      }
      return seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("/");
  return { regex: new RegExp(`^${src}$`), paramNames };
}

/** Match a concrete pathname against a pattern. Returns params or null. */
export function matchPath(pattern: string, pathname: string): Record<string, string> | null {
  const { regex, paramNames } = compilePath(pattern);
  const m = regex.exec(pathname);
  if (!m) return null;
  const params: Record<string, string> = {};
  paramNames.forEach((name, i) => {
    try {
      params[name] = decodeURIComponent(m[i + 1]);
    } catch {
      params[name] = m[i + 1];
    }
  });
  return params;
}

export interface MatchResult {
  endpoint: MockEndpoint;
  params: Record<string, string>;
  methodMismatch: boolean;
}

/**
 * Two-pass match: first an enabled endpoint with same method + path,
 * then (for a proper 405) an enabled endpoint with same path but other method.
 */
export function findEndpoint(
  endpoints: MockEndpoint[],
  method: string,
  pathname: string
): MatchResult | null {
  const upper = method.toUpperCase();
  let pathOnly: { endpoint: MockEndpoint; params: Record<string, string> } | null = null;
  for (const ep of endpoints) {
    if (!ep.enabled) continue;
    const params = matchPath(ep.path, pathname);
    if (!params) continue;
    if (ep.method === (upper as HttpMethod)) {
      return { endpoint: ep, params, methodMismatch: false };
    }
    if (!pathOnly) pathOnly = { endpoint: ep, params };
  }
  if (pathOnly) {
    return { endpoint: pathOnly.endpoint, params: pathOnly.params, methodMismatch: true };
  }
  return null;
}
