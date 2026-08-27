import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../../chatgpt-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const identity = await getChatGPTUser();
  if (!identity) return Response.json({ error: "请先登录后再导出。" }, { status: 401 });
  const member = await env.DB.prepare(`SELECT relationship_id,joined_at,left_at,history_sharing_mode,history_sharing_reviewed_at
    FROM relationship_members WHERE user_id=? ORDER BY joined_at DESC LIMIT 1`).bind(identity.userId).first<Record<string, unknown>>();
  const relationshipId = typeof member?.relationship_id === "string" ? member.relationship_id : null;
  const [user, schedules, importantDays, tasks, media, preferences, shareLinks, feedback] = await Promise.all([
    env.DB.prepare(`SELECT id,email,nickname,birthday,city,created_at,updated_at FROM users WHERE id=?`).bind(identity.userId).first(),
    env.DB.prepare(`SELECT id,visibility,title,event_date,event_time,city,status,source,created_at,updated_at
      FROM schedules WHERE deleted_at IS NULL AND ((visibility='personal' AND created_by_user_id=?) OR (visibility='shared' AND relationship_id=?))
      ORDER BY event_date,created_at`).bind(identity.userId, relationshipId).all(),
    env.DB.prepare(`SELECT id,visibility,title,event_date,repeat_rule,reminder_days,status,created_at,updated_at
      FROM important_days WHERE deleted_at IS NULL AND ((visibility='personal' AND created_by_user_id=?) OR (visibility='shared' AND relationship_id=?))
      ORDER BY event_date,created_at`).bind(identity.userId, relationshipId).all(),
    relationshipId ? env.DB.prepare(`SELECT id,title,status,created_at,updated_at FROM relationship_tasks WHERE relationship_id=? ORDER BY created_at`).bind(relationshipId).all() : Promise.resolve({ results: [] }),
    env.DB.prepare(`SELECT id,purpose,content_type,size_bytes,visibility,status,created_at,retracted_at FROM user_media WHERE owner_user_id=? ORDER BY created_at`).bind(identity.userId).all(),
    env.DB.prepare(`SELECT schedule_reminders,important_day_reminders,partner_updates,updated_at FROM user_preferences WHERE user_id=?`).bind(identity.userId).first(),
    env.DB.prepare(`SELECT schedule_id,expires_at,revoked_at,created_at FROM schedule_share_links WHERE created_by_user_id=? ORDER BY created_at`).bind(identity.userId).all(),
    env.DB.prepare(`SELECT category,message,status,created_at FROM feedback_entries WHERE user_id=? ORDER BY created_at`).bind(identity.userId).all(),
  ]);
  const uploadedMedia = media.results.map(item => ({ ...item, downloadPath: item.status === "active" ? `/api/media?id=${encodeURIComponent(String(item.id))}` : null }));
  const body = JSON.stringify({ exportedAt: new Date().toISOString(), user, relationshipMembership: member ?? null, schedules: schedules.results, importantDays: importantDays.results, tasks: tasks.results, uploadedMedia, notificationPreferences: preferences ?? null, shareLinks: shareLinks.results, feedback: feedback.results }, null, 2);
  return new Response(body, { headers: { "content-type": "application/json; charset=utf-8", "content-disposition": `attachment; filename="love-diary-export-${shanghaiDate()}.json"`, "cache-control": "no-store" } });
}

function shanghaiDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
