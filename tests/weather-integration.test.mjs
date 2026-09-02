import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

async function weatherModule(fetch) {
  const source = await readFile(new URL("../lib/amap-weather.ts", import.meta.url), "utf8");
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, { exports, fetch, URL, AbortSignal, Intl, Date, Map, Number, Math, Error });
  return exports;
}

test("keeps AMap weather behind the server and handles forecast limits", async () => {
  const [page, route, provider, inspiration] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/weather/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/amap-weather.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/inspiration/route.ts", import.meta.url), "utf8"),
  ]);

  assert.match(route, /getChatGPTUser/);
  assert.match(route, /process\.env\.AMAP_WEB_SERVICE_KEY/);
  assert.match(route, /recordServiceRuns/);
  assert.match(route, /source: weather\.source/);
  assert.match(route, /fallbackTriggered: weather\.source !== "高德天气"/);
  assert.match(provider, /restapi\.amap\.com\/v3\/geocode\/geo/);
  assert.match(provider, /restapi\.amap\.com\/v3\/weather\/weatherInfo/);
  assert.match(provider, /geocoding-api\.open-meteo\.com\/v1\/search/);
  assert.match(provider, /api\.open-meteo\.com\/v1\/forecast/);
  assert.match(provider, /source: "Open-Meteo"/);
  assert.match(provider, /casts\.slice\(0, 4\)/);
  assert.match(provider, /CACHE_MS = 15 \* 60_000/);
  assert.match(inspiration, /只能在用户选择的时间落入上述预报日期时引用天气/);
  assert.match(page, /fetch\(`\/api\/weather\?city=/);
  assert.match(page, /高德天气/);
  assert.match(page, /weatherSource/);
  assert.match(page, /UNVERIFIED_AI_FALLBACK/);
  assert.match(page, /仅显示未来 4 天预报/);
  assert.match(page, /date: inspirationWeather\?\.date \?\? draft\.date/);
  assert.doesNotMatch(page, /AMAP_WEB_SERVICE_KEY/);
  assert.doesNotMatch(page, /尚未接入实时天气/);
});

test("falls back to attributed Open-Meteo forecast when AMap is unavailable", async () => {
  const calls = [];
  const provider = await weatherModule(async input => {
    const url = String(input); calls.push(url);
    if (url.includes("restapi.amap.com")) throw new Error("network timeout");
    if (url.includes("geocoding-api.open-meteo.com")) return Response.json({ results: [{ name: "杭州", admin1: "浙江", latitude: 30.27, longitude: 120.15 }] });
    return Response.json({ daily: { time: ["2026-09-02"], weather_code: [61], temperature_2m_max: [27.4], temperature_2m_min: [21.2], wind_speed_10m_max: [14.6] } });
  });
  const weather = await provider.fetchWeather("test-key", "杭州");
  assert.equal(weather.source, "Open-Meteo");
  assert.equal(weather.forecasts[0].dayWeather, "小雨");
  assert.equal(weather.forecasts[0].dayTemp, "27");
  assert.equal(calls.length, 3);
});
