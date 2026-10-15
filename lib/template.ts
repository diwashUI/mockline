import { fakeBool, fakeEmail, fakeInt, fakeName, fakeUuid, fakeWord } from "./faker";

export interface TemplateContext {
  params: Record<string, string>;
  query: Record<string, string>;
  body: unknown;
}

function getPath(obj: unknown, path: string): unknown {
  let cur: unknown = obj;
  for (const key of path.split(".")) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
}

function evalExpr(expr: string, ctx: TemplateContext): unknown {
  let m = expr.match(/^params\.(.+)$/);
  if (m) return getPath(ctx.params, m[1]);
  m = expr.match(/^query\.(.+)$/);
  if (m) return getPath(ctx.query, m[1]);
  m = expr.match(/^body\.(.+)$/);
  if (m) return getPath(ctx.body, m[1]);
  m = expr.match(/^faker\.int\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)$/);
  if (m) return fakeInt(parseInt(m[1], 10), parseInt(m[2], 10));
  if (expr === "faker.uuid") return fakeUuid();
  if (expr === "faker.name") return fakeName();
  if (expr === "faker.email") return fakeEmail();
  if (expr === "faker.word") return fakeWord();
  if (expr === "faker.bool") return fakeBool();
  return "";
}

/**
 * Render a body template. Supported:
 * {{params.id}} {{query.q}} {{body.user.name}}
 * {{faker.int(1,100)}} {{faker.uuid}} {{faker.name}} {{faker.email}} {{faker.word}} {{faker.bool}}
 */
export function renderTemplate(tpl: string, ctx: TemplateContext): string {
  return tpl.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_full, expr: string) => {
    const v = evalExpr(expr.trim(), ctx);
    if (v == null) return "";
    if (typeof v === "object") return JSON.stringify(v);
    return String(v);
  });
}
