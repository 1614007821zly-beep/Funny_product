import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Love Diary V1.12 experience", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html lang="zh-CN">/);
  assert.match(html, /<title>恋爱日记 V1\.12/);
  assert.match(html, /href="#main-content">跳到主要内容<\/a>/);
  assert.match(html, /<main class="prototype-shell" id="main-content">/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /使用 ChatGPT 登录/);
  assert.doesNotMatch(html, /codex-preview|Building your site|react-loading-skeleton/i);
});

test("keeps accessibility and interaction safeguards in source", async () => {
  const [page, css, layout, api, accountApi, inviteApi, joinApi, schema] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/inspiration/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/account/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/relationship/invite/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/relationship/join/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
  ]);

  assert.match(layout, /className="skip-link"/);
  assert.match(page, /role="dialog"/);
  assert.match(page, /aria-modal="true"/);
  assert.match(page, /aria-live="polite"/);
  assert.match(page, /type="datetime-local"/);
  assert.match(page, /aria-pressed=\{reportReason/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /overscroll-behavior:contain/);
  assert.doesNotMatch(css, /transition:\s*all/);
  assert.doesNotMatch(css, /outline:\s*(?:none|0)(?:[;}])/);
  assert.doesNotMatch(page, /modal-backdrop" onClick/);
  assert.match(page, /fetch\("\/api\/inspiration"/);
  assert.match(api, /process\.env\.AIHUBMIX_API_KEY/);
  assert.match(api, /process\.env\.AMAP_WEB_SERVICE_KEY/);
  assert.match(api, /aihubmix\.com\/v1\/chat\/completions/);
  assert.match(api, /lfm-2\.5-2\.6b-free/);
  assert.match(api, /response_format/);
  assert.match(api, /while \(timeline\.length < 3\)/);
  assert.match(api, /fetchWithNetworkRetry/);
  assert.match(api, /restapi\.amap\.com\/v5\/place\/text/);
  assert.match(api, /restapi\.amap\.com\/v5\/place\/around/);
  assert.match(api, /sortrule/);
  assert.match(page, /navigator\.geolocation/);
  assert.match(page, /PlaceCandidates/);
  assert.match(page, /isEventMonth&&d===eventDate\.getDate\(\)&&adopted/);
  assert.match(page, /距离待定位/);
  assert.match(api, /value === null \|\| value === undefined \|\| value === ""/);
  assert.match(api, /RATE_LIMIT/);
  assert.match(api, /SENSITIVE_INPUT/);
  assert.match(page, /AI 密钥尚未配置，当前显示演示方案/);
  assert.match(page, /\/signin-with-chatgpt\?return_to=/);
  assert.match(page, /fetch\("\/api\/relationship\/join"/);
  assert.match(page, /input\.type = "date"/);
  assert.match(page, /input\.max = dateInputValue\(0\)/);
  assert.match(accountApi, /getChatGPTUser/);
  assert.match(inviteApi, /expiresAt/);
  assert.match(joinApi, /env\.DB\.batch/);
  assert.match(schema, /relationshipMembers/);
  assert.match(schema, /relationshipInvites/);
  assert.doesNotMatch(page, /AIHUBMIX_API_KEY|AMAP_WEB_SERVICE_KEY/);
});
