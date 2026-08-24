import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../../chatgpt-auth";

export const dynamic = "force-dynamic";

export async function POST() {
  const identity = await getChatGPTUser();
  if (!identity) return Response.json({ error: "请先登录。" }, { status: 401 });
  const member = await env.DB.prepare("SELECT relationship_id FROM relationship_members WHERE user_id=? AND left_at IS NULL LIMIT 1").bind(identity.userId).first<{ relationship_id: string }>();
  if (!member) return Response.json({ error: "当前没有可退出的关系。" }, { status: 404 });
  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare("UPDATE relationship_members SET left_at=? WHERE relationship_id=? AND user_id=? AND left_at IS NULL").bind(now, member.relationship_id, identity.userId),
    env.DB.prepare("UPDATE relationships SET status='ended',ended_at=? WHERE id=?").bind(now, member.relationship_id),
  ]);
  return Response.json({ ok: true });
}
