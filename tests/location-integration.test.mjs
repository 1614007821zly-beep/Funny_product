import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("updates the inspiration area from authenticated reverse geolocation", async () => {
  const [page, route, provider] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/location/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/amap-location.ts", import.meta.url), "utf8"),
  ]);

  assert.match(route, /getChatGPTUser/);
  assert.match(route, /process\.env\.AMAP_WEB_SERVICE_KEY/);
  assert.match(route, /INVALID_COORDINATES/);
  assert.match(route, /recordServiceRuns/);
  assert.match(route, /failureType: classifyServiceFailure/);
  assert.match(provider, /assistant\/coordinate\/convert/);
  assert.match(provider, /coordsys", "gps"/);
  assert.match(provider, /geocode\/regeo/);
  assert.match(provider, /extensions", "all"/);
  assert.match(provider, /coordinateDistance/);
  assert.match(page, /fetch\("\/api\/location", \{ method: "POST"/);
  assert.match(page, /district: resolved\.businessArea \|\| resolved\.district/);
  assert.match(page, /const inspirationCity = locationPrefs\.city \|\| profile\.city/);
  assert.match(page, /const requestCity = requestLocation\.city \|\| profile\.city/);
  assert.match(page, /city: requestCity, moods:/);
  assert.match(page, /定位变化后会自动更新；自动结果也可以继续修改/);
  assert.doesNotMatch(page, /AMAP_WEB_SERVICE_KEY/);
});
