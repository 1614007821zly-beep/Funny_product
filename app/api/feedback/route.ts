import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const identity = await getChatGPTUser();
  if (!identity) return Response.json({ error: "请先登录后再提交反馈。" }, { status: 401 });
  let body: { category?: string; message?: string };
  try { body = await request.json() as typeof body; }
  catch { return Response.json({ error: "请求内容不是有效的 JSON。" }, { status: 400 }); }
  const category = clean(body.category, 20);
  const message = clean(body.message, 1000);
  if (!category || !message) return Response.json({ error: "请选择类型并填写反馈内容。" }, { status: 400 });
  await env.DB.prepare(`INSERT INTO feedback_entries (id,user_id,category,message,status,created_at)
    VALUES (?,?,?,?, 'open',?)`).bind(crypto.randomUUID(), identity.userId, category, message, new Date().toISOString()).run();
  return Response.json({ ok: true }, { status: 201 });
}

function clean(value: unknown, max: number) {
  return typeof value === "string" ? Array.from(value.trim(), character => character.charCodeAt(0) < 32 ? " " : character).join("").slice(0, max) : "";
}
