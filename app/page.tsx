"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Screen = "welcome" | "age" | "profileSetup" | "connect" | "relationshipReady" | "contentReview" | "home" | "inspire" | "loading" | "results" | "plan" | "location" | "confirm" | "schedule" | "calendar" | "memory" | "memories" | "memoryCreate" | "task" | "taskHistory" | "profile" | "settings" | "notifications" | "privacy" | "relationshipSafety" | "relationshipArchive" | "important" | "importantCreate";
type Tab = "home" | "inspire" | "calendar" | "settings";
type Panel = "" | "edit" | "cancel" | "memoryEdit" | "retractMemory" | "deleteMemory" | "calendarAdd" | "profileEdit" | "cityEdit" | "normalExit" | "safetyExit" | "reportSafety" | "clearData";
type Place = { id: string; name: string; address: string; location: string; type: string; distance: number | null; businessArea: string; rating: string; cost: string; openTimeToday: string; verifiedBy: "amap" };
type TimelineNode = { time: string; title: string; description: string };
type Plan = { eyebrow: string; title: string; meta: string; desc: string; tone: string; duration?: string; timeline?: TimelineNode[]; places?: Place[] };
type HistorySharingMode = "from_now" | "selected" | "keep_private";
type AccountSnapshot = { authenticated: boolean; user?: { id: string; email: string; nickname: string; birthday: string | null; city: string }; relationship?: { id: string; status: string; partner_id: string | null; partner_name: string | null; partner_birthday: string | null; history_sharing_mode: HistorySharingMode | null; history_sharing_reviewed_at: string | null } | null; invite?: { code: string; partner_note: string | null; expires_at: string; status: string } | null };
type ScheduleRecord = { id: string; relationship_id: string | null; created_by_user_id: string; accepted_by_user_id: string | null; visibility: "personal" | "shared"; title: string; event_date: string; event_time: string; city: string; status: "active" | "pending_partner" | "confirmed" | "cancelled" | "deleted"; source: "manual" | "ai" | "legacy_import" | "legacy_shared"; version: number; created_at: string; updated_at: string; deleted_at: string | null };
type ImportantDayRecord = { id: string; relationship_id: string | null; created_by_user_id: string; accepted_by_user_id: string | null; visibility: "personal" | "shared"; title: string; event_date: string; repeat_rule: "yearly" | "none"; reminder_days: number; status: "active" | "pending_partner" | "confirmed" | "cancelled" | "deleted"; version: number; created_at: string; updated_at: string; deleted_at: string | null };
type TaskRecord = { id: string; relationship_id: string; created_by_user_id: string; accepted_by_user_id: string | null; completion_requested_by_user_id: string | null; title: string; status: "pending_partner" | "active" | "completion_pending" | "completed" | "cancelled"; version: number; created_at: string; updated_at: string };
type LegacyPlan = { title: string; date: string; time: string; city: string };

const LEGACY_STORAGE_KEYS = ["love-diary-v112", "love-diary-v17", "love-diary-v16", "love-diary-v15", "love-diary-v14"];
const INSPIRATION_DRAFT_KEY = "love-diary-inspiration-draft-v1";

const Arrow = () => <span aria-hidden="true">→</span>;
const Back = ({ onClick }: { onClick: () => void }) => <button className="icon-button" onClick={onClick} aria-label="返回">‹</button>;
const dateInputValue = (offsetDays: number) => { const date = new Date(); date.setDate(date.getDate() + offsetDays); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; };
const localDate = (value: string) => new Date(`${value}T12:00:00`);
const nextImportantDate = (value: string, repeatRule: "yearly" | "none") => { const base = localDate(value); if (repeatRule === "none") return base; const now = new Date(); now.setHours(0,0,0,0); const next = new Date(now.getFullYear(), base.getMonth(), base.getDate(), 12); if (next < now) next.setFullYear(next.getFullYear()+1); return next; };
const monthOffsetFromToday = (date: Date) => { const today = new Date(); return (date.getFullYear() - today.getFullYear()) * 12 + date.getMonth() - today.getMonth(); };
const dateFieldValue = (value: string | null | undefined) => /^\d{4}-\d{2}-\d{2}$/.test(value ?? "") ? value! : "";
const popularCities = ["北京", "上海", "广州", "深圳", "杭州", "成都", "重庆", "南京", "苏州", "武汉", "西安", "长沙"];
const cityOptions = [
  ...popularCities, "天津", "郑州", "青岛", "宁波", "厦门", "福州", "济南", "合肥", "昆明", "大连", "沈阳", "哈尔滨", "长春", "石家庄", "太原", "南昌", "南宁", "贵阳", "海口", "三亚", "兰州", "西宁", "银川", "乌鲁木齐", "拉萨", "呼和浩特", "珠海", "佛山", "东莞", "无锡", "常州", "温州", "绍兴", "嘉兴", "金华", "台州", "泉州", "烟台", "潍坊", "徐州", "扬州", "镇江", "南通", "洛阳", "开封", "宜昌", "襄阳", "株洲", "桂林", "柳州", "大理", "丽江", "绵阳", "乐山", "秦皇岛", "唐山", "保定", "包头", "威海", "中山", "惠州", "汕头", "湛江", "香港", "澳门", "台北",
];

function Pill({ children, active, onClick }: { children: React.ReactNode; active?: boolean; onClick?: () => void }) {
  return <button type="button" className={`pill ${active ? "active" : ""}`} aria-pressed={Boolean(active)} onClick={onClick}>{children}</button>;
}

const plans: Plan[] = [
  { eyebrow: "主方案 · 松弛感", title: "晚风散步与河畔小酒馆", meta: "18:30–22:00 · 约 ¥260", desc: "先沿江慢慢走，把一周的疲惫留在晚风里；再去安静的小酒馆分享一份甜点。", tone: "primary" },
  { eyebrow: "备选 · 不赶时间", title: "老街慢逛与深夜食堂", meta: "19:00–22:30 · 约 ¥180", desc: "随意走走，去收藏很久的小店吃顿热乎的晚餐。", tone: "cream" },
  { eyebrow: "备选 · 室内", title: "双人陶艺与晚餐", meta: "18:00–21:30 · 约 ¥320", desc: "一起完成一件小作品，把今晚留成以后能触摸的记忆。", tone: "lilac" },
];

