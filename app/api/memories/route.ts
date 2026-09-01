import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";
import { readScheduleFacts, validEventDate } from "../../../lib/schedule-facts";

export const dynamic = "force-dynamic";

type MemoryRow = { id:string;schedule_id:string|null;owner_user_id:string;relationship_id:string|null;title:string;event_date:string;city:string;facts_json:string;note:string;media_id:string|null;contribution_shared:number;version:number;created_at:string;updated_at:string;deleted_at:string|null };
const columns = "id,schedule_id,owner_user_id,relationship_id,title,event_date,city,facts_json,note,media_id,contribution_shared,version,created_at,updated_at,deleted_at";

export async function GET(request: Request) {
  const identity = await getChatGPTUser();
  if (!identity) return json({ error: "请先登录。" }, 401);
  const id = new URL(request.url).searchParams.get("id");
  const own = id
    ? await env.DB.prepare(`SELECT ${columns} FROM memories WHERE id=? AND owner_user_id=? AND deleted_at IS NULL LIMIT 1`).bind(id,identity.userId).all<MemoryRow>()
    : await env.DB.prepare(`SELECT ${columns} FROM memories WHERE owner_user_id=? AND deleted_at IS NULL ORDER BY event_date DESC,created_at DESC LIMIT 100`).bind(identity.userId).all<MemoryRow>();
  const memories = await Promise.all((own.results ?? []).map(async row => {
    const partner = row.schedule_id && row.relationship_id ? await env.DB.prepare(`SELECT m.owner_user_id,m.note,m.media_id,m.version FROM memories m
      JOIN relationship_members me ON me.relationship_id=m.relationship_id AND me.user_id=? AND me.left_at IS NULL
      JOIN relationships r ON r.id=m.relationship_id AND r.status='active'
      WHERE m.schedule_id=? AND m.owner_user_id<>? AND m.contribution_shared=1 LIMIT 1`)
      .bind(identity.userId,row.schedule_id,identity.userId).first<{owner_user_id:string;note:string;media_id:string|null;version:number}>() : null;
    return present(row, partner);
  }));
  if (id && !memories[0]) return json({ error: "回忆不存在。" }, 404);
  return json(id ? { memory: memories[0] } : { memories });
}

export async function POST(request: Request) {
  const identity = await getChatGPTUser();
  if (!identity) return json({ error: "请先登录。" }, 401);
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string,unknown>; } catch { return json({error:"请求内容不是有效的 JSON。"},400); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return json({error:"请求内容无效。"},400);
  const title=clean(body.title,80),eventDate=clean(body.eventDate,10),city=clean(body.city,40),note=clean(body.note,2000),mediaId=clean(body.mediaId,100)||null;
  if (!title || !validEventDate(eventDate) || !city) return json({error:"请填写有效的名称、日期和城市。"},400);
  if (eventDate > shanghaiDate()) return json({error:"回忆只能记录已经发生的日期。"},400);
  const media = mediaId ? await ownedMedia(mediaId,identity.userId) : null;
  if (mediaId && !media) return json({error:"照片不存在或不属于当前账号。"},403);
  const now=new Date().toISOString(),id=crypto.randomUUID();
  await env.DB.prepare(`INSERT INTO memories (id,schedule_id,owner_user_id,relationship_id,title,event_date,city,facts_json,note,media_id,contribution_shared,version,created_at,updated_at,deleted_at)
    VALUES (?,NULL,?,NULL,?,?,?,'{}',?,?,0,1,?,?,NULL)`).bind(id,identity.userId,title,eventDate,city,note,mediaId,now,now).run();
  const row=await env.DB.prepare(`SELECT ${columns} FROM memories WHERE id=?`).bind(id).first<MemoryRow>();
  return json({memory:present(row!)},201);
}

