import type { MockEndpoint } from "./types";

/** Build a copy-paste fetch snippet for an endpoint, with :params filled by example values. */
export function buildFetchSnippet(ep: MockEndpoint): string {
  const examplePath = ep.path.replace(/:([A-Za-z0-9_]+)/g, "123");
  const hasBody = ep.method === "POST" || ep.method === "PUT" || ep.method === "PATCH";
  const headerLines = Object.entries(ep.headers || {})
    .map(([k, v]) => `      "${k}": "${v}",`)
    .join("\n");
  const headersBlock = hasBody || headerLines
    ? `,\n    headers: {\n${headerLines}${hasBody ? `      "Content-Type": "application/json",\n` : ""}    }`
    : "";
  const bodyBlock = hasBody ? `,\n    body: JSON.stringify({ name: "Ada" })` : "";
  return (
    `const res = await fetch("${examplePath}", {\n` +
    `    method: "${ep.method}"${headersBlock}${bodyBlock}\n` +
    `});\n` +
    `const data = await res.json();\n` +
    `console.log(res.status, data);`
  );
}
