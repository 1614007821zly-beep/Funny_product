import { env } from "cloudflare:workers";

export const dynamic = "force-dynamic";

type SharedSchedule = { title: string; event_date: string; event_time: string; city: string; visibility: string; status: string; expires_at: string; revoked_at: string | null };

export default async function SharedPlanPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const row = await env.DB.prepare(`SELECT s.title,s.event_date,s.event_time,s.city,s.visibility,s.status,l.expires_at,l.revoked_at
    FROM schedule_share_links l JOIN schedules s ON s.id=l.schedule_id
    WHERE l.token_hash=? AND l.revoked_at IS NULL AND unixepoch(l.expires_at)>unixepoch('now') AND s.deleted_at IS NULL
      AND ((s.visibility='personal' AND s.status='active') OR (s.visibility='shared' AND s.status='confirmed')) LIMIT 1`)
    .bind(await digest(token)).first<SharedSchedule>();
  const valid = Boolean(row);
  return <main className="public-share-page">
    <section className="public-share-card">
      <p className="kicker">恋爱日记 · 安排分享</p>
      {valid && row ? <>
        <h1>{row.title}</h1>
        <dl><div><dt>日期</dt><dd>{formatDate(row.event_date)}</dd></div><div><dt>时间</dt><dd>{row.event_time}</dd></div><div><dt>城市</dt><dd>{row.city}</dd></div></dl>
        <p className="share-privacy-note">此页面仅包含已确认的安排信息，不包含心情、特别照顾、定位或搜索条件。</p>
      </> : <><h1>这个分享已失效</h1><p className="share-privacy-note">链接可能已过期、被创建者撤回，或原安排已发生变化。</p></>}
    </section>
  </main>;
}

async function digest(value: string) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, "0")).join("");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", day: "numeric", weekday: "short", timeZone: "Asia/Shanghai" }).format(new Date(`${value}T12:00:00+08:00`));
}
