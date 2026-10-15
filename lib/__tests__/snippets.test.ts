import { describe, expect, it } from "vitest";
import { buildFetchSnippet } from "../snippets";
import type { MockEndpoint } from "../types";

const base: MockEndpoint = {
  id: "e1",
  name: "Get user",
  method: "GET",
  path: "/mock-api/users/:id",
  status: 200,
  headers: {},
  body: "{}",
  delayMs: 0,
  failureRate: 0,
  enabled: true,
  createdAt: 1,
};

describe("buildFetchSnippet", () => {
  it("fills :params with example values", () => {
    const s = buildFetchSnippet(base);
    expect(s).toContain('fetch("/mock-api/users/123"');
    expect(s).toContain('method: "GET"');
  });

  it("adds JSON body for POST", () => {
    const s = buildFetchSnippet({ ...base, method: "POST" });
    expect(s).toContain("body: JSON.stringify");
    expect(s).toContain("Content-Type");
  });

  it("includes custom headers", () => {
    const s = buildFetchSnippet({ ...base, headers: { "X-Test": "yes" } });
    expect(s).toContain('"X-Test": "yes"');
  });
});
