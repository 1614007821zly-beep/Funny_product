import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";
import { deleteAccountData } from "../../../lib/account-deletion";

export const dynamic = "force-dynamic";

type ProfileInput = { nickname?: string; birthday?: string; city?: string };

async function ensureUser(input?: ProfileInput) {
  const identity = await getChatGPTUser();
  if (!identity) return null;
  const now = new Date().toISOString();
  const fallbackName = identity.fullName?.trim() || identity.email.split("@")[0] || "新用户";
  await env.DB.prepare(`INSERT INTO users (id,email,nickname,birthday,city,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET email=excluded.email, updated_at=excluded.updated_at`)
    .bind(identity.userId, identity.email, input?.nickname?.trim() || fallbackName, input?.birthday?.trim() || null, input?.city?.trim() || "杭州", now, now).run();
  if (input) {
    await env.DB.prepare("UPDATE users SET nickname=?, birthday=?, city=?, updated_at=? WHERE id=?")
      .bind(input.nickname?.trim() || fallbackName, input.birthday?.trim() || null, input.city?.trim() || "杭州", now, identity.userId).run();
  }
  return identity;
}

async function accountSnapshot(userId: string) {
  const userRow = await env.DB.prepare("SELECT id,email,nickname,birthday,city,onboarding_completed_at FROM users WHERE id=?").bind(userId).first();
  const relationship = await env.DB.prepare(`SELECT r.id, r.status, u.id AS partner_id, u.nickname AS partner_name, u.birthday AS partner_birthday,
      me.history_sharing_mode, me.history_sharing_reviewed_at
    FROM relationship_members me JOIN relationships r ON r.id=me.relationship_id
    LEFT JOIN relationship_members partner ON partner.relationship_id=r.id AND partner.user_id<>me.user_id AND partner.left_at IS NULL
    LEFT JOIN users u ON u.id=partner.user_id
    WHERE me.user_id=? AND me.left_at IS NULL AND r.status='active' LIMIT 1`).bind(userId).first();
  const invite = await env.DB.prepare(`SELECT code,partner_note,expires_at,status FROM relationship_invites
    WHERE inviter_user_id=? AND status='pending' AND expires_at>? ORDER BY created_at DESC LIMIT 1`)
    .bind(userId, new Date().toISOString()).first();
  const user = userRow ? { id: userRow.id, email: userRow.email, nickname: userRow.nickname, birthday: userRow.birthday, city: userRow.city, onboardingCompleted: Boolean(userRow.onboarding_completed_at) } : null;
  return { user, relationship, invite };
}

export async function GET() {
  const identity = await ensureUser();
  if (!identity) return Response.json({ authenticated: false }, { status: 401 });
  return Response.json({ authenticated: true, ...(await accountSnapshot(identity.userId)) });
}

export async function POST(request: Request) {
  const body = await request.json() as ProfileInput;
  const identity = await ensureUser(body);
  if (!identity) return Response.json({ error: "请先登录后再保存资料。" }, { status: 401 });
  await env.DB.prepare("UPDATE users SET onboarding_completed_at=COALESCE(onboarding_completed_at,?) WHERE id=?").bind(new Date().toISOString(), identity.userId).run();
  return Response.json({ ok: true, authenticated: true, ...(await accountSnapshot(identity.userId)) });
}

export async function DELETE(request: Request) {
  const identity = await getChatGPTUser();
  if (!identity) return Response.json({ error: "请先登录后再注销账号。" }, { status: 401 });
  let body: { confirmation?: string };
  try { body = await request.json() as typeof body; }
  catch { return Response.json({ error: "请求内容不是有效的 JSON。" }, { status: 400 }); }
  if (body.confirmation !== "注销账号") return Response.json({ error: "请输入“注销账号”完成确认。" }, { status: 400 });
  const user = await env.DB.prepare("SELECT id FROM users WHERE id=? LIMIT 1").bind(identity.userId).first<{ id: string }>();
  if (!user) return Response.json({ error: "账号不存在或已经注销。" }, { status: 404 });
  try {
    await deleteAccountData(env.DB, env.MEDIA, identity.userId, new Date().toISOString());
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "账号注销暂未完成，账号仍可继续登录。请稍后重试或通过帮助与反馈联系我们。" }, { status: 503 });
  }
}
