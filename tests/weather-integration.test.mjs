import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("keeps AMap weather behind the server and handles forecast limits", async () => {
  const [page, route, provider, inspiration] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/weather/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/amap-weather.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/inspiration/route.ts", import.meta.url), "utf8"),
  ]);

  assert.match(route, /getChatGPTUser/);
  assert.match(route, /process\.env\.AMAP_WEB_SERVICE_KEY/);
  assert.match(provider, /restapi\.amap\.com\/v3\/geocode\/geo/);
  assert.match(provider, /restapi\.amap\.com\/v3\/weather\/weatherInfo/);
  assert.match(provider, /casts\.slice\(0, 4\)/);
  assert.match(provider, /CACHE_MS = 15 \* 60_000/);
  assert.match(inspiration, /只能在用户选择的时间落入上述预报日期时引用天气/);
  assert.match(page, /fetch\(`\/api\/weather\?city=/);
  assert.match(page, /高德天气/);
  assert.match(page, /仅显示未来 4 天预报/);
  assert.match(page, /date: inspirationWeather\?\.date \?\? draft\.date/);
  assert.doesNotMatch(page, /AMAP_WEB_SERVICE_KEY/);
  assert.doesNotMatch(page, /尚未接入实时天气/);
});
