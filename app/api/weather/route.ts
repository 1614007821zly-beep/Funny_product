import { fetchWeather } from "../../../lib/amap-weather";
import { getChatGPTUser } from "../../chatgpt-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const identity = await getChatGPTUser();
  if (!identity) return json({ error: "请先登录后再查看天气。", code: "AUTH_REQUIRED" }, 401);
  const apiKey = process.env.AMAP_WEB_SERVICE_KEY;
  const city = new URL(request.url).searchParams.get("city")?.trim().slice(0, 40) ?? "";
  if (!city) return json({ error: "请先选择城市。", code: "CITY_REQUIRED" }, 400);
  try {
    const weather = await fetchWeather(apiKey, city);
    return json({ weather, source: weather.source }, 200, { "cache-control": "private, max-age=600" });
  } catch (error) {
    const code = error instanceof Error ? error.message : "WEATHER_UNAVAILABLE";
    if (code === "CITY_NOT_FOUND") return json({ error: "暂时无法识别这个城市。", code }, 404);
    return json({ error: "天气暂时无法获取，请稍后再试。", code: "WEATHER_UNAVAILABLE" }, 502);
  }
}

function json(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return Response.json(data, { status, headers: { "cache-control": "no-store", ...headers } });
}
