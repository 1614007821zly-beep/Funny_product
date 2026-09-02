import { env } from "cloudflare:workers";
import { recommendationBrandKey } from "../../../lib/recommendation-feedback";
import { getChatGPTUser } from "../../chatgpt-auth";

export const dynamic = "force-dynamic";

type FeedbackReason = "too_far" | "too_expensive" | "not_novel" | "state_mismatch" | "place_inaccurate";
type FeedbackPlace = { id?: string; name?: string; category?: string; distance?: number | null };
type FeedbackInput = {
  sentiment?: "suitable" | "unsuitable";
  reason?: FeedbackReason;
  category?: string;
  places?: FeedbackPlace[];
  estimatedCost?: number | null;
};

const reasons = new Set<FeedbackReason>(["too_far", "too_expensive", "not_novel", "state_mismatch", "place_inaccurate"]);

export async function POST(request: Request) {
  const identity = await getChatGPTUser();
  if (!identity) return json({ error: "请先登录后再提交推荐反馈。" }, 401);

  let input: FeedbackInput;
  try { input = await request.json() as FeedbackInput; }
  catch { return json({ error: "请求内容不是有效的 JSON。" }, 400); }

  if (!input || !["suitable", "unsuitable"].includes(input.sentiment ?? "")) return json({ error: "请选择合适或不合适。" }, 400);
  if (input.sentiment === "unsuitable" && !reasons.has(input.reason as FeedbackReason)) return json({ error: "请选择不合适的原因。" }, 400);
  if (input.sentiment === "suitable" && input.reason) return json({ error: "合适反馈不需要原因。" }, 400);

  const places = Array.isArray(input.places) ? input.places.slice(0, 4).map(sanitizePlace).filter((place): place is Required<FeedbackPlace> => Boolean(place)) : [];
  const placeIds = [...new Set(places.map(place => place.id))];
  const brandKeys = [...new Set(places.map(place => recommendationBrandKey(place.name)).filter(Boolean))];
  const category = places[0]?.category || clean(input.category, 30) || null;
  const distances = places.map(place => place.distance).filter((value): value is number => value !== null && Number.isFinite(value) && value >= 0);
  const distanceBand = distances.length ? roundedBand(Math.max(...distances), 500, 20_000) : null;
  const costBand = typeof input.estimatedCost === "number" && Number.isFinite(input.estimatedCost) && input.estimatedCost >= 0
    ? roundedBand(input.estimatedCost, 10, 5_000)
    : null;

  await env.DB.prepare(`INSERT INTO recommendation_feedback
    (id,user_id,sentiment,reason,place_ids_json,brand_keys_json,category,distance_band_m,cost_band_yuan,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .bind(
      crypto.randomUUID(), identity.userId, input.sentiment, input.sentiment === "unsuitable" ? input.reason : null,
      JSON.stringify(placeIds), JSON.stringify(brandKeys), category, distanceBand, costBand, new Date().toISOString(),
    ).run();

  return json({ ok: true }, 201);
}

function sanitizePlace(value: FeedbackPlace) {
  if (!value || typeof value !== "object") return null;
  const id = clean(value.id, 80);
  const name = clean(value.name, 80);
  const category = clean(value.category, 30);
  if (!id || !name || !category) return null;
  const distance = typeof value.distance === "number" && Number.isFinite(value.distance) && value.distance >= 0 ? Math.min(value.distance, 20_000) : null;
  return { id, name, category, distance };
}

function roundedBand(value: number, interval: number, maximum: number) {
  return Math.min(maximum, Math.max(0, Math.round(value / interval) * interval));
}

function clean(value: unknown, maxLength: number) {
  return typeof value === "string"
    ? Array.from(value.trim(), character => character.charCodeAt(0) < 32 ? " " : character).join("").slice(0, maxLength)
    : "";
}

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}
