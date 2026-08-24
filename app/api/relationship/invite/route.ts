import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../../chatgpt-auth";

export const dynamic = "force-dynamic";

function inviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, value => alphabet[value % alphabet.length]).join("");
}

export async function POST(request: Request) {
  const identity = await getChatGPTUser();
  if (!identity) return Response.json({ error: "请先登录后再邀请 TA。" }, { status: 401 });
  const active = await env.DB.prepare(`SELECT relationship_id FROM relationship_members
    WHERE user_id=? AND left_at IS NULL LIMIT 1`).bind(identity.userId).first();
  if (active) return Response.json({ error: "你已经在一段关系中，无法重复创建邀请。" }, { status: 409 });
  const body = await request.json() as { partnerNote?: string };
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  await env.DB.prepare("UPDATE relationship_invites SET status='cancelled' WHERE inviter_user_id=? AND status='pending'").bind(identity.userId).run();
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const code = inviteCode();
    try {
      await env.DB.prepare(`INSERT INTO relationship_invites
        (id,code,inviter_user_id,partner_note,status,expires_at,created_at) VALUES (?,?,?,?,?,?,?)`)
        .bind(crypto.randomUUID(), code, identity.userId, body.partnerNote?.trim() || null, "pending", expiresAt, now.toISOString()).run();
      return Response.json({ code, expiresAt });
    } catch (error) {
      if (attempt === 3) throw error;
    }
  }
  return Response.json({ error: "邀请码生成失败，请稍后重试。" }, { status: 500 });
}