export async function PATCH(request: Request) {
  const identity=await getChatGPTUser();
  if(!identity)return json({error:"请先登录。"},401);
  let body:Record<string,unknown>;
  try{body=await request.json() as Record<string,unknown>;}catch{return json({error:"请求内容不是有效的 JSON。"},400);}
  const id=clean(body.id,100),action=body.action;
  const row=await env.DB.prepare(`SELECT ${columns} FROM memories WHERE id=? AND owner_user_id=? AND deleted_at IS NULL LIMIT 1`).bind(id,identity.userId).first<MemoryRow>();
  if(!row)return json({error:"回忆不存在。"},404);
  if(body.version!==row.version)return json({error:"回忆已更新，请刷新后重试。"},409);
  if(action==="retract_content"){
    const media=row.media_id?await ownedMediaWithKey(row.media_id,identity.userId):null;
    const now=new Date().toISOString();
    const statements=[env.DB.prepare(`UPDATE memories SET note='',media_id=NULL,contribution_shared=0,updated_at=?,version=version+1 WHERE id=? AND owner_user_id=? AND version=? AND deleted_at IS NULL`).bind(now,id,identity.userId,row.version)];
    if(media)statements.push(env.DB.prepare(`UPDATE user_media SET status='retracted',retracted_at=? WHERE id=? AND owner_user_id=? AND status='active'`).bind(now,media.id,identity.userId));
    const result=await env.DB.batch(statements);if(!result[0].meta.changes)return json({error:"回忆已更新，请刷新后重试。"},409);
    if(media)await env.MEDIA.delete(media.object_key);
    const updated=await env.DB.prepare(`SELECT ${columns} FROM memories WHERE id=?`).bind(id).first<MemoryRow>();return json({memory:present(updated!)});
  }
  if(action==="delete"){
    if(row.contribution_shared)return json({error:"请先撤回已分享的个人文字或照片，再删除自己的副本。"},409);
    const now=new Date().toISOString();
    const result=await env.DB.prepare(`UPDATE memories SET deleted_at=?,updated_at=?,version=version+1 WHERE id=? AND owner_user_id=? AND version=? AND deleted_at IS NULL`).bind(now,now,id,identity.userId,row.version).run();
    if(!result.meta.changes)return json({error:"回忆已更新，请刷新后重试。"},409);
    return json({memory:null});
  }
  if(action!=="update")return json({error:"不支持的操作。"},400);
  const title=clean(body.title,80),note=clean(body.note,2000),shareContribution=body.shareContribution===true,mediaId=clean(body.mediaId,100)||null;
  if(!title)return json({error:"请填写回忆名称。"},400);
  const media=mediaId?await ownedMedia(mediaId,identity.userId):null;
  if(mediaId&&!media)return json({error:"照片不存在或不属于当前账号。"},403);
  if(shareContribution&&!row.relationship_id)return json({error:"个人回忆不能分享为共同内容。"},400);
  if(shareContribution && !await isActiveMember(identity.userId,row.relationship_id))return json({error:"当前关系已结束，不能再分享内容。"},409);
  const now=new Date().toISOString();
  const statements=[env.DB.prepare(`UPDATE memories SET title=?,note=?,media_id=?,contribution_shared=?,updated_at=?,version=version+1 WHERE id=? AND owner_user_id=? AND version=? AND deleted_at IS NULL`)
    .bind(title,note,mediaId,shareContribution?1:0,now,id,identity.userId,row.version)];
  if(mediaId)statements.push(env.DB.prepare(`UPDATE user_media SET visibility=?,relationship_id=? WHERE id=? AND owner_user_id=? AND status='active'`).bind(shareContribution?"shared":"personal",shareContribution?row.relationship_id:null,mediaId,identity.userId));
  const result=await env.DB.batch(statements);
  if(!result[0].meta.changes)return json({error:"回忆已更新，请刷新后重试。"},409);
  const updated=await env.DB.prepare(`SELECT ${columns} FROM memories WHERE id=?`).bind(id).first<MemoryRow>();
  return json({memory:present(updated!)});
}

function present(row:MemoryRow,partner?:{owner_user_id:string;note:string;media_id:string|null;version:number}|null){
  const facts=readScheduleFacts(row.facts_json);
  return {id:row.id,scheduleId:row.schedule_id,title:row.title,eventDate:row.event_date,city:row.city,facts,note:row.note,mediaId:row.media_id,mediaUrl:row.media_id?`/api/media?id=${encodeURIComponent(row.media_id)}&v=${row.version}`:null,shareContribution:Boolean(row.contribution_shared),version:row.version,createdAt:row.created_at,updatedAt:row.updated_at,partnerContribution:partner?{note:partner.note,mediaUrl:partner.media_id?`/api/media?id=${encodeURIComponent(partner.media_id)}&v=${partner.version}`:null}:null};
}
async function ownedMedia(id:string,userId:string){return env.DB.prepare(`SELECT id FROM user_media WHERE id=? AND owner_user_id=? AND status='active' LIMIT 1`).bind(id,userId).first();}
async function ownedMediaWithKey(id:string,userId:string){return env.DB.prepare(`SELECT id,object_key FROM user_media WHERE id=? AND owner_user_id=? AND status='active' LIMIT 1`).bind(id,userId).first<{id:string;object_key:string}>();}
async function isActiveMember(userId:string,relationshipId:string|null){if(!relationshipId)return false;return Boolean(await env.DB.prepare(`SELECT 1 FROM relationship_members m JOIN relationships r ON r.id=m.relationship_id WHERE m.user_id=? AND m.relationship_id=? AND m.left_at IS NULL AND r.status='active' LIMIT 1`).bind(userId,relationshipId).first());}
function clean(v:unknown,max:number){return typeof v==="string"?v.trim().slice(0,max):"";}
function shanghaiDate(){return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Shanghai",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());}
function json(body:unknown,status=200){return Response.json(body,{status,headers:{"cache-control":"no-store"}});}
