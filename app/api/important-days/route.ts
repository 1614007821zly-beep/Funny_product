import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";

export const dynamic = "force-dynamic";

type Visibility = "personal" | "shared";
type Input = {
  id?: string;
  action?: "accept" | "cancel" | "delete";
  title?: string;
  eventDate?: string;
  repeatRule?: "yearly" | "none";
  reminderDays?: number;
  visibility?: Visibility;
};

type Membership = { relationship_id: string };
type StoredImportantDay = {
  id: string;
  relationship_id: string | null;
  created_by_user_id: string;
  accepted_by_user_id: string | null;
  visibility: Visibility;
  title: string;
  event_date: string;
  repeat_rule: "yearly" | "none";
  reminder_days: number;
  status: string;
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

export async function GET() {
  const identity = await getChatGPTUser();
  if (!identity) return json({ error: "请先登录。" }, 401);
  const membership = await activeRelationship(identity.userId);
  const query = membership
    ? env.DB.prepare(`${columns()} FROM important_days WHERE deleted_at IS NULL AND status<>'cancelled' AND
        ((visibility='personal' AND created_by_user_id=?) OR (visibility='shared' AND relationship_id=?))
        ORDER BY event_date ASC,updated_at DESC LIMIT 100`).bind(identity.userId, membership.relationship_id)
    : env.DB.prepare(`${columns()} FROM important_days WHERE deleted_at IS NULL AND status<>'cancelled'
        AND visibility='personal' AND created_by_user_id=? ORDER BY event_date ASC,updated_at DESC LIMIT 100`).bind(identity.userId);
  const result = await query.all<StoredImportantDay>();
  return json({ importantDays: result.results ?? [] });
}

export async function POST(request: Request) {
  const identity = await getChatGPTUser();
  if (!identity) return json({ error: "请先登录后再添加重要日子。" }, 401);
  let body: Input;
  try { body = await request.json() as Input; }
  catch { return json({ error: "请求内容不是有效的 JSON。" }, 400); }

  const title = clean(body.title, 60);
  const eventDate = clean(body.eventDate, 10);
  const repeatRule = body.repeatRule === "none" ? "none" : "yearly";
  const reminderDays = [0, 1, 7].includes(body.reminderDays ?? 7) ? body.reminderDays ?? 7 : 7;
  const visibility: Visibility = body.visibility === "shared" ? "shared" : "personal";
  if (!title || !validDate(eventDate)) return json({ error: "请填写有效的名称和日期。" }, 400);

  const membership = visibility === "shared" ? await activeRelationship(identity.userId) : null;
  if (visibility === "shared" && !membership) return json({ error: "请先建立关系后再添加共同重要日子。" }, 409);
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const status = visibility === "shared" ? "pending_partner" : "active";
  await env.DB.prepare(`INSERT INTO important_days
    (id,relationship_id,created_by_user_id,accepted_by_user_id,visibility,title,event_date,repeat_rule,reminder_days,status,version,created_at,updated_at,deleted_at)
    VALUES (?,?,?,NULL,?,?,?,?,?,?,1,?,?,NULL)`)
    .bind(id, membership?.relationship_id ?? null, identity.userId, visibility, title, eventDate, repeatRule, reminderDays, status, now, now).run();
  const importantDay = await env.DB.prepare(`${columns()} FROM important_days WHERE id=?`).bind(id).first<StoredImportantDay>();
  return json({ importantDay }, 201);
}

export async function PATCH(request: Request) {
  const identity = await getChatGPTUser();
  if (!identity) return json({ error: "请先登录。" }, 401);
  let body: Input;
  try { body = await request.json() as Input; }
  catch { return json({ error: "请求内容不是有效的 JSON。" }, 400); }
  if (!body.id || !["accept", "cancel", "delete"].includes(body.action ?? "")) return json({ error: "不支持的操作。" }, 400);

  const membership = await activeRelationship(identity.userId);
  const record = await env.DB.prepare(`${columns()} FROM important_days WHERE id=? AND deleted_at IS NULL LIMIT 1`)
    .bind(body.id).first<StoredImportantDay>();
  if (!record) return json({ error: "重要日子不存在。" }, 404);
  const ownsPersonal = record.visibility === "personal" && record.created_by_user_id === identity.userId;
  const belongsToRelationship = record.visibility === "shared" && record.relationship_id === membership?.relationship_id;
  if (!ownsPersonal && !belongsToRelationship) return json({ error: "你无权操作这个重要日子。" }, 403);

  const now = new Date().toISOString();
  let result;
  if (body.action === "delete") {
    if (!ownsPersonal) return json({ error: "共同重要日子只能取消，不能单方删除。" }, 400);
    result = await env.DB.prepare(`UPDATE important_days SET status='deleted',deleted_at=?,updated_at=?,version=version+1
      WHERE id=? AND version=? AND deleted_at IS NULL`).bind(now, now, record.id, record.version).run();
  } else if (body.action === "cancel") {
    if (!belongsToRelationship) return json({ error: "个人重要日子请使用删除操作。" }, 400);
    result = await env.DB.prepare(`UPDATE important_days SET status='cancelled',updated_at=?,version=version+1
      WHERE id=? AND version=? AND status<>'cancelled'`).bind(now, record.id, record.version).run();
  } else {
    if (!belongsToRelationship || record.created_by_user_id === identity.userId) return json({ error: "需要由 TA 确认这个重要日子。" }, 400);
    if (record.status !== "pending_partner") return json({ error: "重要日子状态已经更新。" }, 409);
    result = await env.DB.prepare(`UPDATE important_days SET status='confirmed',accepted_by_user_id=?,updated_at=?,version=version+1
      WHERE id=? AND version=? AND status='pending_partner'`).bind(identity.userId, now, record.id, record.version).run();
  }
  if (!result.meta.changes) return json({ error: "内容刚刚已被更新，请刷新后重试。" }, 409);
  const importantDay = body.action === "delete" ? null : await env.DB.prepare(`${columns()} FROM important_days WHERE id=?`).bind(record.id).first<StoredImportantDay>();
  return json({ importantDay });
}

function columns() {
  return "SELECT id,relationship_id,created_by_user_id,accepted_by_user_id,visibility,title,event_date,repeat_rule,reminder_days,status,version,created_at,updated_at,deleted_at";
}
function clean(value: unknown, max: number) { return typeof value === "string" ? Array.from(value.trim(), character => character.charCodeAt(0) < 32 ? " " : character).join("").slice(0, max) : ""; }
function validDate(value: string) { if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false; const date = new Date(`${value}T12:00:00Z`); return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value; }
function json(body: unknown, status = 200) { return Response.json(body, { status, headers: { "cache-control": "no-store" } }); }
