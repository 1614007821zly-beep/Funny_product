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

test("server-renders the Love Diary V1.8 experience", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html lang="zh-CN">/);
  assert.match(html, /<title>恋爱日记 V1\.8/);
  assert.match(html, /href="#main-content">跳到主要内容<\/a>/);
  assert.match(html, /<main class="prototype-shell" id="main-content">/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /开始我们的故事/);
  assert.doesNotMatch(html, /codex-preview|Building your site|react-loading-skeleton/i);
});

test("keeps accessibility and interaction safeguards in source", async () => {
  const [page, css, layout] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
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
});
