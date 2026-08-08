"use client";

import { useMemo, useState } from "react";

type Screen = "welcome" | "connect" | "home" | "inspire" | "results" | "plan" | "schedule" | "calendar" | "memory";
type Tab = "home" | "inspire" | "calendar" | "settings";

const Arrow = () => <span aria-hidden="true">→</span>;
const Back = ({ onClick }: { onClick: () => void }) => <button className="icon-button" onClick={onClick} aria-label="返回">‹</button>;

function Pill({ children, active, onClick }: { children: React.ReactNode; active?: boolean; onClick?: () => void }) {
  return <button className={`pill ${active ? "active" : ""}`} onClick={onClick}>{children}</button>;
}

const plans = [
  { eyebrow: "主方案 · 松弛感", title: "晚风散步与河畔小酒馆", meta: "18:30–22:00 · 约 ¥260", desc: "先沿江慢慢走，把一周的疲惫留在晚风里；再去安静的小酒馆分享一份甜点。", tone: "primary" },
  { eyebrow: "备选 · 不赶时间", title: "老街慢逛与深夜食堂", meta: "19:00–22:30 · 约 ¥180", desc: "随意走走，去收藏很久的小店吃顿热乎的晚餐。", tone: "cream" },
  { eyebrow: "备选 · 室内", title: "双人陶艺与晚餐", meta: "18:00–21:30 · 约 ¥320", desc: "一起完成一件小作品，把今晚留成以后能触摸的记忆。", tone: "lilac" },
];

