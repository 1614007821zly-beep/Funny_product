import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";

export const dynamic = "force-dynamic";

type Input = { id?: string; title?: string; action?: "accept" | "request_complete" | "confirm_complete" | "cancel" };
type Membership = { relationship_id: string };
type StoredTask = {
  id: string;
  relationship_id: string;
  created_by_user_id: string;
  accepted_by_user_id: string | null;
  completion_requested_by_user_id: string | null;
  title: string;
  status: "pending_partner" | "active" | "completion_pending" | "completed" | "cancelled";
  version: number;
  created_at: string;
  updated_at: string;
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
  if (!membership) return json({ task: null, tasks: [] });
  const result = await env.DB.prepare(`${columns()} FROM relationship_tasks WHERE relationship_id=?
    ORDER BY CASE WHEN status IN ('pending_partner','active','completion_pending') THEN 0 ELSE 1 END,updated_at DESC LIMIT 50`)
    .bind(membership.relationship_id).all<StoredTask>();
  const tasks = result.results ?? [];
  return json({ task: tasks.find(task => !["completed", "cancelled"].includes(task.status)) ?? null, tasks });
}

export async function POST(request: Request) {
  const identity = await getChatGPTUser();
  if (!identity) return json({ error: "请先登录后再发起共同任务。" }, 401);
  const membership = await activeRelationship(identity.userId);
  if (!membership) return json({ error: "请先建立关系后再发起共同任务。" }, 409);
  let body: Input;
  try { body = await request.json() as Input; }
  catch { return json({ error: "请求内容不是有效的 JSON。" }, 400); }
  const title = clean(body.title, 80);
  if (!title) return json({ error: "任务名称不能为空。" }, 400);

  const existing = await env.DB.prepare(`${columns()} FROM relationship_tasks WHERE relationship_id=?
    AND status IN ('pending_partner','active','completion_pending') ORDER BY updated_at DESC LIMIT 1`)
    .bind(membership.relationship_id).first<StoredTask>();
  if (existing) return json({ task: existing, existing: true });
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  await env.DB.prepare(`INSERT OR IGNORE INTO relationship_tasks
    (id,relationship_id,created_by_user_id,accepted_by_user_id,completion_requested_by_user_id,title,status,version,created_at,updated_at)
    VALUES (?,?,?,NULL,NULL,?,'pending_partner',1,?,?)`)
    .bind(id, membership.relationship_id, identity.userId, title, now, now).run();
  const task = await env.DB.prepare(`${columns()} FROM relationship_tasks WHERE relationship_id=?
    AND status IN ('pending_partner','active','completion_pending') ORDER BY updated_at DESC LIMIT 1`)
    .bind(membership.relationship_id).first<StoredTask>();
  return json({ task, existing: task?.id !== id }, task?.id === id ? 201 : 200);
}

export async function PATCH(request: Request) {
  const identity = await getChatGPTUser();
  if (!identity) return json({ error: "请先登录。" }, 401);
  const membership = await activeRelationship(identity.userId);
  if (!membership) return json({ error: "当前没有可用的共同空间。" }, 409);
  let body: Input;
  try { body = await request.json() as Input; }
  catch { return json({ error: "请求内容不是有效的 JSON。" }, 400); }
  if (!body.id || !["accept", "request_complete", "confirm_complete", "cancel"].includes(body.action ?? "")) return json({ error: "不支持的操作。" }, 400);
  const task = await env.DB.prepare(`${columns()} FROM relationship_tasks WHERE id=? AND relationship_id=? LIMIT 1`)
    .bind(body.id, membership.relationship_id).first<StoredTask>();
  if (!task) return json({ error: "共同任务不存在。" }, 404);

  const now = new Date().toISOString();
  let result;
  if (body.action === "accept") {
    if (task.created_by_user_id === identity.userId) return json({ error: "需要由 TA 接受这个任务。" }, 400);
    if (task.status !== "pending_partner") return json({ error: "任务状态已经更新。" }, 409);
    result = await env.DB.prepare(`UPDATE relationship_tasks SET status='active',accepted_by_user_id=?,updated_at=?,version=version+1
      WHERE id=? AND version=? AND status='pending_partner'`).bind(identity.userId, now, task.id, task.version).run();
  } else if (body.action === "request_complete") {
    if (task.status !== "active") return json({ error: "任务尚未由双方接受。" }, 409);
    result = await env.DB.prepare(`UPDATE relationship_tasks SET status='completion_pending',completion_requested_by_user_id=?,updated_at=?,version=version+1
      WHERE id=? AND version=? AND status='active'`).bind(identity.userId, now, task.id, task.version).run();
  } else if (body.action === "confirm_complete") {
    if (task.status !== "completion_pending") return json({ error: "当前没有待确认的完成请求。" }, 409);
    if (task.completion_requested_by_user_id === identity.userId) return json({ error: "需要由 TA 确认完成。" }, 400);
    result = await env.DB.prepare(`UPDATE relationship_tasks SET status='completed',updated_at=?,version=version+1
      WHERE id=? AND version=? AND status='completion_pending'`).bind(now, task.id, task.version).run();
  } else {
    if (["completed", "cancelled"].includes(task.status)) return json({ error: "任务已经结束。" }, 409);
    result = await env.DB.prepare(`UPDATE relationship_tasks SET status='cancelled',updated_at=?,version=version+1
      WHERE id=? AND version=? AND status NOT IN ('completed','cancelled')`).bind(now, task.id, task.version).run();
  }
  if (!result.meta.changes) return json({ error: "任务刚刚已被更新，请刷新后重试。" }, 409);
  const updated = await env.DB.prepare(`${columns()} FROM relationship_tasks WHERE id=?`).bind(task.id).first<StoredTask>();
  return json({ task: updated });
}

function columns() { return "SELECT id,relationship_id,created_by_user_id,accepted_by_user_id,completion_requested_by_user_id,title,status,version,created_at,updated_at"; }
function clean(value: unknown, max: number) { return typeof value === "string" ? Array.from(value.trim(), character => character.charCodeAt(0) < 32 ? " " : character).join("").slice(0, max) : ""; }
function json(body: unknown, status = 200) { return Response.json(body, { status, headers: { "cache-control": "no-store" } }); }
