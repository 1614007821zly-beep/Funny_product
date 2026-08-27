import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../../chatgpt-auth";

export const dynamic = "force-dynamic";

type HistorySharingMode = "from_now" | "selected" | "keep_private";

export async function POST(request: Request) {
  const identity = await getChatGPTUser();
  if (!identity) return Response.json({ error: "请先登录。" }, { status: 401 });

  let body: { mode?: HistorySharingMode; scheduleIds?: string[] };
  try {
    body = await request.json() as typeof body;
  } catch {
    return Response.json({ error: "请求内容不是有效的 JSON。" }, { status: 400 });
  }

  if (!body.mode || !["from_now", "selected", "keep_private"].includes(body.mode)) {
    return Response.json({ error: "请选择历史内容的处理方式。" }, { status: 400 });
  }
  const scheduleIds = [...new Set((body.scheduleIds ?? []).filter(id => typeof id === "string" && id.length <= 80))].slice(0, 20);
  if (body.mode === "selected" && scheduleIds.length === 0) {
    return Response.json({ error: "请至少选择一个要发送给 TA 的计划。" }, { status: 400 });
  }
  if (body.mode !== "selected" && scheduleIds.length) {
    return Response.json({ error: "当前处理方式不应包含待分享计划。" }, { status: 400 });
  }

  const membership = await env.DB.prepare(`SELECT relationship_id FROM relationship_members
    WHERE user_id=? AND left_at IS NULL LIMIT 1`).bind(identity.userId).first<{ relationship_id: string }>();
  if (!membership) return Response.json({ error: "请先建立关系。" }, { status: 409 });

  if (scheduleIds.length) {
    const placeholders = scheduleIds.map(() => "?").join(",");
    const owned = await env.DB.prepare(`SELECT id FROM schedules WHERE id IN (${placeholders})
      AND created_by_user_id=? AND visibility='personal' AND deleted_at IS NULL`)
      .bind(...scheduleIds, identity.userId).all<{ id: string }>();
    if ((owned.results ?? []).length !== scheduleIds.length) {
      return Response.json({ error: "部分计划已变化，请刷新后重新选择。" }, { status: 409 });
    }
  }

  const now = new Date().toISOString();
  const reviewStatement = scheduleIds.length
    ? env.DB.prepare(`UPDATE relationship_members SET history_sharing_mode=?,history_sharing_reviewed_at=?
        WHERE relationship_id=? AND user_id=? AND left_at IS NULL AND
        (SELECT COUNT(*) FROM schedules WHERE id IN (${scheduleIds.map(() => "?").join(",")})
          AND created_by_user_id=? AND visibility='personal' AND deleted_at IS NULL)=?`)
      .bind(body.mode, now, membership.relationship_id, identity.userId, ...scheduleIds, identity.userId, scheduleIds.length)
    : env.DB.prepare(`UPDATE relationship_members SET history_sharing_mode=?,history_sharing_reviewed_at=?
        WHERE relationship_id=? AND user_id=? AND left_at IS NULL`).bind(body.mode, now, membership.relationship_id, identity.userId);
  const shareStatements = scheduleIds.map(id => env.DB.prepare(`UPDATE schedules SET visibility='shared',relationship_id=?,status='pending_partner',
    accepted_by_user_id=NULL,updated_at=?,version=version+1 WHERE id=? AND created_by_user_id=? AND visibility='personal' AND deleted_at IS NULL`)
    .bind(membership.relationship_id, now, id, identity.userId));
  const results = await env.DB.batch([reviewStatement, ...shareStatements]);
  if (!results[0]?.meta.changes) return Response.json({ error: "计划刚刚已变化，请刷新后重新选择。" }, { status: 409 });

  return Response.json({ ok: true, sharedCount: scheduleIds.length, mode: body.mode });
}