export default function Home() {
  const [screen, setScreen] = useState<Screen>("welcome");
  const history = useRef<Screen[]>([]);
  const modalRef = useRef<HTMLElement>(null);
  const lastFocused = useRef<HTMLElement | null>(null);
  const previousPanel = useRef<Panel>("");
  const generationTimer = useRef<number | null>(null);
  const ageErrorRef = useRef<HTMLParagraphElement>(null);
  const profileErrorRef = useRef<HTMLParagraphElement>(null);
  const [ageChecked, setAgeChecked] = useState(false);
  const [agreementChecked, setAgreementChecked] = useState(false);
  const [ageError, setAgeError] = useState("");
  const [profileError, setProfileError] = useState("");
  const [account, setAccount] = useState<AccountSnapshot | null>(null);
  const [accountBusy, setAccountBusy] = useState(false);
  const [sharedSchedule, setSharedSchedule] = useState<ScheduleRecord | null>(null);
  const [schedules, setSchedules] = useState<ScheduleRecord[]>([]);
  const [scheduleLoaded, setScheduleLoaded] = useState(false);
  const [scheduleBusy, setScheduleBusy] = useState(false);
  const [legacyPlan, setLegacyPlan] = useState<LegacyPlan | null>(null);
  const [onboardingIntent, setOnboardingIntent] = useState<"solo" | "invite" | "join">("solo");
  const [soloMode, setSoloMode] = useState(false);
  const [inviteCodeValue, setInviteCodeValue] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [relationshipError, setRelationshipError] = useState("");
  const [historySharingMode, setHistorySharingMode] = useState<HistorySharingMode>("from_now");
  const [historySharingSelection, setHistorySharingSelection] = useState<string[]>([]);
  const [historySharingError, setHistorySharingError] = useState("");
  const [birthdayPickerOpen, setBirthdayPickerOpen] = useState(false);
  const [cityPickerOpen, setCityPickerOpen] = useState(false);
  const [profile, setProfile] = useState({ name: "林予", birthday: "", city: "杭州" });
  const [partnerProfile, setPartnerProfile] = useState({ name: "周宁", birthday: "11月6日" });
  const [isLocating, setIsLocating] = useState(false);
  const [scheduleDraft, setScheduleDraft] = useState(() => ({ title: "", date: dateInputValue(7), time: "18:30", city: "杭州" }));
  const [memoryDraft, setMemoryDraft] = useState(() => ({ title: "雨天一起逛书店", date: dateInputValue(-2), place: "杭州", copy: "下雨以后临时改变计划，一起在书店待了很久。" }));
  const [importantDraft, setImportantDraft] = useState(() => ({ title: "在一起纪念日", date: dateInputValue(63), repeatRule: "yearly" as "yearly" | "none", reminderDays: 7 }));
  const [formError, setFormError] = useState("");
  const [importantDays, setImportantDays] = useState<ImportantDayRecord[]>([]);
  const [sharedExperiencesAvailable, setSharedExperiencesAvailable] = useState(true);
  const [importantBusy, setImportantBusy] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(0);
  const [adopted, setAdopted] = useState(false);
  const [partnerAccepted, setPartnerAccepted] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [myConfirmed, setMyConfirmed] = useState(false);
  const [taConfirmed, setTaConfirmed] = useState(false);
  const [cancelled, setCancelledState] = useState(false);
  const [panel, setPanel] = useState<Panel>("");
  const [loadingFailed, setLoadingFailed] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [taskRecord, setTaskRecord] = useState<TaskRecord | null>(null);
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [taskBusy, setTaskBusy] = useState(false);
  const [taskContextActive, setTaskContextActive] = useState(false);
  const [memoryNote, setMemoryNote] = useState("");
  const [memoryPhoto, setMemoryPhoto] = useState(false);
  const [memoryCreated, setMemoryCreated] = useState(false);
  const [memoryDeleted, setMemoryDeleted] = useState(false);
  const [memoryContentRetracted, setMemoryContentRetracted] = useState(false);
  const [relationshipExited, setRelationshipExited] = useState(false);
  const [safetyExitUsed, setSafetyExitUsed] = useState(false);
  const [taskLinked, setTaskLinked] = useState(false);
  const [selectedDay, setSelectedDay] = useState(() => new Date().getDate());
  const [monthOffset, setMonthOffset] = useState(0);
  const [placeVersion, setPlaceVersion] = useState(0);
  const [selectedPlaceIndexes, setSelectedPlaceIndexes] = useState([0, 0, 0]);
  const [locationPrefs, setLocationPrefs] = useState<{ district: string; radius: number; longitude: number | null; latitude: number | null; label: string }>({ district: "", radius: 5000, longitude: null, latitude: null, label: "尚未定位" });
  const [choices, setChoices] = useState({ mood: "想放松", taMood: "和我一样", vibe: "安静", time: "今晚", budget: "¥100–300", space: "都可以", special: "" });
  const [myStates, setMyStates] = useState<string[]>(["想放松"]);
  const [customStates, setCustomStates] = useState<string[]>([]);
  const [newState, setNewState] = useState("");
  const [toast, setToast] = useState("");
  const [clock, setClock] = useState("--:--");
  const [reportReason, setReportReason] = useState("");
  const [aiPlans, setAiPlans] = useState<Plan[] | null>(null);
  const [generationError, setGenerationError] = useState("");
  const requestController = useRef<AbortController | null>(null);
  const dynamicPlans = useMemo(() => (aiPlans ?? plans).map((plan, index) => ({
    ...plan,
    title: aiPlans ? plan.title : choices.space === "室内" ? ["独立书店与安静晚餐", "双人陶艺与甜品", "小剧场与夜宵"][index] : choices.mood === "想热闹" ? ["夜市寻味与现场音乐", "双人保龄球与夜宵", "城市夜游与甜品"][index] : plan.title,
    meta: `${choices.time} · ${choices.budget}`,
  })), [aiPlans, choices]);
  const currentPlan = dynamicPlans[selectedPlan];
  const hasRelationship = Boolean(account?.relationship?.partner_id);
  const activeTask = taskRecord && !["completed", "cancelled"].includes(taskRecord.status) ? taskRecord : null;
  const taskAccepted = Boolean(activeTask && ["active", "completion_pending"].includes(activeTask.status));
  const taskDone = tasks.some(task => task.status === "completed");
  const orderedImportantDays = useMemo(() => [...importantDays].sort((a,b)=>nextImportantDate(a.event_date,a.repeat_rule).getTime()-nextImportantDate(b.event_date,b.repeat_rule).getTime()), [importantDays]);
  const primaryImportantDay = orderedImportantDays[0] ?? null;
  const relationshipImportantDay = importantDays.find(day => day.visibility === "shared" && day.status === "confirmed") ?? null;
  const importantAdded = importantDays.length > 0;
  const isPrimaryImportantCreator = Boolean(primaryImportantDay && primaryImportantDay.created_by_user_id === account?.user?.id);
  const isTaskCreator = Boolean(taskRecord && taskRecord.created_by_user_id === account?.user?.id);
  const isTaskCompletionRequester = Boolean(taskRecord && taskRecord.completion_requested_by_user_id === account?.user?.id);
  const personalSchedules = schedules.filter(schedule => schedule.visibility === "personal");
  const needsHistoryReview = hasRelationship && !account?.relationship?.history_sharing_reviewed_at && personalSchedules.length > 0;
  const currentPlaceCandidates = currentPlan.places ?? [];
  const currentPlace = currentPlaceCandidates[selectedPlaceIndexes[selectedPlan] ?? 0] ?? null;
  const amapMapUrl = currentPlace ? `https://uri.amap.com/marker?position=${encodeURIComponent(currentPlace.location)}&name=${encodeURIComponent(currentPlace.name)}&src=love-diary&coordinate=gaode&callnative=0` : "";
  const eventDate = useMemo(() => localDate(scheduleDraft.date), [scheduleDraft.date]);
  const today = useMemo(() => { const value = new Date(); value.setHours(0, 0, 0, 0); return value; }, []);
  const canConfirmCompletion = eventDate.getTime() <= today.getTime();
  const isScheduleCreator = Boolean(sharedSchedule && account?.user?.id && sharedSchedule.created_by_user_id === account.user.id);
  const scheduleIsShared = sharedSchedule ? sharedSchedule.visibility === "shared" : hasRelationship;
  const eventDateLong = new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", day: "numeric", weekday: "short" }).format(eventDate);
  const eventMonthDay = new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric" }).format(eventDate);
  const eventWeekday = new Intl.DateTimeFormat("zh-CN", { weekday: "short" }).format(eventDate);
  const eventBudget = new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY", maximumFractionDigits: 0 }).format(260);
  const manualMemoryDate = useMemo(() => localDate(memoryDraft.date), [memoryDraft.date]);
  const manualMemoryMonthDay = new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric" }).format(manualMemoryDate);
  const importantDate = useMemo(() => primaryImportantDay ? nextImportantDate(primaryImportantDay.event_date, primaryImportantDay.repeat_rule) : localDate(importantDraft.date), [primaryImportantDay, importantDraft.date]);
  const importantDateLong = new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", day: "numeric" }).format(importantDate);
  const calendarDate = useMemo(() => { const value = new Date(); return new Date(value.getFullYear(), value.getMonth() + monthOffset, 1); }, [monthOffset]);
  const calendarYear = calendarDate.getFullYear();
  const calendarMonth = calendarDate.getMonth();
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const leadingDays = (new Date(calendarYear, calendarMonth, 1).getDay() + 6) % 7;
  const calendarTitle = new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long" }).format(calendarDate);
  const restDays = Array.from({ length: daysInMonth }, (_, index) => index + 1).filter(day => [0, 6].includes(new Date(calendarYear, calendarMonth, day).getDay()));
  const adjustedWorkDays = calendarYear === 2026 && calendarMonth === 7 ? [9] : [];
  const isIdeaMonth = calendarYear === 2026 && calendarMonth === 7;
  const isCurrentMonth = calendarYear === today.getFullYear() && calendarMonth === today.getMonth();

  function jumpToToday() { setMonthOffset(0); setSelectedDay(new Date().getDate()); }
  function showDateInCalendar(date: Date) { setMonthOffset(monthOffsetFromToday(date)); setSelectedDay(date.getDate()); }
  function importantDaysOnDate(dateKey: string) { return importantDays.filter(day => day.repeat_rule === "yearly" ? day.event_date.slice(5) === dateKey.slice(5) : day.event_date === dateKey); }

  const step = useMemo(() => ({ welcome: 0, age: 0, profileSetup: 0, connect: 1, relationshipReady: 1, contentReview: 1, home: 2, inspire: 3, loading: 3, results: 4, plan: 5, location: 5, confirm: 5, schedule: 6, calendar: 7, memory: 8, memories: 8, memoryCreate: 8, task: 2, taskHistory: 2, profile: 2, settings: 2, notifications: 2, privacy: 2, relationshipSafety: 2, relationshipArchive: 2, important: 2, importantCreate: 2 }[screen]), [screen]);

  function go(next: Screen, replace = false) { if (screen === "loading" && next !== "results") { if (generationTimer.current) { window.clearTimeout(generationTimer.current); generationTimer.current = null; } requestController.current?.abort(); } if (!replace) history.current.push(screen); const method = replace ? "replaceState" : "pushState"; window.history[method]({ screen: next }, "", `#${next}`); setScreen(next); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function back(fallback: Screen = "home") { const previous = history.current.pop(); if (previous) window.history.back(); else go(fallback, true); }
  function notify(message: string) { setToast(message); window.setTimeout(() => setToast(""), 1800); }
  async function loadAccount(silent = false) {
    try {
      const response = await fetch("/api/account", { cache: "no-store" });
      const data = await response.json() as AccountSnapshot;
      if (response.status === 401) { setAccount({ authenticated: false }); setSharedSchedule(null); setSchedules([]); setTaskRecord(null); setTasks([]); setImportantDays([]); setScheduleLoaded(true); setAdopted(false); return null; }
      if (!response.ok) throw new Error("账号状态读取失败");
      if (account?.user?.id && data.user?.id && account.user.id !== data.user.id) {
        setSharedSchedule(null); setSchedules([]); setTaskRecord(null); setTasks([]); setImportantDays([]); setScheduleLoaded(false); setAdopted(false);
      }
      setAccount(data);
      if (data.user) setProfile({ name: data.user.nickname, birthday: dateFieldValue(data.user.birthday), city: data.user.city });
      setInviteCodeValue(data.invite?.code ?? "");
      if (data.relationship?.partner_id) {
        window.localStorage.removeItem("love-diary-solo-user"); setSoloMode(false);
        setPartnerProfile({ name: data.relationship.partner_name ?? "TA", birthday: data.relationship.partner_birthday ?? "" });
        if (screen === "connect") go("relationshipReady", true);
      } else { setSoloMode(window.localStorage.getItem("love-diary-solo-user") === data.user?.id); }
      return data;
    } catch {
      if (!silent) setRelationshipError("暂时无法连接账号服务，请稍后重试。");
      return null;
    }
  }
  async function createRelationshipInvite() {
    setAccountBusy(true); setRelationshipError("");
    try {
      const response = await fetch("/api/relationship/invite", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ partnerNote: partnerProfile.name }) });
      const data = await response.json() as { code?: string; error?: string };
      if (!response.ok || !data.code) throw new Error(data.error || "邀请码生成失败。");
      setInviteCodeValue(data.code); notify("真实邀请码已生成，7 天内有效");
    } catch (error) { setRelationshipError(error instanceof Error ? error.message : "邀请码生成失败。"); }
    finally { setAccountBusy(false); }
  }
  async function loadSharedSchedule(silent = false) {
    if (!account?.authenticated && !silent) return;
    try {
      const response = await fetch("/api/schedules", { cache: "no-store" });
      if (response.status === 401) return;
      const data = await response.json() as { schedule?: ScheduleRecord | null; schedules?: ScheduleRecord[]; error?: string };
      if (!response.ok) throw new Error(data.error || "安排读取失败。");
      const schedule = data.schedule ?? null;
      setSchedules(data.schedules ?? (schedule ? [schedule] : []));
      setSharedSchedule(schedule);
      if (schedule) {
        setScheduleDraft({ title: schedule.title, date: schedule.event_date, time: schedule.event_time, city: schedule.city });
        showDateInCalendar(localDate(schedule.event_date));
        setAdopted(true); setPartnerAccepted(schedule.status === "confirmed"); setCancelled(schedule.status === "cancelled");
        setCompleted(false); setMyConfirmed(false); setTaConfirmed(false);
      } else if (account?.authenticated) { setAdopted(false); setPartnerAccepted(false); }
    } catch { if (!silent) notify("安排同步失败，请稍后重试"); }
    finally { setScheduleLoaded(true); }
  }
  async function loadSharedExperiences(silent = false) {
    if (!account?.authenticated && !silent) return;
    try {
      const [taskResponse, importantResponse] = await Promise.all([
        fetch("/api/tasks", { cache: "no-store" }),
        fetch("/api/important-days", { cache: "no-store" }),
      ]);
      if (taskResponse.status === 401 || importantResponse.status === 401) return;
      const taskData = await taskResponse.json() as { task?: TaskRecord | null; tasks?: TaskRecord[]; available?: boolean; error?: string };
      const importantData = await importantResponse.json() as { importantDays?: ImportantDayRecord[]; available?: boolean; error?: string };
      if (!taskResponse.ok || !importantResponse.ok) throw new Error(taskData.error || importantData.error || "共同内容读取失败。");
      setSharedExperiencesAvailable(taskData.available !== false && importantData.available !== false);
      setTaskRecord(taskData.task ?? null); setTasks(taskData.tasks ?? []); setImportantDays(importantData.importantDays ?? []);
    } catch { if (!silent) notify("任务与重要日子同步失败，请稍后重试"); }
  }
  async function createImportantDay() {
    if (!sharedExperiencesAvailable) { setFormError("重要日子将在第四阶段完成后启用。"); return; }
    if (!importantDraft.title.trim() || !importantDraft.date) { setFormError("请填写重要日子的名称和日期。"); return; }
    setImportantBusy(true); setFormError("");
    try {
      const response = await fetch("/api/important-days", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: importantDraft.title, eventDate: importantDraft.date, repeatRule: importantDraft.repeatRule, reminderDays: importantDraft.reminderDays, visibility: hasRelationship ? "shared" : "personal" }) });
      const data = await response.json() as { importantDay?: ImportantDayRecord; error?: string };
      if (!response.ok || !data.importantDay) throw new Error(data.error || "重要日子保存失败。");
      setImportantDays(current => [...current.filter(day => day.id !== data.importantDay!.id), data.importantDay!].sort((a,b)=>a.event_date.localeCompare(b.event_date)));
      notify(hasRelationship ? "已发给 TA 确认，确认后进入共同日历" : "已保存到我的重要日子"); go("important");
    } catch (error) { setFormError(error instanceof Error ? error.message : "重要日子保存失败。"); }
    finally { setImportantBusy(false); }
  }
  async function acceptImportantDay(id: string) {
    if (!sharedExperiencesAvailable) { notify("重要日子将在第四阶段完成后启用"); return; }
    setImportantBusy(true);
    try {
      const response = await fetch("/api/important-days", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, action: "accept" }) });
      const data = await response.json() as { importantDay?: ImportantDayRecord; error?: string };
      if (!response.ok || !data.importantDay) throw new Error(data.error || "确认重要日子失败。");
      setImportantDays(current => current.map(day => day.id === id ? data.importantDay! : day)); notify("已确认，并同步到共同日历");
    } catch (error) { notify(error instanceof Error ? error.message : "确认重要日子失败。"); }
    finally { setImportantBusy(false); }
  }
  async function startSharedTask() {
    if (!sharedExperiencesAvailable) { notify("共同任务将在第四阶段完成后启用"); return; }
    if (!hasRelationship) { setOnboardingIntent("invite"); go("connect"); return; }
    setTaskBusy(true);
    try {
      const response = await fetch("/api/tasks", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: "交换一首最近常听的歌" }) });
      const data = await response.json() as { task?: TaskRecord; existing?: boolean; error?: string };
      if (!response.ok || !data.task) throw new Error(data.error || "任务发起失败。");
      setTaskRecord(data.task); setTasks(current => [data.task!, ...current.filter(task => task.id !== data.task!.id)]); notify(data.existing ? "当前已有一项进行中的任务" : "已发给 TA，等待接受");
    } catch (error) { notify(error instanceof Error ? error.message : "任务发起失败。"); }
    finally { setTaskBusy(false); }
  }
  async function updateSharedTask(action: "accept" | "request_complete" | "confirm_complete" | "cancel") {
    if (!sharedExperiencesAvailable) { notify("共同任务将在第四阶段完成后启用"); return; }
    if (!taskRecord) return;
    setTaskBusy(true);
    try {
      const response = await fetch("/api/tasks", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: taskRecord.id, action }) });
      const data = await response.json() as { task?: TaskRecord; error?: string };
      if (!response.ok || !data.task) throw new Error(data.error || "任务更新失败。");
      setTaskRecord(["completed", "cancelled"].includes(data.task.status) ? null : data.task);
      setTasks(current => [data.task!, ...current.filter(task => task.id !== data.task!.id)]);
      if (action === "accept") notify("任务已接受，双方现在可以一起完成");
      else if (action === "request_complete") notify("已记录你的完成确认，等待 TA 确认");
      else if (action === "confirm_complete") notify("双方已确认完成");
      else notify("任务已结束，可以稍后发起新的任务");
    } catch (error) { notify(error instanceof Error ? error.message : "任务更新失败。"); }
    finally { setTaskBusy(false); }
  }
  async function createSharedSchedule() {
    const title = (scheduleDraft.title || currentPlan.title).trim(); const city = (scheduleDraft.city || profile.city).trim();
    if (!title || !scheduleDraft.date || !scheduleDraft.time || !city) { setFormError("请完整填写安排名称、日期、时间和城市。"); return; }
    setScheduleBusy(true); setFormError("");
    try {
      const response = await fetch("/api/schedules", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title, eventDate: scheduleDraft.date, eventTime: scheduleDraft.time, city, visibility: "shared", source: aiPlans ? "ai" : "manual" }) });
      const data = await response.json() as { schedule?: ScheduleRecord; error?: string };
      if (!response.ok || !data.schedule) throw new Error(data.error || "安排发送失败。");
      setSharedSchedule(data.schedule); setSchedules(current => [data.schedule!, ...current.filter(schedule => schedule.id !== data.schedule!.id)]); setScheduleDraft({ title, date: scheduleDraft.date, time: scheduleDraft.time, city });
      showDateInCalendar(localDate(scheduleDraft.date)); setAdopted(true); setPartnerAccepted(false); setCompleted(false); setMyConfirmed(false); setTaConfirmed(false); setTaskLinked(taskContextActive); go("schedule");
    } catch (error) { setFormError(error instanceof Error ? error.message : "安排发送失败。"); }
    finally { setScheduleBusy(false); }
  }
  async function acceptSharedSchedule() {
    if (!sharedSchedule) return;
    setScheduleBusy(true);
    try {
      const response = await fetch("/api/schedules", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: sharedSchedule.id, action: "accept" }) });
      const data = await response.json() as { schedule?: ScheduleRecord; error?: string };
      if (!response.ok || !data.schedule) throw new Error(data.error || "接受安排失败。");
      setSharedSchedule(data.schedule); setSchedules(current => current.map(schedule => schedule.id === data.schedule!.id ? data.schedule! : schedule)); setPartnerAccepted(true); setCompleted(false); setMyConfirmed(false); setTaConfirmed(false); notify("安排已接受，双方共同日历已同步");
    } catch (error) { notify(error instanceof Error ? error.message : "接受安排失败。"); }
    finally { setScheduleBusy(false); }
  }
  async function sharePersonalPlan(id = sharedSchedule?.id) {
    if (!id) return;
    setScheduleBusy(true);
    try {
      const response = await fetch("/api/schedules", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, action: "share" }) });
      const data = await response.json() as { schedule?: ScheduleRecord; error?: string };
      if (!response.ok || !data.schedule) throw new Error(data.error || "计划发送失败。");
      setSharedSchedule(data.schedule);
      setSchedules(current => current.map(schedule => schedule.id === data.schedule!.id ? data.schedule! : schedule));
      setPartnerAccepted(false); notify("已发给 TA，等待接受");
    } catch (error) { notify(error instanceof Error ? error.message : "计划发送失败。"); }
    finally { setScheduleBusy(false); }
  }
  async function saveHistorySharingChoice() {
    const scheduleIds = historySharingMode === "selected" ? historySharingSelection : [];
    if (historySharingMode === "selected" && scheduleIds.length === 0) { setHistorySharingError("请至少选择一个要发送给 TA 的计划。"); return; }
    setAccountBusy(true); setHistorySharingError("");
    try {
      const response = await fetch("/api/relationship/history-sharing", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode: historySharingMode, scheduleIds }) });
      const data = await response.json() as { ok?: boolean; sharedCount?: number; error?: string };
      if (!response.ok || !data.ok) throw new Error(data.error || "历史内容选择保存失败。");
      const reviewedAt = new Date().toISOString();
      setAccount(current => current?.relationship ? { ...current, relationship: { ...current.relationship, history_sharing_mode: historySharingMode, history_sharing_reviewed_at: reviewedAt } } : current);
      await loadSharedSchedule(true);
      notify(data.sharedCount ? `已发送 ${data.sharedCount} 个计划给 TA` : "历史内容继续保持私密");
      go("home", true);
    } catch (error) { setHistorySharingError(error instanceof Error ? error.message : "历史内容选择保存失败。"); }
    finally { setAccountBusy(false); }
  }
  function openSchedule(schedule: ScheduleRecord) {
    setSharedSchedule(schedule);
    setScheduleDraft({ title: schedule.title, date: schedule.event_date, time: schedule.event_time, city: schedule.city });
    setAdopted(true); setPartnerAccepted(schedule.status === "confirmed"); setCancelledState(schedule.status === "cancelled");
    go("schedule");
  }
  function setCancelled(value: boolean) { if (value) void cancelCurrentSchedule(); else setCancelledState(false); }
  async function cancelCurrentSchedule() {
    if (!sharedSchedule) { notify("当前没有可删除的计划"); setPanel(""); return; }
    setScheduleBusy(true);
    try {
      const action = sharedSchedule.visibility === "shared" ? "cancel" : "delete";
      const response = await fetch("/api/schedules", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: sharedSchedule.id, action }) });
      const data = await response.json() as { schedule?: ScheduleRecord | null; error?: string };
      if (!response.ok) throw new Error(data.error || (action === "delete" ? "删除计划失败。" : "取消安排失败。"));
      setSharedSchedule(null); setAdopted(false); setPartnerAccepted(false); setCancelled(false); setPanel(""); notify(action === "delete" ? "个人计划已删除" : "安排已取消并从首页移除");
      await loadSharedSchedule(true); go("home");
    } catch (error) { notify(error instanceof Error ? error.message : "安排更新失败。"); }
    finally { setScheduleBusy(false); }
  }
  async function saveScheduleEdits() {
    if (!sharedSchedule) { notify("当前没有可编辑的计划"); return; }
    const title = (scheduleDraft.title || currentPlan.title).trim();
    const city = (scheduleDraft.city || profile.city).trim();
    if (!title || !scheduleDraft.date || !scheduleDraft.time || !city) { notify("请完整填写安排信息"); return; }
    setScheduleBusy(true);
    try {
      const response = await fetch("/api/schedules", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: sharedSchedule.id, action: "update", title, eventDate: scheduleDraft.date, eventTime: scheduleDraft.time, city }) });
      const data = await response.json() as { schedule?: ScheduleRecord; error?: string };
      if (!response.ok || !data.schedule) throw new Error(data.error || "安排保存失败。");
      setSharedSchedule(data.schedule); setSchedules(current => current.map(schedule => schedule.id === data.schedule!.id ? data.schedule! : schedule)); setScheduleDraft({ title, date: data.schedule.event_date, time: data.schedule.event_time, city: data.schedule.city });
      setPartnerAccepted(data.schedule.status === "confirmed"); showDateInCalendar(localDate(data.schedule.event_date)); setPanel("");
      notify(data.schedule.visibility === "shared" ? "安排已更新，等待 TA 重新确认" : "个人计划已更新");
    } catch (error) {
      await loadSharedSchedule(true); notify(error instanceof Error ? error.message : "安排保存失败。");
    } finally { setScheduleBusy(false); }
  }
  async function savePersonalPlan(source: "manual" | "ai" | "legacy_import" = aiPlans ? "ai" : "manual", plan: LegacyPlan | null = null) {
    const next = plan ?? { title: scheduleDraft.title || currentPlan.title, date: scheduleDraft.date, time: scheduleDraft.time, city: scheduleDraft.city || profile.city };
    const title = next.title.trim(); const city = next.city.trim();
    if (!title || !next.date || !next.time || !city) { setFormError("请完整填写安排名称、日期、时间和城市。"); return; }
    setScheduleBusy(true); setFormError("");
    try {
      const response = await fetch("/api/schedules", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title, eventDate: next.date, eventTime: next.time, city, visibility: "personal", source }) });
      const data = await response.json() as { schedule?: ScheduleRecord; error?: string };
      if (!response.ok || !data.schedule) throw new Error(data.error || "个人计划保存失败。");
      setSharedSchedule(data.schedule); setSchedules(current => [data.schedule!, ...current.filter(schedule => schedule.id !== data.schedule!.id)]); setScheduleDraft({ title, date: next.date, time: next.time, city });
      showDateInCalendar(localDate(next.date)); setAdopted(true); setPartnerAccepted(false);
      setCompleted(false); setMyConfirmed(false); setTaConfirmed(false);
      if (source === "legacy_import") {
        const backup = LEGACY_STORAGE_KEYS.map(key => window.localStorage.getItem(key)).find(Boolean);
        if (backup) window.localStorage.setItem("love-diary-legacy-backup", backup);
        LEGACY_STORAGE_KEYS.forEach(key => window.localStorage.removeItem(key));
        window.localStorage.setItem("love-diary-legacy-plan-migrated", "1");
        setLegacyPlan(null);
      }
      notify(source === "legacy_import" ? "旧计划已安全导入" : "已保存到我的计划"); go("calendar");
    } catch (error) { setFormError(error instanceof Error ? error.message : "个人计划保存失败。"); }
    finally { setScheduleBusy(false); }
  }
  async function saveProfileAndContinue() {
    if (!profile.name.trim() || (onboardingIntent === "invite" && !partnerProfile.name.trim())) { setProfileError("请填写昵称和邀请称呼后继续。"); window.requestAnimationFrame(()=>profileErrorRef.current?.focus()); return; }
    setAccountBusy(true); setProfileError("");
    try {
      const response = await fetch("/api/account", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ nickname: profile.name, birthday: profile.birthday, city: profile.city }) });
      const data = await response.json() as AccountSnapshot & { error?: string };
      if (!response.ok) throw new Error(data.error || "资料保存失败。");
      setAccount(data);
      if (onboardingIntent === "solo") {
        window.localStorage.setItem("love-diary-solo-user", data.user?.id ?? "");
        setSoloMode(true); go("home");
      } else {
        window.localStorage.removeItem("love-diary-solo-user");
        setSoloMode(false); go("connect");
        if (onboardingIntent === "invite") window.setTimeout(() => void createRelationshipInvite(), 0);
      }
    } catch (error) { setProfileError(error instanceof Error ? error.message : "资料保存失败。"); }
    finally { setAccountBusy(false); }
  }
  async function saveSelectedCity(city: string) {
    const previousCity = account?.user?.city ?? profile.city;
    setProfile(current => ({ ...current, city }));
    if (!account?.authenticated) { notify("城市已更新"); return; }
    try {
      const response = await fetch("/api/account", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ nickname: profile.name, birthday: profile.birthday, city }) });
      const data = await response.json() as AccountSnapshot & { error?: string };
      if (!response.ok) throw new Error(data.error || "城市同步失败。");
      setAccount(data); notify("城市已更新并同步到账户");
    } catch { setProfile(current => ({ ...current, city: previousCity })); notify("城市保存失败，已恢复账户中的城市"); }
  }
  async function saveProfileEdits() {
    if (!profile.name.trim()) { notify("请先填写昵称"); return; }
    setAccountBusy(true);
    try {
      const response = await fetch("/api/account", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ nickname: profile.name, birthday: profile.birthday, city: profile.city }) });
      const data = await response.json() as AccountSnapshot & { error?: string };
      if (!response.ok || !data.user) throw new Error(data.error || "资料保存失败。");
      setAccount(data); setProfile({ name: data.user.nickname, birthday: dateFieldValue(data.user.birthday), city: data.user.city });
      setPanel(""); notify("我的资料已保存到账户");
    } catch (error) {
      if (account?.user) setProfile({ name: account.user.nickname, birthday: dateFieldValue(account.user.birthday), city: account.user.city });
      notify(error instanceof Error ? error.message : "资料保存失败。");
    } finally { setAccountBusy(false); }
  }
  async function joinRelationship() {
    setAccountBusy(true); setRelationshipError("");
    try {
      const response = await fetch("/api/relationship/join", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: joinCode }) });
      const data = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) throw new Error(data.error || "加入关系失败。");
      await loadAccount(); go("relationshipReady", true);
    } catch (error) { setRelationshipError(error instanceof Error ? error.message : "加入关系失败。"); }
    finally { setAccountBusy(false); }
  }
  async function leaveRelationship(safety: boolean) {
    if (account?.authenticated && account.relationship?.id) {
      setAccountBusy(true); setRelationshipError("");
      try {
        const response = await fetch("/api/relationship/leave", { method: "POST" });
        const data = await response.json() as { ok?: boolean; error?: string };
        if (!response.ok || !data.ok) throw new Error(data.error || "退出关系失败。");
        await loadAccount(true); await Promise.all([loadSharedSchedule(true), loadSharedExperiences(true)]);
      } catch (error) {
        setRelationshipError(error instanceof Error ? error.message : "退出关系失败。");
        notify("暂时无法退出关系，请稍后重试");
        setAccountBusy(false);
        return;
      }
      setAccountBusy(false);
    }
    setRelationshipExited(true); setSafetyExitUsed(safety);
    if (safety) setMemoryContentRetracted(true);
    setInviteCodeValue(""); setJoinCode(""); setPanel(""); history.current=[]; go("relationshipArchive",true);
  }
  function useCurrentLocation() {
    if (!navigator.geolocation) { notify("当前浏览器不支持定位，请填写商圈"); return; }
    if (isLocating) return;
    setIsLocating(true);
    notify("正在获取当前位置…");
    navigator.geolocation.getCurrentPosition(
      position => { setLocationPrefs(current => ({ ...current, longitude: position.coords.longitude, latitude: position.coords.latitude, label: `已定位 · 精度约 ${new Intl.NumberFormat("zh-CN").format(Math.round(position.coords.accuracy))} 米` })); setIsLocating(false); notify("已获取当前位置，仅用于本次附近搜索"); },
      () => { setLocationPrefs(current => ({ ...current, label: "定位失败，请允许权限或手动填写商圈" })); setIsLocating(false); notify("无法获取定位，请允许权限或手动填写商圈"); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    );
  }
  async function generate(shouldFail = false) {
    requestController.current?.abort();
    if (shouldFail) { setGenerationError("这是手动触发的失败状态预览。"); setLoadingFailed(true); go("loading"); return; }
    const controller = new AbortController();
    requestController.current = controller;
    setGenerationError(""); setLoadingFailed(false); go("loading");
    try {
      const response = await fetch("/api/inspiration", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ city: profile.city, moods: myStates, partnerMood: hasRelationship ? choices.taMood : undefined, vibe: choices.vibe, time: choices.time, budget: choices.budget, space: choices.space, special: choices.special.trim(), district: locationPrefs.district, radius: locationPrefs.radius, longitude: locationPrefs.longitude, latitude: locationPrefs.latitude }),
        signal: controller.signal,
      });
      const data = await response.json() as { plans?: Array<{ title: string; summary: string; duration: string; budgetLabel: string; timeline: TimelineNode[]; places?: Place[] }>; error?: string; code?: string };
      if (["AI_NOT_CONFIGURED", "GENERATION_FAILED", "AI_CIRCUIT_OPEN"].includes(data.code ?? "")) {
        setAiPlans(null); setSelectedPlan(0); setHasGenerated(true); go("results");
        notify(data.code === "AI_NOT_CONFIGURED" ? "AI 尚未配置，当前显示备用方案" : "AI 服务暂时繁忙，已切换为可继续编辑的备用方案");
        return;
      }
      if (!response.ok || !data.plans) throw new Error(data.error || "灵感暂时没有生成成功。");
      setAiPlans(data.plans.map((plan, index) => ({ eyebrow: index === 0 ? "主方案 · AI 实时生成" : "备选 · AI 实时生成", title: plan.title, meta: `${choices.time} · ${plan.budgetLabel}`, desc: plan.summary, tone: ["primary", "cream", "lilac"][index] ?? "cream", duration: plan.duration, timeline: plan.timeline, places: plan.places })));
      setSelectedPlaceIndexes([0, 0, 0]); setSelectedPlan(0); setHasGenerated(true); go("results");
    } catch (error) {
      if (controller.signal.aborted) return;
      setGenerationError(error instanceof Error ? error.message : "灵感暂时没有生成成功。");
      setLoadingFailed(true);
    } finally {
      if (requestController.current === controller) requestController.current = null;
    }
  }
  function resetJourney() {
    setCompleted(false); setMyConfirmed(false); setTaConfirmed(false); setTaskLinked(false); setTaskContextActive(false); setMemoryDeleted(false); void loadSharedSchedule(true); void loadSharedExperiences(true); go("home");
  }
  function clearLocalSession() {
    window.sessionStorage.removeItem(INSPIRATION_DRAFT_KEY);
    LEGACY_STORAGE_KEYS.forEach(key => window.localStorage.removeItem(key));
    ["love-diary-legacy-backup", "love-diary-legacy-plan-migrated", "love-diary-legacy-plan-dismissed", "love-diary-solo-user"].forEach(key => window.localStorage.removeItem(key));
    setChoices({ mood: "想放松", taMood: "和我一样", vibe: "安静", time: "今晚", budget: "¥100–300", space: "都可以", special: "" });
    setMyStates(["想放松"]); setCustomStates([]); setLocationPrefs({ district: "", radius: 5000, longitude: null, latitude: null, label: "尚未定位" });
    setLegacyPlan(null); setSoloMode(false); setAiPlans(null); setHasGenerated(false); setCompleted(false); setTaskContextActive(false); setTaskLinked(false); setMemoryCreated(false); setMemoryContentRetracted(false); setRelationshipExited(false); setSafetyExitUsed(false); setPanel("");
    history.current = []; void loadSharedSchedule(true); void loadSharedExperiences(true); go("welcome", true);
  }

  useEffect(() => {
    // The remote account snapshot is authoritative and arrives asynchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadAccount(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const refreshAccount = () => { if (document.visibilityState === "visible") { void loadAccount(true); void loadSharedSchedule(true); void loadSharedExperiences(true); } };
    window.addEventListener("focus", refreshAccount);
    document.addEventListener("visibilitychange", refreshAccount);
    return () => {
      window.removeEventListener("focus", refreshAccount);
      document.removeEventListener("visibilitychange", refreshAccount);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!account?.authenticated) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSharedSchedule(true);
    void loadSharedExperiences(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?.authenticated, account?.relationship?.id]);

  useEffect(() => {
    if (screen !== "connect" || !account?.authenticated || account.relationship?.partner_id) return;
    const timer = window.setInterval(() => void loadAccount(true), 5000);
    return () => window.clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, account?.authenticated, account?.relationship?.partner_id]);

  useEffect(() => {
    if (!account?.authenticated || account.relationship?.partner_id || soloMode || relationshipExited) return;
    const relationshipRequired: Screen[] = ["contentReview", "home", "inspire", "loading", "results", "plan", "location", "confirm", "schedule", "calendar", "memory", "memories", "memoryCreate", "task", "taskHistory", "profile", "settings", "notifications", "privacy", "relationshipSafety", "important", "importantCreate"];
    if (!relationshipRequired.includes(screen)) return;
    // The server relationship snapshot is authoritative after an account switch or exit.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    go("connect", true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?.authenticated, account?.relationship?.partner_id, soloMode, relationshipExited, screen]);

  useEffect(() => {
    const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[name="my-birthday"]'));
    const openPicker = () => setBirthdayPickerOpen(true);
    inputs.forEach(input => {
      input.type = "text";
      input.readOnly = true;
      input.removeAttribute("inputmode");
      input.placeholder = "请选择出生日期";
      input.setAttribute("aria-label", "打开生日日期选择器");
      input.classList.add("birthday-trigger");
      input.addEventListener("click", openPicker);
    });
    return () => inputs.forEach(input => input.removeEventListener("click", openPicker));
  }, [screen, panel]);

  useEffect(() => {
    const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[name="city"], input[name="inspiration-city"]'));
    const openPicker = () => { setPanel(""); setCityPickerOpen(true); };
    inputs.forEach(input => {
      input.readOnly = true;
      input.placeholder = "搜索并选择城市";
      input.setAttribute("aria-label", "打开城市搜索选择器");
      input.classList.add("city-trigger");
      input.addEventListener("click", openPicker);
    });
    return () => inputs.forEach(input => input.removeEventListener("click", openPicker));
  }, [screen, panel]);

  useEffect(() => {
    const fields = Array.from(document.querySelectorAll<HTMLInputElement>('input[name="partner-name"], input[name="partner-birthday"]'));
    fields.forEach(field => {
      field.tabIndex = -1;
      field.classList.add("readonly-profile-input");
      field.setAttribute("aria-readonly", "true");
    });
  }, [panel]);

  useEffect(() => {
    const savedDraft = window.sessionStorage.getItem(INSPIRATION_DRAFT_KEY);
    if (savedDraft) {
      try {
        const data = JSON.parse(savedDraft) as { choices?: typeof choices; myStates?: string[]; customStates?: string[]; district?: string; radius?: number };
        // Session storage only keeps this tab's unfinished inspiration form.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (data.choices) setChoices(current => ({ ...current, ...data.choices, special: data.choices?.special ?? "" }));
        if (Array.isArray(data.myStates)) setMyStates(data.myStates.slice(0, 2));
        if (Array.isArray(data.customStates)) setCustomStates(data.customStates.slice(0, 12));
        if (typeof data.district === "string" || [3000, 5000, 10000].includes(data.radius ?? 0)) {
          setLocationPrefs(current => ({ ...current, district: data.district?.slice(0, 40) ?? "", radius: [3000, 5000, 10000].includes(data.radius ?? 0) ? data.radius! : current.radius }));
        }
      } catch { window.sessionStorage.removeItem(INSPIRATION_DRAFT_KEY); }
    }

    if (window.localStorage.getItem("love-diary-legacy-plan-migrated") || window.localStorage.getItem("love-diary-legacy-plan-dismissed")) return;
    const legacySnapshot = LEGACY_STORAGE_KEYS.map(key => window.localStorage.getItem(key)).find(Boolean);
    if (!legacySnapshot) return;
    try {
      const data = JSON.parse(legacySnapshot) as { adopted?: boolean; scheduleDraft?: Partial<LegacyPlan> };
      const draft = data.scheduleDraft;
      if (data.adopted && draft?.title?.trim() && /^\d{4}-\d{2}-\d{2}$/.test(draft.date ?? "") && /^\d{2}:\d{2}$/.test(draft.time ?? "") && draft.city?.trim()) {
        setLegacyPlan({ title: draft.title.trim(), date: draft.date!, time: draft.time!, city: draft.city.trim() });
      }
    } catch { /* Damaged legacy snapshots are ignored, never auto-imported. */ }
  }, []);

  useEffect(() => {
    const updateClock = () => setClock(new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date()));
    updateClock();
    const timer = window.setInterval(updateClock, 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const initial = window.location.hash.slice(1) as Screen;
    const initialScreen = initial || screen;
    // Old versions exposed form content in the query string. Strip it before
    // rendering and keep only the non-sensitive screen hash.
    if (window.location.search) {
      window.location.replace(`${window.location.pathname}#${initialScreen}`);
      return;
    }
    window.history.replaceState({ screen: initialScreen }, "", `#${initialScreen}`);
    if (initial) window.queueMicrotask(() => setScreen(initial));
    const onPopState = (event: PopStateEvent) => {
      const next = (event.state?.screen ?? window.location.hash.slice(1) ?? "home") as Screen;
      setScreen(next);
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    window.sessionStorage.setItem(INSPIRATION_DRAFT_KEY, JSON.stringify({ choices, myStates, customStates, district: locationPrefs.district, radius: locationPrefs.radius }));
  }, [choices, myStates, customStates, locationPrefs.district, locationPrefs.radius]);

  useEffect(() => {
    const backgroundRegions = Array.from(document.querySelectorAll<HTMLElement>(".prototype-notes, .phone-stage"));
    backgroundRegions.forEach(region => { region.inert = Boolean(panel); if (panel) region.setAttribute("aria-hidden", "true"); else region.removeAttribute("aria-hidden"); });
    if (panel && !previousPanel.current) {
      lastFocused.current = document.activeElement as HTMLElement;
      window.requestAnimationFrame(() => modalRef.current?.focus());
    }
    if (!panel && previousPanel.current) lastFocused.current?.focus();
    previousPanel.current = panel;
    const handleModalKeys = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPanel("");
      if (event.key !== "Tab" || !modalRef.current) return;
      const focusable = Array.from(modalRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    if (panel) document.addEventListener("keydown", handleModalKeys);
    return () => { document.removeEventListener("keydown", handleModalKeys); backgroundRegions.forEach(region => { region.inert = false; region.removeAttribute("aria-hidden"); }); };
  }, [panel]);

  useEffect(() => () => { if (generationTimer.current) window.clearTimeout(generationTimer.current); requestController.current?.abort(); }, []);

  function nav(tab: Tab) {
    if (tab === "home") go("home");
    if (tab === "inspire") go("inspire");
    if (tab === "calendar") go("calendar");
    if (tab === "settings") go("settings");
  }

  const bottomNav = (active: Tab) => (
    <nav className="bottom-nav" aria-label="主导航">
      {([ ["home", "⌂", hasRelationship ? "我们" : "我的"], ["inspire", "✦", "灵感"], ["calendar", "▦", "日历"], ["settings", "○", "设置"] ] as const).map(([id, icon, label]) => (
        <a key={id} href={`#${id}`} className={active === id ? "selected" : ""} aria-current={active === id ? "page" : undefined} onClick={(event) => {event.preventDefault();nav(id);}}><span aria-hidden="true">{icon}</span>{label}</a>
      ))}
    </nav>
  );

  return (
    <main className="prototype-shell" id="main-content">
      <aside className="prototype-notes">
        <div className="brand-mark">日</div>
        <p className="kicker">恋爱日记 · V1.16 单人与共同体验</p>
        <h1>把一起生活的<br/>小事，好好留下。</h1>
        <p className="intro">从一个轻松的约会灵感开始，经过双方确认，成为共同安排，最后自然沉淀为回忆。</p>
        <ol className="journey" aria-label="体验流程">
          {["相遇", "我们", "灵感", "计划", "安排", "日历", "回忆"].map((label, i) => <li key={label} className={step >= i + 1 ? "done" : ""} aria-current={step === i + 1 ? "step" : undefined}><i aria-hidden="true">{step > i + 1 ? "✓" : i + 1}</i><span>{label}</span></li>)}
        </ol>
        <p className="hint">V1.16 单人内容默认私密；共同任务和重要日子必须由双方确认。</p>
      </aside>

      <section className="phone-stage">
        <div className="phone">
          <div className="statusbar" aria-hidden="true"><span>{clock}</span><span className="island"/><span>● ◒ ▰</span></div>
          <div className={`screen screen-${screen} ${hasRelationship?"":"solo-mode"}`}>
            {screen === "welcome" && (
              <div className="welcome page-full">
                <div className="soft-orb orb-one"/><div className="soft-orb orb-two"/>
                <div className="welcome-symbol"><span>♥</span><span>♥</span></div>
                <div className="welcome-copy"><p className="kicker">恋爱日记</p><h2>两个人的生活，<br/>值得被温柔记住。</h2><p>一起计划，一起经历，<br/>也一起拥有属于我们的回忆。</p></div>
                <div className="welcome-actions">{account?.authenticated ? hasRelationship ? <><button className="primary-button" onClick={() => go("home")}>进入我们的空间 <Arrow /></button><a className="account-link" href="/signout-with-chatgpt?return_to=%2F">退出当前账号</a></> : <><button className="primary-button" onClick={() => {setOnboardingIntent("solo");go(soloMode?"home":"age");}}>{soloMode?"继续单人体验":"先自己体验"} <Arrow /></button><button className="ghost-button welcome-join" onClick={() => {setOnboardingIntent("invite");go("age");}}>邀请 TA 一起使用</button><button className="account-link" onClick={() => {setOnboardingIntent("join");go("age");}}>我有 TA 的邀请码</button><a className="account-link" href="/signout-with-chatgpt?return_to=%2F">退出当前账号</a></> : <><a className="primary-button sign-in-button" href="/signin-with-chatgpt?return_to=%2F">使用 ChatGPT 登录 <Arrow /></a><p>登录后可先单人体验，以后再邀请 TA</p></>}</div>
              </div>
            )}

            {screen === "age" && <div className="page formal-page onboarding-page"><header><Back onClick={() => back("welcome")}/><span>开始前确认</span><i aria-hidden="true"/></header><section className="page-intro"><p className="kicker">清楚，再继续</p><h2>{onboardingIntent==="solo"?"先从自己的生活开始。":"建立两个人的共同空间。"}</h2><p className="confirm-copy">恋爱日记仅面向已满 18 周岁的用户。AI 建议不会自动变成个人计划或共同事实。</p></section><section className="consent-card"><label htmlFor="age-confirmation" aria-label="确认已满 18 周岁"><input id="age-confirmation" type="checkbox" name="age-confirmation" checked={ageChecked} onChange={e=>{setAgeChecked(e.target.checked);setAgeError("");}}/><span><b>我已满 18 周岁</b><small>未满 18 周岁无法继续使用</small></span></label><label htmlFor="agreement-confirmation" aria-label="同意用户协议与隐私说明"><input id="agreement-confirmation" type="checkbox" name="agreement-confirmation" checked={agreementChecked} onChange={e=>{setAgreementChecked(e.target.checked);setAgeError("");}}/><span><b>我已阅读并同意用户协议与隐私说明</b><small>可随时在设置中再次查看</small></span></label><div className="consent-links"><button onClick={()=>notify("用户协议：个人计划与共同内容均须主动确认")}>用户协议</button><button onClick={()=>go("privacy")}>隐私与 AI 说明</button></div></section><button className="primary-button" onClick={()=>{if(!ageChecked||!agreementChecked){setAgeError("请确认年龄，并同意用户协议与隐私说明。");window.requestAnimationFrame(()=>ageErrorRef.current?.focus());return;}go("profileSetup");}}>继续填写资料 <Arrow/></button>{ageError&&<p ref={ageErrorRef} className="field-error" role="alert" tabIndex={-1}>{ageError}</p>}</div>}

            {screen === "profileSetup" && <div className="page formal-page onboarding-page"><header><Back onClick={()=>back("age")}/><span>{onboardingIntent==="invite"?"我的资料与邀请备注":"确认我的资料"}</span><i aria-hidden="true"/></header><section className="page-intro compact"><p className="kicker">先从自己开始</p><h2>{onboardingIntent==="solo"?<>先体验，再决定<br/>何时邀请 TA。</>:<>你的资料由你确认，<br/>TA 的资料交给 TA。</>}</h2><p className="confirm-copy">{onboardingIntent==="solo"?"以后可随时邀请伴侣；已有灵感和个人计划不会自动向 TA 公开。":"双方使用各自账号确认资料；关系建立后，也不能代替对方修改个人资料。"}</p></section><section className="create-form"><p className="form-section-label">我的资料</p><label>我的昵称 <em>必填</em><input name="my-name" autoComplete="name" spellCheck={false} maxLength={30} value={profile.name} onChange={e=>{setProfile({...profile,name:e.target.value});setProfileError("");}}/></label><label>我的生日 <small>选填，仅由我管理</small><input name="my-birthday" autoComplete="bday" inputMode="numeric" maxLength={20} value={profile.birthday} onChange={e=>setProfile({...profile,birthday:e.target.value})}/></label><label>当前城市 <small>可随时临时切换</small><input name="city" autoComplete="address-level2" maxLength={40} value={profile.city} onChange={e=>setProfile({...profile,city:e.target.value})}/></label>{onboardingIntent==="invite"&&<><p className="form-section-label partner-label">邀请备注</p><label>怎么称呼 TA <em>必填</em><input name="partner-invite-note" autoComplete="off" spellCheck={false} maxLength={30} value={partnerProfile.name} onChange={e=>{setPartnerProfile({...partnerProfile,name:e.target.value,birthday:""});setProfileError("");}}/></label><p className="partner-note">这只是邀请备注。TA 加入后，将显示 TA 自己确认的昵称。</p></>}</section>{profileError&&<p ref={profileErrorRef} className="field-error" role="alert" tabIndex={-1}>{profileError}</p>}<button className="primary-button" disabled={accountBusy} onClick={()=>void saveProfileAndContinue()}>{accountBusy?"正在保存…":onboardingIntent==="solo"?"保存并开始体验":onboardingIntent==="invite"?"保存并生成真实邀请":"保存并输入邀请码"} <Arrow/></button></div>}

            {screen === "connect" && (
              <div className="page connect-page">
                <header><Back onClick={() => back("welcome")}/><span>建立关系</span><i aria-hidden="true"/></header>
                <div className="progress-line"><span/></div>
                <section className="connect-copy"><p className="kicker">真实关系绑定</p><h2>{onboardingIntent==="invite"?"邀请 TA 加入":"输入 TA 的邀请码"}<br/>你们的共同空间</h2><p>双方必须使用各自账号确认；邀请码 7 天有效，且只能成功使用一次。</p></section>
                {onboardingIntent==="invite"&&<div className="invite-card"><span className="mini-label">我的邀请码</span><strong translate="no">{inviteCodeValue||"尚未生成"}</strong><button className="invite-copy-button" disabled={!inviteCodeValue} onClick={async () => {try {await navigator.clipboard.writeText(inviteCodeValue);notify("邀请码已复制");} catch {notify("复制失败，请长按邀请码手动复制");}}}>复制邀请码</button></div>}
                {onboardingIntent==="invite"&&<p className="waiting-partner" role="status">{inviteCodeValue?"正在等待 TA 用自己的账号接受邀请…":"生成邀请码后，TA 可以在自己的账号中接受邀请。"}</p>}
                <div className="divider"><span>{onboardingIntent==="invite"?"或者接受 TA 的邀请":"关系邀请码"}</span></div>
                <label className="join-code-field">输入邀请码<input value={joinCode} onChange={e=>{setJoinCode(e.target.value.toUpperCase());setRelationshipError("");}} maxLength={12} autoComplete="one-time-code" placeholder="例如：8F3K2M7Q"/></label>
                {relationshipError&&<p className="field-error" role="alert">{relationshipError}</p>}
                <button className="primary-button connect-action" disabled={accountBusy||!joinCode.trim()} onClick={()=>void joinRelationship()}>{accountBusy?"正在确认…":"接受邀请并建立关系"} <Arrow/></button>
                {onboardingIntent==="invite"&&<button className="ghost-button" disabled={accountBusy} onClick={()=>void createRelationshipInvite()}>{inviteCodeValue?"重新生成邀请码":"生成邀请码"}</button>}
              </div>
            )}

            {screen === "relationshipReady" && <div className="page formal-page onboarding-page relationship-ready"><header><Back onClick={()=>back("connect")}/><span>关系已建立</span><i aria-hidden="true"/></header><div className="success-symbol">♡</div><section className="page-intro"><p className="kicker">双方已分别确认</p><h2>{profile.name} 与{partnerProfile.name}，<br/>从今天开始记录。</h2><p className="confirm-copy">TA 已自行确认昵称；双方内容会标记来源，任何一方都可以独立退出并撤回自己的敏感内容。</p></section><button className="primary-button" onClick={()=>{setRelationshipExited(false);go(needsHistoryReview?"contentReview":"home",true);}}>{needsHistoryReview?"确认历史内容":"进入「我们」"} <Arrow/></button><button className="ghost-button" onClick={()=>notify("通知权限可稍后在设置中开启")}>暂不开启通知</button></div>}

            {screen === "contentReview" && <div className="page formal-page onboarding-page content-review-page"><header><Back onClick={()=>back("relationshipReady")}/><span>历史内容处理</span><i aria-hidden="true"/></header><section className="page-intro compact"><p className="kicker">由你决定分享范围</p><h2>单人阶段的计划，<br/>不会自动交给 TA。</h2><p className="confirm-copy">这项选择只影响你过去保存的个人计划；不会改变 TA 的内容，也不会自动分享个人回忆。</p></section><fieldset className="history-sharing-options"><legend>选择处理方式</legend>{([['from_now','仅从现在开始','过去计划继续仅自己可见；以后可逐项发送。'],['selected','选择部分计划','仅把你勾选的计划发给 TA 确认。'],['keep_private','暂不共享任何历史内容','保留全部历史计划为个人内容，之后仍可手动发送。']] as const).map(([value,title,note])=><label key={value} className={historySharingMode===value?"selected":""} aria-label={title}><input type="radio" name="history-sharing" value={value} checked={historySharingMode===value} onChange={()=>{setHistorySharingMode(value);setHistorySharingError("");}}/><span><b>{title}</b><small>{note}</small></span></label>)}</fieldset>{historySharingMode==="selected"&&<fieldset className="history-plan-list"><legend>选择要发送的计划</legend>{personalSchedules.map(schedule=><label key={schedule.id} aria-label={"分享计划：" + schedule.title}><input type="checkbox" checked={historySharingSelection.includes(schedule.id)} onChange={event=>{setHistorySharingSelection(current=>event.target.checked?[...current,schedule.id]:current.filter(id=>id!==schedule.id));setHistorySharingError("");}}/><span><b>{schedule.title}</b><small>{schedule.event_date} · {schedule.event_time} · {schedule.city}</small></span></label>)}</fieldset>}{historySharingError&&<p className="field-error" role="alert">{historySharingError}</p>}<button className="primary-button" disabled={accountBusy} onClick={()=>void saveHistorySharingChoice()}>{accountBusy?"正在保存…":historySharingMode==="selected"?"发送所选计划":"确认并继续"} <Arrow/></button><p className="policy-note">完成后仍可在每个“我的计划”详情中单独发送给 TA。</p></div>}

            {screen === "home" && (
              <div className="page tab-page">
                <div className="home-hero">
                  <div className="home-top"><button className="couple-avatars avatar-button" onClick={() => go("profile")} aria-label={hasRelationship?"查看我们的资料":"查看我的资料"}><div className="avatar a">{profile.name.slice(0,1)}</div>{hasRelationship&&<div className="avatar b">{partnerProfile.name.slice(0,1)}</div>}</button><button className="round-button" onClick={() => go("settings")} aria-label="打开设置">•••</button></div>
                  <p className="kicker">{hasRelationship?"我们在一起":"我的生活空间"}</p><h2>{hasRelationship?"第 1 天":"从今天开始"}</h2><p className="date-line">{hasRelationship?"从真实发生的今天开始":"先体验，准备好后再邀请 TA"}</p><div className="relation-stats"><span><b>{completed ? 1 : 0}</b><small>{hasRelationship?"共同体验":"完成计划"}</small></span><span><b>{hasRelationship&&taskDone ? 1 : 0}</b><small>{hasRelationship?"共同任务":"灵感清单"}</small></span><button onClick={() => go("important")}><b>{importantDays.length}</b><small>重要日子</small></button></div>
                </div>
                <section className="status-note"><div><p className="kicker">{hasRelationship?"我们的近况":"我的近况"}</p><p>{adopted ? (scheduleIsShared?"已经有一件共同安排，等待你们一起经历。":"已经保存一项个人计划，随时可以继续完善。") : (hasRelationship?"这里暂时没有统计。完成第一件共同体验后，近况会自然出现。":"先找一份灵感，保存为只对自己可见的计划。")}</p></div><button onClick={() => notify(hasRelationship?"近况只根据双方确认的安排、任务与回忆生成":"单人阶段的内容默认不会向未来的伴侣公开")}>查看依据</button></section>
                {needsHistoryReview&&<section className="history-review-card"><div><p className="kicker">历史内容仍保持私密</p><h3>确认过去的个人计划如何处理</h3><p>系统不会自动分享。你可以继续保密，或只发送选中的计划。</p></div><button className="secondary-button" onClick={()=>go("contentReview")}>现在确认 <Arrow/></button></section>}
                {legacyPlan&&!adopted&&account?.authenticated&&<section className="legacy-plan-card" aria-labelledby="legacy-plan-title"><div><p className="kicker">发现旧版本计划</p><h3 id="legacy-plan-title">{legacyPlan.title}</h3><p>{legacyPlan.date} · {legacyPlan.time} · {legacyPlan.city}</p><small>旧计划不会自动恢复。确认后才会导入你的账户，且默认仅自己可见。</small></div><div><button className="secondary-button" disabled={scheduleBusy} onClick={()=>void savePersonalPlan("legacy_import",legacyPlan)}>{scheduleBusy?"正在导入…":"导入旧计划"}</button><button className="ghost-button" disabled={scheduleBusy} onClick={()=>{window.localStorage.setItem("love-diary-legacy-plan-dismissed","1");setLegacyPlan(null);}}>暂不导入</button></div></section>}
                <section className="content-section"><div className="section-heading"><div><p className="kicker">下一件小事</p><h3>{adopted ? (scheduleDraft.title || currentPlan.title) : "今晚，想一起做点什么？"}</h3></div><span aria-hidden="true">→</span></div>
                  {adopted ? <button className="event-card" onClick={() => go("schedule")}><span className="date-block"><b>{String(eventDate.getDate()).padStart(2,"0")}</b><small>{eventWeekday}</small></span><span><b>{scheduleDraft.time} · {scheduleDraft.city || profile.city}</b><small>{scheduleIsShared ? (partnerAccepted ? "双方已接受" : isScheduleCreator ? "等待 TA 接受" : "待你确认") : "我的计划 · 仅自己可见"}</small></span><i aria-hidden="true">›</i></button> : <button className="inspiration-card" onClick={() => go("inspire")}><div className="spark" aria-hidden="true">✦</div><div><b>获取一份约会灵感</b><small>告诉我们此刻的心情，剩下的交给灵感</small></div><i aria-hidden="true">›</i></button>}
                </section>
                {!hasRelationship&&<section className="solo-invite-card"><div><p className="kicker">想一起使用时</p><h3>邀请 TA 建立共同空间</h3><p>个人计划不会自动共享，由你决定发出哪些内容。</p></div><button className="secondary-button" onClick={()=>{setOnboardingIntent("invite");go("connect");}}>邀请 TA <Arrow/></button></section>}
                <section className="content-section memory-peek"><div className="section-heading"><div><p className="kicker">{hasRelationship?"最近的回忆":"我的记录"}</p><h3>{completed ? (hasRelationship?"晚风里，我们聊了很久":"晚风里的这次经历") : "经历发生后，会自然留在这里"}</h3></div><button onClick={() => go("memories")}>查看全部</button></div>{completed ? <button className="photo-card" onClick={() => go("memory")}><div className="photo-art"><span>{new Intl.DateTimeFormat("zh-CN",{month:"2-digit",day:"2-digit"}).format(eventDate)}</span></div><p>河畔小酒馆 · {eventMonthDay}</p></button> : <button className="empty-content-card" onClick={()=>go("memoryCreate")}><span>♡</span><div><b>{hasRelationship?"还没有共同回忆":"还没有我的记录"}</b><small>{hasRelationship?"可以先一起经历，也可以手动留下一条真实记录":"完成个人计划后再记录；内容默认仅自己可见"}</small></div><i aria-hidden="true">›</i></button>}</section>
                <section className="content-section task-peek"><div className="section-heading"><div><p className="kicker">{hasRelationship?"共同任务":"以后可以一起做"}</p><h3>{hasRelationship?(activeTask?.title??"一起交换一首最近常听的歌"):"交换一首最近常听的歌"}</h3></div>{hasRelationship&&<button onClick={() => go("taskHistory")}>{taskDone ? "查看历史" : "查看任务"}</button>}</div><button className="task-card" onClick={() => go("task")}><span aria-hidden="true">♫</span><div><b>{hasRelationship?(taskAccepted?"任务进行中":activeTask?"等待双方确认":"给平常加一点新鲜"):"共同体验预览"}</b><small>{hasRelationship?(taskAccepted?"去规划一个适合分享音乐的晚上":"任务是邀请，不是待办压力"):"建立关系后，双方确认才会加入共同任务"}</small></div><i aria-hidden="true">›</i></button></section>
                <button className="demo-reset" onClick={resetJourney}>↺ 重置演示状态（保留已保存计划）</button>
                {bottomNav("home")}
              </div>
            )}

            {screen === "inspire" && (
              <div className="page tab-page form-page">
                <header><button className="location-button" onClick={() => setPanel("cityEdit")} aria-label={`切换城市，当前为${profile.city}`}>{profile.city}⌄</button><span className="header-title">找灵感</span><button className="text-button" onClick={() => {setMyStates(["想放松"]);setChoices({ mood:"想放松",taMood:"和我一样",vibe:"安静",time:"今晚",budget:"¥100–300",space:"都可以",special:"" });}}>重置条件</button></header>
                {taskContextActive && <div className="context-banner"><span>本次灵感目标</span><b>为「交换一首最近常听的歌」找灵感</b><button onClick={() => setTaskContextActive(false)} aria-label="移除共同任务灵感目标">×</button></div>}
                <div className="form-intro"><p className="kicker">{hasRelationship?"此刻的你们":"此刻的我"}</p><h2>{hasRelationship?<>今天想和 TA<br/>怎么度过？</>:<>今天想<br/>怎么度过？</>}</h2><p>不用想得太具体，选几个直觉答案就好。</p></div>
                <section className="nearby-settings" aria-labelledby="nearby-title"><div className="nearby-heading"><div><p className="kicker">从哪里出发</p><h3 id="nearby-title">优先推荐附近地点</h3></div><button type="button" onClick={useCurrentLocation} disabled={isLocating} aria-describedby="location-status">⌖ {isLocating ? "正在定位…" : "使用当前位置"}</button></div><p id="location-status" className="location-status" aria-live="polite">{locationPrefs.label}</p><label>商圈或区域（可选）<input name="business-district" autoComplete="address-level3" value={locationPrefs.district} onChange={event=>setLocationPrefs({...locationPrefs,district:event.target.value})} maxLength={40} placeholder="例如：西湖区、武林广场、国贸…"/></label><fieldset className="radius-choice"><legend>地点搜索范围</legend>{[[3000,"3 公里"],[5000,"5 公里"],[10000,"10 公里"]] .map(([radius,label])=><button type="button" key={radius} className={locationPrefs.radius===radius?"active":""} aria-pressed={locationPrefs.radius===radius} onClick={()=>setLocationPrefs({...locationPrefs,radius:Number(radius)})}>{label}</button>)}</fieldset><small>定位只用于本次附近搜索，不保存在共同资料中；也可以拒绝定位并手动填写商圈。</small></section>
                <MultiChoice title="我的状态（最多选2项）" options={["想放松", "有点累", "想热闹", "想尝鲜", "想认真聊聊", ...customStates]} values={myStates} setValues={(values)=>{setMyStates(values);setChoices({...choices,mood:values[0]??"想放松"});}}/>
                <div className="custom-state-editor"><label htmlFor="custom-state">没有合适的状态？</label><div><input id="custom-state" aria-label="自定义状态" name="custom-state" autoComplete="off" value={newState} onChange={e=>setNewState(e.target.value)} maxLength={10} placeholder="例如：刚加完班…"/><button onClick={()=>{const value=newState.trim();if(!value)return;if(!customStates.includes(value))setCustomStates([...customStates,value]);setNewState("");notify("已加入自定义状态，可立即选择");}}>＋ 添加</button></div>{customStates.length>0&&<p>自定义状态可重复使用；点击右侧删除： {customStates.map(state=><button key={state} onClick={()=>{setCustomStates(customStates.filter(x=>x!==state));setMyStates(myStates.filter(x=>x!==state));}}>{state} ×</button>)}</p>}</div>
                {hasRelationship&&<Choice title="TA 呢？" options={["和我一样", "想放松", "想热闹", "不知道"]} value={choices.taMood} setValue={(taMood) => setChoices({...choices,taMood})}/>}
                <Choice title="想要什么感觉？" options={["安静", "热闹", "都可以"]} value={choices.vibe} setValue={(vibe) => setChoices({...choices,vibe})}/>
                <Choice title="时间" options={["现在出发", "今晚", "周末", "暂不确定"]} value={choices.time} setValue={(time) => setChoices({...choices, time})}/>
                <Choice title="预算" options={["¥100以内", "¥100–300", "¥300+"]} value={choices.budget} setValue={(budget) => setChoices({...choices, budget})}/>
                <Choice title="活动空间" options={["都可以", "室内", "户外"]} value={choices.space} setValue={(space) => setChoices({...choices, space})}/>
                <label className="special-request">还有需要特别照顾的吗？<input name="special-requirements" autoComplete="off" maxLength={120} value={choices.special} onChange={e=>setChoices({...choices,special:e.target.value})} placeholder="例如：少走路、避免辛辣或需要无障碍设施…"/><small className="ai-privacy-note">选填。留空时不会出现在灵感方案中；请勿填写姓名、手机号、邮箱或其他私密内容。</small></label>
                <div className="sticky-cta"><button className="primary-button" onClick={() => generate(false)}>获取 3 个灵感 <span>✦</span></button></div>
                {bottomNav("inspire")}
              </div>
            )}

            {screen === "loading" && (
              <div className="page loading-page"><header><Back onClick={() => back("inspire")}/><span>正在寻找灵感</span><i aria-hidden="true"/></header>{loadingFailed ? <div className="error-state"><div className="state-symbol" aria-hidden="true">↻</div><p className="kicker">暂时走神了</p><h2>灵感没有生成成功</h2><p>{generationError || "网络有一点拥挤，你刚才选择的条件都还在，不需要重新填写。"}</p><button className="primary-button" onClick={() => generate(false)}>再试一次 <Arrow/></button><button className="ghost-button" onClick={() => go("inspire")}>返回修改条件</button></div> : <div className="ai-loading" role="status" aria-live="polite"><div className="loading-orbit" aria-hidden="true"><span>✦</span></div><p className="kicker">{hasRelationship?"读懂你们此刻的心情":"读懂你此刻的心情"}</p><h2>正在把今晚，<br/>想得刚刚好。</h2><div className="loading-steps"><span className="on">✓ 匹配{hasRelationship?"你们":"你的"}状态</span><span className="on">• 安排合适的节奏</span><span>• 整理 1 主 + 2 备选</span></div><p>通常只需要几秒钟</p></div>}</div>
            )}

            {screen === "results" && (
              <div className="page result-page">
                <header><Back onClick={() => back("inspire")}/><span>{hasRelationship?"为你们想到的":"为你想到的"}</span><button className="text-button" onClick={() => go("inspire")}>调整条件</button></header>
                <div className="result-intro"><p className="kicker">{profile.city} · {choices.time} · {choices.mood} · {choices.budget}</p><h2>{choices.space === "室内" ? <>留在室内，<br/>也能认真约会。</> : <>不赶时间，<br/>也不辜负今晚。</>}</h2></div>
                <div className="plan-stack"><button className={`plan-card primary main-plan ${selectedPlan === 0 ? "chosen" : ""}`} aria-pressed={selectedPlan === 0} onClick={() => setSelectedPlan(0)}><div className="plan-top"><span>主灵感 · {aiPlans ? "AI 实时生成" : "演示方案"}</span>{selectedPlan === 0 && <i>✓ 当前方案</i>}</div><h3>{dynamicPlans[0].title}</h3><p className="plan-meta">{choices.time} · {choices.budget} · {choices.space}</p><p>{dynamicPlans[0].desc}</p>{choices.special.trim()&&<span className="prep-note">特别照顾：{choices.special.trim()}</span>}</button><div className="alternative-title"><b>也可以试试</b><button onClick={() => {setSelectedPlan((selectedPlan+1)%3);notify("已将下一方案设为主方案");}}>换一个</button></div>{dynamicPlans.slice(1).map((plan, offset) => {const i=offset+1;return <button key={plan.title} className={`plan-card alternative ${selectedPlan === i ? "chosen" : ""}`} aria-pressed={selectedPlan === i} onClick={() => setSelectedPlan(i)}><div><h3>{plan.title}</h3><p className="plan-meta">{plan.meta}</p></div><i aria-hidden="true">›</i></button>})}</div>
                <div className="sticky-cta"><button className="primary-button" onClick={() => go("plan")}>查看详细计划 <Arrow /></button></div>
              </div>
            )}

            {screen === "plan" && (
              <div className="page detail-page">
                <div className="detail-hero"><header><Back onClick={() => back("results")}/><span>AI 详细计划</span><button className="icon-button" onClick={() => notify("为保护灵感条件，当前版本不会生成公开计划链接")} aria-label="分享计划说明">↗</button></header><p className="kicker">候选方案 · 尚未进入日历</p><h2>{currentPlan.title}</h2><p className="plan-summary">{currentPlan.desc}</p><div className="detail-meta"><span>{profile.city} · {choices.time}</span><span>{currentPlan.duration || "约 3.5 小时"}</span><span>{choices.budget}</span></div></div>
                <section className="timeline"><p className="kicker">今晚的节奏</p>{(currentPlan.timeline ?? [
                  { time: "18:30", title: "在地铁口见面", description: "不用赶，先买两杯喜欢的饮料" }, { time: "19:00", title: "沿江慢慢散步", description: "推荐路线 2.3 km · 约 45 分钟" }, { time: "20:00", title: "河畔小酒馆", description: "靠窗位 · 分享甜点与低度酒" }, { time: "21:40", title: "一起回家", description: "今晚留一个问题给彼此" }
                ]).map((node, i) => <div className="timeline-item" key={`${node.time}-${node.title}`}><span>{node.time}</span><i aria-hidden="true">{i + 1}</i><div>{i === 2 ? <a className="place-link" href="#location" onClick={(event) => {event.preventDefault();go("location");}}><b>{currentPlace?.name || node.title}</b><em>查看地点 ›</em></a> : <b>{node.title}</b>}<p>{node.description}</p>{i === 2 && <button className="replace-place" disabled={currentPlaceCandidates.length < 2} onClick={() => {const next=((selectedPlaceIndexes[selectedPlan]??0)+1)%currentPlaceCandidates.length;setSelectedPlaceIndexes(values=>values.map((value,planIndex)=>planIndex===selectedPlan?next:value));setPlaceVersion(next);notify(`已切换为${currentPlaceCandidates[next]?.name}`);}}>换一个地点</button>}</div></div>)}</section>
                <section className="execution-info"><p className="kicker">执行信息</p><div><span>地点</span><b>{currentPlace ? "高德地图已匹配" : "AI 建议 · 尚未核验"}</b></div><div><span>交通</span><b>打开高德地图后查看实时路线</b></div><div><span>天气</span><b>尚未接入实时天气</b></div><div><span>预算</span><b>{choices.budget}{hasRelationship?" / 两人":" · 参考"}</b></div></section>
                <section className="warm-note"><span>♡</span><p><b>一个小提示</b><br/>{hasRelationship?"把手机收起来十分钟，问问对方：最近有什么小事让你开心？":"给自己留十分钟，不赶时间地感受今天。"}</p></section>
                <div className="sticky-cta"><button className="primary-button" onClick={() => {setScheduleDraft(draft => ({...draft, title: currentPlan.title, city: profile.city}));go("confirm");}}>采用这个安排 <Arrow /></button><p>下一步确认日期与时间；确认前不会进入日历</p></div>
              </div>
            )}

            {screen === "location" && <div className="page formal-page location-page"><header><Back onClick={() => back("plan")}/><span>地点详情</span>{currentPlace ? <a className="icon-button" href={amapMapUrl} target="_blank" rel="noreferrer" aria-label="在高德地图中打开地点">↗</a> : <button className="icon-button" onClick={() => notify("本方案尚未匹配到真实地点")} aria-label="地点尚未匹配">↗</button>}</header><div className={`place-photo ${placeVersion ? "alternate" : ""}`}><span>{currentPlace ? "高德地图地点数据" : "AI 地点建议 · 未核验"}</span></div><section className="place-title"><p className="kicker">{currentPlace ? "真实地点已匹配 · 营业信息请出发前确认" : "尚未匹配到真实地点"}</p><h2>{currentPlace?.name || currentPlan.title}</h2><p>{currentPlace?.address || `请在${profile.city}重新生成或更换搜索条件`}</p></section><section className="info-group"><InfoRow label="计划时段" value="以最终安排为准"/><InfoRow label="地点类型" value={currentPlace?.type || "AI 建议"}/><InfoRow label="坐标" value={currentPlace?.location || "尚未获取"}/><InfoRow label="营业时间" value="高德地点搜索未提供，需另行确认"/><InfoRow label="地点来源" value={currentPlace ? "高德地图 Web 服务" : "AIHubMix 建议"}/></section><PlaceCandidates places={currentPlaceCandidates} selectedId={currentPlace?.id} onSelect={(index)=>{setSelectedPlaceIndexes(values=>values.map((value,planIndex)=>planIndex===selectedPlan?index:value));setPlaceVersion(index);}}/><section className="place-notice"><b>执行提示</b><p>{currentPlace ? "地点名称、地址和坐标来自高德地图；营业状态、排队情况与价格可能变化，请出发前确认。" : "AI 不会编造具体商家。重新生成后，系统会尝试用高德地图匹配真实地点。"}</p></section>{currentPlace ? <a className="primary-button map-link" href={amapMapUrl} target="_blank" rel="noreferrer">在高德地图中查看 <Arrow/></a> : <button className="primary-button" onClick={() => {go("inspire");notify("请调整关键词后重新生成");}}>返回调整条件 <Arrow/></button>}<button className="ghost-button" onClick={() => {setSelectedPlan((selectedPlan+1)%3);go("plan");}}>查看另一个方案</button></div>}

            {screen === "confirm" && <div className="page formal-page confirm-page"><header><Back onClick={() => back("plan")}/><span>{hasRelationship?"确认安排":"保存我的计划"}</span><i aria-hidden="true"/></header><section className="page-intro"><p className="kicker">最后确认一次</p><h2>{hasRelationship?<>发给 TA，<br/>一起决定。</>:<>先为自己，<br/>保存这个计划。</>}</h2><p className="confirm-copy">{hasRelationship?"你确认后将发出共同安排邀请；TA 接受前它会显示为“待确认”。":"计划默认仅自己可见；以后邀请 TA 时，也不会自动共享。"}</p></section><section className="confirm-card"><label>安排名称<input required name="schedule-title" autoComplete="off" value={scheduleDraft.title || currentPlan.title} onChange={e=>{setScheduleDraft({...scheduleDraft,title:e.target.value});setFormError("");}}/></label><label>日期<input required name="schedule-date" type="date" autoComplete="off" value={scheduleDraft.date} onChange={e=>{setScheduleDraft({...scheduleDraft,date:e.target.value});setFormError("");}}/></label><label>开始时间<input required name="schedule-time" type="time" autoComplete="off" value={scheduleDraft.time} onChange={e=>{setScheduleDraft({...scheduleDraft,time:e.target.value});setFormError("");}}/></label><label>所在城市<input required name="schedule-city" autoComplete="address-level2" value={scheduleDraft.city || profile.city} onChange={e=>{setScheduleDraft({...scheduleDraft,city:e.target.value});setFormError("");}}/></label></section>{formError&&<p className="field-error" role="alert">{formError}</p>}{taskContextActive && <section className="link-context"><span>♫</span><div><b>关联共同任务</b><p>交换一首最近常听的歌</p></div><em>安排确认后关联</em></section>}<button className="primary-button" disabled={scheduleBusy} onClick={()=>hasRelationship?void createSharedSchedule():void savePersonalPlan()}>{scheduleBusy?"正在保存…":hasRelationship?"发给 TA 确认":"保存到我的计划"} <Arrow/></button>{!hasRelationship&&<button className="ghost-button" onClick={()=>{setOnboardingIntent("invite");go("connect");}}>邀请 TA 一起决定</button>}<button className="ghost-button" onClick={() => back("plan")}>返回继续查看</button></div>}

            {screen === "schedule" && !scheduleLoaded && (
              <div className="page formal-page schedule-page">
                <header><Back onClick={() => back("calendar")}/><span>安排详情</span><i aria-hidden="true"/></header>
                <section className="empty-formal" role="status"><span>◌</span><h2>正在同步计划</h2><p>从你的账户读取最新内容，请稍候。</p></section>
              </div>
            )}

            {screen === "schedule" && scheduleLoaded && !sharedSchedule && (
              <div className="page formal-page schedule-page">
                <header><Back onClick={() => back("calendar")}/><span>安排详情</span><i aria-hidden="true"/></header>
                <section className="empty-formal"><span>◌</span><h2>没有可查看的计划</h2><p>这条计划可能已被删除，或尚未保存到你的账户。</p><button className="primary-button" onClick={() => go("calendar")}>返回日历 <Arrow/></button></section>
                {bottomNav("calendar")}
              </div>
            )}

            {screen === "schedule" && scheduleLoaded && sharedSchedule && (
              <div className="page schedule-page">
                <header><Back onClick={() => back("calendar")}/><span>安排详情</span><button className="text-button" onClick={() => setPanel("edit")}>编辑</button></header>
                <div className={`confirmation ${cancelled ? "is-cancelled" : ""} ${scheduleIsShared&&!partnerAccepted&&!cancelled?"is-pending":""}`}><span>{cancelled ? "×" : scheduleIsShared&&!partnerAccepted ? "◷" : "✓"}</span><p>{cancelled ? "安排已取消" : !scheduleIsShared ? "我的计划 · 仅自己可见" : !partnerAccepted ? "等待 TA 接受" : completed ? "双方已确认完成" : "双方已接受 · 正式安排"}</p></div>
                <div className="schedule-title"><p className="kicker">{eventDateLong}</p><h2>{scheduleDraft.title || currentPlan.title}</h2><p>{scheduleDraft.time} · {scheduleDraft.city || profile.city}</p></div>
                <section className="schedule-card"><div><span className="label">时间</span><b>{eventMonthDay} {scheduleDraft.time}</b></div><div><span className="label">集合</span><b>近江地铁站 B 口</b></div><div><span className="label">预算</span><b>约 {eventBudget}{scheduleIsShared?" / 两人":" · 参考"}</b></div><button onClick={() => go("plan")}>查看完整路线 <span>›</span></button></section>
                {taskLinked && <button className="linked-task" onClick={() => go("task")}><span>♫</span><div><small>关联情侣任务</small><b>交换一首最近常听的歌</b></div><i aria-hidden="true">›</i></button>}
                {!scheduleIsShared ? <div className="schedule-actions confirm-wait"><div className="wait-card"><span>○</span><div><b>这是我的计划</b><p>目前只对你可见；建立关系后仍由你决定是否分享。</p></div></div>{hasRelationship?<button className="primary-button" disabled={scheduleBusy} onClick={()=>void sharePersonalPlan()}>{scheduleBusy?"正在发送…":"发给 TA 一起决定"} <Arrow/></button>:<button className="primary-button" onClick={()=>{setOnboardingIntent("invite");go("connect");}}>邀请 TA 一起决定 <Arrow/></button>}<button className="ghost-button danger-text" onClick={() => setPanel("cancel")}>删除这个计划</button></div> : <><div className="people-row"><div className="avatar a">{profile.name.slice(0,1)}</div><div><b>{cancelled ? "这次安排已取消" : !partnerAccepted ? (isScheduleCreator ? "你已发出邀请" : "TA 已发出邀请") : myConfirmed ? "你已确认完成" : "双方已经接受"}</b><p>{!partnerAccepted ? (isScheduleCreator ? "等待 TA 接受、拒绝或提出修改" : "接受后会进入双方共同日历") : taConfirmed ? "TA 也已确认完成" : myConfirmed ? "正在等待 TA 确认完成" : "安排已进入双方共同日历"}</p></div><div className="avatar b">{partnerProfile.name.slice(0,1)}</div></div>{cancelled ? <div className="schedule-actions"><button className="primary-button" onClick={() => {setCancelled(false);setPartnerAccepted(false);notify("已重新发给 TA 确认");}}>重新发起安排 <Arrow /></button></div> : !partnerAccepted ? <div className="schedule-actions confirm-wait"><div className="wait-card"><span>◷</span><div><b>{isScheduleCreator?"等待 TA 接受":"TA 发来一项共同安排"}</b><p>接受后才会成为双方已确认的正式安排</p></div></div>{!isScheduleCreator&&<button className="primary-button" disabled={scheduleBusy} onClick={()=>void acceptSharedSchedule()}>{scheduleBusy?"正在同步…":"接受这个安排"} <Arrow/></button>}</div> : completed ? <div className="schedule-actions"><div className="recorded-note"><b>这次经历已记录 ♡</b><p>{taskLinked ? "关联任务仍需双方在任务页确认完成。" : "基础回忆已经生成，稍后完善也算完整。"}</p></div><button className="primary-button" onClick={() => go("memory")}>完善这次回忆 <Arrow /></button></div> : !canConfirmCompletion ? <div className="schedule-actions confirm-wait"><div className="wait-card"><span>◷</span><div><b>等待一起出发</b><p>活动日期到来后，双方才能确认完成并生成基础回忆</p></div></div><button className="ghost-button danger-text" onClick={() => setPanel("cancel")}>取消这个安排</button></div> : !myConfirmed ? <div className="schedule-actions"><button className="primary-button" onClick={() => setMyConfirmed(true)}>我完成了 <Arrow /></button><button className="ghost-button danger-text" onClick={() => setPanel("cancel")}>取消这个安排</button></div> : <div className="schedule-actions confirm-wait"><div className="wait-card"><span>◷</span><div><b>等待 TA 确认完成</b><p>双方确认后，才会生成不含虚构感受的基础回忆</p></div></div><button className="primary-button" onClick={() => {setTaConfirmed(true); setCompleted(true); notify("双方已确认，基础回忆已生成");}}>模拟 TA 确认完成 <Arrow /></button></div>}</>}
                {bottomNav("calendar")}
              </div>
            )}

            {screen === "calendar" && (
              <div className="page tab-page calendar-page">
                <header><div><p className="kicker">{hasRelationship?"我的与共同日历":"我的日历"}</p><h2>{calendarTitle}</h2></div><button className="round-button" onClick={() => setPanel("calendarAdd")} aria-label="添加日历内容">＋</button></header>
                <div className="month-switch"><button onClick={() => {setMonthOffset(v=>v-1);setSelectedDay(1);}} aria-label="上一个月">‹</button><button className="today-button" onClick={jumpToToday}>今日</button><button onClick={() => {setMonthOffset(v=>v+1);setSelectedDay(1);}} aria-label="下一个月">›</button></div>
                <div className="week-row">{["一","二","三","四","五","六","日"].map(x => <span key={x}>{x}</span>)}</div>
                <div className="month-grid">{Array.from({length: Math.ceil((leadingDays + daysInMonth) / 7) * 7}, (_, i) => { const d = i - leadingDays + 1; const valid=d>0&&d<=daysInMonth; const dateKey=`${calendarYear}-${String(calendarMonth+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`; const daySchedules=valid?schedules.filter(schedule=>schedule.event_date===dateKey):[]; const dayImportantDays=valid?importantDaysOnDate(dateKey):[]; const hasShared=daySchedules.some(schedule=>schedule.visibility==="shared"); const hasPersonal=daySchedules.some(schedule=>schedule.visibility==="personal"); const isToday=isCurrentMonth&&d===today.getDate(); const isAdjustedWork=adjustedWorkDays.includes(d); const states=[isToday?"今天":"",!isAdjustedWork&&restDays.includes(d)?"休息日":"",isAdjustedWork?"调休上班":"",hasShared?"有共同安排":"",hasPersonal?"有我的计划":"",isIdeaMonth&&d===16&&hasGenerated?"有 AI 灵感":"",dayImportantDays.length?"重要日子":""].filter(Boolean).join("，"); const scheduleClass=hasShared&&hasPersonal?"mixed-plan":hasShared?"official":hasPersonal?"personal-plan":""; return valid ? <button key={i} onClick={()=>setSelectedDay(d)} aria-label={`${calendarYear}年${calendarMonth+1}月${d}日${states?`，${states}`:""}`} aria-pressed={d===selectedDay} className={`${d === selectedDay ? "selected-day" : ""} ${isToday?"today":""} ${scheduleClass} ${isIdeaMonth&&d === 16 && hasGenerated ? "idea" : ""} ${dayImportantDays.length?"important-dot":""} ${!isAdjustedWork&&restDays.includes(d)?"rest-day":""} ${isAdjustedWork?"work-day":""}`}><span>{d}</span>{!isAdjustedWork&&restDays.includes(d)&&<small className="day-type rest">休</small>}{isAdjustedWork&&<small className="day-type work">班</small>}{dayImportantDays.length>0&&<small>重要</small>}</button> : <span key={i} aria-hidden="true"/>; })}</div>
                <div className="legend"><span><i className="personal-dot"/>我的计划</span><span><i className="solid-dot"/>共同安排</span><span><i className="ring-dot"/>AI 灵感</span><span><i className="rest-swatch"/>休息日</span><span><i className="work-swatch"/>调休上班</span></div>
                <section className="day-agenda"><p className="kicker">{calendarMonth+1}月{selectedDay}日</p>{(()=>{const dateKey=`${calendarYear}-${String(calendarMonth+1).padStart(2,"0")}-${String(selectedDay).padStart(2,"0")}`;const daySchedules=schedules.filter(schedule=>schedule.event_date===dateKey);const dayImportantDays=importantDaysOnDate(dateKey);if(daySchedules.length||dayImportantDays.length)return <div className="agenda-list">{daySchedules.map(schedule=><button key={schedule.id} className={`agenda-item ${schedule.visibility==="personal"?"personal-agenda":""}`} onClick={()=>openSchedule(schedule)}><i aria-hidden="true"/><span><b>{schedule.event_time}</b><small>{schedule.visibility==="shared"?"共同安排":"我的计划"}</small></span><div><b>{schedule.title}</b><small>{schedule.visibility==="shared"?(schedule.status==="confirmed"?"双方已接受":"等待确认"):"仅自己可见"} · {schedule.city}</small></div><em aria-hidden="true">›</em></button>)}{dayImportantDays.map(day=><button key={day.id} className="agenda-item important-agenda" onClick={() => go("important")}><i aria-hidden="true"/><span><b>全天</b></span><div><b>{day.title}</b><small>{day.visibility==="personal"?"我的重要日子":day.status==="confirmed"?"共同重要日子":"等待 TA 确认"} · {day.repeat_rule==="yearly"?"每年重复":"不重复"}</small></div><em aria-hidden="true">›</em></button>)}</div>;if(isIdeaMonth&&selectedDay===16&&hasGenerated)return <div className="idea-day"><span aria-hidden="true">✦</span><div><b>AI 轻量建议</b><p>周日下午适合去城市周边走走，尚未成为正式安排。</p></div><button onClick={()=>go("inspire")}>继续规划</button></div>;return <div className="empty-day"><span aria-hidden="true">☼</span><p>这一天还没有{hasRelationship?"共同安排、个人计划或重要日子":"个人计划或重要日子"}</p><button onClick={() => go("inspire")}>找点灵感</button></div>;})()}</section>
                {bottomNav("calendar")}
              </div>
            )}

            {screen === "memory" && (
              <div className="page memory-page">
                <div className={`memory-cover ${memoryPhoto&&!memoryContentRetracted ? "with-photo" : ""}`}><header><Back onClick={() => back("memories")}/><span>回忆详情</span><button className="icon-button" onClick={() => notify(hasRelationship?"分享卡仅包含仍获授权的共同事实":"个人记录暂不生成公开分享链接")} aria-label="分享回忆">↗</button></header><div className="moon">☽</div><div className="city-lights">•• · • ·• ••</div><div className="cover-copy"><p>{eventDateLong} · {profile.city}</p><h2>{hasRelationship?<>晚风里，<br/>我们聊了很久。</>:<>{memoryDraft.title}</>}</h2></div></div>
                <section className="ownership-strip" aria-label="内容来源"><span>{hasRelationship?"共同事实":"我的记录"}</span><span>{hasRelationship?"AI 摘要":"由我填写"}</span>{memoryPhoto&&!memoryContentRetracted&&<span>照片 · 我上传</span>}</section>
                <section className="memory-story"><p>{hasRelationship?<><i className="ai-label">AI 建议摘要</i> 这是一条由双方确认的正式安排形成的基础回忆。{eventMonthDay} 18:30，你们在近江地铁站见面，随后沿江散步，并在 20:00 到达晚餐地点。</>:<>{memoryDraft.copy||"这是一条由你主动创建的个人记录。"}</>}</p>{memoryNote&&!memoryContentRetracted&&<blockquote>“{memoryNote}”<small>— {profile.name}主动补充 · 可随时修改</small></blockquote>}{memoryContentRetracted&&<div className="withdrawn-content"><span>—</span><p><b>你已撤回个人内容</b><small>{hasRelationship?"共同事实仍保留；对方看到的照片和文字已同步移除。":"这部分个人内容已从当前记录移除。"}</small></p></div>}<button className="memory-edit-link" onClick={() => setPanel("memoryEdit")}>＋ 补充照片或一句话</button>{hasRelationship&&<button className="memory-retract-link" onClick={() => setPanel("retractMemory")}>管理来源与撤回</button>}<div className="memory-stats"><span><b>3.2 km</b><small>{hasRelationship?"共同事实":"行程参考"}</small></span><span><b>3.5 h</b><small>{hasRelationship?"共同事实":"行程参考"}</small></span><span><b>✓</b><small>{hasRelationship?"双方已确认":"由我记录"}</small></span></div></section>
                <details className="day-route"><summary>当天行程 <span>展开查看</span></summary><div><b>18:30</b><p>近江地铁站见面</p></div><div><b>19:00</b><p>沿江散步</p></div><div><b>20:00</b><p>{placeVersion?"桂雨小馆":"河畔小酒馆"}</p></div></details>
                <section className="memory-footer"><div className="couple-avatars"><div className="avatar a">{profile.name.slice(0,1)}</div>{hasRelationship&&<div className="avatar b">{partnerProfile.name.slice(0,1)}</div>}</div><p>已收进「{hasRelationship?"我们的回忆":"我的记录"}」{memoryPhoto&&!memoryContentRetracted ? " · 1 张由你上传的照片" : ""}</p><button className="primary-button" onClick={() => setPanel("memoryEdit")}>编辑我的内容 <Arrow /></button><button className="ghost-button danger-text" onClick={() => setPanel("deleteMemory")}>{hasRelationship?"删除我的回忆副本":"删除这条记录"}</button></section>
              </div>
            )}

            {screen === "memories" && <div className="page formal-page memories-page"><header><Back onClick={() => back("home")}/><span>{hasRelationship?"我们的回忆":"我的记录"}</span><button className="round-button" onClick={() => go("memoryCreate")} aria-label="添加回忆">＋</button></header><section className="page-intro"><p className="kicker">先生活，再记录</p><h2>{hasRelationship?<>一起经历过的，<br/>自然留在这里。</>:<>真实经历过的，<br/>自然留在这里。</>}</h2></section>{completed&&!memoryDeleted&&<><p className="month-title">{new Intl.DateTimeFormat("zh-CN",{year:"numeric",month:"long"}).format(eventDate)}</p><button className="memory-list-card" onClick={() => go("memory")}><div className="memory-thumb river"/><div><b>{eventMonthDay}{hasRelationship?"的共同经历":"的经历"}</b><small>{eventMonthDay} · {profile.city}</small><p>{hasRelationship?"根据双方确认的时间、地点与行程生成，未替你们描述感受。":"根据个人计划记录，不自动推断你的感受。"}</p></div><i aria-hidden="true">›</i></button></>}{memoryCreated&&<><p className="month-title">手动记录</p><button className="memory-list-card text-only" onClick={() => go("memory")}><div><b>{memoryDraft.title}</b><small>{manualMemoryMonthDay} · {profile.city}</small><p>这是一条由你主动创建的{hasRelationship?"独立回忆":"个人记录"}。</p></div><i aria-hidden="true">›</i></button></>}{!completed&&!memoryCreated&&<section className="empty-formal memory-empty"><span>♡</span><h2>{hasRelationship?"还没有共同回忆":"还没有个人记录"}</h2><p>{hasRelationship?"完成一次双方确认的安排，或手动记录一件真实发生的事。":"可以手动记录一件真实发生的事，默认仅自己可见。"}</p><button className="primary-button" onClick={()=>go("memoryCreate")}>添加一条真实记录 <Arrow/></button></section>}</div>}

            {screen === "memoryCreate" && <div className="page formal-page create-memory-page"><header><Back onClick={() => back("memories")}/><span>{hasRelationship?"添加回忆":"添加个人记录"}</span><i aria-hidden="true"/></header><section className="page-intro compact"><p className="kicker">一条简单记录也已经完整</p><h2>把这件{hasRelationship?"一起":"真实"}经历的事，<br/>留在这里。</h2></section><section className="create-form"><label>{hasRelationship?"回忆":"记录"}名称 <em>必填</em><input required name="memory-title" autoComplete="off" value={memoryDraft.title} onChange={e=>{setMemoryDraft({...memoryDraft,title:e.target.value});setFormError("");}}/></label><label>日期 <em>必填</em><input required name="memory-date" type="date" autoComplete="off" value={memoryDraft.date} onChange={e=>{setMemoryDraft({...memoryDraft,date:e.target.value});setFormError("");}}/></label><label>地点 <small>选填，{hasRelationship?"属于共同事实":"仅保存在个人记录中"}</small><input name="memory-place" autoComplete="off" value={memoryDraft.place} onChange={e=>setMemoryDraft({...memoryDraft,place:e.target.value})}/></label><button type="button" className="photo-upload" onClick={() => notify(hasRelationship?"照片将标记为由你上传；可随时撤回对方访问权限":"照片将作为个人内容保存")}><span>＋</span>添加我的照片（最多9张）</button><label>写点什么 <small>选填，由我管理</small><textarea name="memory-copy" autoComplete="off" value={memoryDraft.copy} onChange={e=>setMemoryDraft({...memoryDraft,copy:e.target.value})}/></label></section>{formError&&<p className="field-error" role="alert">{formError}</p>}<p className="ownership-note">{hasRelationship?"照片和文字由你控制；共同日期与地点由双方各自保留。离线副本无法由平台远程删除。":"这条记录默认仅自己可见；建立关系后也不会自动共享。"}</p><button className="primary-button" onClick={() => {if(!memoryDraft.title.trim()||!memoryDraft.date){setFormError("请填写名称和日期。");return;}setMemoryCreated(true);notify(hasRelationship?"回忆已保存，并记录了内容来源":"个人记录已保存");go("memories");}}>保存这条{hasRelationship?"回忆":"记录"} <Arrow/></button></div>}

            {screen === "profile" && <div className="page formal-page"><header><Back onClick={() => back("home")}/><span>{hasRelationship?"我们的资料":"我的资料"}</span><button className="text-button" onClick={() => setPanel("profileEdit")}>编辑</button></header><section className="profile-hero"><div className="connect-visual"><div className="avatar a">{profile.name.slice(0,1)}</div>{hasRelationship&&<><span>♡</span><div className="avatar b">{partnerProfile.name.slice(0,1)}</div></>}</div><h2>{hasRelationship?`${profile.name} & ${partnerProfile.name}`:profile.name}</h2><p>{hasRelationship?"共同空间已连接 · 双方分别管理个人资料":"单人体验中 · 个人内容默认仅自己可见"}</p></section>{hasRelationship&&<section className="info-group"><p className="group-label">关系资料</p><InfoRow label="在一起纪念日" value={relationshipImportantDay?new Intl.DateTimeFormat("zh-CN",{year:"numeric",month:"long",day:"numeric"}).format(nextImportantDate(relationshipImportantDay.event_date,relationshipImportantDay.repeat_rule)):"尚未由双方确认"}/><InfoRow label="当前城市" value={profile.city}/><InfoRow label="关系状态" value="已连接"/></section>}<section className="info-group"><p className="group-label">我的资料</p><InfoRow label="昵称" value={profile.name}/><InfoRow label="生日" value={profile.birthday||"未填写"}/><InfoRow label="当前城市" value={profile.city}/></section>{hasRelationship?<section className="info-group"><p className="group-label">TA 已确认的资料</p><InfoRow label="昵称" value={partnerProfile.name}/><InfoRow label="生日" value={partnerProfile.birthday||"由 TA 决定是否共享"}/><p className="partner-note">TA 的资料只能由 TA 修改；你可以请求更正，但不能代为覆盖。</p></section>:<section className="solo-profile-cta"><p className="kicker">以后也可以一起使用</p><h2>邀请 TA 建立共同空间</h2><p>你的历史计划与回忆不会自动共享。</p><button className="primary-button" onClick={()=>{setOnboardingIntent("invite");go("connect");}}>邀请 TA <Arrow/></button></section>}{hasRelationship&&<button className="secondary-button safety-entry" onClick={() => go("relationshipSafety")}>管理关系与数据安全 <Arrow/></button>}</div>}

            {screen === "important" && <div className="page formal-page"><header><Back onClick={() => back("home")}/><span>{hasRelationship?"我们的重要日子":"我的重要日子"}</span><button className="round-button" onClick={() => go("importantCreate")} aria-label="添加重要日子">＋</button></header>{importantAdded&&primaryImportantDay ? <><section className="important-hero"><p className="kicker">下一个重要日子</p><h2>{primaryImportantDay.title}</h2><strong>{primaryImportantDay.visibility==="shared"?(primaryImportantDay.status==="confirmed"?"双方已确认":"等待双方确认"):"仅自己可见"}</strong><p>{importantDateLong} · {primaryImportantDay.repeat_rule==="yearly"?"每年重复":"不重复"}</p>{primaryImportantDay.visibility==="shared"&&primaryImportantDay.status==="pending_partner"&&!isPrimaryImportantCreator&&<button className="primary-button" disabled={importantBusy} onClick={()=>void acceptImportantDay(primaryImportantDay.id)}>{importantBusy?"正在确认…":"确认这个重要日子"} <Arrow/></button>}{primaryImportantDay.status!=="pending_partner"&&<button className="primary-button" onClick={() => {setChoices({...choices,time:"暂不确定"});go("inspire");}}>为这一天找灵感 <Arrow/></button>}</section><section className="info-group"><p className="group-label">全部重要日子</p>{profile.birthday&&<InfoRow label={`${profile.name}的生日`} value={`${profile.birthday} · 仅本人管理`}/>} {importantDays.map(day=><InfoRow key={day.id} label={day.title} value={`${new Intl.DateTimeFormat("zh-CN",{month:"long",day:"numeric"}).format(localDate(day.event_date))} · ${day.visibility==="personal"?"我的":day.status==="confirmed"?"共同":"待确认"}`}/>)}</section></> : <section className="empty-formal"><span>♡</span><h2>还没有重要日子</h2><p>{hasRelationship?"生日、纪念日或只属于你们的一天，确认后会进入共同日历。":"生日、纪念日或只属于自己的一天，都可以先保存在这里。"}</p><button className="primary-button" onClick={()=>go("importantCreate")}>添加第一个重要日子 <Arrow/></button></section>}</div>}

            {screen === "importantCreate" && <div className="page formal-page"><header><Back onClick={()=>back("important")}/><span>添加重要日子</span><i aria-hidden="true"/></header><section className="page-intro compact"><p className="kicker">由你确认的事实</p><h2>记住一个，<br/>{hasRelationship?"对你们":"对自己"}重要的日子。</h2><p className="confirm-copy">{hasRelationship?"保存后先发给 TA 确认；确认前不会作为双方共同事实。":"当前会保存为个人内容，以后不会自动分享给 TA。"}</p></section><section className="create-form"><label>名称 <em>必填</em><input required name="important-title" autoComplete="off" value={importantDraft.title} onChange={e=>{setImportantDraft({...importantDraft,title:e.target.value});setFormError("");}}/></label><label>日期 <em>必填</em><input required name="important-date" type="date" autoComplete="off" value={importantDraft.date} onChange={e=>{setImportantDraft({...importantDraft,date:e.target.value});setFormError("");}}/></label><label>重复方式<select name="important-repeat" value={importantDraft.repeatRule} onChange={e=>setImportantDraft({...importantDraft,repeatRule:e.target.value as "yearly"|"none"})}><option value="yearly">每年重复</option><option value="none">不重复</option></select></label><label>提前提醒<select name="important-reminder" value={importantDraft.reminderDays} onChange={e=>setImportantDraft({...importantDraft,reminderDays:Number(e.target.value)})}><option value="7">提前 7 天</option><option value="1">提前 1 天</option><option value="0">当天提醒</option></select></label></section>{formError&&<p className="field-error" role="alert">{formError}</p>}<button className="primary-button" disabled={importantBusy} onClick={()=>void createImportantDay()}>{importantBusy?"正在保存…":hasRelationship?"发给 TA 确认":"保存到我的重要日子"} <Arrow/></button></div>}

            {screen === "taskHistory" && <div className="page formal-page"><header><Back onClick={() => back("home")}/><span>共同任务</span><i aria-hidden="true"/></header><section className="page-intro"><p className="kicker">当前任务</p><h2>偶尔想到一件，<br/>值得一起做的小事。</h2></section>{activeTask?<button className="task-history-current" onClick={() => go("task")}><span>♫</span><div><b>{activeTask.title}</b><small>{activeTask.status==="pending_partner"?"等待接受":activeTask.status==="completion_pending"?"等待完成确认":"进行中"}</small></div><i aria-hidden="true">›</i></button>:<div className="empty-inline"><span>○</span><p>当前没有进行中的共同任务</p></div>}<p className="month-title">历史任务</p>{tasks.filter(task=>["completed","cancelled"].includes(task.status)).length?tasks.filter(task=>["completed","cancelled"].includes(task.status)).map(task=><div className="history-row" key={task.id}><span>{task.status==="completed"?"✓":"↻"}</span><div><b>{task.title}</b><small>{task.status==="completed"?"双方已确认完成":"已结束"}</small></div></div>):<div className="empty-inline"><span>○</span><p>还没有已完成或已结束的任务</p></div>}</div>}

            {screen === "settings" && <div className="page tab-page formal-page settings-page"><header><div><p className="kicker">恋爱日记</p><h2>设置</h2></div><i aria-hidden="true"/></header><button type="button" className="settings-profile" onClick={() => go("profile")}><div className="avatar a">{profile.name.slice(0,1)}</div><div><b>{profile.name}</b><small>{hasRelationship?`与${partnerProfile.name}已连接`:"单人体验中 · 内容仅自己可见"}</small></div><i aria-hidden="true">›</i></button><section className="settings-group"><SettingRow icon="♢" label={hasRelationship?"我们的资料":"我的资料"} onClick={() => go("profile")}/><SettingRow icon="◌" label={hasRelationship?"我们的重要日子":"我的重要日子"} onClick={() => go("important")}/>{!hasRelationship&&<SettingRow icon="♡" label="邀请 TA 一起使用" value="随时可以" onClick={() => {setOnboardingIntent("invite");go("connect");}}/>}</section><section className="settings-group">{hasRelationship&&<SettingRow icon="♡" label="关系与数据安全" value="可随时退出" onClick={() => go("relationshipSafety")}/>}<SettingRow icon="♢" label="通知与提醒" onClick={() => go("notifications")}/><SettingRow icon="◉" label="隐私与 AI 数据说明" onClick={() => go("privacy")}/><SettingRow icon="▢" label="照片与存储" onClick={() => notify("每项内容都会记录上传者、授权范围与撤回状态")}/></section><section className="settings-group"><SettingRow icon="?" label="帮助与反馈" onClick={() => notify("帮助中心将在产品开发阶段接入")}/><SettingRow icon="○" label="关于恋爱日记" value="V1.16"/></section>{bottomNav("settings")}</div>}

            {screen === "notifications" && <div className="page formal-page"><header><Back onClick={() => back("settings")}/><span>通知与提醒</span><i aria-hidden="true"/></header><section className="page-intro compact"><p className="kicker">只提醒重要的事</p><h2>不让{hasRelationship?"共同":"日常"}生活，<br/>变成通知压力。</h2></section><section className="settings-group">{hasRelationship&&<ToggleRow label="共同安排提醒" note="开始前与变更时提醒"/>}<ToggleRow label="重要日子提醒" note={hasRelationship?"按双方设置的提前时间提醒":"按你设置的提前时间提醒"}/>{hasRelationship&&<ToggleRow label="TA 的状态变化" note="接受安排、完成确认"/>}</section><p className="policy-note">不会发送连续签到、任务催促或关系评分通知。</p></div>}

            {screen === "privacy" && <div className="page formal-page"><header><Back onClick={() => back("settings")}/><span>隐私与 AI</span><i aria-hidden="true"/></header><section className="page-intro compact"><p className="kicker">你的生活，由你决定</p><h2>AI 提供建议，<br/>不会替你确认事实。</h2></section><section className="principle-card"><span>01</span><div><b>建议不是正式安排</b><p>只有你主动采用并确认后，内容才会进入个人或共同日历；备用方案与 AI 方案会清楚标明来源。</p></div></section><section className="principle-card"><span>02</span><div><b>不推断关系与感受</b><p>不生成忠诚度、关系评分、分手概率或心理诊断；用户文字不会被自动覆盖。</p></div></section><section className="principle-card"><span>03</span><div><b>只发送生成所需条件</b><p>请勿输入姓名、联系方式或私密内容；系统会拦截常见联系方式，临时灵感条件不会写入网址。</p></div></section><section className="principle-card"><span>04</span><div><b>每个人都能独立离开</b><p>退出不需要对方确认；自己的敏感内容可以立即撤回，对方离线副本无法远程删除。</p></div></section><section className="principle-card"><span>05</span><div><b>公开原型不等于公开关系</b><p>账号资料、关系与已确认计划通过安全连接同步；灵感表单只保存在当前标签页会话中，不写入网址。</p></div></section>{hasRelationship?<button className="secondary-button safety-entry" onClick={() => go("relationshipSafety")}>查看关系安全设置 <Arrow/></button>:<button className="secondary-button safety-entry" onClick={() => {setOnboardingIntent("invite");go("connect");}}>了解关系建立与退出 <Arrow/></button>}<button className="subtle-danger" onClick={() => setPanel("clearData")}>清空本机会话</button></div>}

            {screen === "relationshipSafety" && <div className="page formal-page safety-page"><header><Back onClick={() => back("settings")}/><span>关系与数据安全</span><i aria-hidden="true"/></header><section className="page-intro compact"><p className="kicker">离开不需要许可</p><h2>你的安全，<br/>不由对方决定。</h2><p className="confirm-copy">任何一方都能独立退出。共同空间解散可以协商，但不能阻止个人离开。</p></section><section className="safety-status"><span>✓</span><div><b>当前共享权限正常</b><p>照片、文字与 AI 衍生内容均记录来源和撤回状态。</p></div></section><section className="settings-group"><SettingRow icon="◎" label="查看我的内容与授权" value="3 类内容" onClick={()=>notify("普通记录、个人原创与敏感内容已分别管理")}/><SettingRow icon="⇩" label="导出我的数据" value="不含 TA 已撤回内容" onClick={()=>notify("导出包已准备；退出处理中会冻结批量导出")}/><SettingRow icon="!" label="举报骚扰或内容滥用" onClick={()=>setPanel("reportSafety")}/></section><section className="safety-explainer"><b>退出后保留什么？</b><p>你自己的内容和必要共同事实可形成只读归档；TA 撤回的内容会显示为占位说明。新关系永远不能访问旧关系数据。</p></section><button className="secondary-button" onClick={()=>setPanel("normalExit")}>退出当前关系</button><button className="danger-button safety-danger" onClick={()=>setPanel("safetyExit")}>立即退出并保护我的内容</button><p className="policy-note">安全退出会先撤销共享、下载和历史文件链接，再通知对方。</p></div>}

            {screen === "relationshipArchive" && <div className="page formal-page archive-page"><header><span/><span>{safetyExitUsed?"安全退出完成":"旧关系归档"}</span><i aria-hidden="true"/></header><div className="success-symbol protected">✓</div><section className="page-intro compact"><p className="kicker">{safetyExitUsed?"共享权限已撤销":"你已独立退出"}</p><h2>{safetyExitUsed?"你的内容，已受到保护。":"这段记录，现在只读保存。"}</h2><p className="confirm-copy">退出无需对方确认。对方已收到不含举报详情的通知；新关系无法访问这里的数据。</p></section><section className="protection-checklist"><div><span>✓</span><p><b>敏感内容已撤回</b><small>对方无法继续查看或下载</small></p></div><div><span>✓</span><p><b>历史访问链接已失效</b><small>离线截屏与已导出文件无法远程删除</small></p></div><div><span>✓</span><p><b>AI 衍生内容已清理</b><small>关系评价、摘要和画像不再保留</small></p></div></section>{!safetyExitUsed&&<section className="archive-card"><p className="kicker">只读共同事实</p><b>晚风散步与河畔小酒馆</b><small>{eventDateLong} · 双方曾确认</small><p>个人文字和照片仍受各自撤回权限控制。</p></section>}<button className="primary-button" onClick={()=>{setRelationshipExited(false);setSafetyExitUsed(false);history.current=[];go("connect",true);}}>建立新的关系 <Arrow/></button><button className="ghost-button" onClick={()=>notify("旧关系数据不会带入新的共同空间")}>了解数据隔离</button></div>}

            {screen === "task" && <div className="page task-page"><header><Back onClick={() => back("home")}/><span>{hasRelationship?"共同任务":"共同体验预览"}</span>{hasRelationship?<button className="text-button" onClick={()=>go("taskHistory")}>历史</button>:<i aria-hidden="true"/>}</header><div className="task-hero"><span>{taskDone&&!activeTask?"✓":"♫"}</span><p className="kicker">{hasRelationship?(activeTask?"当前共同任务":"任务灵感"):"建立关系后可开启"}</p><h2>交换一首<br/>最近常听的歌</h2><p>不是为了猜对彼此，而是借一首歌，听见最近没有说出口的心情。</p></div><div className="task-rule"><span>01</span><p><b>各自选一首</b><br/>先不要告诉对方原因</p><span>02</span><p><b>一起完整听完</b><br/>再分享为什么选择它</p></div>{!hasRelationship?<div className="task-actions"><div className="accepted-badge">这是共同功能预览，不会记录完成状态</div><button className="primary-button" onClick={()=>{setOnboardingIntent("invite");go("connect");}}>邀请 TA 一起使用 <Arrow/></button><button className="ghost-button" onClick={()=>go("home")}>先继续单人体验</button></div>:taskLinked?<div className="task-actions"><div className="linked-plan-preview"><b>已规划</b><p>{currentPlan.title}</p><small>{eventMonthDay} 18:30 · 当前关联安排</small></div><button className="primary-button" onClick={()=>go("schedule")}>查看安排 <Arrow/></button></div>:!activeTask?<div className="task-actions"><button className="primary-button" disabled={taskBusy} onClick={()=>void startSharedTask()}>{taskBusy?"正在发送…":"发给 TA 一起做"} <Arrow/></button><p className="policy-note">TA 接受后才会成为双方的共同任务。</p></div>:activeTask.status==="pending_partner"?<div className="task-actions"><div className="accepted-badge">{isTaskCreator?"等待 TA 接受":"TA 邀请你一起完成"}</div>{!isTaskCreator&&<button className="primary-button" disabled={taskBusy} onClick={()=>void updateSharedTask("accept")}>{taskBusy?"正在确认…":"接受这个任务"} <Arrow/></button>}<button className="ghost-button" disabled={taskBusy} onClick={()=>void updateSharedTask("cancel")}>结束这项任务</button></div>:activeTask.status==="completion_pending"?<div className="task-actions"><div className="accepted-badge">{isTaskCompletionRequester?"等待 TA 确认完成":"TA 已确认完成，等待你的确认"}</div>{!isTaskCompletionRequester&&<button className="primary-button" disabled={taskBusy} onClick={()=>void updateSharedTask("confirm_complete")}>{taskBusy?"正在确认…":"确认双方已完成"} <Arrow/></button>}</div>:<div className="task-actions"><div className="accepted-badge">✓ 双方已接受这项任务</div><button className="primary-button" onClick={() => {setTaskContextActive(true);setChoices({...choices, mood:"想放松"}); go("inspire");}}>去规划一个晚上 <Arrow/></button><button className="ghost-button" disabled={taskBusy} onClick={()=>void updateSharedTask("request_complete")}>我已经完成</button></div>}</div>}
          </div>
        </div>
      </section>
      {panel && !["profileEdit","cityEdit","normalExit","safetyExit","reportSafety","clearData"].includes(panel) && <div className="modal-backdrop"><section ref={modalRef} className="bottom-sheet" role="dialog" aria-modal="true" aria-label="操作面板" tabIndex={-1}><div className="sheet-handle" aria-hidden="true"/><button type="button" className="sheet-close" onClick={() => setPanel("")} aria-label="关闭面板">×</button>{panel === "edit" && <><p className="kicker">编辑正式安排</p><h2>{scheduleIsShared?"这已经是你们的安排":"这是你的个人计划"}</h2><label>安排名称<input required name="schedule-title" autoComplete="off" value={scheduleDraft.title || currentPlan.title} onChange={e=>setScheduleDraft({...scheduleDraft,title:e.target.value})}/></label><label>日期与时间<input required name="edit-date-time" type="datetime-local" autoComplete="off" value={`${scheduleDraft.date}T${scheduleDraft.time}`} onChange={e=>{const [date,time]=e.target.value.split("T");setScheduleDraft({...scheduleDraft,date,time});}}/></label><label>所在城市<input required name="schedule-city-edit" autoComplete="address-level2" value={scheduleDraft.city || profile.city} onChange={e=>setScheduleDraft({...scheduleDraft,city:e.target.value})}/></label><button className="primary-button" disabled={scheduleBusy} onClick={()=>void saveScheduleEdits()}>{scheduleBusy?"正在保存…":"保存修改"} <Arrow/></button></>}{panel === "cancel" && <><div className="danger-symbol">!</div><h2>{scheduleIsShared?"确定取消这个安排？":"确定删除这个计划？"}</h2><p className="sheet-copy">{scheduleIsShared?"取消后会保留记录；若关联任务，任务会解除关联但安排历史不会消失。":"删除后会从你的首页和日历中移除，且无法恢复。"}</p><button className="danger-button" disabled={scheduleBusy} onClick={() => {setCancelled(true);setTaskLinked(false);setPanel("");}}>{scheduleBusy?"正在处理…":scheduleIsShared?"确认取消":"确认删除"}</button><button className="ghost-button" disabled={scheduleBusy} onClick={() => setPanel("")}>{scheduleIsShared?"保留安排":"暂不删除"}</button></>}{panel === "memoryEdit" && <><p className="kicker">我的内容，由我管理</p><h2>补充一点真实细节</h2><button className={`photo-upload ${memoryPhoto&&!memoryContentRetracted ? "added" : ""}`} onClick={() => {setMemoryPhoto(true);setMemoryContentRetracted(false);}}><span>{memoryPhoto&&!memoryContentRetracted ? "✓" : "+"}</span>{memoryPhoto&&!memoryContentRetracted ? "已添加1张 · 由我上传" : "添加我的照片（最多9张）"}</button><label>回忆名称<input name="memory-title-edit" autoComplete="off" value={memoryDraft.title} onChange={e=>setMemoryDraft({...memoryDraft,title:e.target.value})}/></label><label>想留住的一句话<textarea name="memory-note" autoComplete="off" value={memoryNote} onChange={e => setMemoryNote(e.target.value)}/></label><p className="sheet-copy">照片和文字会标记为由你上传，可随时撤回；AI 不会自动覆盖。</p><button className="primary-button" onClick={() => {setMemoryContentRetracted(false);setPanel("");notify("我的内容已保存，并记录来源");}}>保存到回忆 <Arrow/></button></>}{panel === "retractMemory"&&<><div className="danger-symbol">↩</div><p className="kicker">撤回我的内容</p><h2>让对方也无法继续访问？</h2><p className="sheet-copy">你上传的照片和补充文字会从双方在线副本中移除；共同确认的日期、地点与活动仍作为各自历史事实保留。</p><div className="risk-note"><b>撤回不等于远程销毁</b><p>对方此前的截屏或离线导出文件无法由平台删除。</p></div><button className="danger-button" onClick={()=>{setMemoryContentRetracted(true);setPanel("");notify("个人内容已同步撤回，历史文件链接已失效");}}>撤回照片与个人文字</button><button className="ghost-button" onClick={()=>setPanel("")}>暂不撤回</button></>}{panel === "deleteMemory"&&<><div className="danger-symbol">!</div><h2>删除我的回忆副本？</h2><p className="sheet-copy">只会删除你看到的这条回忆，不会删除对方的副本。若要让对方也无法访问你上传的内容，请使用“管理来源与撤回”。</p><button className="danger-button" onClick={()=>{setMemoryDeleted(true);setPanel("");go("memories");}}>删除我的副本</button><button className="ghost-button" onClick={()=>setPanel("")}>取消</button></>}{panel === "calendarAdd"&&<><p className="kicker">{hasRelationship?"添加到我的与共同日历":"添加到我的日历"}</p><h2>想记录什么？</h2><button className="sheet-choice" onClick={()=>{setPanel("");go("inspire");}}><span>＋</span><div><b>添加安排</b><p>手动创建，或先从灵感开始</p></div><i aria-hidden="true">›</i></button><button className="sheet-choice" onClick={()=>{setPanel("");go("importantCreate");}}><span>♡</span><div><b>添加重要日子</b><p>生日、纪念日或其他值得记住的日期</p></div><i aria-hidden="true">›</i></button></>}</section></div>}
      {["profileEdit","cityEdit","normalExit","safetyExit","reportSafety","clearData"].includes(panel) && <div className="modal-backdrop"><section ref={modalRef} className="bottom-sheet" role="dialog" aria-modal="true" aria-label="确认操作" tabIndex={-1}><div className="sheet-handle" aria-hidden="true"/><button type="button" className="sheet-close" onClick={() => setPanel("")} aria-label="关闭面板">×</button>{panel==="profileEdit"&&<><p className="kicker">编辑我的资料</p><h2>每个人管理自己的资料</h2><label>昵称<input name="my-name" autoComplete="name" spellCheck={false} maxLength={30} value={profile.name} onChange={e=>{setProfile({...profile,name:e.target.value});setProfileError("");}}/></label><label>生日<input name="my-birthday" autoComplete="bday" inputMode="numeric" maxLength={20} value={profile.birthday} onChange={e=>setProfile({...profile,birthday:e.target.value})}/></label><label>当前城市<input name="city" autoComplete="address-level2" maxLength={40} value={profile.city} onChange={e=>setProfile({...profile,city:e.target.value})}/></label>{hasRelationship&&<><label>TA 的昵称<input name="partner-name" autoComplete="off" value={partnerProfile.name} readOnly aria-describedby="partner-permission-note"/></label><label>TA 共享的生日<input name="partner-birthday" autoComplete="off" value={partnerProfile.birthday||"未共享"} readOnly aria-describedby="partner-permission-note"/></label><p id="partner-permission-note" className="sheet-copy">TA 的个人资料只能由 TA 修改；这里仅展示 TA 主动共享的内容。</p></>}<button className="primary-button" disabled={accountBusy} onClick={()=>void saveProfileEdits()}>{accountBusy?"正在保存…":"保存修改"} <Arrow/></button></>}{panel==="cityEdit"&&<><p className="kicker">灵感城市</p><h2>这次想去哪里？</h2><label>城市<input name="inspiration-city" autoComplete="address-level2" maxLength={40} value={profile.city} onChange={e=>setProfile({...profile,city:e.target.value})}/></label>{!profile.city.trim()&&<p className="field-error" role="alert">请输入城市后再保存。</p>}<button className="primary-button" disabled={accountBusy} onClick={()=>{if(!profile.city.trim())return;setPanel("");void saveSelectedCity(profile.city);}}>保存城市 <Arrow/></button></>}{panel==="normalExit"&&<><div className="danger-symbol">↗</div><p className="kicker">无需对方确认</p><h2>退出当前关系？</h2><p className="sheet-copy">共享权限会立即结束。你自己的内容与必要共同事实形成只读归档；对方撤回的内容会同步消失。</p><div className="risk-note"><b>不会提供退出前导出期</b><p>这样可以避免另一方在最后时刻批量保存敏感内容。</p></div><button className="danger-button" disabled={accountBusy} onClick={()=>void leaveRelationship(false)}>{accountBusy?"正在退出…":"确认独立退出"}</button><button className="ghost-button" disabled={accountBusy} onClick={()=>setPanel("")}>继续保留关系</button></>}{panel==="safetyExit"&&<><div className="danger-symbol">!</div><p className="kicker">立即保护</p><h2>退出并撤回敏感内容？</h2><div className="protection-mini"><p>✓ 无需 TA 同意</p><p>✓ 立即撤回我的敏感照片与文字</p><p>✓ 阻止继续查看、下载和批量导出</p><p>✓ 撤销历史文件链接后再通知 TA</p></div><p className="sheet-copy">平台无法远程删除对方此前的截屏或离线文件。举报详情不会出现在关系通知中。</p><button className="danger-button" disabled={accountBusy} onClick={()=>void leaveRelationship(true)}>{accountBusy?"正在保护并退出…":"立即退出并保护我的内容"}</button><button className="ghost-button" disabled={accountBusy} onClick={()=>setPanel("")}>取消</button></>}{panel==="reportSafety"&&<><div className="danger-symbol">!</div><p className="kicker">举报与证据保护</p><h2>发生了什么？</h2><div className="report-choices"><button className={reportReason==="骚扰或控制"?"selected":""} aria-pressed={reportReason==="骚扰或控制"} onClick={()=>setReportReason("骚扰或控制")}>骚扰或控制</button><button className={reportReason==="勒索或威胁"?"selected":""} aria-pressed={reportReason==="勒索或威胁"} onClick={()=>setReportReason("勒索或威胁")}>勒索或威胁</button><button className={reportReason==="亲密影像滥用"?"selected":""} aria-pressed={reportReason==="亲密影像滥用"} onClick={()=>setReportReason("亲密影像滥用")}>亲密影像滥用</button></div><p className="sheet-copy">提交后先停止相关内容传播与下载，再进入审核。撤回你自己的内容无需等待审核。</p><button className="danger-button" disabled={!reportReason||accountBusy} onClick={()=>void leaveRelationship(true)}>{accountBusy?"正在提交并保护…":"提交举报并立即保护"}</button><button className="ghost-button" disabled={accountBusy} onClick={()=>setPanel("")}>暂不提交</button></>}{panel==="clearData"&&<><div className="danger-symbol">!</div><h2>清空本机会话？</h2><p className="sheet-copy">只会删除当前浏览器里的灵感草稿、显示偏好与旧版本快照；账户资料和服务端安排不会删除。</p><button className="danger-button" onClick={clearLocalSession}>确认清空本机会话</button><button className="ghost-button" onClick={()=>setPanel("")}>取消</button></>}</section></div>}
      {birthdayPickerOpen && <BirthdayCalendar value={profile.birthday} onConfirm={value=>{setProfile({...profile,birthday:value});setBirthdayPickerOpen(false);}} onClose={()=>setBirthdayPickerOpen(false)}/>} 
      {cityPickerOpen && <CityPicker value={profile.city} onConfirm={value=>{void saveSelectedCity(value);setCityPickerOpen(false);}} onClose={()=>setCityPickerOpen(false)}/>}
      <div className="toast-region" aria-live="polite" aria-atomic="true">{toast && <div className="toast">{toast}</div>}</div>
    </main>
  );
}

function Choice({ title, options, value, setValue }: { title: string; options: string[]; value: string; setValue: (v: string) => void }) {
  return <section className="choice-group" role="group" aria-label={title}><h3>{title}</h3><div>{options.map(option => <Pill key={option} active={option === value} onClick={() => setValue(option)}>{option}</Pill>)}</div></section>;
}

function MultiChoice({ title, options, values, setValues }: { title: string; options: string[]; values: string[]; setValues: (v: string[]) => void }) {
  return <section className="choice-group" role="group" aria-label={title}><h3>{title}</h3><div>{options.map(option => <Pill key={option} active={values.includes(option)} onClick={() => values.includes(option) ? setValues(values.filter(v=>v!==option)) : values.length < 2 ? setValues([...values,option]) : setValues([values[1],option])}>{option}</Pill>)}</div><p className="choice-help" aria-live="polite">已选择 {values.length}/2 · 选择第 3 项时会替换最早选择</p></section>;
}

function PlaceCandidates({ places, selectedId, onSelect }: { places: Place[]; selectedId?: string; onSelect: (index: number) => void }) {
  const distanceFormatter = new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
  return <section className="place-candidates" aria-labelledby="place-candidates-title"><div className="section-heading"><div><p className="kicker">附近候选</p><h3 id="place-candidates-title">选择更合适的地点</h3></div><span>{places.length} 个真实地点</span></div>{places.length ? places.map((place, index) => <button type="button" key={place.id} className={selectedId === place.id ? "selected" : ""} aria-pressed={selectedId === place.id} onClick={() => onSelect(index)}><div><b>{place.name}</b><small title={place.businessArea || place.address}>{place.businessArea || place.address}</small></div><span>{place.distance !== null ? `${distanceFormatter.format(place.distance / 1000)}\u00a0公里` : "距离待定位"}</span></button>) : <p className="candidate-empty">附近没有匹配到地点，请扩大范围或调整商圈。</p>}</section>;
}

function InfoRow({ label, value }: { label: string; value: string }) { return <div className="info-row"><span>{label}</span><b>{value}</b><i aria-hidden="true">›</i></div>; }
function SettingRow({ icon, label, value, onClick }: { icon: string; label: string; value?: string; onClick?: () => void }) { return <button className="setting-row" onClick={onClick}><span aria-hidden="true">{icon}</span><b>{label}</b>{value && <small>{value}</small>}<i aria-hidden="true">›</i></button>; }
function ToggleRow({ label, note }: { label: string; note: string }) { const [on,setOn]=useState(true); return <div className="toggle-row"><div><b>{label}</b><small>{note}</small></div><button type="button" role="switch" aria-label={label} aria-checked={on} className={on?"on":""} onClick={()=>setOn(!on)}><i aria-hidden="true"/></button></div>; }

function BirthdayCalendar({ value, onConfirm, onClose }: { value: string; onConfirm: (value: string) => void; onClose: () => void }) {
  const today = new Date();
  const initial = value ? localDate(value) : new Date(today.getFullYear() - 25, today.getMonth(), today.getDate());
  const [cursor, setCursor] = useState(new Date(initial.getFullYear(), initial.getMonth(), 1));
  const [draft, setDraft] = useState(value);
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const days = new Date(year, month + 1, 0).getDate();
  const leading = (new Date(year, month, 1).getDay() + 6) % 7;
  const years = Array.from({ length: 101 }, (_, index) => today.getFullYear() - index);
  const selectDate = (day: number) => {
    const selected = new Date(year, month, day, 12);
    if (selected > today) return;
    setDraft(`${year}-${String(month + 1).padStart(2,"0")}-${String(day).padStart(2,"0")}`);
  };
  return <div className="modal-backdrop birthday-backdrop"><section className="birthday-calendar" role="dialog" aria-modal="true" aria-labelledby="birthday-title"><div className="birthday-calendar-header"><div><p className="kicker">我的生日</p><h2 id="birthday-title">选择出生日期</h2></div><button type="button" onClick={onClose} aria-label="关闭生日选择器">×</button></div><div className="birthday-mode"><label>年份<select aria-label="出生年份" value={year} onChange={event=>setCursor(new Date(Number(event.target.value),month,1))}>{years.map(item=><option key={item} value={item}>{item} 年</option>)}</select></label><label>月份<select aria-label="出生月份" value={month} onChange={event=>setCursor(new Date(year,Number(event.target.value),1))}>{Array.from({length:12},(_,index)=><option key={index} value={index}>{index+1} 月</option>)}</select></label></div><div className="birthday-week" aria-hidden="true">{["一","二","三","四","五","六","日"].map(day=><span key={day}>{day}</span>)}</div><div className="birthday-days">{Array.from({length:leading},(_,index)=><span key={`empty-${index}`}/>)}{Array.from({length:days},(_,index)=>{const day=index+1;const iso=`${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;const future=new Date(year,month,day,12)>today;return <button key={day} type="button" disabled={future} className={draft===iso?"selected":""} aria-pressed={draft===iso} onClick={()=>selectDate(day)}>{day}</button>;})}</div><p className="birthday-selection">{draft ? `已选择：${draft.replaceAll("-"," / ")}` : "尚未选择日期"}</p><div className="birthday-actions"><button type="button" className="ghost-button" onClick={()=>setDraft("")}>清除</button><button type="button" className="primary-button" onClick={()=>onConfirm(draft)}>确认生日 <Arrow/></button></div></section></div>;
}

function CityPicker({ value, onConfirm, onClose }: { value: string; onConfirm: (value: string) => void; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState(value);
  const normalizedQuery = query.trim().toLowerCase();
  const results = normalizedQuery ? cityOptions.filter(city => city.toLowerCase().includes(normalizedQuery)) : cityOptions;
  const canUseCustom = Boolean(query.trim()) && !cityOptions.some(city => city.toLowerCase() === normalizedQuery);
  return <div className="modal-backdrop city-backdrop"><section className="city-picker" role="dialog" aria-modal="true" aria-labelledby="city-picker-title"><div className="city-picker-header"><div><p className="kicker">当前城市</p><h2 id="city-picker-title">搜索并选择城市</h2></div><button type="button" onClick={onClose} aria-label="关闭城市选择器">×</button></div><label className="city-search"><span className="sr-only">搜索城市</span><input name="city-search" type="search" autoComplete="address-level2" placeholder="搜索城市，例如：成都" value={query} onChange={event=>setQuery(event.target.value)}/></label>{!normalizedQuery&&<section className="city-popular" aria-labelledby="popular-city-title"><h3 id="popular-city-title">常用城市</h3><div>{popularCities.map(city=><button key={city} type="button" className={draft===city?"selected":""} aria-pressed={draft===city} onClick={()=>setDraft(city)}>{city}</button>)}</div></section>}<section className="city-results" aria-labelledby="city-result-title"><div className="city-result-heading"><h3 id="city-result-title">{normalizedQuery?"搜索结果":"全部城市"}</h3><span>{results.length} 个</span></div>{canUseCustom&&<button type="button" className={`city-option custom ${draft===query.trim()?"selected":""}`} aria-pressed={draft===query.trim()} onClick={()=>setDraft(query.trim())}><span>使用“{query.trim()}”</span><small>未列出的城市也可以直接使用</small></button>}{results.map(city=><button key={city} type="button" className={`city-option ${draft===city?"selected":""}`} aria-pressed={draft===city} onClick={()=>setDraft(city)}><span>{city}</span>{draft===city&&<b aria-hidden="true">✓</b>}</button>)}</section><p className="city-selection" aria-live="polite">{draft?`当前选择：${draft}`:"请选择一个城市"}</p><div className="city-picker-actions"><button type="button" className="ghost-button" onClick={onClose}>取消</button><button type="button" className="primary-button" disabled={!draft.trim()} onClick={()=>onConfirm(draft.trim())}>确认城市 <Arrow/></button></div></section></div>;
}
