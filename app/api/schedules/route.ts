import { env } from "cloudflare:workers";
import { getChatGPTUser, type ChatGPTUser } from "../../chatgpt-auth";

export const dynamic = "force-dynamic";

type ScheduleAction = "accept" | "cancel" | "delete" | "update";
type ScheduleVisibility = "personal" | "shared";
type ScheduleSource = "manual" | "ai" | "legacy_import";
type ScheduleInput = {
  title?: string;
  eventDate?: string;
  eventTime?: string;
  city?: string;
  id?: string;
  action?: ScheduleAction;
  visibility?: ScheduleVisibility;
  source?: ScheduleSource;
};

type Membership = { relationship_id: string };
type StoredSchedule = {
  id: string;
  relationship_id: string | null;
  created_by_user_id: string;
  accepted_by_user_id: string | null;
  visibility: ScheduleVisibility;
  title: string;
  event_date: string;
  event_time: string;
  city: string;
  status: string;
  source: ScheduleSource | "legacy_shared";
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

async function activeRelationship(userId: string) {
  return env.DB.prepare(`SELECT m.relationship_id FROM relationship_members m
    JOIN relationships r ON r.id=m.relationship_id
    WHERE m.user_id=? AND m.left_at IS NULL AND r.status='active' LIMIT 1`)
    .bind(userId).first<Membership>();
}

async function ensureUser(identity: ChatGPTUser) {
  const now = new Date().toISOString();
  const fallbackName = identity.fullName?.trim() || identity.email.split("@")[0] || "新用户";
  await env.DB.prepare(`INSERT INTO users (id,email,nickname,birthday,city,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET email=excluded.email,updated_at=excluded.updated_at`)
    .bind(identity.userId, identity.email, fallbackName, null, "杭州", now, now).run();
}

export async function GET() {
  const identity = await getChatGPTUser();
  if (!identity) return json({ error: "请先登录。" }, 401);
  const membership = await activeRelationship(identity.userId);
  const today = shanghaiDate();
  const query = membership
    ? env.DB.prepare(`${scheduleColumns()} FROM schedules
        WHERE deleted_at IS NULL AND status<>'cancelled' AND (
          (visibility='personal' AND created_by_user_id=?) OR
          (visibility='shared' AND relationship_id=?)
        )
        ORDER BY CASE WHEN event_date>=? THEN 0 ELSE 1 END,event_date ASC,updated_at DESC LIMIT 100`)
      .bind(identity.userId, membership.relationship_id, today)
    : env.DB.prepare(`${scheduleColumns()} FROM schedules
        WHERE deleted_at IS NULL AND status<>'cancelled'
          AND visibility='personal' AND created_by_user_id=?
        ORDER BY CASE WHEN event_date>=? THEN 0 ELSE 1 END,event_date ASC,updated_at DESC LIMIT 100`)
      .bind(identity.userId, today);
  const result = await query.all<StoredSchedule>();
  const schedules = result.results ?? [];
  return json({ schedule: schedules[0] ?? null, schedules });
}

export async function POST(request: Request) {
  const identity = await getChatGPTUser();
  if (!identity) return json({ error: "请先登录后再创建安排。" }, 401);
  await ensureUser(identity);

  let body: ScheduleInput;
  try {
    body = await request.json() as ScheduleInput;
  } catch {
    return json({ error: "请求内容不是有效的 JSON。" }, 400);
  }

  const title = clean(body.title, 80);
  const eventDate = clean(body.eventDate, 10);
  const eventTime = clean(body.eventTime, 5);
  const city = clean(body.city, 40);
  const source: ScheduleSource = ["ai", "legacy_import"].includes(body.source ?? "") ? body.source as ScheduleSource : "manual";
  const visibility: ScheduleVisibility = body.visibility === "shared" && source !== "legacy_import" ? "shared" : "personal";
  if (!title || !validDate(eventDate) || !validTime(eventTime) || !city) {
    return json({ error: "请完整填写有效的安排名称、日期、时间和城市。" }, 400);
  }

  const membership = visibility === "shared" ? await activeRelationship(identity.userId) : null;
  if (visibility === "shared" && !membership) return json({ error: "请先建立关系。" }, 409);

  const now = new Date().toISOString();
  const sourceReference = source === "legacy_import"
    ? await digest(`${identity.userId}\n${title}\n${eventDate}\n${eventTime}\n${city}`)
    : null;
  const id = crypto.randomUUID();
  const status = visibility === "shared" ? "pending_partner" : "active";

  if (sourceReference) {
    await env.DB.prepare(`INSERT OR IGNORE INTO schedules
      (id,relationship_id,created_by_user_id,accepted_by_user_id,visibility,title,event_date,event_time,city,status,source,source_reference,facts_json,version,created_at,updated_at,deleted_at)
      VALUES (?,?,?,NULL,?,?,?,?,?,?,?,?, '{}',1,?,?,NULL)`)
      .bind(id, null, identity.userId, visibility, title, eventDate, eventTime, city, status, source, sourceReference, now, now).run();
    const schedule = await env.DB.prepare(`${scheduleColumns()} FROM schedules WHERE created_by_user_id=? AND source_reference=? LIMIT 1`)
      .bind(identity.userId, sourceReference).first<StoredSchedule>();
    return json({ schedule, imported: schedule?.id === id });
  }

  await env.DB.prepare(`INSERT INTO schedules
    (id,relationship_id,created_by_user_id,accepted_by_user_id,visibility,title,event_date,event_time,city,status,source,source_reference,facts_json,version,created_at,updated_at,deleted_at)
    VALUES (?,?,?,NULL,?,?,?,?,?,?,?,?, '{}',1,?,?,NULL)`)
    .bind(id, membership?.relationship_id ?? null, identity.userId, visibility, title, eventDate, eventTime, city, status, source, null, now, now).run();
  const schedule = await env.DB.prepare(`${scheduleColumns()} FROM schedules WHERE id=?`).bind(id).first<StoredSchedule>();
  return json({ schedule }, 201);
}

export async function PATCH(request: Request) {
  const identity = await getChatGPTUser();
  if (!identity) return json({ error: "请先登录。" }, 401);
  const membership = await activeRelationship(identity.userId);

  let body: ScheduleInput;
  try {
    body = await request.json() as ScheduleInput;
  } catch {
    return json({ error: "请求内容不是有效的 JSON。" }, 400);
  }
  if (!body.id || !["accept", "cancel", "delete", "update"].includes(body.action ?? "")) {
    return json({ error: "不支持的操作。" }, 400);
  }

  const schedule = await env.DB.prepare(`${scheduleColumns()} FROM schedules WHERE id=? AND deleted_at IS NULL LIMIT 1`)
    .bind(body.id).first<StoredSchedule>();
  if (!schedule) return json({ error: "安排不存在。" }, 404);
  const ownsPersonal = schedule.visibility === "personal" && schedule.created_by_user_id === identity.userId;
  const belongsToRelationship = schedule.visibility === "shared" && Boolean(membership) && schedule.relationship_id === membership?.relationship_id;
  if (!ownsPersonal && !belongsToRelationship) return json({ error: "你无权操作这个安排。" }, 403);

  const now = new Date().toISOString();
  if (body.action === "update") {
    const title = clean(body.title, 80);
    const eventDate = clean(body.eventDate, 10);
    const eventTime = clean(body.eventTime, 5);
    const city = clean(body.city, 40);
    if (!title || !validDate(eventDate) || !validTime(eventTime) || !city) {
      return json({ error: "请完整填写有效的安排名称、日期、时间和城市。" }, 400);
    }
    if (schedule.visibility === "shared" && schedule.created_by_user_id !== identity.userId) {
      return json({ error: "共同安排只能由发起人修改。" }, 403);
    }
    const status = schedule.visibility === "shared" ? "pending_partner" : "active";
    const result = await env.DB.prepare(`UPDATE schedules SET title=?,event_date=?,event_time=?,city=?,status=?,
      accepted_by_user_id=CASE WHEN visibility='shared' THEN NULL ELSE accepted_by_user_id END,
      updated_at=?,version=version+1 WHERE id=? AND version=? AND deleted_at IS NULL`)
      .bind(title, eventDate, eventTime, city, status, now, schedule.id, schedule.version).run();
    if (!result.meta.changes) return json({ error: "安排刚刚已被更新，请刷新后重试。" }, 409);
    const updated = await env.DB.prepare(`${scheduleColumns()} FROM schedules WHERE id=?`).bind(schedule.id).first<StoredSchedule>();
    return json({ schedule: updated });
  }

  if (body.action === "delete") {
    if (!ownsPersonal) return json({ error: "共同安排只能取消，不能由单方删除。" }, 400);
    const result = await env.DB.prepare(`UPDATE schedules SET status='deleted',deleted_at=?,updated_at=?,version=version+1
      WHERE id=? AND version=? AND deleted_at IS NULL`).bind(now, now, schedule.id, schedule.version).run();
    if (!result.meta.changes) return json({ error: "安排刚刚已被更新，请刷新后重试。" }, 409);
    return json({ schedule: null });
  }

  if (body.action === "cancel") {
    if (!belongsToRelationship) return json({ error: "个人计划请使用删除操作。" }, 400);
    if (schedule.status === "cancelled") return json({ error: "安排已经取消。" }, 409);
    const result = await env.DB.prepare(`UPDATE schedules SET status='cancelled',updated_at=?,version=version+1
      WHERE id=? AND version=? AND status<>'cancelled'`).bind(now, schedule.id, schedule.version).run();
    if (!result.meta.changes) return json({ error: "安排刚刚已被更新，请刷新后重试。" }, 409);
  } else {
    if (!belongsToRelationship) return json({ error: "个人计划无需伴侣接受。" }, 400);
    if (schedule.created_by_user_id === identity.userId) return json({ error: "需要由 TA 接受这个安排。" }, 400);
    if (schedule.status !== "pending_partner") return json({ error: "安排状态已经更新。" }, 409);
    const result = await env.DB.prepare(`UPDATE schedules SET status='confirmed',accepted_by_user_id=?,updated_at=?,version=version+1
      WHERE id=? AND version=? AND status='pending_partner'`)
      .bind(identity.userId, now, schedule.id, schedule.version).run();
    if (!result.meta.changes) return json({ error: "安排刚刚已被更新，请刷新后重试。" }, 409);
  }

  const updated = await env.DB.prepare(`${scheduleColumns()} FROM schedules WHERE id=?`).bind(schedule.id).first<StoredSchedule>();
  return json({ schedule: updated });
}

function scheduleColumns() {
  return `SELECT id,relationship_id,created_by_user_id,accepted_by_user_id,visibility,title,event_date,event_time,city,status,source,version,created_at,updated_at,deleted_at`;
}

function clean(value: unknown, maxLength: number) {
  return typeof value === "string" ? Array.from(value.trim(), character => character.charCodeAt(0) < 32 ? " " : character).join("").slice(0, maxLength) : "";
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validTime(value: string) {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const [hour, minute] = value.split(":").map(Number);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

function shanghaiDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

async function digest(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, "0")).join("");
}

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}
