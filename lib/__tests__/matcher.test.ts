import { describe, expect, it } from "vitest";
import { compilePath, findEndpoint, matchPath } from "../matcher";
import type { MockEndpoint } from "../types";

function ep(over: Partial<MockEndpoint>): MockEndpoint {
  return {
    id: "e1",
    name: "test",
    method: "GET",
    path: "/mock-api/users",
    status: 200,
    headers: {},
    body: "{}",
    delayMs: 0,
    failureRate: 0,
    enabled: true,
    createdAt: 1,
    ...over,
  };
}

describe("compilePath", () => {
  it("matches static paths exactly", () => {
    expect(matchPath("/mock-api/users", "/mock-api/users")).toEqual({});
  });

  it("rejects non-matching paths", () => {
    expect(matchPath("/mock-api/users", "/mock-api/posts")).toBeNull();
    expect(matchPath("/mock-api/users", "/mock-api/users/123")).toBeNull();
  });

  it("extracts :params", () => {
    expect(matchPath("/mock-api/users/:id", "/mock-api/users/42")).toEqual({ id: "42" });
  });

  it("extracts multiple params", () => {
    expect(matchPath("/a/:x/b/:y", "/a/1/b/2")).toEqual({ x: "1", y: "2" });
  });

  it("decodes URI components in params", () => {
    expect(matchPath("/mock-api/users/:id", "/mock-api/users/a%20b")).toEqual({ id: "a b" });
  });

  it("does not let :param swallow slashes", () => {
    expect(matchPath("/mock-api/users/:id", "/mock-api/users/1/2")).toBeNull();
  });

  it("escapes regex special chars in static segments", () => {
    expect(matchPath("/mock-api/u.sers", "/mock-api/uXsers")).toBeNull();
    expect(matchPath("/mock-api/u.sers", "/mock-api/u.sers")).toEqual({});
  });
});

describe("findEndpoint", () => {
  const eps = [
    ep({ id: "list", method: "GET", path: "/mock-api/users" }),
    ep({ id: "create", method: "POST", path: "/mock-api/users" }),
    ep({ id: "one", method: "GET", path: "/mock-api/users/:id" }),
    ep({ id: "off", method: "GET", path: "/mock-api/hidden", enabled: false }),
  ];

  it("finds exact method + path", () => {
    const r = findEndpoint(eps, "GET", "/mock-api/users");
    expect(r?.endpoint.id).toBe("list");
    expect(r?.methodMismatch).toBe(false);
  });

  it("distinguishes same path, different method", () => {
    const r = findEndpoint(eps, "POST", "/mock-api/users");
    expect(r?.endpoint.id).toBe("create");
  });

  it("returns methodMismatch for wrong method on known path", () => {
    const r = findEndpoint(eps, "DELETE", "/mock-api/users");
    expect(r?.methodMismatch).toBe(true);
    expect(r?.endpoint.id).toBe("list");
  });

  it("matches :params", () => {
    const r = findEndpoint(eps, "GET", "/mock-api/users/abc");
    expect(r?.endpoint.id).toBe("one");
    expect(r?.params).toEqual({ id: "abc" });
  });

  it("ignores disabled endpoints", () => {
    expect(findEndpoint(eps, "GET", "/mock-api/hidden")).toBeNull();
  });

  it("returns null for unknown paths", () => {
    expect(findEndpoint(eps, "GET", "/mock-api/nope")).toBeNull();
  });

  it("is case-insensitive on method", () => {
    const r = findEndpoint(eps, "get", "/mock-api/users");
    expect(r?.endpoint.id).toBe("list");
  });
});