export default function Home() {
  const [screen, setScreen] = useState<Screen>("welcome");
  const [selectedPlan, setSelectedPlan] = useState(0);
  const [adopted, setAdopted] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [choices, setChoices] = useState({ mood: "想放松", time: "今晚", budget: "¥100–300", space: "都可以" });
  const [toast, setToast] = useState("");
  const currentPlan = plans[selectedPlan];

  const step = useMemo(() => ({ welcome: 0, connect: 1, home: 2, inspire: 3, results: 4, plan: 5, schedule: 6, calendar: 7, memory: 8 }[screen]), [screen]);

  function go(next: Screen) { setScreen(next); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function notify(message: string) { setToast(message); window.setTimeout(() => setToast(""), 1800); }

  function nav(tab: Tab) {
    if (tab === "home") go("home");
    if (tab === "inspire") go("inspire");
    if (tab === "calendar") go("calendar");
    if (tab === "settings") notify("设置将在下一阶段开放");
  }

  const bottomNav = (active: Tab) => (
    <nav className="bottom-nav" aria-label="主导航">
      {([ ["home", "⌂", "我们"], ["inspire", "✦", "灵感"], ["calendar", "▦", "日历"], ["settings", "○", "设置"] ] as const).map(([id, icon, label]) => (
        <button key={id} className={active === id ? "selected" : ""} onClick={() => nav(id)}><span>{icon}</span>{label}</button>
      ))}
    </nav>
  );

  return (
    <main className="prototype-shell">
      <aside className="prototype-notes">
        <div className="brand-mark">日</div>
        <p className="kicker">恋爱日记 · V1 原型</p>
        <h1>把一起生活的<br/>小事，好好留下。</h1>
        <p className="intro">从一个轻松的约会灵感开始，经过双方确认，成为共同安排，最后自然沉淀为回忆。</p>
        <div className="journey">
          {["相遇", "我们", "灵感", "计划", "安排", "日历", "回忆"].map((label, i) => <div key={label} className={step >= i + 1 ? "done" : ""}><i>{step > i + 1 ? "✓" : i + 1}</i><span>{label}</span></div>)}
        </div>
        <p className="hint">这是一条完整可点击主流程。手机框内的按钮、卡片和底部导航均可操作。</p>
      </aside>

      <section className="phone-stage">
        <div className="phone">
          <div className="statusbar"><span>9:41</span><span className="island"/><span>● ◒ ▰</span></div>
          <div className={`screen screen-${screen}`}>
            {screen === "welcome" && (
              <div className="welcome page-full">
                <div className="soft-orb orb-one"/><div className="soft-orb orb-two"/>
                <div className="welcome-symbol"><span>♥</span><span>♥</span></div>
                <div className="welcome-copy"><p className="kicker">恋爱日记</p><h2>两个人的生活，<br/>值得被温柔记住。</h2><p>一起计划，一起经历，<br/>也一起拥有属于我们的回忆。</p></div>
                <div className="welcome-actions"><button className="primary-button" onClick={() => go("connect")}>开始我们的故事 <Arrow /></button><p>继续即表示你已满 18 岁并同意用户协议</p></div>
              </div>
            )}

            {screen === "connect" && (
              <div className="page connect-page">
                <header><Back onClick={() => go("welcome")}/><span>建立关系</span><i/></header>
                <div className="progress-line"><span/></div>
                <section className="connect-copy"><p className="kicker">只差一步</p><h2>邀请 TA 加入<br/>你们的共同空间</h2><p>连接后，你们可以一起做安排、发现灵感，并共同保存回忆。</p></section>
                <div className="invite-card"><span className="mini-label">我的邀请码</span><strong>LOVE 0520</strong><button onClick={() => notify("邀请码已复制")}>复制</button></div>
                <div className="divider"><span>或者</span></div>
                <button className="secondary-button" onClick={() => notify("已模拟扫码连接")}>▣ 扫描 TA 的二维码</button>
                <div className="connect-visual"><div className="avatar a">林</div><span>♥</span><div className="avatar b">予</div></div>
                <button className="primary-button sticky-button" onClick={() => go("home")}>模拟 TA 已加入 <Arrow /></button>
              </div>
            )}

            {screen === "home" && (
              <div className="page tab-page">
                <div className="home-hero">
                  <div className="home-top"><div className="couple-avatars"><div className="avatar a">林</div><div className="avatar b">予</div></div><button className="round-button">•••</button></div>
                  <p className="kicker">我们在一起</p><h2>第 286 天</h2><p className="date-line">2025.10.26 — 今天</p>
                </div>
                <section className="content-section"><div className="section-heading"><div><p className="kicker">下一件小事</p><h3>{adopted ? "晚风散步与河畔小酒馆" : "今晚，想一起做点什么？"}</h3></div><span>→</span></div>
                  {adopted ? <button className="event-card" onClick={() => go("schedule")}><span className="date-block"><b>08</b><small>周六</small></span><span><b>18:30 · 杭州</b><small>已加入共同安排</small></span><i>›</i></button> : <button className="inspiration-card" onClick={() => go("inspire")}><div className="spark">✦</div><div><b>获取一份约会灵感</b><small>告诉我们此刻的心情，剩下的交给灵感</small></div><i>›</i></button>}
                </section>
                <section className="content-section memory-peek"><div className="section-heading"><div><p className="kicker">最近的回忆</p><h3>{completed ? "晚风里，我们聊了很久" : "平凡日子里的闪光"}</h3></div><span>全部</span></div><button className="photo-card" onClick={() => completed ? go("memory") : notify("完成一次安排后，这里会出现回忆")}><div className="photo-art"><span>09.18</span></div><p>{completed ? "河畔小酒馆 · 2 张照片" : "一起做饭的那个周末"}</p></button></section>
                {bottomNav("home")}
              </div>
            )}

            {screen === "inspire" && (
              <div className="page tab-page form-page">
                <header><span className="header-title">找灵感</span><button className="text-button" onClick={() => notify("已恢复默认条件")}>重置</button></header>
                <div className="form-intro"><p className="kicker">此刻的你们</p><h2>今晚想怎么<br/>度过？</h2><p>不用想得太具体，选几个直觉答案就好。</p></div>
                <Choice title="我的状态" options={["想放松", "想热闹", "想尝鲜"]} value={choices.mood} setValue={(mood) => setChoices({...choices, mood})}/>
                <Choice title="时间" options={["今晚", "周末", "下周"]} value={choices.time} setValue={(time) => setChoices({...choices, time})}/>
                <Choice title="预算" options={["¥100以内", "¥100–300", "¥300+"]} value={choices.budget} setValue={(budget) => setChoices({...choices, budget})}/>
                <Choice title="活动空间" options={["都可以", "室内", "户外"]} value={choices.space} setValue={(space) => setChoices({...choices, space})}/>
                <div className="sticky-cta"><button className="primary-button" onClick={() => go("results")}>获取 3 个灵感 <span>✦</span></button></div>
                {bottomNav("inspire")}
              </div>
            )}

            {screen === "results" && (
              <div className="page result-page">
                <header><Back onClick={() => go("inspire")}/><span>为你们想到的</span><button className="text-button" onClick={() => notify("已换一组灵感")}>换一组</button></header>
                <div className="result-intro"><p className="kicker">{choices.time} · {choices.mood}</p><h2>不赶时间，<br/>也不辜负今晚。</h2></div>
                <div className="plan-stack">{plans.map((plan, i) => <button key={plan.title} className={`plan-card ${plan.tone} ${selectedPlan === i ? "chosen" : ""}`} onClick={() => setSelectedPlan(i)}><div className="plan-top"><span>{plan.eyebrow}</span>{selectedPlan === i && <i>✓ 已选择</i>}</div><h3>{plan.title}</h3><p className="plan-meta">{plan.meta}</p><p>{plan.desc}</p></button>)}</div>
                <div className="sticky-cta"><button className="primary-button" onClick={() => go("plan")}>查看详细计划 <Arrow /></button></div>
              </div>
            )}

            {screen === "plan" && (
              <div className="page detail-page">
                <div className="detail-hero"><header><Back onClick={() => go("results")}/><span>详细计划</span><button className="icon-button" onClick={() => notify("计划链接已准备好")}>↗</button></header><p className="kicker">{currentPlan.eyebrow}</p><h2>{currentPlan.title}</h2><div className="detail-meta"><span>◷ {currentPlan.meta.split(" · ")[0]}</span><span>¥ {currentPlan.meta.split(" · ")[1]}</span></div></div>
                <section className="timeline"><p className="kicker">今晚的节奏</p>{[
                  ["18:30", "在地铁口见面", "不用赶，先买两杯喜欢的饮料"], ["19:00", "沿江慢慢散步", "推荐路线 2.3 km · 约 45 分钟"], ["20:00", "河畔小酒馆", "靠窗位 · 分享甜点与低度酒"], ["21:40", "一起回家", "今晚留一个问题给彼此"]
                ].map(([time, title, desc], i) => <div className="timeline-item" key={time}><span>{time}</span><i>{i + 1}</i><div><b>{title}</b><p>{desc}</p></div></div>)}</section>
                <section className="warm-note"><span>♡</span><p><b>一个小提示</b><br/>把手机收起来十分钟，问问对方：最近有什么小事让你开心？</p></section>
                <div className="sticky-cta"><button className="primary-button" onClick={() => {setAdopted(true); go("schedule");}}>采用这个安排 <Arrow /></button><p>采用后才会加入双方的正式日历</p></div>
              </div>
            )}

            {screen === "schedule" && (
              <div className="page schedule-page">
                <header><Back onClick={() => go("home")}/><span>安排详情</span><button className="text-button" onClick={() => notify("编辑功能已模拟")}>编辑</button></header>
                <div className="confirmation"><span>✓</span><p>已加入共同安排</p></div>
                <div className="schedule-title"><p className="kicker">8月8日 · 周六</p><h2>{currentPlan.title}</h2><p>18:30–22:00 · 杭州</p></div>
                <section className="schedule-card"><div><span className="label">时间</span><b>今天 18:30</b></div><div><span className="label">集合</span><b>近江地铁站 B 口</b></div><div><span className="label">预算</span><b>约 ¥260 / 两人</b></div><button onClick={() => go("plan")}>查看完整路线 <span>›</span></button></section>
                <div className="people-row"><div className="avatar a">林</div><div><b>你发起了这个安排</b><p>TA 已收到共同日历提醒</p></div><div className="avatar b">予</div></div>
                {!completed ? <div className="schedule-actions"><button className="primary-button" onClick={() => {setCompleted(true); go("memory");}}>完成了，留下回忆 <Arrow /></button><button className="ghost-button" onClick={() => notify("安排仍为进行中")}>稍后再说</button></div> : <div className="schedule-actions"><button className="primary-button" onClick={() => go("memory")}>查看这次回忆 <Arrow /></button></div>}
                {bottomNav("calendar")}
              </div>
            )}

            {screen === "calendar" && (
              <div className="page tab-page calendar-page">
                <header><div><p className="kicker">共同日历</p><h2>2026 年 8 月</h2></div><button className="round-button">＋</button></header>
                <div className="week-row">{["一","二","三","四","五","六","日"].map(x => <span key={x}>{x}</span>)}</div>
                <div className="month-grid">{Array.from({length: 35}, (_, i) => { const d = i - 1; return <button key={i} className={`${d === 8 ? "today" : ""} ${d === 8 && adopted ? "official" : ""} ${d === 16 ? "idea" : ""}`}>{d > 0 && d <= 31 ? d : ""}</button>; })}</div>
                <div className="legend"><span><i className="solid-dot"/>正式安排</span><span><i className="ring-dot"/>AI 灵感</span></div>
                <section className="day-agenda"><p className="kicker">8月8日 · 今天</p>{adopted ? <button className="agenda-item" onClick={() => go("schedule")}><i/><span><b>18:30</b><small>22:00</small></span><div><b>{currentPlan.title}</b><small>共同安排 · 杭州</small></div><em>›</em></button> : <div className="empty-day"><span>☼</span><p>今天还没有共同安排</p><button onClick={() => go("inspire")}>找点灵感</button></div>}</section>
                {bottomNav("calendar")}
              </div>
            )}

            {screen === "memory" && (
              <div className="page memory-page">
                <div className="memory-cover"><header><Back onClick={() => go("home")}/><span>我们的回忆</span><button className="icon-button" onClick={() => notify("回忆已准备分享")}>↗</button></header><div className="moon">☽</div><div className="city-lights">•• · • ·• ••</div><div className="cover-copy"><p>2026.08.08 · 杭州</p><h2>晚风里，<br/>我们聊了很久。</h2></div></div>
                <section className="memory-story"><p className="dropcap">那</p><p>天没有特别宏大的计划。我们沿着江边慢慢走，风刚好，天色也刚好。后来在靠窗的位置坐下，分享了一份甜点，也分享了最近各自藏着的小心事。</p><blockquote>“原来平凡的一晚，也会在以后想起来。”</blockquote><div className="memory-stats"><span><b>3.2 km</b><small>一起走过</small></span><span><b>3.5 h</b><small>共同时间</small></span><span><b>♥</b><small>值得记住</small></span></div></section>
                <section className="memory-footer"><div className="couple-avatars"><div className="avatar a">林</div><div className="avatar b">予</div></div><p>已收进「我们的回忆」</p><button className="primary-button" onClick={() => go("home")}>回到我们 <Arrow /></button></section>
              </div>
            )}
          </div>
        </div>
      </section>
      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}

function Choice({ title, options, value, setValue }: { title: string; options: string[]; value: string; setValue: (v: string) => void }) {
  return <section className="choice-group"><h3>{title}</h3><div>{options.map(option => <Pill key={option} active={option === value} onClick={() => setValue(option)}>{option}</Pill>)}</div></section>;
}
