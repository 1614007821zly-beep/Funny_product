import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("ranks real AMap candidates before asking AI to compose plans", async () => {
  const [api, page] = await Promise.all([
    readFile(new URL("../app/api/inspiration/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  ]);

  assert.ok(api.indexOf("searchAmapCandidates(amapKey, safeInput)") < api.indexOf("generatePlans(aiHubMixKey, safeInput, weather, candidates)"));
  assert.match(api, /Promise\.all\(intents\.map/);
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
  assert.match(api, /totalCost > band\.max/);
  assert.match(api, /budgetEligible: false/);
  assert.match(api, /budgetLabel: clean\(input\.budget/);
  assert.match(api, /预算是目标区间/);
  assert.match(api, /\["¥100以内", "¥100–300", "¥300\+"\]\.includes/);
  assert.match(api, /\{ min: 300, max: Infinity \}/);
  assert.match(api, /distance > input\.radius/);
  assert.match(api, /input\.radius >= 10_000/);
  assert.match(api, /diversifyCandidates/);
  assert.match(api, /brandKey/);
  assert.match(api, /composePlacesForBudget/);
  assert.match(api, /routeDistance\(primary, place\) <= 3_000/);
  assert.match(api, /includedPlaces: composition\.included/);
  assert.match(api, /highBudget.*餐厅.*剧院/s);
  assert.match(api, /page_size", "25"/);
  assert.match(api, /page_num", String\(pageNumber\)/);
  assert.match(api, /firstPage\.rawCount === 25/);
  assert.match(api, /candidateSearchIntents/);
  assert.match(api, /\.slice\(0, 10\)/);
  assert.match(api, /\.slice\(0, 60\)/);
  assert.match(api, /count >= 10/);
  assert.match(api, /LiveHouse/);
  assert.match(api, /pool: candidateSearch\.pool/);
  assert.match(api, /matchesCategory/);
  assert.match(api, /手机\|电脑\|家电\|汽车/);
  assert.match(api, /compositionChanged/);
  assert.match(api, /budgetMatch: "under"/);
  assert.match(api, /暂停营业\|停止营业\|已关闭\|永久关闭/);
  assert.match(page, /districtSource:district\.trim\(\)\?"manual":"none"/);
  assert.match(page, /为什么推荐这里/);
  assert.match(page, /AI 暂时繁忙，已根据真实地点生成可执行方案/);
  assert.match(page, /recommendationReasons\.slice\(0,2\)/);
  assert.match(page, /本次安排总预算/);
  assert.match(page, /价格待确认/);
  assert.match(page, /预算偏好/);
  assert.match(page, /搜索范围/);
  assert.match(page, /已知地点消费约/);
  assert.match(page, /商圈搜索/);
  assert.match(page, /未达到预算偏好/);
  assert.match(page, /已从高德返回的/);
  assert.match(page, /灵感是怎么生成的/);
  assert.match(page, /这里只提供建议，确认前不会进入日历/);
  assert.match(page, /共同安排仍需双方分别确认/);
  assert.doesNotMatch(page, /format\(260\)/);
});
