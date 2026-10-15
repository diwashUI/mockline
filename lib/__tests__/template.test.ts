import { describe, expect, it } from "vitest";
import { renderTemplate } from "../template";

const ctx = {
  params: { id: "42" },
  query: { q: "hello" },
  body: { user: { name: "Ada" } },
};

describe("renderTemplate", () => {
  it("leaves plain text alone", () => {
    expect(renderTemplate("hello world", ctx)).toBe("hello world");
  });

  it("substitutes {{params.*}}", () => {
    expect(renderTemplate('{"id":"{{params.id}}"}', ctx)).toBe('{"id":"42"}');
  });

  it("substitutes {{query.*}}", () => {
    expect(renderTemplate("q={{query.q}}", ctx)).toBe("q=hello");
  });

  it("substitutes {{body.*}} with nested paths", () => {
    expect(renderTemplate("{{body.user.name}}", ctx)).toBe("Ada");
  });

  it("renders missing values as empty string", () => {
    expect(renderTemplate("[{{params.nope}}]", ctx)).toBe("[]");
    expect(renderTemplate("[{{body.nope.deeper}}]", ctx)).toBe("[]");
  });

  it("supports {{faker.int(min,max)}} in range", () => {
    for (let i = 0; i < 50; i++) {
      const v = parseInt(renderTemplate("{{faker.int(5,10)}}", ctx), 10);
      expect(v).toBeGreaterThanOrEqual(5);
      expect(v).toBeLessThanOrEqual(10);
    }
  });

  it("supports {{faker.uuid}} with uuid shape", () => {
    expect(renderTemplate("{{faker.uuid}}", ctx)).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
  });

  it("supports {{faker.name}}, {{faker.email}}, {{faker.word}}, {{faker.bool}}", () => {
    const name = renderTemplate("{{faker.name}}", ctx);
    expect(name).toContain(" ");
    expect(renderTemplate("{{faker.email}}", ctx)).toMatch(/@/);
    expect(renderTemplate("{{faker.word}}", ctx).length).toBeGreaterThan(0);
    expect(["true", "false"]).toContain(renderTemplate("{{faker.bool}}", ctx));
  });

  it("renders each placeholder independently", () => {
    const out = renderTemplate("{{params.id}}-{{params.id}}", ctx);
    expect(out).toBe("42-42");
  });

  it("tolerates whitespace inside braces", () => {
    expect(renderTemplate("{{  params.id  }}", ctx)).toBe("42");
  });

  it("stringifies object values", () => {
    expect(renderTemplate("{{body.user}}", ctx)).toBe('{"name":"Ada"}');
  });
});
