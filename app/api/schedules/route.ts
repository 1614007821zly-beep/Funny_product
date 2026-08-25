import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";

export const dynamic = "force-dynamic";

type ScheduleInput = { title?: string; eventDate?: string; eventTime?: string; city?: string; id?: string; action?: "accept" | "cancel" };

async function activeRelationship(userId: string) {
  return env.DB.prepare(`SELECT m.relationship_id FROM relationship_members m
    JOIN relationships r ON r.id=m.relationship_id
    WHERE m.user_id=? AND m.left_at IS NULL AND r.status='active' LIMIT 1`).bind(userId).first<{ relationship_id: string }>();
}

export async function GET() {
  const identity = await getChatGPTUser();
  if (!identity) return Response.json({ error: "请先登录。" }, { status: 401 });
  const membership = await activeRelationship(identity.userId);
  if (!membership) return Response.json({ schedule: null });
  const schedule = await env.DB.prepare(`SELECT id,relationship_id,created_by_user_id,accepted_by_user_id,title,event_date,event_time,city,status,created_at,updated_at
    FROM shared_schedules WHERE relationship_id=? AND status<>'cancelled'
    ORDER BY created_at DESC LIMIT 1`).bind(membership.relationship_id).first();
  return Response.json({ schedule });
}

export async function POST(request: Request) {
  const identity = await getChatGPTUser();
  if (!identity) return Response.json({ error: "请先登录后再创建安排。" }, { status: 401 });
  const membership = await activeRelationship(identity.userId);
  if (!membership) return Response.json({ error: "请先建立关系。" }, { status: 409 });
  const body = await request.json() as ScheduleInput;
  const title = body.title?.trim(); const eventDate = body.eventDate?.trim(); const eventTime = body.eventTime?.trim(); const city = body.city?.trim();
  if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(eventDate ?? "") || !/^\d{2}:\d{2}$/.test(eventTime ?? "") || !city) return Response.json({ error: "请完整填写安排信息。" }, { status: 400 });
  const id = crypto.randomUUID(); const now = new Date().toISOString();
  await env.DB.prepare(`INSERT INTO shared_schedules
    (id,relationship_id,created_by_user_id,title,event_date,event_time,city,status,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,'pending_partner',?,?)`).bind(id,membership.relationship_id,identity.userId,title,eventDate,eventTime,city,now,now).run();
  const schedule = await env.DB.prepare("SELECT * FROM shared_schedules WHERE id=?").bind(id).first();
  return Response.json({ schedule });
}

export async function PATCH(request: Request) {
  const identity = await getChatGPTUser();
  if (!identity) return Response.json({ error: "请先登录。" }, { status: 401 });
  const membership = await activeRelationship(identity.userId);
  if (!membership) return Response.json({ error: "当前没有有效关系。" }, { status: 409 });
  const body = await request.json() as ScheduleInput;
  if (!body.id || !["accept", "cancel"].includes(body.action ?? "")) return Response.json({ error: "不支持的操作。" }, { status: 400 });
  const schedule = await env.DB.prepare("SELECT created_by_user_id,status FROM shared_schedules WHERE id=? AND relationship_id=?").bind(body.id,membership.relationship_id).first<{ created_by_user_id: string; status: string }>();
  if (!schedule) return Response.json({ error: "安排不存在。" }, { status: 404 });
  if (body.action === "cancel") {
    if (schedule.status === "cancelled") return Response.json({ error: "安排已经取消。" }, { status: 409 });
    const now = new Date().toISOString();
    await env.DB.prepare("UPDATE shared_schedules SET status='cancelled',updated_at=? WHERE id=? AND relationship_id=?").bind(now,body.id,membership.relationship_id).run();
    const updated = await env.DB.prepare("SELECT * FROM shared_schedules WHERE id=?").bind(body.id).first();
    return Response.json({ schedule: updated });
  }
  if (schedule.created_by_user_id === identity.userId) return Response.json({ error: "需要由 TA 接受这个安排。" }, { status: 400 });
  if (schedule.status !== "pending_partner") return Response.json({ error: "安排状态已经更新。" }, { status: 409 });
  const now = new Date().toISOString();
  await env.DB.prepare("UPDATE shared_schedules SET status='confirmed',accepted_by_user_id=?,updated_at=? WHERE id=? AND status='pending_partner'").bind(identity.userId,now,body.id).run();
  const updated = await env.DB.prepare("SELECT * FROM shared_schedules WHERE id=?").bind(body.id).first();
  return Response.json({ schedule: updated });
}
