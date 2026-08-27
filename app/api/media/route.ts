import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";

export const dynamic = "force-dynamic";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxBytes = 8 * 1024 * 1024;

type MediaRow = { id: string; owner_user_id: string; relationship_id: string | null; object_key: string; content_type: string; visibility: string; status: string };

export async function GET(request: Request) {
  const identity = await getChatGPTUser();
  if (!identity) return Response.json({ error: "请先登录。" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!id) {
    const result = await env.DB.prepare(`SELECT id,visibility FROM user_media
      WHERE owner_user_id=? AND status='active' ORDER BY created_at DESC LIMIT 20`).bind(identity.userId).all<{ id: string; visibility: "personal" | "shared" }>();
    return Response.json({ media: (result.results ?? []).map(item => ({ ...item, url: `/api/media?id=${encodeURIComponent(item.id)}` })) });
  }
  const media = await env.DB.prepare(`SELECT id,owner_user_id,relationship_id,object_key,content_type,visibility,status
    FROM user_media WHERE id=? LIMIT 1`).bind(id).first<MediaRow>();
  if (!media || media.status !== "active") return Response.json({ error: "照片不存在或已撤回。" }, { status: 404 });
  const canRead = media.owner_user_id === identity.userId || (media.visibility === "shared" && await isActiveMember(identity.userId, media.relationship_id));
  if (!canRead) return Response.json({ error: "你无权查看这张照片。" }, { status: 403 });
  const object = await env.MEDIA.get(media.object_key);
  if (!object) return Response.json({ error: "照片文件不存在。" }, { status: 404 });
  return new Response(object.body, { headers: { "content-type": object.httpMetadata?.contentType ?? media.content_type, "cache-control": "private, max-age=300", "x-content-type-options": "nosniff" } });
}

export async function POST(request: Request) {
  const identity = await getChatGPTUser();
  if (!identity) return Response.json({ error: "请先登录后再上传照片。" }, { status: 401 });
  let form: FormData;
  try { form = await request.formData(); }
  catch { return Response.json({ error: "上传内容无法读取。" }, { status: 400 }); }
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "请选择一张照片。" }, { status: 400 });
  if (!allowedTypes.has(file.type)) return Response.json({ error: "仅支持 JPG、PNG 或 WebP 照片。" }, { status: 415 });
  if (!file.size || file.size > maxBytes) return Response.json({ error: "单张照片不能超过 8MB。" }, { status: 413 });
  const contents = await file.arrayBuffer();
  if (!hasValidImageSignature(new Uint8Array(contents), file.type)) return Response.json({ error: "照片文件内容与格式不一致。" }, { status: 415 });
  const requestedShared = form.get("visibility") === "shared";
  const membership = requestedShared ? await activeRelationship(identity.userId) : null;
  if (requestedShared && !membership) return Response.json({ error: "请先建立关系后再上传共同照片。" }, { status: 409 });
  const id = crypto.randomUUID();
  const objectKey = `users/${identity.userId}/${id}`;
  await env.MEDIA.put(objectKey, contents, { httpMetadata: { contentType: file.type } });
  try {
    await env.DB.prepare(`INSERT INTO user_media
      (id,owner_user_id,relationship_id,object_key,purpose,content_type,size_bytes,visibility,status,created_at,retracted_at)
      VALUES (?,?,?,?, 'memory',?,?,?, 'active',?,NULL)`)
      .bind(id, identity.userId, membership?.relationship_id ?? null, objectKey, file.type, file.size, membership ? "shared" : "personal", new Date().toISOString()).run();
  } catch (error) {
    await env.MEDIA.delete(objectKey);
    throw error;
  }
  return Response.json({ media: { id, url: `/api/media?id=${encodeURIComponent(id)}`, visibility: membership ? "shared" : "personal" } }, { status: 201 });
}

export async function DELETE(request: Request) {
  const identity = await getChatGPTUser();
  if (!identity) return Response.json({ error: "请先登录。" }, { status: 401 });
  let body: { id?: string };
  try { body = await request.json() as typeof body; }
  catch { return Response.json({ error: "请求内容不是有效的 JSON。" }, { status: 400 }); }
  const media = await env.DB.prepare(`SELECT id,owner_user_id,relationship_id,object_key,content_type,visibility,status
    FROM user_media WHERE id=? LIMIT 1`).bind(body.id ?? "").first<MediaRow>();
  if (!media) return Response.json({ error: "照片不存在。" }, { status: 404 });
  if (media.owner_user_id !== identity.userId) return Response.json({ error: "只有上传者可以撤回这张照片。" }, { status: 403 });
  if (media.status !== "active") return Response.json({ ok: true });
  const now = new Date().toISOString();
  const result = await env.DB.prepare(`UPDATE user_media SET status='retracted',retracted_at=? WHERE id=? AND owner_user_id=? AND status='active'`)
    .bind(now, media.id, identity.userId).run();
  if (result.meta.changes) await env.MEDIA.delete(media.object_key);
  return Response.json({ ok: true });
}

async function activeRelationship(userId: string) {
  return env.DB.prepare(`SELECT m.relationship_id FROM relationship_members m JOIN relationships r ON r.id=m.relationship_id
    WHERE m.user_id=? AND m.left_at IS NULL AND r.status='active' LIMIT 1`).bind(userId).first<{ relationship_id: string }>();
}

async function isActiveMember(userId: string, relationshipId: string | null) {
  if (!relationshipId) return false;
  return Boolean(await env.DB.prepare(`SELECT 1 FROM relationship_members m JOIN relationships r ON r.id=m.relationship_id
    WHERE m.user_id=? AND m.relationship_id=? AND m.left_at IS NULL AND r.status='active' LIMIT 1`)
    .bind(userId, relationshipId).first());
}

function hasValidImageSignature(bytes: Uint8Array, contentType: string) {
  if (contentType === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (contentType === "image/png") return bytes.length >= 8 && [0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a].every((value,index)=>bytes[index]===value);
  if (contentType === "image/webp") return bytes.length >= 12 && new TextDecoder().decode(bytes.slice(0,4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8,12)) === "WEBP";
  return false;
}
