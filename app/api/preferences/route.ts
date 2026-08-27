import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";

export const dynamic = "force-dynamic";

type Preferences = {
  scheduleReminders: boolean;
  importantDayReminders: boolean;
  partnerUpdates: boolean;
};

const defaults: Preferences = { scheduleReminders: true, importantDayReminders: true, partnerUpdates: true };

export async function GET() {
  const identity = await getChatGPTUser();
  if (!identity) return Response.json({ error: "请先登录。" }, { status: 401 });
  const row = await env.DB.prepare(`SELECT schedule_reminders,important_day_reminders,partner_updates
    FROM user_preferences WHERE user_id=? LIMIT 1`).bind(identity.userId).first<Record<string, number>>();
  return Response.json({ preferences: row ? fromRow(row) : defaults });
}

export async function PUT(request: Request) {
  const identity = await getChatGPTUser();
  if (!identity) return Response.json({ error: "请先登录。" }, { status: 401 });
  let body: Partial<Preferences>;
  try { body = await request.json() as Partial<Preferences>; }
  catch { return Response.json({ error: "请求内容不是有效的 JSON。" }, { status: 400 }); }
  if ([body.scheduleReminders, body.importantDayReminders, body.partnerUpdates].some(value => value !== undefined && typeof value !== "boolean")) {
    return Response.json({ error: "提醒设置格式不正确。" }, { status: 400 });
  }
  const current = await env.DB.prepare(`SELECT schedule_reminders,important_day_reminders,partner_updates
    FROM user_preferences WHERE user_id=? LIMIT 1`).bind(identity.userId).first<Record<string, number>>();
  const next = { ...(current ? fromRow(current) : defaults), ...body };
  await env.DB.prepare(`INSERT INTO user_preferences
    (user_id,schedule_reminders,important_day_reminders,partner_updates,updated_at)
    VALUES (?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET
    schedule_reminders=excluded.schedule_reminders,important_day_reminders=excluded.important_day_reminders,
    partner_updates=excluded.partner_updates,updated_at=excluded.updated_at`)
    .bind(identity.userId, Number(next.scheduleReminders), Number(next.importantDayReminders), Number(next.partnerUpdates), new Date().toISOString()).run();
  return Response.json({ preferences: next });
}

function fromRow(row: Record<string, number>): Preferences {
  return {
    scheduleReminders: Boolean(row.schedule_reminders),
    importantDayReminders: Boolean(row.important_day_reminders),
    partnerUpdates: Boolean(row.partner_updates),
  };
}
