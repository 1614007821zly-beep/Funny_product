import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("ranks real AMap candidates before asking AI to compose plans", async () => {
  const [api, page] = await Promise.all([
    readFile(new URL("../app/api/inspiration/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  ]);

  assert.ok(api.indexOf("searchAmapCandidates(amapKey, safeInput)") < api.indexOf("generatePlans(aiHubMixKey, safeInput, weather, candidates)"));
  assert.match(api, /Promise\.all\(categories\.map/);
  assert.match(api, /const bestById = new Map/);
  assert.match(api, /right\.score - left\.score/);
  assert.match(api, /districtSource === "manual"/);
  assert.match(api, /sortrule", "weight"/);
  assert.match(api, /placeId 必须从下方真实地点候选编号中选择/);
  assert.match(api, /usedPlaceIds\.add/);
  assert.match(api, /candidateFallbackResponse/);
  assert.match(api, /REAL_PLACE_FALLBACK/);
  assert.match(api, /buildCandidateFallbackPlans/);
  assert.match(api, /recommendationReasons: scored\.reasons/);
  assert.match(api, /rating >= 4\.5 \? 20/);
  assert.match(api, /totalCost <= maxBudget/);
  assert.match(api, /暂停营业\|停止营业\|已关闭\|永久关闭/);
  assert.match(page, /districtSource:district\.trim\(\)\?"manual":"none"/);
  assert.match(page, /为什么推荐这里/);
  assert.match(page, /AI 暂时繁忙，已根据真实地点生成可执行方案/);
  assert.match(page, /recommendationReasons\.slice\(0,2\)/);
});
