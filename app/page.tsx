"use client";

import { useMemo, useState } from "react";

type Screen = "welcome" | "connect" | "home" | "inspire" | "loading" | "results" | "plan" | "location" | "confirm" | "schedule" | "calendar" | "memory" | "memories" | "memoryCreate" | "task" | "taskHistory" | "profile" | "settings" | "notifications" | "privacy" | "important";
type Tab = "home" | "inspire" | "calendar" | "settings";
type Panel = "" | "edit" | "cancel" | "memoryEdit" | "deleteMemory" | "calendarAdd";

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
  const [myConfirmed, setMyConfirmed] = useState(false);
  const [taConfirmed, setTaConfirmed] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [panel, setPanel] = useState<Panel>("");
  const [loadingFailed, setLoadingFailed] = useState(false);
  const [taskAccepted, setTaskAccepted] = useState(false);
  const [memoryNote, setMemoryNote] = useState("原来平凡的一晚，也会在以后想起来。");
  const [memoryPhoto, setMemoryPhoto] = useState(false);
  const [memoryCreated, setMemoryCreated] = useState(false);
  const [memoryDeleted, setMemoryDeleted] = useState(false);
  const [taskLinked, setTaskLinked] = useState(false);
  const [taskDone, setTaskDone] = useState(false);
  const [selectedDay, setSelectedDay] = useState(8);
  const [monthOffset, setMonthOffset] = useState(0);
  const [placeVersion, setPlaceVersion] = useState(0);
  const [choices, setChoices] = useState({ mood: "想放松", time: "今晚", budget: "¥100–300", space: "都可以" });
  const [toast, setToast] = useState("");
  const currentPlan = plans[selectedPlan];

  const step = useMemo(() => ({ welcome: 0, connect: 1, home: 2, inspire: 3, loading: 3, results: 4, plan: 5, location: 5, confirm: 5, schedule: 6, calendar: 7, memory: 8, memories: 8, memoryCreate: 8, task: 2, taskHistory: 2, profile: 2, settings: 2, notifications: 2, privacy: 2, important: 2 }[screen]), [screen]);

  function go(next: Screen) { setScreen(next); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function notify(message: string) { setToast(message); window.setTimeout(() => setToast(""), 1800); }
  function generate(shouldFail = false) {
    setLoadingFailed(shouldFail); go("loading");
    if (!shouldFail) window.setTimeout(() => go("results"), 1500);
  }
  function resetJourney() {
    setAdopted(false); setCompleted(false); setMyConfirmed(false); setTaConfirmed(false); setCancelled(false); setTaskLinked(false); setTaskDone(false); setMemoryDeleted(false); go("home");
  }

  function nav(tab: Tab) {
    if (tab === "home") go("home");
    if (tab === "inspire") go("inspire");
    if (tab === "calendar") go("calendar");
    if (tab === "settings") go("settings");
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
        <p className="kicker">恋爱日记 · 正式体验版</p>
        <h1>把一起生活的<br/>小事，好好留下。</h1>
        <p className="intro">从一个轻松的约会灵感开始，经过双方确认，成为共同安排，最后自然沉淀为回忆。</p>
        <div className="journey">
          {["相遇", "我们", "灵感", "计划", "安排", "日历", "回忆"].map((label, i) => <div key={label} className={step >= i + 1 ? "done" : ""}><i>{step > i + 1 ? "✓" : i + 1}</i><span>{label}</span></div>)}
        </div>
        <p className="hint">完整体现“关系 → 状态 → 下一步”：AI只给建议，用户确认后才进入共同生活；经历发生后，再自然沉淀为回忆。</p>
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
                  <div className="home-top"><button className="couple-avatars avatar-button" onClick={() => go("profile")} aria-label="查看我们的资料"><div className="avatar a">林</div><div className="avatar b">予</div></button><button className="round-button" onClick={() => go("settings")}>•••</button></div>
                  <p className="kicker">我们在一起</p><h2>第 286 天</h2><p className="date-line">2025.10.26 — 今天</p><div className="relation-stats"><span><b>12</b><small>共同体验</small></span><span><b>3</b><small>完成任务</small></span><button onClick={() => go("important")}><b>18</b><small>纪念日倒数</small></button></div>
                </div>
                <section className="status-note"><div><p className="kicker">我们的近况</p><p>最近30天一起完成了 3 次共同体验，本周六还有一个计划。</p></div><button onClick={() => notify("近况仅根据共同安排与回忆生成")}>查看依据</button></section>
                <section className="content-section"><div className="section-heading"><div><p className="kicker">下一件小事</p><h3>{adopted ? "晚风散步与河畔小酒馆" : "今晚，想一起做点什么？"}</h3></div><span>→</span></div>
                  {adopted ? <button className="event-card" onClick={() => go("schedule")}><span className="date-block"><b>08</b><small>周六</small></span><span><b>18:30 · 杭州</b><small>已加入共同安排</small></span><i>›</i></button> : <button className="inspiration-card" onClick={() => go("inspire")}><div className="spark">✦</div><div><b>获取一份约会灵感</b><small>告诉我们此刻的心情，剩下的交给灵感</small></div><i>›</i></button>}
                </section>
                <section className="content-section memory-peek"><div className="section-heading"><div><p className="kicker">最近的回忆</p><h3>{completed ? "晚风里，我们聊了很久" : "平凡日子里的闪光"}</h3></div><button onClick={() => go("memories")}>查看全部</button></div><button className="photo-card" onClick={() => completed ? go("memory") : go("memories")}><div className="photo-art"><span>09.18</span></div><p>{completed ? "河畔小酒馆 · 8月8日" : "一起做饭的那个周末 · 7月26日"}</p></button></section>
                <section className="content-section task-peek"><div className="section-heading"><div><p className="kicker">情侣任务</p><h3>一起交换一首最近常听的歌</h3></div><button onClick={() => go("taskHistory")}>已完成 3 个</button></div><button className="task-card" onClick={() => go("task")}><span>♫</span><div><b>{taskAccepted ? "任务进行中" : "给平常加一点新鲜"}</b><small>{taskAccepted ? "去规划一个适合分享音乐的晚上" : "任务是邀请，不是待办压力"}</small></div><i>›</i></button></section>
                <button className="demo-reset" onClick={resetJourney}>↺ 重置原型状态</button>
                {bottomNav("home")}
              </div>
            )}

            {screen === "inspire" && (
              <div className="page tab-page form-page">
                <header><button className="location-button" onClick={() => notify("当前城市：杭州，可临时切换")}>杭州⌄</button><span className="header-title">找灵感</span><button className="text-button" onClick={() => notify("已恢复默认条件")}>重置</button></header>
                {taskAccepted && <div className="context-banner"><span>本次灵感目标</span><b>为「交换一首最近常听的歌」找灵感</b><button onClick={() => setTaskAccepted(false)}>×</button></div>}
                <div className="form-intro"><p className="kicker">此刻的你们</p><h2>今天想和 TA<br/>怎么度过？</h2><p>不用想得太具体，选几个直觉答案就好。</p></div>
                <Choice title="我的状态" options={["想放松", "想热闹", "想尝鲜"]} value={choices.mood} setValue={(mood) => setChoices({...choices, mood})}/>
                <Choice title="TA 呢？" options={["和我一样", "不知道", "单独选择"]} value="和我一样" setValue={() => notify("已记住 TA 的状态")}/>
                <Choice title="想要什么感觉？" options={["安静", "热闹", "都可以"]} value="安静" setValue={() => notify("氛围已更新")}/>
                <Choice title="时间" options={["今晚", "周末", "下周"]} value={choices.time} setValue={(time) => setChoices({...choices, time})}/>
                <Choice title="预算" options={["¥100以内", "¥100–300", "¥300+"]} value={choices.budget} setValue={(budget) => setChoices({...choices, budget})}/>
                <Choice title="活动空间" options={["都可以", "室内", "户外"]} value={choices.space} setValue={(space) => setChoices({...choices, space})}/>
                <label className="special-request">还有什么需要照顾？<input placeholder="例如：不想走太多路（选填）"/></label>
                <div className="sticky-cta"><button className="primary-button" onClick={() => generate(false)}>获取 3 个灵感 <span>✦</span></button><button className="failure-link" onClick={() => generate(true)}>预览生成失败状态</button></div>
                {bottomNav("inspire")}
              </div>
            )}

            {screen === "loading" && (
              <div className="page loading-page"><header><Back onClick={() => go("inspire")}/><span>正在寻找灵感</span><i/></header>{loadingFailed ? <div className="error-state"><div className="state-symbol">↻</div><p className="kicker">暂时走神了</p><h2>灵感没有生成成功</h2><p>网络有一点拥挤，你刚才选择的条件都还在，不需要重新填写。</p><button className="primary-button" onClick={() => generate(false)}>再试一次 <Arrow/></button><button className="ghost-button" onClick={() => go("inspire")}>返回修改条件</button></div> : <div className="ai-loading"><div className="loading-orbit"><span>✦</span></div><p className="kicker">读懂你们此刻的心情</p><h2>正在把今晚，<br/>想得刚刚好。</h2><div className="loading-steps"><span className="on">✓ 匹配你们的状态</span><span className="on">• 安排合适的节奏</span><span>• 整理 1 主 + 2 备选</span></div><p>通常只需要几秒钟</p></div>}</div>
            )}

            {screen === "results" && (
              <div className="page result-page">
                <header><Back onClick={() => go("inspire")}/><span>为你们想到的</span><button className="text-button" onClick={() => go("inspire")}>调整条件</button></header>
                <div className="result-intro"><p className="kicker">杭州 · {choices.time} · {choices.mood} · {choices.budget}</p><h2>不赶时间，<br/>也不辜负今晚。</h2></div>
                <div className="plan-stack"><button className={`plan-card primary main-plan ${selectedPlan === 0 ? "chosen" : ""}`} onClick={() => setSelectedPlan(0)}><div className="plan-top"><span>主灵感 · 松弛感</span>{selectedPlan === 0 && <i>✓ 当前方案</i>}</div><h3>{plans[0].title}</h3><p className="plan-meta">约3.5小时 · ¥200–300 / 两人 · 户外为主</p><p>{plans[0].desc}</p><span className="prep-note">无需预约 · 不需要太多准备</span></button><div className="alternative-title"><b>也可以试试</b><button onClick={() => notify("已换一个主灵感")}>换一个</button></div>{plans.slice(1).map((plan, offset) => {const i=offset+1;return <button key={plan.title} className={`plan-card alternative ${selectedPlan === i ? "chosen" : ""}`} onClick={() => setSelectedPlan(i)}><div><h3>{plan.title}</h3><p className="plan-meta">{plan.meta}</p></div><i>›</i></button>})}</div>
                <div className="sticky-cta"><button className="primary-button" onClick={() => go("plan")}>查看详细计划 <Arrow /></button></div>
              </div>
            )}

            {screen === "plan" && (
              <div className="page detail-page">
                <div className="detail-hero"><header><Back onClick={() => go("results")}/><span>AI 详细计划</span><button className="icon-button" onClick={() => notify("计划链接已准备好")}>↗</button></header><p className="kicker">候选方案 · 尚未进入日历</p><h2>{currentPlan.title}</h2><p className="plan-summary">先慢慢走一段路，再到附近吃晚餐。路线顺，不需要赶时间。</p><div className="detail-meta"><span>杭州 · 今晚</span><span>约3.5小时</span><span>两人约 ¥260</span></div></div>
                <section className="timeline"><p className="kicker">今晚的节奏</p>{[
                  ["18:30", "在地铁口见面", "不用赶，先买两杯喜欢的饮料"], ["19:00", "沿江慢慢散步", "推荐路线 2.3 km · 约 45 分钟"], ["20:00", "河畔小酒馆", "靠窗位 · 分享甜点与低度酒"], ["21:40", "一起回家", "今晚留一个问题给彼此"]
                ].map(([time, title, desc], i) => <div className="timeline-item" key={time}><span>{time}</span><i>{i + 1}</i><div>{i === 2 ? <button className="place-link" onClick={() => go("location")}><b>{placeVersion ? "桂雨小馆" : title}</b><em>查看地点 ›</em></button> : <b>{title}</b>}<p>{i === 2 && placeVersion ? "安静内庭 · 分享晚餐与甜点" : desc}</p>{i === 2 && <button className="replace-place" onClick={() => {setPlaceVersion(v=>v+1);notify("只替换了当前地点，其他节点未改变");}}>换一个地点</button>}</div></div>)}</section>
                <section className="execution-info"><p className="kicker">执行信息</p><div><span>预约</span><b>小酒馆建议提前电话留位</b></div><div><span>交通</span><b>全程步行约 3.2 km</b></div><div><span>天气</span><b>晚间 27℃ · 建议带伞</b></div><div><span>预算</span><b>饮品 ¥80 + 晚餐约 ¥180</b></div></section>
                <section className="warm-note"><span>♡</span><p><b>一个小提示</b><br/>把手机收起来十分钟，问问对方：最近有什么小事让你开心？</p></section>
                <div className="sticky-cta"><button className="primary-button" onClick={() => go("confirm")}>采用这个安排 <Arrow /></button><p>下一步确认日期与时间；确认前不会进入日历</p></div>
              </div>
            )}

            {screen === "location" && <div className="page formal-page location-page"><header><Back onClick={() => go("plan")}/><span>地点详情</span><button className="icon-button" onClick={() => notify("已准备在地图中打开")}>↗</button></header><div className={`place-photo ${placeVersion ? "alternate" : ""}`}><span>已验证地点照片 · 1/3</span></div><section className="place-title"><p className="kicker">计划时段正常营业</p><h2>{placeVersion ? "桂雨小馆" : "河畔小酒馆"}</h2><p>上城区之江路 118 号 · 距上一节点步行 12 分钟</p></section><section className="info-group"><InfoRow label="计划时段" value="20:00–21:40 · 营业中"/><InfoRow label="营业时间" value="17:00–00:30"/><InfoRow label="价格范围" value="两人约 ¥180–260"/><InfoRow label="预约" value="建议电话留位"/><InfoRow label="地点信息" value="已核验"/></section><section className="place-notice"><b>执行提示</b><p>靠窗座位较少；若临时满座，返回计划可只替换这个地点。</p></section><button className="primary-button" onClick={() => notify("正在打开系统地图")}>在地图中查看 <Arrow/></button><button className="ghost-button" onClick={() => {setPlaceVersion(v=>v+1);go("plan");}}>换一个地点</button></div>}

            {screen === "confirm" && <div className="page formal-page confirm-page"><header><Back onClick={() => go("plan")}/><span>确认安排</span><i/></header><section className="page-intro"><p className="kicker">最后确认一次</p><h2>把这个计划，<br/>加入共同生活。</h2><p className="confirm-copy">AI 建议只有在你确认后，才会成为正式安排并通知 TA。</p></section><section className="confirm-card"><label>安排名称<input defaultValue={currentPlan.title}/></label><label>日期<input defaultValue="2026年8月8日 · 周六"/></label><label>开始时间<input defaultValue="18:30"/></label><label>所在城市<input defaultValue="杭州（当地时间）"/></label></section>{taskAccepted && <section className="link-context"><span>♫</span><div><b>关联情侣任务</b><p>交换一首最近常听的歌</p></div><em>确认后关联</em></section>}<button className="primary-button" onClick={() => {setAdopted(true);setTaskLinked(taskAccepted);go("schedule");}}>确认并加入日历 <Arrow/></button><button className="ghost-button" onClick={() => go("plan")}>返回继续查看</button></div>}

            {screen === "schedule" && (
              <div className="page schedule-page">
                <header><Back onClick={() => go("calendar")}/><span>安排详情</span><button className="text-button" onClick={() => setPanel("edit")}>编辑</button></header>
                <div className={`confirmation ${cancelled ? "is-cancelled" : ""}`}><span>{cancelled ? "×" : "✓"}</span><p>{cancelled ? "安排已取消" : completed ? "双方已确认完成" : "已加入共同安排"}</p></div>
                <div className="schedule-title"><p className="kicker">8月8日 · 周六</p><h2>{currentPlan.title}</h2><p>18:30–22:00 · 杭州</p></div>
                <section className="schedule-card"><div><span className="label">时间</span><b>今天 18:30</b></div><div><span className="label">集合</span><b>近江地铁站 B 口</b></div><div><span className="label">预算</span><b>约 ¥260 / 两人</b></div><button onClick={() => go("plan")}>查看完整路线 <span>›</span></button></section>
                {taskLinked && <button className="linked-task" onClick={() => go("task")}><span>♫</span><div><small>关联情侣任务</small><b>交换一首最近常听的歌</b></div><i>›</i></button>}
                <div className="people-row"><div className="avatar a">林</div><div><b>{cancelled ? "这次安排已取消" : myConfirmed ? "你已确认完成" : "你发起了这个安排"}</b><p>{taConfirmed ? "TA 也已确认完成" : myConfirmed ? "正在等待 TA 确认" : "TA 已收到共同日历提醒"}</p></div><div className="avatar b">予</div></div>
                {cancelled ? <div className="schedule-actions"><button className="primary-button" onClick={() => {setCancelled(false); notify("安排已恢复");}}>重新安排 <Arrow /></button></div> : completed ? <div className="schedule-actions"><div className="recorded-note"><b>这次经历已记录 ♡</b><p>{taskDone ? "关联任务也已完成；没有生成第二条回忆。" : "基础回忆已经生成，稍后完善也算完整。"}</p></div><button className="primary-button" onClick={() => go("memory")}>完善这次回忆 <Arrow /></button></div> : !myConfirmed ? <div className="schedule-actions"><button className="primary-button" onClick={() => setMyConfirmed(true)}>我完成了 <Arrow /></button><button className="ghost-button danger-text" onClick={() => setPanel("cancel")}>取消这个安排</button></div> : <div className="schedule-actions confirm-wait"><div className="wait-card"><span>◷</span><div><b>等待 TA 确认</b><p>双方确认后，会自动生成基础回忆</p></div></div><button className="primary-button" onClick={() => {setTaConfirmed(true); setCompleted(true); setTaskDone(taskLinked); notify("双方已确认，回忆已生成");}}>模拟 TA 确认 <Arrow /></button></div>}
                {bottomNav("calendar")}
              </div>
            )}

            {screen === "calendar" && (
              <div className="page tab-page calendar-page">
                <header><div><p className="kicker">共同日历</p><h2>{monthOffset === 0 ? "2026 年 8 月" : monthOffset < 0 ? "2026 年 7 月" : "2026 年 9 月"}</h2></div><button className="round-button" onClick={() => setPanel("calendarAdd")}>＋</button></header>
                <div className="month-switch"><button onClick={() => setMonthOffset(v=>Math.max(-1,v-1))}>‹</button><span>左右切换月份</span><button onClick={() => setMonthOffset(v=>Math.min(1,v+1))}>›</button></div>
                <div className="week-row">{["一","二","三","四","五","六","日"].map(x => <span key={x}>{x}</span>)}</div>
                <div className="month-grid">{Array.from({length: 35}, (_, i) => { const d = i - 1; const valid=d>0&&d<=31; return <button key={i} onClick={()=>valid&&setSelectedDay(d)} className={`${d === selectedDay ? "selected-day" : ""} ${d === 8 ? "today" : ""} ${d === 8 && adopted ? "official" : ""} ${d === 16 ? "idea" : ""} ${d===15?"important-dot":""}`}><span>{valid ? d : ""}</span>{d===1&&<small>休</small>}{d===9&&<small>班</small>}{d===15&&<small>纪念日</small>}</button>; })}</div>
                <div className="legend"><span><i className="solid-dot"/>正式内容</span><span><i className="ring-dot"/>AI 灵感</span><span>休/班 · 调休</span></div>
                <section className="day-agenda"><p className="kicker">8月{selectedDay}日 {selectedDay===8?"· 今天":""}</p>{selectedDay===8&&adopted ? <button className="agenda-item" onClick={() => go("schedule")}><i/><span><b>18:30</b><small>22:00</small></span><div><b>{currentPlan.title}</b><small>{cancelled?"已取消":"共同安排 · 杭州"}</small></div><em>›</em></button> : selectedDay===15 ? <button className="agenda-item important-agenda" onClick={() => go("important")}><i/><span><b>全天</b></span><div><b>我们的一周年</b><small>重要日子 · 每年重复</small></div><em>›</em></button> : selectedDay===16 ? <div className="idea-day"><span>✦</span><div><b>AI 轻量建议</b><p>周日下午适合去城市周边走走，尚未成为正式安排。</p></div><button onClick={()=>go("inspire")}>继续规划</button></div> : <div className="empty-day"><span>☼</span><p>这一天还没有共同安排</p><button onClick={() => go("inspire")}>找点灵感</button></div>}</section>
                {bottomNav("calendar")}
              </div>
            )}

            {screen === "memory" && (
              <div className="page memory-page">
                <div className={`memory-cover ${memoryPhoto ? "with-photo" : ""}`}><header><Back onClick={() => go("memories")}/><span>回忆详情</span><button className="icon-button" onClick={() => notify("已生成不含私人资料的分享卡")}>↗</button></header><div className="moon">☽</div><div className="city-lights">•• · • ·• ••</div><div className="cover-copy"><p>2026.08.08 · 杭州</p><h2>晚风里，<br/>我们聊了很久。</h2></div></div>
                <section className="memory-story"><p className="dropcap">那</p><p>天没有特别宏大的计划。我们沿着江边慢慢走，风刚好，天色也刚好。后来在靠窗的位置坐下，分享了一份甜点，也分享了最近各自藏着的小心事。</p><blockquote>“{memoryNote}”</blockquote><button className="memory-edit-link" onClick={() => setPanel("memoryEdit")}>＋ 补充照片或一句话</button><div className="memory-stats"><span><b>3.2 km</b><small>一起走过</small></span><span><b>3.5 h</b><small>共同时间</small></span><span><b>♥</b><small>值得记住</small></span></div></section>
                <details className="day-route"><summary>当天行程 <span>展开查看</span></summary><div><b>18:30</b><p>近江地铁站见面</p></div><div><b>19:00</b><p>沿江散步</p></div><div><b>20:00</b><p>{placeVersion?"桂雨小馆":"河畔小酒馆"}</p></div></details>
                <section className="memory-footer"><div className="couple-avatars"><div className="avatar a">林</div><div className="avatar b">予</div></div><p>已收进「我们的回忆」{memoryPhoto ? " · 1 张照片" : ""}</p><button className="primary-button" onClick={() => setPanel("memoryEdit")}>编辑回忆 <Arrow /></button><button className="ghost-button danger-text" onClick={() => setPanel("deleteMemory")}>删除这条回忆</button></section>
              </div>
            )}

            {screen === "memories" && <div className="page formal-page memories-page"><header><Back onClick={() => go("home")}/><span>我们的回忆</span><button className="round-button" onClick={() => go("memoryCreate")}>＋</button></header><section className="page-intro"><p className="kicker">先生活，再记录</p><h2>一起经历过的，<br/>自然留在这里。</h2></section><p className="month-title">2026年8月</p>{!memoryDeleted&&<button className="memory-list-card" onClick={() => go("memory")}><div className="memory-thumb river"/><div><b>晚风里，我们聊了很久</b><small>8月8日 · 杭州</small><p>沿着江边散步，之后在附近吃了晚餐。</p></div><i>›</i></button>}{memoryCreated&&<button className="memory-list-card text-only" onClick={() => go("memory")}><div><b>雨天一起逛书店</b><small>8月6日 · 杭州</small><p>这是一条手动创建的独立回忆。</p></div><i>›</i></button>}<button className="memory-list-card" onClick={() => go("memory")}><div className="memory-thumb exhibit"/><div><b>傍晚看展 + 安静晚餐</b><small>8月5日 · 成都</small><p>一起去了美术馆，之后在附近吃了晚餐。</p></div><i>›</i></button><p className="month-title">2026年7月</p><button className="memory-list-card text-only" onClick={() => go("memory")}><div><b>一起做饭的那个周末</b><small>7月26日</small><p>第一次一起尝试做意面。</p></div><i>›</i></button></div>}

            {screen === "memoryCreate" && <div className="page formal-page create-memory-page"><header><Back onClick={() => go("memories")}/><span>添加回忆</span><i/></header><section className="page-intro compact"><p className="kicker">一条简单记录也已经完整</p><h2>把这件一起经历的事，<br/>留在这里。</h2></section><section className="create-form"><label>回忆名称 <em>必填</em><input defaultValue="雨天一起逛书店"/></label><label>日期 <em>必填</em><input defaultValue="2026年8月6日"/></label><label>地点 <small>选填</small><input defaultValue="杭州"/></label><button className="photo-upload" onClick={() => notify("最多可添加9张照片，并可调整封面")}><span>＋</span>添加照片（最多9张）</button><label>写点什么 <small>选填</small><textarea defaultValue="下雨以后临时改变计划，一起在书店待了很久。"/></label></section><div className="similar-warning"><b>这一天已有一条相似回忆</b><p>系统不会自动合并，你仍然可以创建。</p><button onClick={() => go("memories")}>查看已有回忆</button></div><button className="primary-button" onClick={() => {setMemoryCreated(true);notify("回忆已保存，共同体验 +1");go("memories");}}>仍然创建并保存 <Arrow/></button></div>}

            {screen === "profile" && <div className="page formal-page"><header><Back onClick={() => go("home")}/><span>我们的资料</span><button className="text-button" onClick={() => notify("资料已进入编辑状态")}>编辑</button></header><section className="profile-hero"><div className="connect-visual"><div className="avatar a">林</div><span>♡</span><div className="avatar b">予</div></div><h2>林予 & 周宁</h2><p>一起生活的第 286 天</p></section><section className="info-group"><p className="group-label">关系资料</p><InfoRow label="在一起纪念日" value="2025年10月26日"/><InfoRow label="当前城市" value="杭州"/><InfoRow label="关系状态" value="已连接"/></section><section className="info-group"><p className="group-label">我的资料</p><InfoRow label="昵称" value="林予"/><InfoRow label="生日" value="4月18日"/></section><button className="subtle-danger" onClick={() => notify("重新建立关系前会再次确认")}>重新建立关系</button></div>}

            {screen === "important" && <div className="page formal-page"><header><Back onClick={() => go("home")}/><span>重要日子</span><button className="round-button" onClick={() => notify("可添加生日或纪念日")}>＋</button></header><section className="important-hero"><p className="kicker">下一个重要日子</p><h2>我们的一周年</h2><strong>还有 18 天</strong><p>2026年10月26日 · 周一</p><button className="primary-button" onClick={() => go("inspire")}>为这一天找灵感 <Arrow/></button></section><section className="info-group"><p className="group-label">全部重要日子</p><InfoRow label="林予的生日" value="4月18日 · 每年"/><InfoRow label="周宁的生日" value="11月6日 · 每年"/><InfoRow label="在一起纪念日" value="10月26日 · 每年"/></section></div>}

            {screen === "taskHistory" && <div className="page formal-page"><header><Back onClick={() => go("home")}/><span>情侣任务</span><i/></header><section className="page-intro"><p className="kicker">当前任务</p><h2>偶尔想到一件，<br/>值得一起做的小事。</h2></section><button className="task-history-current" onClick={() => go("task")}><span>♫</span><div><b>交换一首最近常听的歌</b><small>{taskAccepted ? "进行中" : "等待接受"}</small></div><i>›</i></button><p className="month-title">历史任务</p>{[["✓","一起看一次日落","完成于 8月1日"],["✓","一起做一道没做过的菜","完成于 7月18日"],["↻","去陌生街区散步","已更换 · 7月6日"]].map(([s,t,d])=><div className="history-row" key={t}><span>{s}</span><div><b>{t}</b><small>{d}</small></div></div>)}</div>}

            {screen === "settings" && <div className="page tab-page formal-page settings-page"><header><div><p className="kicker">恋爱日记</p><h2>设置</h2></div><i/></header><section className="settings-profile" onClick={() => go("profile")}><div className="avatar a">林</div><div><b>林予</b><small>与周宁已连接</small></div><i>›</i></section><section className="settings-group"><SettingRow icon="♢" label="我们的资料" onClick={() => go("profile")}/><SettingRow icon="◌" label="重要日子" onClick={() => go("important")}/></section><section className="settings-group"><SettingRow icon="♢" label="通知与提醒" onClick={() => go("notifications")}/><SettingRow icon="◉" label="隐私与 AI 数据说明" onClick={() => go("privacy")}/><SettingRow icon="▢" label="照片与存储" onClick={() => notify("照片只在用户主动添加时使用")}/></section><section className="settings-group"><SettingRow icon="?" label="帮助与反馈" onClick={() => notify("帮助中心将在产品开发阶段接入")}/><SettingRow icon="○" label="关于恋爱日记" value="V1.3"/></section>{bottomNav("settings")}</div>}

            {screen === "notifications" && <div className="page formal-page"><header><Back onClick={() => go("settings")}/><span>通知与提醒</span><i/></header><section className="page-intro compact"><p className="kicker">只提醒重要的事</p><h2>不让共同生活，<br/>变成通知压力。</h2></section><section className="settings-group"><ToggleRow label="共同安排提醒" note="开始前与变更时提醒"/><ToggleRow label="重要日子提醒" note="按你们设置的提前时间提醒"/><ToggleRow label="TA 的状态变化" note="接受安排、完成确认"/></section><p className="policy-note">不会发送连续签到、任务催促或关系评分通知。</p></div>}

            {screen === "privacy" && <div className="page formal-page"><header><Back onClick={() => go("settings")}/><span>隐私与 AI</span><i/></header><section className="page-intro compact"><p className="kicker">你的生活，由你决定</p><h2>AI 提供建议，<br/>不会替你确认事实。</h2></section><section className="principle-card"><span>01</span><div><b>建议不是正式安排</b><p>只有点击“采用这个安排”后，内容才会进入共同日历。</p></div></section><section className="principle-card"><span>02</span><div><b>不虚构你们的感受</b><p>基础回忆只使用已确认的时间、地点与活动；用户文字不会被自动覆盖。</p></div></section><section className="principle-card"><span>03</span><div><b>不公开你们的关系生活</b><p>分享卡默认不包含双方资料、关系天数与私人统计。</p></div></section><button className="subtle-danger" onClick={() => notify("清空前会列出影响并二次确认")}>清空全部数据</button></div>}

            {screen === "task" && <div className="page task-page"><header><Back onClick={() => go("home")}/><span>情侣任务</span><button className="text-button" onClick={()=>go("taskHistory")}>历史</button></header><div className="task-hero"><span>{taskDone?"✓":"♫"}</span><p className="kicker">{taskDone?"任务完成 ♡":"当前任务"}</p><h2>交换一首<br/>最近常听的歌</h2><p>不是为了猜对彼此，而是借一首歌，听见最近没有说出口的心情。</p></div><div className="task-rule"><span>01</span><p><b>各自选一首</b><br/>先不要告诉对方原因</p><span>02</span><p><b>一起完整听完</b><br/>再分享为什么选择它</p></div>{taskDone?<div className="task-actions"><div className="accepted-badge">✓ 已随关联安排完成，没有额外生成回忆</div><button className="primary-button" onClick={()=>{setTaskAccepted(false);setTaskLinked(false);setTaskDone(false);notify("可以在想要的时候获取下一个任务");go("home");}}>完成并回到我们 <Arrow/></button></div>:taskLinked?<div className="task-actions"><div className="linked-plan-preview"><b>已规划</b><p>{currentPlan.title}</p><small>8月8日 18:30 · 当前唯一关联安排</small></div><button className="primary-button" onClick={()=>go("schedule")}>查看安排 <Arrow/></button></div>:!taskAccepted ? <div className="task-actions"><button className="primary-button" onClick={() => setTaskAccepted(true)}>接受这个任务 <Arrow/></button><button className="ghost-button" onClick={() => notify("更换后将记为已更换，不计入完成数")}>更换任务</button><button className="ghost-button" onClick={()=>{setTaskAccepted(true);setTaskDone(true);notify("任务已完成；未创建日历或回忆");}}>已经完成</button></div> : <div className="task-actions"><div className="accepted-badge">✓ 已加入你们的任务</div><button className="primary-button" onClick={() => {setChoices({...choices, mood:"想放松"}); go("inspire");}}>去规划一个晚上 <Arrow/></button><button className="ghost-button" onClick={()=>{setTaskDone(true);notify("任务已完成；共同体验次数不增加");}}>现实中已经完成</button></div>}</div>}
          </div>
        </div>
      </section>
      {panel && <div className="modal-backdrop" onClick={() => setPanel("")}><section className="bottom-sheet" onClick={e => e.stopPropagation()}><div className="sheet-handle"/>{panel === "edit" && <><p className="kicker">编辑正式安排</p><h2>这已经是你们的安排</h2><label>安排名称<input defaultValue={currentPlan.title}/></label><label>日期与时间<input defaultValue="8月8日 18:30"/></label><label>集合地点<input defaultValue="近江地铁站 B 口"/></label><button className="secondary-button node-edit" onClick={()=>notify("可新增、删除或调整节点顺序")}>管理行程节点</button><button className="primary-button" onClick={() => {setPanel("");notify("安排已更新，TA 会收到提醒");}}>保存修改 <Arrow/></button></>}{panel === "cancel" && <><div className="danger-symbol">!</div><h2>确定取消这个安排？</h2><p className="sheet-copy">取消后会保留记录；若关联任务，任务会解除关联但安排历史不会消失。</p><button className="danger-button" onClick={() => {setCancelled(true);setTaskLinked(false);setPanel("");}}>确认取消</button><button className="ghost-button" onClick={() => setPanel("")}>保留安排</button></>}{panel === "memoryEdit" && <><p className="kicker">让回忆更像你们</p><h2>补充一点真实细节</h2><button className={`photo-upload ${memoryPhoto ? "added" : ""}`} onClick={() => setMemoryPhoto(true)}><span>{memoryPhoto ? "✓" : "+"}</span>{memoryPhoto ? "已添加1张 · 可排序或设为封面" : "添加照片（最多9张）"}</button><label>回忆名称<input defaultValue="晚风里，我们聊了很久"/></label><label>想留住的一句话<textarea value={memoryNote} onChange={e => setMemoryNote(e.target.value)}/></label><button className="primary-button" onClick={() => {setPanel("");notify("用户文字已保存，AI不会自动覆盖");}}>保存到回忆 <Arrow/></button></>}{panel === "deleteMemory"&&<><div className="danger-symbol">!</div><h2>删除这条回忆？</h2><p className="sheet-copy">它来自已完成的正式安排。照片、文字和回忆展示会删除，但已经发生的经历仍保留，共同体验次数不会减少。</p><button className="danger-button" onClick={()=>{setMemoryDeleted(true);setPanel("");go("memories");}}>确认删除回忆</button><button className="ghost-button" onClick={()=>setPanel("")}>取消</button></>}{panel === "calendarAdd"&&<><p className="kicker">添加到共同日历</p><h2>想记录什么？</h2><button className="sheet-choice" onClick={()=>{setPanel("");go("inspire");}}><span>＋</span><div><b>添加安排</b><p>手动创建，或先从灵感开始</p></div><i>›</i></button><button className="sheet-choice" onClick={()=>{setPanel("");go("important");}}><span>♡</span><div><b>添加重要日子</b><p>生日、纪念日或其他值得记住的日期</p></div><i>›</i></button></>}</section></div>}
      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}

function Choice({ title, options, value, setValue }: { title: string; options: string[]; value: string; setValue: (v: string) => void }) {
  return <section className="choice-group"><h3>{title}</h3><div>{options.map(option => <Pill key={option} active={option === value} onClick={() => setValue(option)}>{option}</Pill>)}</div></section>;
}

function InfoRow({ label, value }: { label: string; value: string }) { return <div className="info-row"><span>{label}</span><b>{value}</b><i>›</i></div>; }
function SettingRow({ icon, label, value, onClick }: { icon: string; label: string; value?: string; onClick?: () => void }) { return <button className="setting-row" onClick={onClick}><span>{icon}</span><b>{label}</b>{value && <small>{value}</small>}<i>›</i></button>; }
function ToggleRow({ label, note }: { label: string; note: string }) { const [on,setOn]=useState(true); return <div className="toggle-row"><div><b>{label}</b><small>{note}</small></div><button className={on?"on":""} onClick={()=>setOn(!on)}><i/></button></div>; }
