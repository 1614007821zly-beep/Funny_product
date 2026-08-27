import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";

export const dynamic = "force-dynamic";

type StoredSchedule = { id: string; relationship_id: string | null; created_by_user_id: string; visibility: string; status: string };

export async function GET() {
  const identity = await getChatGPTUser();
  if (!identity) return Response.json({ error: "请先登录。" }, { status: 401 });
  const result = await env.DB.prepare(`SELECT l.id,l.schedule_id,l.expires_at,l.revoked_at,l.created_at,s.title
    FROM schedule_share_links l JOIN schedules s ON s.id=l.schedule_id
    WHERE l.created_by_user_id=? ORDER BY l.created_at DESC LIMIT 50`).bind(identity.userId).all();
  return Response.json({ links: (result.results ?? []).map(row => ({
    id: row.id, scheduleId: row.schedule_id, title: row.title, expiresAt: row.expires_at,
    revokedAt: row.revoked_at, createdAt: row.created_at,
  })) });
}

export async function POST(request: Request) {
  const identity = await getChatGPTUser();
  if (!identity) return Response.json({ error: "请先登录后再创建分享链接。" }, { status: 401 });
  let body: { scheduleId?: string; expiresInDays?: number };
  try { body = await request.json() as typeof body; }
  catch { return Response.json({ error: "请求内容不是有效的 JSON。" }, { status: 400 }); }
  const scheduleId = typeof body.scheduleId === "string" ? body.scheduleId : "";
  const days = [1, 7, 30].includes(body.expiresInDays ?? 0) ? body.expiresInDays! : 7;
  const schedule = await env.DB.prepare(`SELECT id,relationship_id,created_by_user_id,visibility,status FROM schedules
    WHERE id=? AND deleted_at IS NULL LIMIT 1`).bind(scheduleId).first<StoredSchedule>();
  if (!schedule) return Response.json({ error: "安排不存在。" }, { status: 404 });
  const ownsPersonal = schedule.visibility === "personal" && schedule.created_by_user_id === identity.userId && schedule.status === "active";
  const sharedMember = schedule.visibility === "shared" && schedule.status === "confirmed" && await isActiveMember(identity.userId, schedule.relationship_id);
  if (!ownsPersonal && !sharedMember) return Response.json({ error: "只有本人确认的计划或双方已确认的安排可以分享。" }, { status: 403 });
  const token = randomToken();
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + days * 86400000);
  const id = crypto.randomUUID();
  await env.DB.prepare(`INSERT INTO schedule_share_links
    (id,schedule_id,created_by_user_id,token_hash,expires_at,revoked_at,created_at) VALUES (?,?,?,?,?,NULL,?)`)
    .bind(id, schedule.id, identity.userId, await digest(token), expiresAt.toISOString(), createdAt.toISOString()).run();
  return Response.json({ link: { id, path: `/share/${token}`, expiresAt: expiresAt.toISOString() } }, { status: 201 });
}

export async function DELETE(request: Request) {
  const identity = await getChatGPTUser();
  if (!identity) return Response.json({ error: "请先登录。" }, { status: 401 });
  let body: { id?: string };
  try { body = await request.json() as typeof body; }
  catch { return Response.json({ error: "请求内容不是有效的 JSON。" }, { status: 400 }); }
  const result = await env.DB.prepare(`UPDATE schedule_share_links SET revoked_at=?
    WHERE id=? AND created_by_user_id=? AND revoked_at IS NULL`).bind(new Date().toISOString(), body.id ?? "", identity.userId).run();
  if (!result.meta.changes) return Response.json({ error: "链接不存在或已经失效。" }, { status: 404 });
  return Response.json({ ok: true });
}

async function isActiveMember(userId: string, relationshipId: string | null) {
  if (!relationshipId) return false;
  return Boolean(await env.DB.prepare(`SELECT 1 FROM relationship_members m JOIN relationships r ON r.id=m.relationship_id
    WHERE m.user_id=? AND m.relationship_id=? AND m.left_at IS NULL AND r.status='active' LIMIT 1`)
    .bind(userId, relationshipId).first());
}

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function digest(value: string) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, "0")).join("");
}
