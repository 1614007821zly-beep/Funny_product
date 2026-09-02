import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

function createRoute({ anonymous = false } = {}) {
  const writes = [];
  const DB = { prepare: sql => ({ bind(...values) { this.values = values; return this; }, async run() { writes.push({ sql, values: this.values }); return { success: true }; } }) };
  const feedbackModule = (() => {
    const exports = {};
    vm.runInNewContext(ts.transpileModule(read("lib/recommendation-feedback.ts"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, { exports });
    return exports;
  })();
  const exports = {};
  vm.runInNewContext(ts.transpileModule(read("app/api/recommendation-feedback/route.ts"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, Request, Response, crypto: webcrypto,
    require: name => name === "cloudflare:workers" ? { env: { DB } } : name.includes("chatgpt-auth") ? { getChatGPTUser: async () => anonymous ? null : { userId: "user-1" } } : feedbackModule,
  });
  return { ...exports, writes };
}

const request = body => new Request("http://local.test/api/recommendation-feedback", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

test("recommendation feedback requires identity and a bounded reason", async () => {
  assert.equal((await createRoute({ anonymous: true }).POST(request({ sentiment: "suitable" }))).status, 401);
  assert.equal((await createRoute().POST(request({ sentiment: "unsuitable", reason: "other" }))).status, 400);
  assert.equal((await createRoute().POST(request({ sentiment: "suitable", reason: "too_far" }))).status, 400);
});

test("stores only bounded ranking signals and rounds distance/cost", async () => {
  const route = createRoute();
  const response = await route.POST(request({
    sentiment: "unsuitable", reason: "too_far", estimatedCost: 137,
    longitude: 104.081234, latitude: 30.651234, special: "不要保存这段文字",
    places: [{ id: "poi-1", name: "星巴克（IFS店）", category: "咖啡馆", distance: 1234 }],
  }));
  assert.equal(response.status, 201);
  assert.equal(route.writes.length, 1);
  const values = route.writes[0].values;
  assert.equal(values[1], "user-1");
  assert.equal(values[2], "unsuitable");
  assert.equal(values[3], "too_far");
  assert.deepEqual(JSON.parse(values[4]), ["poi-1"]);
  assert.deepEqual(JSON.parse(values[5]), ["星巴克"]);
  assert.equal(values[6], "咖啡馆");
  assert.equal(values[7], 1000);
  assert.equal(values[8], 140);
  assert.doesNotMatch(JSON.stringify(values), /104\.081234|30\.651234|不要保存这段文字/);
});
