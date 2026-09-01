// Server-only: never accept a model or endpoint from the browser.
const FREE_MODELS = ["lfm-2.5-2.6b-free", "coding-glm-5.3-flash-free"];
const BASE_URLS = ["https://aihubmix.com/v1", "https://api.inferera.com/v1"];
export function inspirationAIConfig(environment: Record<string, string | undefined>) {
  const model = environment.AIHUBMIX_MODEL?.trim() || FREE_MODELS[0];
  const baseURL = (environment.AIHUBMIX_BASE_URL?.trim() || BASE_URLS[0]).replace(/\/$/, "");
  if (!FREE_MODELS.includes(model) || !BASE_URLS.includes(baseURL)) throw new Error("AI_CONFIG_INVALID");
  return { model, endpoint: `${baseURL}/chat/completions` };
}
// Validate before truncation/defaulting so a user's constraint is never silently changed.
export function inspirationInputError(input: Record<string, unknown>): string | null {
  const limits: Record<string, number> = { city: 40, partnerMood: 20, vibe: 20, time: 20, space: 20, special: 120, district: 40 };
  for (const [key, limit] of Object.entries(limits)) {
    const value = input[key];
    if (value !== undefined && (typeof value !== "string" || value.trim().length > limit)) return "条件格式或长度不正确，请检查后重试。";
  }
  const options: Record<string, string[]> = {
    budget: ["¥100以内", "¥100–300", "¥300+"], space: ["", "都可以", "室内", "户外"],
    time: ["", "现在出发", "今晚", "周末", "暂不确定"], vibe: ["", "安静", "热闹", "都可以"],
    districtSource: ["none", "auto", "manual"],
  };
  for (const [key, values] of Object.entries(options)) {
    if (input[key] !== undefined && !values.includes(input[key] as string)) return "预算、时间或空间选项无效，请重新选择。";
  }
  for (const [key, count, length] of [["moods", 2, 20], ["excludePlaceIds", 60, 80], ["excludeCategories", 20, 30], ["excludeBrands", 60, 80]] as const) {
    const value = input[key];
    if (value !== undefined && (!Array.isArray(value) || value.length > count || value.some(item => typeof item !== "string" || item.trim().length > length))) return "状态或筛选条件格式不正确，请检查后重试。";
  }
  if (input.radius !== undefined && (typeof input.radius !== "number" || !Number.isFinite(input.radius) || input.radius < 1000 || input.radius > 20000)) return "搜索范围应在 1–20 公里内，请重新选择。";
  const { longitude, latitude } = input;
  const noLocation = longitude == null && latitude == null || longitude === 0 && latitude === 0;
  if (!noLocation && (typeof longitude !== "number" || typeof latitude !== "number" || !Number.isFinite(longitude) || !Number.isFinite(latitude) || longitude < 73 || longitude > 136 || latitude < 3 || latitude > 54)) return "定位坐标无效或不在支持区域，请重新定位或手动填写商圈。";
  for (const key of ["maxCost", "maxDistance"]) {
    const value = input[key];
    if (value != null && (typeof value !== "number" || !Number.isFinite(value) || value < 0)) return "价格或距离筛选条件无效，请重新选择。";
  }
  return null;
}
export type AIPlan = {
  title: string; summary: string; duration: string; budgetLabel: string;
  placeQuery: string; placeId: string;
  timeline: Array<{ time: string; title: string; description: string }>;
};
function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function text(value: unknown, limit: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= limit;
}
// Reject quota notices, truncated answers, wrapped strings and invented fields.
// No recursive unwrapping or extra paid/repair call.
export function parseAIPlans(payload: unknown, candidateCount: number): AIPlan[] {
  if (!record(payload) || !Array.isArray(payload.choices) || payload.choices.length !== 1) throw new Error("AI_RESPONSE_INVALID");
  const choice = payload.choices[0];
  if (!record(choice) || choice.finish_reason !== "stop" || !record(choice.message) || choice.message.refusal || !text(choice.message.content, 40_000)) throw new Error("AI_RESPONSE_INCOMPLETE");
  const content = choice.message.content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  let parsed: unknown;
  try { parsed = JSON.parse(content); } catch { throw new Error("AI_JSON_INVALID"); }
  if (!record(parsed) || Object.keys(parsed).length !== 1 || !Array.isArray(parsed.plans) || parsed.plans.length !== 3) throw new Error("AI_PLAN_COUNT_INVALID");
  const keys = ["title", "summary", "duration", "budgetLabel", "placeQuery", "placeId", "timeline"];
  const seen = new Set<string>();
  for (const plan of parsed.plans) {
    if (!record(plan) || Object.keys(plan).some(key => !keys.includes(key)) || !text(plan.title, 100) || !text(plan.summary, 500) || !text(plan.duration, 50) || !text(plan.budgetLabel, 100) || !text(plan.placeQuery, 80) || typeof plan.placeId !== "string" || !Array.isArray(plan.timeline) || plan.timeline.length !== 3) throw new Error("AI_PLAN_SCHEMA_INVALID");
    const index = /^P([1-9]\d?)$/.exec(plan.placeId);
    if (candidateCount ? !index || Number(index[1]) > Math.min(candidateCount, 12) : plan.placeId !== "") throw new Error("AI_PLACE_ID_INVALID");
    if (candidateCount >= 3 && seen.has(plan.placeId)) throw new Error("AI_PLACE_ID_DUPLICATE");
    seen.add(plan.placeId);
    for (const node of plan.timeline) {
      if (!record(node) || Object.keys(node).some(key => !["time", "title", "description"].includes(key)) || !text(node.time, 20) || !text(node.title, 100) || !text(node.description, 300)) throw new Error("AI_TIMELINE_INVALID");
    }
  }
  return parsed.plans as AIPlan[];
}
type UserConditions = { special: string; moods: string[]; partnerMood: string; space: string };
export function userConditions(input: UserConditions) {
  const notes = [input.special, ...input.moods, input.partnerMood].join("，");
  return {
    lowMobility: /(少走路|不想走路|不宜走路|不方便走路|腿脚|无障碍|轮椅|行动不便|不能久站|避免久站)/u.test(notes),
    noAlcohol: /(不喝酒|不要酒|不能喝酒|不饮酒|无酒精|禁酒)/u.test(notes),
  };
}
export function categoryAllowed(category: string, input: UserConditions) {
  const { lowMobility, noAlcohol } = userConditions(input);
  const outdoor = /^(公园|景区|夜市|户外休闲|游船|马术|帆船|主题乐园|精品露营|露营地)$/u.test(category);
  if (input.space === "室内" && outdoor) return false;
  if (input.space === "户外" && !outdoor) return false;
  if (lowMobility && /公园|景区|夜市|户外休闲|马术|帆船|主题乐园|露营|滑雪|攀岩/u.test(category)) return false;
  return !(noAlcohol && /酒吧/u.test(category));
}
// Copy stays untrusted after POI filtering; preserve only non-conflicting prose.
export function unsafePlanCopy(plan: Pick<AIPlan, "title" | "summary">, input: UserConditions) {
  const value = `${plan.title} ${plan.summary}`;
  const { lowMobility, noAlcohol } = userConditions(input);
  if (/[¥￥$元]|免费|预算|无障碍|轮椅|营业|开放时间|步行\s*\d|\d\s*(分钟|公里|千米|米)/u.test(value)) return true;
  if (lowMobility && /步行|散步|漫步|逛街|徒步|骑行|攀岩|爬山|滑雪|马术|久站/u.test(value)) return true;
  return noAlcohol && /喝酒|饮酒|品酒|微醺|小酌|鸡尾酒|红酒|啤酒|酒吧/u.test(value);
}
