import { resolveAmapLocation } from "../../../lib/amap-location";
import { classifyServiceFailure, recordServiceRuns, serviceElapsed } from "../../../lib/service-monitoring";
import { getChatGPTUser } from "../../chatgpt-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const startedAt = Date.now();
  const identity = await getChatGPTUser();
  if (!identity) return json({ error: "请先登录后再使用定位。", code: "AUTH_REQUIRED" }, 401);
  const apiKey = process.env.AMAP_WEB_SERVICE_KEY;
  if (!apiKey) {
    await recordServiceRuns([{ service: "location", source: "未配置", durationMs: serviceElapsed(startedAt), outcome: "skipped", failureType: "unconfigured", fallbackTriggered: false }]).catch(() => undefined);
    return json({ error: "定位服务尚未配置。", code: "LOCATION_NOT_CONFIGURED" }, 503);
  }

  const body = await request.json().catch(() => null) as { longitude?: unknown; latitude?: unknown } | null;
  const longitudeValue = body?.longitude;
  const latitudeValue = body?.latitude;
  const longitude = Number(longitudeValue);
  const latitude = Number(latitudeValue);
  if (longitudeValue === undefined || latitudeValue === undefined || !Number.isFinite(longitude) || !Number.isFinite(latitude) || longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
    return json({ error: "定位坐标无效。", code: "INVALID_COORDINATES" }, 400);
  }

  try {
    const location = await resolveAmapLocation(apiKey, longitude, latitude);
    await recordServiceRuns([{ service: "location", source: "高德地图", durationMs: serviceElapsed(startedAt), outcome: "success", failureType: null, fallbackTriggered: false }]).catch(() => undefined);
    return json({ location, source: "高德地图" }, 200, { "cache-control": "private, max-age=300" });
  } catch (error) {
    await recordServiceRuns([{ service: "location", source: "高德地图", durationMs: serviceElapsed(startedAt), outcome: "failure", failureType: classifyServiceFailure(error), fallbackTriggered: false }]).catch(() => undefined);
    return json({ error: "暂时无法识别所在区域。", code: "LOCATION_UNAVAILABLE" }, 502);
  }
}

function json(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return Response.json(data, { status, headers: { "cache-control": "no-store", ...headers } });
}
