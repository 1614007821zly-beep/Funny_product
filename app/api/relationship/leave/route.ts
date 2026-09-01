import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../../chatgpt-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const identity = await getChatGPTUser();
  if (!identity) return Response.json({ error: "请先登录。" }, { status: 401 });
  let safety = false;
  try { safety = Boolean((await request.json() as { safety?: boolean }).safety); }
  catch { /* An empty body remains a normal exit for older clients. */ }
  const member = await env.DB.prepare("SELECT relationship_id FROM relationship_members WHERE user_id=? AND left_at IS NULL LIMIT 1").bind(identity.userId).first<{ relationship_id: string }>();
  if (!member) return Response.json({ error: "当前没有可退出的关系。" }, { status: 404 });
  const now = new Date().toISOString();
  const ownedSharedMedia = safety ? await env.DB.prepare(`SELECT id,object_key FROM user_media
    WHERE owner_user_id=? AND relationship_id=? AND visibility='shared' AND status='active'`)
    .bind(identity.userId, member.relationship_id).all<{ id: string; object_key: string }>() : { results: [] };
  const statements = [
    env.DB.prepare(`UPDATE schedule_share_links SET revoked_at=? WHERE created_by_user_id=? AND revoked_at IS NULL
      AND schedule_id IN (SELECT id FROM schedules WHERE relationship_id=?)`).bind(now, identity.userId, member.relationship_id),
    env.DB.prepare("UPDATE relationship_members SET left_at=? WHERE relationship_id=? AND left_at IS NULL").bind(now, member.relationship_id),
    env.DB.prepare("UPDATE relationships SET status='ended',ended_at=? WHERE id=? AND status='active'").bind(now, member.relationship_id),
    env.DB.prepare(`UPDATE relationship_invites SET status='cancelled'
      WHERE status='pending' AND inviter_user_id IN
      (SELECT user_id FROM relationship_members WHERE relationship_id=?)`).bind(member.relationship_id),
  ];
  if (safety) statements.unshift(
    env.DB.prepare(`UPDATE memories SET note='',media_id=NULL,contribution_shared=0,updated_at=?,version=version+1
      WHERE owner_user_id=? AND relationship_id=? AND contribution_shared=1`).bind(now, identity.userId, member.relationship_id),
    env.DB.prepare(`UPDATE user_media SET status='retracted',retracted_at=?
      WHERE owner_user_id=? AND relationship_id=? AND visibility='shared' AND status='active'`).bind(now, identity.userId, member.relationship_id),
  );
  await env.DB.batch(statements);
  if (safety) await Promise.all((ownedSharedMedia.results ?? []).map(media => env.MEDIA.delete(media.object_key)));
  return Response.json({ ok: true });
}
