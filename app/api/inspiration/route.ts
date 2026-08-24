type InspirationRequest = {
  city?: string;
  moods?: string[];
  partnerMood?: string;
  vibe?: string;
  time?: string;
  budget?: string;
  space?: string;
  special?: string;
};

type AmapPlace = {
  id: string;
  name: string;
  address: string;
  location: string;
  type: string;
  verifiedBy: "amap";
};

type GeneratedPlan = {
  title: string;
  summary: string;
  duration: string;
  budgetLabel: string;
  placeQuery: string;
  timeline: Array<{ time: string; title: string; description: string }>;
  place?: AmapPlace | null;
};

const rateLimits = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 6;
const WINDOW_MS = 60_000;

export async function POST(request: Request) {
  const clientId = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!takeRateLimit(clientId)) return json({ error: "请求过于频繁，请稍后再试。", code: "RATE_LIMITED" }, 429);

  let input: InspirationRequest;
  try {
    input = await request.json() as InspirationRequest;
  } catch {
    return json({ error: "请求内容不是有效的 JSON。", code: "INVALID_JSON" }, 400);
  }

  const safeInput = sanitizeInput(input);
  if (!safeInput.city) return json({ error: "请先填写城市。", code: "CITY_REQUIRED" }, 400);
  if (containsContactDetails(safeInput.special)) {
    return json({ error: "特殊要求中请勿填写手机号、邮箱等联系方式。", code: "SENSITIVE_INPUT" }, 400);
  }

  const aiHubMixKey = process.env.AIHUBMIX_API_KEY;
  const amapKey = process.env.AMAP_WEB_SERVICE_KEY;
  if (!aiHubMixKey) return json({ error: "AI 服务尚未配置，请联系网站管理员。", code: "AI_NOT_CONFIGURED" }, 503);

  try {
    const plans = await generatePlans(aiHubMixKey, safeInput);
    const enriched = await Promise.all(plans.map(async plan => ({
      ...plan,
      place: amapKey ? await searchAmapPlace(amapKey, safeInput.city, plan.placeQuery) : null,
    })));
    return json({ plans: enriched, source: { ai: "AIHubMix / lfm-2.5-2.6b-free", places: amapKey ? "高德地图" : "未配置" } });
  } catch (error) {
    console.error("Inspiration generation failed", error instanceof Error ? error.message : "unknown error");
    return json({ error: "灵感暂时没有生成成功，请稍后重试。", code: "GENERATION_FAILED" }, 502);
  }
}

