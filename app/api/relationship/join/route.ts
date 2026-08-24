import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../../chatgpt-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const identity = await getChatGPTUser();
  if (!identity) return Response.json({ error: "请先登录后再接受邀请。" }, { status: 401 });
  const body = await request.json() as { code?: string };
  const code = body.code?.replace(/\s+/g, "").toUpperCase();
  if (!code) return Response.json({ error: "请输入邀请码。" }, { status: 400 });
  const existing = await env.DB.prepare("SELECT relationship_id FROM relationship_members WHERE user_id=? AND left_at IS NULL LIMIT 1").bind(identity.userId).first();
  if (existing) return Response.json({ error: "你已经在一段关系中。" }, { status: 409 });
  const invite = await env.DB.prepare(`SELECT id,inviter_user_id,expires_at,status FROM relationship_invites WHERE code=? LIMIT 1`).bind(code).first<{
    id: string; inviter_user_id: string; expires_at: string; status: string;
  }>();
  if (!invite || invite.status !== "pending" || invite.expires_at <= new Date().toISOString()) return Response.json({ error: "邀请码无效或已过期。" }, { status: 404 });
  if (invite.inviter_user_id === identity.userId) return Response.json({ error: "不能接受自己创建的邀请。" }, { status: 400 });
  const inviterActive = await env.DB.prepare("SELECT relationship_id FROM relationship_members WHERE user_id=? AND left_at IS NULL LIMIT 1").bind(invite.inviter_user_id).first();
  if (inviterActive) return Response.json({ error: "邀请方已经建立了其他关系。" }, { status: 409 });
  const relationshipId = crypto.randomUUID();
  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare("INSERT INTO relationships (id,status,created_at) VALUES (?,'active',?)").bind(relationshipId, now),
    env.DB.prepare("INSERT INTO relationship_members (relationship_id,user_id,role,joined_at) VALUES (?,?,?,?)").bind(relationshipId, invite.inviter_user_id, "inviter", now),
    env.DB.prepare("INSERT INTO relationship_members (relationship_id,user_id,role,joined_at) VALUES (?,?,?,?)").bind(relationshipId, identity.userId, "invitee", now),
    env.DB.prepare("UPDATE relationship_invites SET relationship_id=?,status='accepted',accepted_by_user_id=?,accepted_at=? WHERE id=? AND status='pending'").bind(relationshipId, identity.userId, now, invite.id),
  ]);
  return Response.json({ ok: true, relationshipId });
}