async function generatePlans(apiKey: string, input: Required<InspirationRequest>): Promise<GeneratedPlan[]> {
  const prompt = [
    "你是情侣共同生活规划助手。请生成3个安全、现实、不过度浪漫化的约会灵感。",
    "返回 JSON：plans 正好3项；每项包含 title、summary、duration、budgetLabel、placeQuery、timeline；timeline 正好3项，每项包含 time、title、description。",
    "不得编造具体商家、营业时间、评分、价格或交通事实；具体地点只写可用于地图检索的通用关键词。",
    "不要推断关系质量、情绪原因或任何未提供的个人信息。",
    `城市：${input.city}`,
    `我的状态：${input.moods.join("、") || "未说明"}`,
    `TA状态：${input.partnerMood}`,
    `氛围：${input.vibe}`,
    `时间：${input.time}`,
    `预算：${input.budget}`,
    `空间：${input.space}`,
    `特殊要求：${input.special || "无"}`,
  ].join("\n");

  const response = await fetchWithNetworkRetry("https://aihubmix.com/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "lfm-2.5-2.6b-free",
      messages: [
        { role: "system", content: "你是情侣生活规划助手，只输出 JSON，不要 Markdown、解释或思考过程。根对象必须只有 plans 数组。" },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      reasoning_effort: "none",
      temperature: 0.3,
      max_tokens: 6000,
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) throw new Error(`AIHubMix ${response.status}`);
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const text = payload.choices?.[0]?.message?.content;
  if (!text) throw new Error("AIHubMix returned no text");
  const parsed = JSON.parse(stripCodeFence(text)) as { plans?: GeneratedPlan[] };
  if (!Array.isArray(parsed.plans) || parsed.plans.length !== 3) throw new Error("AIHubMix returned an invalid plan count");
  return parsed.plans.map(validatePlan);
}

async function searchAmapPlace(apiKey: string, city: string, keywords: string): Promise<AmapPlace | null> {
  const url = new URL("https://restapi.amap.com/v5/place/text");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("keywords", keywords.slice(0, 80));
  url.searchParams.set("region", city);
  url.searchParams.set("city_limit", "true");
  url.searchParams.set("page_size", "3");

  const response = await fetch(url, { signal: AbortSignal.timeout(8_000) });
  if (!response.ok) return null;
  const data = await response.json() as { status?: string; pois?: Array<Record<string, unknown>> };
  const poi = data.status === "1" ? data.pois?.[0] : undefined;
  if (!poi || typeof poi.name !== "string" || typeof poi.location !== "string") return null;
  return {
    id: stringValue(poi.id),
    name: poi.name,
    address: stringValue(poi.address) || stringValue(poi.pname) + stringValue(poi.cityname) + stringValue(poi.adname),
    location: poi.location,
    type: stringValue(poi.type),
    verifiedBy: "amap",
  };
}

function sanitizeInput(input: InspirationRequest): Required<InspirationRequest> {
  return {
    city: clean(input.city, 40),
    moods: Array.isArray(input.moods) ? input.moods.slice(0, 2).map(value => clean(value, 20)).filter(Boolean) : [],
    partnerMood: clean(input.partnerMood, 20),
    vibe: clean(input.vibe, 20),
    time: clean(input.time, 20),
    budget: clean(input.budget, 20),
    space: clean(input.space, 20),
    special: clean(input.special, 120),
  };
}

function validatePlan(plan: GeneratedPlan): GeneratedPlan {
  if (!plan || typeof plan.title !== "string" || typeof plan.summary !== "string" || !Array.isArray(plan.timeline)) throw new Error("Invalid generated plan");
  const timeline = plan.timeline.slice(0, 3).map(item => ({ time: clean(item.time, 10), title: clean(item.title, 50), description: clean(item.description, 120) }));
  while (timeline.length < 3) {
    timeline.push({ time: "结束前", title: "从容返程", description: "根据当晚状态决定结束时间，并在出发前查看实时路线" });
  }
  return {
    title: clean(plan.title, 50),
    summary: clean(plan.summary, 180),
    duration: clean(plan.duration, 30),
    budgetLabel: clean(plan.budgetLabel, 30),
    placeQuery: clean(plan.placeQuery, 80),
    timeline,
  };
}

function takeRateLimit(id: string) {
  const now = Date.now();
  const current = rateLimits.get(id);
  if (!current || current.resetAt <= now) { rateLimits.set(id, { count: 1, resetAt: now + WINDOW_MS }); return true; }
  if (current.count >= RATE_LIMIT) return false;
  current.count += 1;
  return true;
}

function clean(value: unknown, maxLength: number) { return typeof value === "string" ? Array.from(value.trim(), character => character.charCodeAt(0) < 32 ? " " : character).join("").slice(0, maxLength) : ""; }
function containsContactDetails(value: string) { return /(?:1[3-9]\d{9})|(?:[\w.+-]+@[\w.-]+\.[A-Za-z]{2,})/.test(value); }
function stripCodeFence(value: string) { return value.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""); }
async function fetchWithNetworkRetry(input: string | URL, init: RequestInit) {
  try {
    return await fetch(input, init);
  } catch (error) {
    if (init.signal?.aborted) throw error;
    await new Promise(resolve => setTimeout(resolve, 350));
    return fetch(input, init);
  }
}
function stringValue(value: unknown) { return typeof value === "string" ? value : ""; }
function json(body: unknown, status = 200) { return Response.json(body, { status, headers: { "cache-control": "no-store" } }); }
