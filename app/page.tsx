"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { calendarDayStatus, holidaySource } from "../lib/china-holidays";
import { emptyRecommendationFeedback, recommendationBrandKey, recommendationPlaces, recommendationDistance, planIdentity, selectUnseenPlans, type RecommendationFeedback } from "../lib/recommendation-feedback";
import { normalizeScheduleFacts, readScheduleFacts, type ScheduleFacts } from "../lib/schedule-facts";

type Screen = "welcome" | "age" | "profileSetup" | "connect" | "relationshipReady" | "contentReview" | "home" | "inspire" | "loading" | "results" | "plan" | "location" | "confirm" | "schedule" | "calendar" | "memory" | "memories" | "memoryCreate" | "task" | "taskHistory" | "profile" | "settings" | "notifications" | "privacy" | "privacyPolicy" | "terms" | "accountDeletion" | "storage" | "help" | "about" | "relationshipSafety" | "relationshipArchive" | "important" | "importantCreate";
type Tab = "home" | "inspire" | "calendar" | "settings";
type Panel = "" | "edit" | "cancel" | "memoryEdit" | "retractMemory" | "deleteMemory" | "calendarAdd" | "profileEdit" | "cityEdit" | "normalExit" | "safetyExit" | "reportSafety" | "clearData";
type Place = { id: string; name: string; address: string; location: string; type: string; distance: number | null; businessArea: string; rating: string; cost: string; openTimeToday: string; category: string; recommendationReasons: string[]; verifiedBy: "amap" | "saved" };
type TimelineNode = { time: string; title: string; description: string };
type Plan = { eyebrow: string; title: string; meta: string; desc: string; tone: string; category?: string; duration?: string; timeline?: TimelineNode[]; places?: Place[]; includedPlaces?: Place[]; estimatedCost?: number | null; budgetMatch?: "matched" | "unknown" | "under"; searchRadius?: number; distanceVerified?: boolean };
type HistorySharingMode = "from_now" | "selected" | "keep_private";
type AccountSnapshot = { authenticated: boolean; user?: { id: string; email: string; nickname: string; birthday: string | null; city: string; onboardingCompleted: boolean }; relationship?: { id: string; status: string; partner_id: string | null; partner_name: string | null; partner_birthday: string | null; history_sharing_mode: HistorySharingMode | null; history_sharing_reviewed_at: string | null } | null; invite?: { code: string; partner_note: string | null; expires_at: string; status: string } | null };
type ScheduleRecord = { id: string; relationship_id: string | null; created_by_user_id: string; accepted_by_user_id: string | null; visibility: "personal" | "shared"; title: string; event_date: string; event_time: string; city: string; status: "active" | "pending_partner" | "confirmed" | "completion_pending" | "completed" | "cancelled" | "deleted"; source: "manual" | "ai" | "legacy_import" | "legacy_shared"; facts_json: string; completion_requested_by_user_id: string | null; completed_at: string | null; version: number; created_at: string; updated_at: string; deleted_at: string | null };
type MemoryRecord = { id:string;scheduleId:string|null;title:string;eventDate:string;city:string;facts:ScheduleFacts|null;note:string;mediaId:string|null;mediaUrl:string|null;shareContribution:boolean;version:number;createdAt:string;updatedAt:string;partnerContribution:{note:string;mediaUrl:string|null}|null };
type ImportantDayRecord = { id: string; relationship_id: string | null; created_by_user_id: string; accepted_by_user_id: string | null; visibility: "personal" | "shared"; title: string; event_date: string; repeat_rule: "yearly" | "none"; reminder_days: number; status: "active" | "pending_partner" | "confirmed" | "cancelled" | "deleted"; version: number; created_at: string; updated_at: string; deleted_at: string | null };
type TaskRecord = { id: string; relationship_id: string; created_by_user_id: string; accepted_by_user_id: string | null; completion_requested_by_user_id: string | null; title: string; status: "pending_partner" | "active" | "completion_pending" | "completed" | "cancelled"; version: number; created_at: string; updated_at: string };
type LegacyPlan = { title: string; date: string; time: string; city: string };
type Preferences = { scheduleReminders: boolean; importantDayReminders: boolean; partnerUpdates: boolean };
type UploadedMedia = { id: string; url: string; visibility: "personal" | "shared" };
type PublicShareLink = { id: string; path: string; expiresAt: string };
type ManagedShareLink = { id: string; scheduleId: string; title: string; expiresAt: string; revokedAt: string | null; createdAt: string };
type WeatherDay = { date: string; dayWeather: string; nightWeather: string; dayTemp: string; nightTemp: string; dayWind: string; nightWind: string; dayPower: string; nightPower: string };
type WeatherForecast = { source?: "高德天气" | "Open-Meteo"; queryCity: string; city: string; province: string; adcode: string; reportTime: string; fetchedAt: string; forecasts: WeatherDay[] };
type LocationPreferences = { city: string; district: string; districtSource: "none" | "auto" | "manual"; radius: number; longitude: number | null; latitude: number | null; label: string };
type ResolvedLocation = { city: string; district: string; businessArea: string; displayName: string; longitude: number; latitude: number };
type CandidatePool = { rawCount: number; candidateCount: number; categories: string[]; pagesFetched: number };
type GeneratedPlanResponse = { title: string; summary: string; duration: string; budgetLabel: string; placeQuery: string; timeline: TimelineNode[]; places?: Place[]; includedPlaces?: Place[]; estimatedCost?: number | null; budgetMatch?: "matched" | "unknown" | "under"; searchRadius?: number; distanceVerified?: boolean };
type FeedbackReason = "太远" | "太贵" | "不新奇" | "不符合状态" | "地点不准确";
type ServiceIssueSource = "ai" | "location" | "weather" | "sync";
type ServiceIssue = { source: ServiceIssueSource; title: string; detail: string };

const LEGACY_STORAGE_KEYS = ["love-diary-v112", "love-diary-v17", "love-diary-v16", "love-diary-v15", "love-diary-v14"];
const INSPIRATION_DRAFT_KEY = "love-diary-inspiration-draft-v1";
const feedbackReasonCodes: Record<FeedbackReason, "too_far" | "too_expensive" | "not_novel" | "state_mismatch" | "place_inaccurate"> = {
  太远: "too_far", 太贵: "too_expensive", 不新奇: "not_novel", 不符合状态: "state_mismatch", 地点不准确: "place_inaccurate",
};

const Arrow = () => <span aria-hidden="true">→</span>;
const Back = ({ onClick }: { onClick: () => void }) => <button className="icon-button" onClick={onClick} aria-label="返回">‹</button>;
const dateInputValue = (offsetDays: number) => { const date = new Date(); date.setDate(date.getDate() + offsetDays); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; };
const localDate = (value: string) => new Date(`${value}T12:00:00`);
const nextImportantDate = (value: string, repeatRule: "yearly" | "none") => { const base = localDate(value); if (repeatRule === "none") return base; const now = new Date(); now.setHours(0,0,0,0); const next = new Date(now.getFullYear(), base.getMonth(), base.getDate(), 12); if (next < now) next.setFullYear(next.getFullYear()+1); return next; };
const monthOffsetFromToday = (date: Date) => { const today = new Date(); return (date.getFullYear() - today.getFullYear()) * 12 + date.getMonth() - today.getMonth(); };
const dateFieldValue = (value: string | null | undefined) => /^\d{4}-\d{2}-\d{2}$/.test(value ?? "") ? value! : "";
const weatherLabel = (day: WeatherDay) => `${day.dayWeather}${day.nightWeather&&day.nightWeather!==day.dayWeather?`转${day.nightWeather}`:""} · ${day.nightTemp}–${day.dayTemp}℃`;
const weatherSource = (forecast: WeatherForecast | null) => forecast?.source ?? "高德天气";
const popularCities = ["北京", "上海", "广州", "深圳", "杭州", "成都", "重庆", "南京", "苏州", "武汉", "西安", "长沙"];
const cityOptions = [
  ...popularCities, "天津", "郑州", "青岛", "宁波", "厦门", "福州", "济南", "合肥", "昆明", "大连", "沈阳", "哈尔滨", "长春", "石家庄", "太原", "南昌", "南宁", "贵阳", "海口", "三亚", "兰州", "西宁", "银川", "乌鲁木齐", "拉萨", "呼和浩特", "珠海", "佛山", "东莞", "无锡", "常州", "温州", "绍兴", "嘉兴", "金华", "台州", "泉州", "烟台", "潍坊", "徐州", "扬州", "镇江", "南通", "洛阳", "开封", "宜昌", "襄阳", "株洲", "桂林", "柳州", "大理", "丽江", "绵阳", "乐山", "秦皇岛", "唐山", "保定", "包头", "威海", "中山", "惠州", "汕头", "湛江", "香港", "澳门", "台北",
];
function toPlan(plan: GeneratedPlanResponse, index: number, time: string, budget: string, fallback: boolean): Plan {
  return {
    eyebrow: index === 0 ? `主方案 · ${fallback ? "真实地点推荐" : "AI 实时生成"}` : `备选 · ${fallback ? "真实地点推荐" : "AI 实时生成"}`,
    title: plan.title,
    meta: `${time} · 预算偏好 ${budget}`,
    desc: plan.summary,
    tone: ["primary", "cream", "lilac"][index] ?? "cream",
    category: plan.placeQuery,
    duration: plan.duration,
    timeline: plan.timeline,
    places: plan.places,
    includedPlaces: plan.includedPlaces,
    estimatedCost: plan.estimatedCost,
    budgetMatch: plan.budgetMatch,
    searchRadius: plan.searchRadius,
    distanceVerified: plan.distanceVerified,
  };
}

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
  const [memoryDraft, setMemoryDraft] = useState(() => ({ title: "", date: dateInputValue(0), place: "", copy: "" }));
  const [importantDraft, setImportantDraft] = useState(() => ({ title: "在一起纪念日", date: dateInputValue(63), repeatRule: "yearly" as "yearly" | "none", reminderDays: 7 }));
  const [formError, setFormError] = useState("");
  const [importantDays, setImportantDays] = useState<ImportantDayRecord[]>([]);
  const [sharedExperiencesAvailable, setSharedExperiencesAvailable] = useState(true);
  const [importantBusy, setImportantBusy] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(0);
  const [adopted, setAdopted] = useState(false);
  const [partnerAccepted, setPartnerAccepted] = useState(false);
  const [cancelled, setCancelledState] = useState(false);
  const [panel, setPanel] = useState<Panel>("");
  const [loadingFailed, setLoadingFailed] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [taskRecord, setTaskRecord] = useState<TaskRecord | null>(null);
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [taskBusy, setTaskBusy] = useState(false);
  const [taskContextActive, setTaskContextActive] = useState(false);
  const [memoryNote, setMemoryNote] = useState("");
  const [memoryContentRetracted, setMemoryContentRetracted] = useState(false);
  const [uploadedMedia, setUploadedMedia] = useState<UploadedMedia | null>(null);
  const [memories, setMemories] = useState<MemoryRecord[]>([]);
  const [currentMemory, setCurrentMemory] = useState<MemoryRecord | null>(null);
  const [memoryBusy, setMemoryBusy] = useState(false);
  const [memoryShare, setMemoryShare] = useState(false);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [preferences, setPreferences] = useState<Preferences>({ scheduleReminders: true, importantDayReminders: true, partnerUpdates: true });
  const [preferencesBusy, setPreferencesBusy] = useState(false);
  const [feedbackDraft, setFeedbackDraft] = useState({ category: "产品建议", message: "" });
  const [feedbackBusy, setFeedbackBusy] = useState(false);
  const [deletionPhrase, setDeletionPhrase] = useState("");
  const [deletionBusy, setDeletionBusy] = useState(false);
  const [deletionError, setDeletionError] = useState("");
  const [publicShareLink, setPublicShareLink] = useState<PublicShareLink | null>(null);
  const [managedShareLinks, setManagedShareLinks] = useState<ManagedShareLink[]>([]);
  const [shareBusy, setShareBusy] = useState(false);
  const [relationshipExited, setRelationshipExited] = useState(false);
  const [safetyExitUsed, setSafetyExitUsed] = useState(false);
  const [taskLinked, setTaskLinked] = useState(false);
  const [selectedDay, setSelectedDay] = useState(() => new Date().getDate());
  const [monthOffset, setMonthOffset] = useState(0);
  const [placeVersion, setPlaceVersion] = useState(0);
  const [selectedPlaceIndexes, setSelectedPlaceIndexes] = useState([0, 0, 0]);
  const [locationPrefs, setLocationPrefs] = useState<LocationPreferences>({ city: "", district: "", districtSource: "none", radius: 5000, longitude: null, latitude: null, label: "尚未定位" });
  const districtInputRef = useRef<HTMLInputElement>(null);
  const [choices, setChoices] = useState({ mood: "想放松", taMood: "和我一样", vibe: "安静", time: "今晚", budget: "¥100–300", space: "都可以", special: "" });
  const [myStates, setMyStates] = useState<string[]>(["想放松"]);
  const [customStates, setCustomStates] = useState<string[]>([]);
  const [newState, setNewState] = useState("");
  const [toast, setToast] = useState("");
  const [clock, setClock] = useState("--:--");
  const [nowEpoch, setNowEpoch] = useState(()=>Date.now());
  const [reportReason, setReportReason] = useState("");
  const [aiPlans, setAiPlans] = useState<Plan[] | null>(null);
  const [morePlans, setMorePlans] = useState<Plan[]>([]);
  const [seenPlaceIds, setSeenPlaceIds] = useState<string[]>([]);
  const [recommendationFeedback, setRecommendationFeedback] = useState<RecommendationFeedback>(emptyRecommendationFeedback);
  const [recommendationFeedbackOpen, setRecommendationFeedbackOpen] = useState(false);
  const [recommendationFeedbackBusy, setRecommendationFeedbackBusy] = useState(false);
  const [ratedPlanIdentity, setRatedPlanIdentity] = useState<string | undefined>(undefined);
  const [generationError, setGenerationError] = useState("");
  const [serviceIssues, setServiceIssues] = useState<Partial<Record<ServiceIssueSource, ServiceIssue>>>({});
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [syncBusy, setSyncBusy] = useState(false);
  const [weather, setWeather] = useState<WeatherForecast | null>(null);
  const weatherRequest = useRef(0);
  const [candidatePool, setCandidatePool] = useState<CandidatePool | null>(null);
  const [viewingSavedRoute, setViewingSavedRoute] = useState(false);
  const requestController = useRef<AbortController | null>(null);
  const generationRefresh = useRef(false);
  const dynamicPlans = useMemo(() => (aiPlans ?? plans).map((plan, index) => ({
    ...plan,
    title: aiPlans ? plan.title : choices.space === "室内" ? ["独立书店与安静晚餐", "双人陶艺与甜品", "小剧场与夜宵"][index] : choices.mood === "想热闹" ? ["夜市寻味与现场音乐", "双人保龄球与夜宵", "城市夜游与甜品"][index] : plan.title,
    meta: `${choices.time} · 预算偏好 ${choices.budget}`,
  })), [aiPlans, choices]);
  const eligibleMorePlans = useMemo(() => selectUnseenPlans(morePlans, recommendationFeedback, seenPlaceIds), [morePlans, recommendationFeedback, seenPlaceIds]);
  const currentPlan = dynamicPlans[selectedPlan];
  const hasRelationship = Boolean(account?.relationship?.partner_id);
  const inspirationCity = locationPrefs.city || profile.city;
  const scheduledFacts = useMemo(() => readScheduleFacts(sharedSchedule?.facts_json), [sharedSchedule?.facts_json]);
  const canViewScheduledInspiration = Boolean(scheduledFacts);
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
  const completedScheduleCount = schedules.filter(schedule => schedule.status === "completed").length;
  const needsHistoryReview = hasRelationship && !account?.relationship?.history_sharing_reviewed_at && personalSchedules.length > 0;
  const currentPlaceCandidates = currentPlan.places ?? [];
  const currentPlace = currentPlaceCandidates[selectedPlaceIndexes[selectedPlan] ?? 0] ?? null;
  const currentBudgetText = planBudgetText(currentPlan, choices.budget, hasRelationship);
  const amapMapUrl = currentPlace ? `https://uri.amap.com/marker?position=${encodeURIComponent(currentPlace.location)}&name=${encodeURIComponent(currentPlace.name)}&src=love-diary&coordinate=gaode&callnative=0` : "";
  const eventDate = useMemo(() => localDate(scheduleDraft.date), [scheduleDraft.date]);
  const displayedInspirationCity = viewingSavedRoute && scheduledFacts ? scheduledFacts.city : inspirationCity;
  const inspirationWeatherData = weather?.queryCity === displayedInspirationCity ? weather : null;
  const scheduleWeatherData = weather?.queryCity === (scheduleDraft.city || profile.city) ? weather : null;
  const inspirationWeather = choices.time === "周末" ? inspirationWeatherData?.forecasts.find(day => [0,6].includes(localDate(day.date).getDay())) ?? null : ["现在出发","今晚"].includes(choices.time) ? inspirationWeatherData?.forecasts.find(day => day.date === dateInputValue(0)) ?? null : null;
  const scheduleWeather = scheduleWeatherData?.forecasts.find(day => day.date === scheduleDraft.date) ?? null;
  const today = useMemo(() => { const value = new Date(); value.setHours(0, 0, 0, 0); return value; }, []);
  const canConfirmCompletion = Date.parse(`${scheduleDraft.date}T${scheduleDraft.time}:00+08:00`) <= nowEpoch;
  const isScheduleCreator = Boolean(sharedSchedule && account?.user?.id && sharedSchedule.created_by_user_id === account.user.id);
  const scheduleIsShared = sharedSchedule ? sharedSchedule.visibility === "shared" : hasRelationship;
  const scheduleCompleted = sharedSchedule?.status === "completed";
  const scheduleCompletionRequesterIsMe = Boolean(sharedSchedule?.completion_requested_by_user_id === account?.user?.id);
  const scheduleCompletionPending = sharedSchedule?.status === "completion_pending";
  const eventDateLong = new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", day: "numeric", weekday: "short" }).format(eventDate);
  const eventMonthDay = new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric" }).format(eventDate);
  const eventWeekday = new Intl.DateTimeFormat("zh-CN", { weekday: "short" }).format(eventDate);
  const importantDate = useMemo(() => primaryImportantDay ? nextImportantDate(primaryImportantDay.event_date, primaryImportantDay.repeat_rule) : localDate(importantDraft.date), [primaryImportantDay, importantDraft.date]);
  const importantDateLong = new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", day: "numeric" }).format(importantDate);
  const calendarDate = useMemo(() => { const value = new Date(); return new Date(value.getFullYear(), value.getMonth() + monthOffset, 1); }, [monthOffset]);
  const calendarYear = calendarDate.getFullYear();
  const calendarMonth = calendarDate.getMonth();
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const leadingDays = (new Date(calendarYear, calendarMonth, 1).getDay() + 6) % 7;
  const calendarTitle = new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long" }).format(calendarDate);
  const isIdeaMonth = calendarYear === 2026 && calendarMonth === 7;
  const selectedCalendarDateKey = `${calendarYear}-${String(calendarMonth+1).padStart(2,"0")}-${String(selectedDay).padStart(2,"0")}`;
  const calendarWeather = weather?.queryCity === (scheduleDraft.city || profile.city) ? weather.forecasts.find(day => day.date === selectedCalendarDateKey) ?? null : null;
  const isCurrentMonth = calendarYear === today.getFullYear() && calendarMonth === today.getMonth();

  function jumpToToday() { setMonthOffset(0); setSelectedDay(new Date().getDate()); }
  function showDateInCalendar(date: Date) { setMonthOffset(monthOffsetFromToday(date)); setSelectedDay(date.getDate()); }
  function importantDaysOnDate(dateKey: string) { return importantDays.filter(day => day.repeat_rule === "yearly" ? day.event_date.slice(5) === dateKey.slice(5) : day.event_date === dateKey); }

  const step = useMemo(() => ({ welcome: 0, age: 0, profileSetup: 0, connect: 1, relationshipReady: 1, contentReview: 1, home: 2, inspire: 3, loading: 3, results: 4, plan: 5, location: 5, confirm: 5, schedule: 6, calendar: 7, memory: 8, memories: 8, memoryCreate: 8, task: 2, taskHistory: 2, profile: 2, settings: 2, notifications: 2, privacy: 2, privacyPolicy: 2, terms: 2, accountDeletion: 2, storage: 2, help: 2, about: 2, relationshipSafety: 2, relationshipArchive: 2, important: 2, importantCreate: 2 }[screen]), [screen]);

  function go(next: Screen, replace = false) { if (screen === "loading" && next !== "results") { if (generationTimer.current) { window.clearTimeout(generationTimer.current); generationTimer.current = null; } requestController.current?.abort(); } if (!replace) history.current.push(screen); const method = replace ? "replaceState" : "pushState"; window.history[method]({ screen: next }, "", `#${next}`); setScreen(next); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function back(fallback: Screen = "home") { const previous = history.current.pop(); if (previous) window.history.back(); else go(fallback, true); }
  function notify(message: string) { setToast(message); window.setTimeout(() => setToast(""), 1800); }
  function reportServiceIssue(source: ServiceIssueSource, title: string, detail: string) { setServiceIssues(current => ({ ...current, [source]: { source, title, detail } })); }
  function clearServiceIssue(source: ServiceIssueSource) { setServiceIssues(current => { if (!current[source]) return current; const next = { ...current }; delete next[source]; return next; }); }
  function syncIssueDetail() {
    if (!lastSyncAt) return "已保留当前页面内容，但可能不是最新状态。请检查网络后重新同步。";
    const time = new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false }).format(lastSyncAt);
    return `已保留 ${time} 成功同步的内容，但可能不是最新状态。请检查网络后重新同步。`;
  }
  async function loadAccount(silent = false) {
    try {
      const response = await fetch("/api/account", { cache: "no-store" });
      const data = await response.json() as AccountSnapshot;
      if (response.status === 401) { setAccount({ authenticated: false }); setSharedSchedule(null); setSchedules([]); setMemories([]); setCurrentMemory(null); setTaskRecord(null); setTasks([]); setImportantDays([]); setScheduleLoaded(true); setAdopted(false); setServiceIssues({}); setLastSyncAt(null); return null; }
      if (!response.ok) throw new Error("账号状态读取失败");
      if (account?.user?.id && data.user?.id && account.user.id !== data.user.id) {
        setSharedSchedule(null); setSchedules([]); setMemories([]); setCurrentMemory(null); setTaskRecord(null); setTasks([]); setImportantDays([]); setScheduleLoaded(false); setAdopted(false); setServiceIssues({}); setLastSyncAt(null);
      }
      setAccount(data);
      if (data.user) setProfile({ name: data.user.nickname, birthday: dateFieldValue(data.user.birthday), city: data.user.city });
      setInviteCodeValue(data.invite?.code ?? "");
      if (data.relationship?.partner_id) {
        window.localStorage.removeItem("love-diary-solo-user"); setSoloMode(false);
        setPartnerProfile({ name: data.relationship.partner_name ?? "TA", birthday: data.relationship.partner_birthday ?? "" });
        if (screen === "connect") go("relationshipReady", true);
      } else { setSoloMode(Boolean(data.user?.onboardingCompleted) || window.localStorage.getItem("love-diary-solo-user") === data.user?.id); }
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
  async function loadSharedSchedule(silent = false, preserveCalendar = false): Promise<boolean> {
    if (!account?.authenticated) return true;
    try {
      const response = await fetch("/api/schedules", { cache: "no-store" });
      if (response.status === 401) return true;
      const data = await response.json() as { schedule?: ScheduleRecord | null; schedules?: ScheduleRecord[]; error?: string };
      if (!response.ok) throw new Error(data.error || "安排读取失败。");
      const schedule = data.schedule ?? null;
      setSchedules(data.schedules ?? (schedule ? [schedule] : []));
      setSharedSchedule(schedule);
      if (schedule) {
        setScheduleDraft({ title: schedule.title, date: schedule.event_date, time: schedule.event_time, city: schedule.city });
        if (!preserveCalendar) showDateInCalendar(localDate(schedule.event_date));
        setAdopted(true); setPartnerAccepted(["confirmed","completion_pending","completed"].includes(schedule.status)); setCancelled(schedule.status === "cancelled");
      } else if (account?.authenticated) { setAdopted(false); setPartnerAccepted(false); }
      return true;
    } catch {
      reportServiceIssue("sync", "共同内容暂时没有同步", syncIssueDetail());
      if (!silent) notify("安排同步失败，当前内容已保留");
      return false;
    }
    finally { setScheduleLoaded(true); }
  }
  async function loadSharedExperiences(silent = false): Promise<boolean> {
    if (!account?.authenticated) return true;
    try {
      const [taskResponse, importantResponse] = await Promise.all([
        fetch("/api/tasks", { cache: "no-store" }),
        fetch("/api/important-days", { cache: "no-store" }),
      ]);
      if (taskResponse.status === 401 || importantResponse.status === 401) return true;
      const taskData = await taskResponse.json() as { task?: TaskRecord | null; tasks?: TaskRecord[]; available?: boolean; error?: string };
      const importantData = await importantResponse.json() as { importantDays?: ImportantDayRecord[]; available?: boolean; error?: string };
      if (!taskResponse.ok || !importantResponse.ok) throw new Error(taskData.error || importantData.error || "共同内容读取失败。");
      setSharedExperiencesAvailable(taskData.available !== false && importantData.available !== false);
      setTaskRecord(taskData.task ?? null); setTasks(taskData.tasks ?? []); setImportantDays(importantData.importantDays ?? []);
      return true;
    } catch {
      reportServiceIssue("sync", "共同内容暂时没有同步", syncIssueDetail());
      if (!silent) notify("任务与重要日子同步失败，当前内容已保留");
      return false;
    }
  }
  async function refreshSharedData(preserveCalendar = true, announce = false) {
    if (!account?.authenticated) return;
    if (announce) setSyncBusy(true);
    const [scheduleOk, experiencesOk] = await Promise.all([loadSharedSchedule(true, preserveCalendar), loadSharedExperiences(true)]);
    if (scheduleOk && experiencesOk) {
      setLastSyncAt(nowEpoch); clearServiceIssue("sync");
      if (announce) notify("已同步最新共同内容");
    } else {
      reportServiceIssue("sync", "共同内容暂时没有同步", syncIssueDetail());
    }
    if (announce) setSyncBusy(false);
  }
  async function loadWeather(cityInput: string, silent = false, force = false): Promise<boolean> {
    const city = cityInput.trim();
    if (!city || !account?.authenticated) return true;
    const fetchedAt = weather?.queryCity === city ? Date.parse(weather.fetchedAt) : 0;
    if (!force && fetchedAt && Date.now() - fetchedAt < 10 * 60_000) { clearServiceIssue("weather"); return true; }
    const requestId = ++weatherRequest.current;
    if (weather?.queryCity !== city) { setWeather(null); clearServiceIssue("weather"); }
    try {
      const response = await fetch(`/api/weather?city=${encodeURIComponent(city)}`, { cache: "no-store" });
      if (response.status === 401) return true;
      const data = await response.json() as { weather?: WeatherForecast; error?: string; code?: string };
      if (!response.ok || !data.weather) throw new Error(data.error || "天气读取失败。");
      if (requestId !== weatherRequest.current || data.weather.queryCity !== city) return true;
      setWeather(data.weather); clearServiceIssue("weather"); return true;
    } catch (error) {
      if (requestId !== weatherRequest.current) return false;
      setWeather(null);
      const detail = error instanceof Error && /城市|地区/.test(error.message)
        ? "请确认城市名称，或切换城市后重新获取天气。"
        : "不影响继续规划；可以现在重试，也可以稍后查看。";
      reportServiceIssue("weather", /城市|地区/.test(error instanceof Error ? error.message : "") ? "无法识别这个城市" : "天气暂时无法获取", detail);
      if (!silent) notify("天气暂时无法获取，仍可继续规划");
      return false;
    }
  }

  function selectedFacts(): ScheduleFacts | null {
    if (!aiPlans) return null;
    const chosenPlaces = [currentPlace, ...(currentPlan.includedPlaces ?? [])].filter((place): place is Place => Boolean(place));
    const uniquePlaces = [...new Map(chosenPlaces.map(place => [place.id, place])).values()];
    return normalizeScheduleFacts({ version:1,title:currentPlan.title,city:inspirationCity,summary:currentPlan.desc,duration:currentPlan.duration??"",budgetPreference:choices.budget,priceNote:currentBudgetText,capturedAt:new Date().toISOString(),timeline:currentPlan.timeline??[],places:uniquePlaces });
  }

  function viewSavedRoute() {
    if (!scheduledFacts) { notify("这条旧安排没有保存路线，无法还原；名称、日期和城市仍然有效。"); return; }
    const savedPlaces: Place[] = scheduledFacts.places.map(place => ({...place,type:"",businessArea:"",rating:"",category:"",recommendationReasons:["保存时选择的地点参考"],verifiedBy:"saved"}));
    setAiPlans([{eyebrow:"已保存的灵感参考",title:scheduledFacts.title,meta:`保存于 ${scheduledFacts.capturedAt.slice(0,10)}`,desc:scheduledFacts.summary,tone:"primary",duration:scheduledFacts.duration,timeline:scheduledFacts.timeline,places:savedPlaces,includedPlaces:savedPlaces,estimatedCost:null,budgetMatch:"unknown"}]);
    setChoices(current=>({...current,budget:scheduledFacts.budgetPreference||current.budget}));setSelectedPlan(0);setSelectedPlaceIndexes([0,0,0]);setViewingSavedRoute(true);go("plan");
  }

  async function loadMemories(silent=false) {
    if (!account?.authenticated) return;
    try { const response=await fetch("/api/memories",{cache:"no-store"}); const data=await response.json() as {memories?:MemoryRecord[];error?:string}; if(!response.ok||!data.memories)throw new Error(data.error||"回忆读取失败。"); setMemories(data.memories); if(currentMemory)setCurrentMemory(data.memories.find(memory=>memory.id===currentMemory.id)??null); }
    catch(error){if(!silent)notify(error instanceof Error?error.message:"回忆读取失败。");}
  }

  async function openMemoryForSchedule(){if(!sharedSchedule)return;let memory=memories.find(item=>item.scheduleId===sharedSchedule.id);if(!memory){await loadMemories(true);try{const response=await fetch("/api/memories",{cache:"no-store"});const data=await response.json() as {memories?:MemoryRecord[]};memory=data.memories?.find(item=>item.scheduleId===sharedSchedule.id);}catch{/* The empty state below remains honest. */}}if(memory)openMemory(memory);else notify("回忆正在同步，请稍后再试");}

  function openMemory(memory:MemoryRecord){setCurrentMemory(memory);setMemoryDraft({title:memory.title,date:memory.eventDate,place:memory.city,copy:memory.note});setMemoryNote(memory.note);setMemoryShare(memory.shareContribution);setUploadedMedia(memory.mediaId&&memory.mediaUrl?{id:memory.mediaId,url:memory.mediaUrl,visibility:memory.shareContribution?"shared":"personal"}:null);setMemoryContentRetracted(false);go("memory");}
  function startNewMemory(){setCurrentMemory(null);setMemoryDraft({title:"",date:dateInputValue(0),place:profile.city,copy:""});setMemoryNote("");setMemoryShare(false);setUploadedMedia(null);setFormError("");go("memoryCreate");}

  async function updateScheduleCompletion(action:"request_complete"|"confirm_complete"){
    if(!sharedSchedule)return;setScheduleBusy(true);
    try{const response=await fetch("/api/schedules",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({id:sharedSchedule.id,action,version:sharedSchedule.version})});const data=await response.json() as {schedule?:ScheduleRecord;error?:string};if(!response.ok||!data.schedule)throw new Error(data.error||"完成确认失败。");setSharedSchedule(data.schedule);setSchedules(current=>current.map(schedule=>schedule.id===data.schedule!.id?data.schedule!:schedule));if(data.schedule.status==="completed"){await loadMemories(true);notify("已确认完成，基础回忆已保存");}else notify("已记录你的确认，等待 TA 确认");}
    catch(error){await loadSharedSchedule(true,true);notify(error instanceof Error?error.message:"完成确认失败。");}finally{setScheduleBusy(false);}
  }

  async function saveMemory(create=false){
    if(!memoryDraft.title.trim()||!memoryDraft.date){setFormError("请填写名称和日期。");return;}setMemoryBusy(true);setFormError("");
    try{const body=create?{title:memoryDraft.title,eventDate:memoryDraft.date,city:memoryDraft.place||profile.city,note:memoryDraft.copy,mediaId:uploadedMedia?.id}:{id:currentMemory?.id,action:"update",version:currentMemory?.version,title:memoryDraft.title,note:memoryNote,mediaId:uploadedMedia?.id,shareContribution:memoryShare};const response=await fetch("/api/memories",{method:create?"POST":"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify(body)});const data=await response.json() as {memory?:MemoryRecord;error?:string};if(!response.ok||!data.memory)throw new Error(data.error||"回忆保存失败。");setCurrentMemory(data.memory);await loadMemories(true);setPanel("");notify("回忆已保存，并记录了内容来源");go(create?"memories":"memory");}
    catch(error){notify(error instanceof Error?error.message:"回忆保存失败。");}finally{setMemoryBusy(false);}
  }

  async function deleteCurrentMemory(){if(!currentMemory)return;setMemoryBusy(true);try{const response=await fetch("/api/memories",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({id:currentMemory.id,action:"delete",version:currentMemory.version})});const data=await response.json() as {error?:string};if(!response.ok)throw new Error(data.error||"删除失败。");setCurrentMemory(null);await loadMemories(true);setPanel("");go("memories");notify("已删除你的回忆副本");}catch(error){notify(error instanceof Error?error.message:"删除失败。");}finally{setMemoryBusy(false);}}
  async function retractCurrentMemoryContent(){if(!currentMemory)return;setMemoryBusy(true);try{const response=await fetch("/api/memories",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({id:currentMemory.id,action:"retract_content",version:currentMemory.version})});const data=await response.json() as {memory?:MemoryRecord;error?:string};if(!response.ok||!data.memory)throw new Error(data.error||"撤回失败。");setCurrentMemory(data.memory);setMemoryNote("");setUploadedMedia(null);await loadMemories(true);setPanel("");notify("你的文字和照片已从在线记录中撤回");}catch(error){notify(error instanceof Error?error.message:"撤回失败。");}finally{setMemoryBusy(false);}}
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
      const facts = aiPlans ? selectedFacts() : null;
      const response = await fetch("/api/schedules", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title, eventDate: scheduleDraft.date, eventTime: scheduleDraft.time, city, visibility: "shared", source: aiPlans ? "ai" : "manual", facts }) });
      const data = await response.json() as { schedule?: ScheduleRecord; error?: string };
      if (!response.ok || !data.schedule) throw new Error(data.error || "安排发送失败。");
      setSharedSchedule(data.schedule); setSchedules(current => [data.schedule!, ...current.filter(schedule => schedule.id !== data.schedule!.id)]); setScheduleDraft({ title, date: scheduleDraft.date, time: scheduleDraft.time, city });
      showDateInCalendar(localDate(scheduleDraft.date)); setAdopted(true); setPartnerAccepted(false); setTaskLinked(taskContextActive); go("schedule");
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
      setSharedSchedule(data.schedule); setSchedules(current => current.map(schedule => schedule.id === data.schedule!.id ? data.schedule! : schedule)); setPartnerAccepted(true); notify("安排已接受，双方共同日历已同步");
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
    setAdopted(true); setPartnerAccepted(schedule.status === "confirmed"); setCancelledState(schedule.status === "cancelled"); setPublicShareLink(null);
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
      const facts = source === "ai" ? selectedFacts() : null;
      const response = await fetch("/api/schedules", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title, eventDate: next.date, eventTime: next.time, city, visibility: "personal", source, facts }) });
      const data = await response.json() as { schedule?: ScheduleRecord; error?: string };
      if (!response.ok || !data.schedule) throw new Error(data.error || "个人计划保存失败。");
      setSharedSchedule(data.schedule); setSchedules(current => [data.schedule!, ...current.filter(schedule => schedule.id !== data.schedule!.id)]); setScheduleDraft({ title, date: next.date, time: next.time, city });
      showDateInCalendar(localDate(next.date)); setAdopted(true); setPartnerAccepted(false);
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
    if (!account?.authenticated) { setLocationPrefs(current => ({ ...current, city: "", district: "", districtSource: "none", longitude: null, latitude: null, label: "尚未定位" })); notify("城市已更新"); return; }
    try {
      const response = await fetch("/api/account", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ nickname: profile.name, birthday: profile.birthday, city }) });
      const data = await response.json() as AccountSnapshot & { error?: string };
      if (!response.ok) throw new Error(data.error || "城市同步失败。");
      setAccount(data); setLocationPrefs(current => ({ ...current, city: "", district: "", districtSource: "none", longitude: null, latitude: null, label: "尚未定位" })); notify("城市已更新并同步到账户");
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
        if (safety && reportReason) { try { await fetch("/api/feedback", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ category: "隐私与安全", message: `安全举报：${reportReason}` }) }); } catch { /* Safety exit must never depend on report delivery. */ } }
        const response = await fetch("/api/relationship/leave", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ safety }) });
        const data = await response.json() as { ok?: boolean; error?: string };
        if (!response.ok || !data.ok) throw new Error(data.error || "退出关系失败。");
        await loadAccount(true); await Promise.all([loadSharedSchedule(true), loadSharedExperiences(true), loadMemories(true)]);
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
    setInviteCodeValue(""); setJoinCode(""); setReportReason(""); setPanel(""); history.current=[]; go("relationshipArchive",true);
  }
  function useCurrentLocation() {
    if (!navigator.geolocation) {
      reportServiceIssue("location", "当前浏览器不支持定位", "可以直接填写商圈或区域，其他灵感条件不受影响。");
      notify("当前浏览器不支持定位，请填写商圈"); return;
    }
    if (isLocating) return;
    clearServiceIssue("location"); setIsLocating(true);
    notify("正在获取当前位置…");
    navigator.geolocation.getCurrentPosition(
      async position => {
        const accuracy = new Intl.NumberFormat("zh-CN").format(Math.round(position.coords.accuracy));
        setLocationPrefs(current => ({ ...current, longitude: position.coords.longitude, latitude: position.coords.latitude, label: "已定位，正在识别所在区域…" }));
        try {
          const response = await fetch("/api/location", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ longitude: position.coords.longitude, latitude: position.coords.latitude }) });
          const data = await response.json() as { location?: ResolvedLocation; error?: string };
          if (!response.ok || !data.location) throw new Error(data.error || "区域识别失败");
          const resolved = data.location;
          setLocationPrefs(current => ({ ...current, city: resolved.city, district: resolved.businessArea || resolved.district, districtSource: "auto", longitude: resolved.longitude, latitude: resolved.latitude, label: `已定位 · ${resolved.city}${resolved.displayName} · 精度约 ${accuracy} 米` }));
          clearServiceIssue("location");
          notify(`已自动填写${resolved.displayName}，仍可手动修改`);
        } catch {
          setLocationPrefs(current => ({ ...current, label: `已定位 · 精度约 ${accuracy} 米；区域识别失败，可手动填写` }));
          reportServiceIssue("location", "已获取位置，但无法识别商圈", "坐标已经保留。可以重新识别，或直接填写商圈后继续生成灵感。");
          notify("已获取坐标，但暂时无法识别商圈，可手动填写");
        } finally { setIsLocating(false); }
      },
      () => {
        setLocationPrefs(current => ({ ...current, label: "定位失败，请允许权限或手动填写商圈" })); setIsLocating(false);
        reportServiceIssue("location", "无法获取当前位置", "请允许浏览器定位权限后重试，或直接填写商圈继续使用。");
        notify("无法获取定位，请允许权限或手动填写商圈");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    );
  }
  async function generate(shouldFail = false, refreshPool = false, feedbackOverride = recommendationFeedback, requestLocation = locationPrefs) {
    requestController.current?.abort(); setViewingSavedRoute(false);
    generationRefresh.current = refreshPool;
    if (shouldFail) {
      const message = "这是手动触发的失败状态预览。已保留全部条件，可以直接重试。";
      setGenerationError(message); reportServiceIssue("ai", "灵感没有生成成功", message); setLoadingFailed(true); go("loading"); return;
    }
    const controller = new AbortController();
    requestController.current = controller;
    const activeFeedback = refreshPool ? feedbackOverride : emptyRecommendationFeedback();
    if (!refreshPool) { setRecommendationFeedback(activeFeedback); setSeenPlaceIds([]); setRatedPlanIdentity(undefined); }
    setRecommendationFeedbackOpen(false);
    setGenerationError(""); clearServiceIssue("ai"); setLoadingFailed(false); setCandidatePool(null); go("loading");
    try {
      const requestCity = requestLocation.city || profile.city;
      const response = await fetch("/api/inspiration", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ city: requestCity, moods: myStates, partnerMood: hasRelationship ? choices.taMood : undefined, vibe: choices.vibe, time: choices.time, budget: choices.budget, space: choices.space, special: choices.special.trim(), district: requestLocation.district, districtSource: requestLocation.districtSource, radius: requestLocation.radius, longitude: requestLocation.longitude, latitude: requestLocation.latitude, excludePlaceIds: refreshPool ? [...new Set([...seenPlaceIds, ...activeFeedback.placeIds])].slice(-60) : [], excludeCategories: refreshPool ? activeFeedback.categories : [], excludeBrands: refreshPool ? activeFeedback.brands.slice(-60) : [], maxDistance: activeFeedback.maxDistance, maxCost: activeFeedback.maxCost }),
        signal: controller.signal,
      });
      const data = await response.json() as { plans?: GeneratedPlanResponse[]; morePlans?: GeneratedPlanResponse[]; weather?: WeatherForecast | null; pool?: CandidatePool; error?: string; code?: string };
      if (controller.signal.aborted) return;
      if (data.code === "NO_MATCHING_PLACES") {
        setCandidatePool(data.pool ?? null);
        const message = refreshPool ? "没有更多符合当前条件与反馈的新地点。已保留原方案和反馈。" : "暂时没有找到符合当前条件的真实地点。已保留全部选择。";
        setGenerationError(message); setLoadingFailed(true);
        reportServiceIssue("location", "暂时没有找到合适的真实地点", `${message} 可以重新搜索，或返回调整商圈与搜索范围。`);
        return;
      }
      if (["RATE_LIMITED", "DAILY_LIMITED", "AI_NOT_CONFIGURED", "AI_CONFIG_INVALID", "GENERATION_FAILED", "AI_CIRCUIT_OPEN"].includes(data.code ?? "") || !response.ok || !data.plans) {
        const title = data.code === "RATE_LIMITED" ? "请求有点频繁" : data.code === "DAILY_LIMITED" ? "今天的 AI 灵感次数已用完" : "灵感没有生成成功";
        const message = data.code === "RATE_LIMITED" ? "请稍等片刻后再试，已保留全部条件。" : data.code === "DAILY_LIMITED" ? "已保留全部条件，可以明天继续生成。" : refreshPool ? "暂时无法补充新方案，已保留原方案和反馈。可稍后重试或返回修改条件。" : data.error || "暂时无法生成符合条件的方案。已保留全部选择。";
        setGenerationError(message); setLoadingFailed(true); reportServiceIssue("ai", title, message); return;
      }
      if (data.weather && data.weather.queryCity === requestCity) { weatherRequest.current += 1; setWeather(data.weather); clearServiceIssue("weather"); }
      setCandidatePool(data.pool ?? null);
      const fallback = data.code === "REAL_PLACE_FALLBACK";
      const freshPlans = [...data.plans.map((plan, index) => toPlan(plan, index, choices.time, choices.budget, fallback)), ...(data.morePlans ?? []).map((plan, index) => toPlan(plan, index + 3, choices.time, choices.budget, true))];
      const eligible = selectUnseenPlans([...(refreshPool ? morePlans : []), ...freshPlans], activeFeedback, refreshPool ? seenPlaceIds : []);
      if (!eligible.length) throw new Error("没有更多符合当前条件与反馈的新方案。可返回修改条件，或稍后再试。");
      const displayedPlans = eligible.slice(0, 3);
      setAiPlans(displayedPlans);
      setMorePlans(eligible.slice(3));
      const displayedPlaceIds = displayedPlans.flatMap(plan => recommendationPlaces(plan).map(place => place.id));
      setSeenPlaceIds(current => [...new Set([...(refreshPool ? current : []), ...displayedPlaceIds])]);
      setSelectedPlaceIndexes([0, 0, 0]); setSelectedPlan(0); setHasGenerated(true); clearServiceIssue("ai"); clearServiceIssue("location"); go("results");
      if (data.code === "REAL_PLACE_FALLBACK") notify("AI 暂时繁忙，已根据真实地点生成可执行方案");
      if (["UNVERIFIED_AI_FALLBACK", "UNVERIFIED_RULE_FALLBACK"].includes(data.code ?? "")) {
        reportServiceIssue("location", "真实地点暂时无法核验", "已生成活动方向；具体商家、距离与营业状态需要稍后重新搜索或出发前确认。");
        notify("已生成活动方向，具体地点暂时需要自行确认");
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      const message = error instanceof Error ? error.message : "灵感暂时没有生成成功。";
      setGenerationError(message); reportServiceIssue("ai", "灵感没有生成成功", `${message} 已保留全部条件，可以直接重试。`);
      setLoadingFailed(true);
    } finally {
      if (requestController.current === controller) requestController.current = null;
    }
  }
  function replaceSelectedPlan(feedback = recommendationFeedback, notice = "已换成一个未看过的方案") {
    const next = selectUnseenPlans(morePlans, feedback, seenPlaceIds)[0];
    if (!next) { notify("本批候选已看完，正在寻找新的地点"); void generate(false, true, feedback); return; }
    const identity = planIdentity(next);
    setMorePlans(current => current.filter(plan => planIdentity(plan) !== identity));
    setAiPlans(current => current?.map((plan, index) => index === selectedPlan ? next : plan) ?? current);
    setSelectedPlaceIndexes(current => current.map((value, index) => index === selectedPlan ? 0 : value));
    setSeenPlaceIds(current => [...new Set([...current, ...recommendationPlaces(next).map(place => place.id)])]);
    setRecommendationFeedbackOpen(false);
    notify(notice);
  }
  function replacePlanBatch() {
    if (eligibleMorePlans.length < 3) { notify("本批剩余方案不足，正在补充新的地点"); void generate(false, true); return; }
    const batch = eligibleMorePlans.slice(0, 3);
    const identities = new Set(batch.map(planIdentity));
    setAiPlans(batch);
    setMorePlans(current => current.filter(plan => !identities.has(planIdentity(plan))));
    setSeenPlaceIds(current => [...new Set([...current, ...batch.flatMap(plan => recommendationPlaces(plan).map(place => place.id))])]);
    setSelectedPlaceIndexes([0, 0, 0]); setSelectedPlan(0); setRecommendationFeedbackOpen(false); notify("已换成 3 个未看过的方案");
  }
  async function persistRecommendationFeedback(sentiment: "suitable" | "unsuitable", reason?: FeedbackReason) {
    const ratedPlan = currentPlan;
    const identity = planIdentity(ratedPlan);
    setRecommendationFeedbackBusy(true);
    try {
      const response = await fetch("/api/recommendation-feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sentiment,
          reason: reason ? feedbackReasonCodes[reason] : undefined,
          category: ratedPlan.category,
          places: recommendationPlaces(ratedPlan).map(place => ({ id: place.id, name: place.name, category: place.category, distance: place.distance })),
          estimatedCost: ratedPlan.estimatedCost ?? null,
        }),
      });
      if (!response.ok) throw new Error("反馈保存失败");
      setRatedPlanIdentity(identity);
      if (sentiment === "suitable") notify("已记住这类偏好，后续推荐会适当提高排序");
    } catch {
      notify(sentiment === "suitable" ? "暂时无法保存偏好，请稍后再试" : "已完成本次更换，但长期偏好暂未保存");
    } finally { setRecommendationFeedbackBusy(false); }
  }
  function likeCurrentPlan() {
    setRecommendationFeedbackOpen(false);
    void persistRecommendationFeedback("suitable");
  }
  function dislikeCurrentPlan(reason: FeedbackReason) {
    const places = recommendationPlaces(currentPlan);
    const primary = currentPlan.places?.[0];
    const distance = recommendationDistance(currentPlan);
    const nextFeedback: RecommendationFeedback = {
      placeIds: [...new Set([...recommendationFeedback.placeIds, ...places.map(place => place.id)])],
      brands: [...new Set([...recommendationFeedback.brands, ...places.map(place => recommendationBrandKey(place.name))])],
      categories: ["不新奇", "不符合状态"].includes(reason) && primary?.category ? [...new Set([...recommendationFeedback.categories, primary.category])] : recommendationFeedback.categories,
      maxDistance: reason === "太远" && distance !== null ? Math.min(recommendationFeedback.maxDistance ?? Infinity, distance) : recommendationFeedback.maxDistance,
      maxCost: reason === "太贵" && currentPlan.estimatedCost !== null && currentPlan.estimatedCost !== undefined ? Math.min(recommendationFeedback.maxCost ?? Infinity, Math.max(0, currentPlan.estimatedCost)) : recommendationFeedback.maxCost,
    };
    setRecommendationFeedback(nextFeedback);
    setRecommendationFeedbackOpen(false);
    void persistRecommendationFeedback("unsuitable", reason);
    replaceSelectedPlan(nextFeedback, `已记住“${reason}”，并更换当前方案`);
  }
  function resetJourney() {
    setTaskLinked(false); setTaskContextActive(false); void loadSharedSchedule(true); void loadSharedExperiences(true); void loadMemories(true); go("home");
  }
  function clearAppBrowserData() {
    window.sessionStorage.removeItem(INSPIRATION_DRAFT_KEY);
    LEGACY_STORAGE_KEYS.forEach(key => window.localStorage.removeItem(key));
    ["love-diary-legacy-backup", "love-diary-legacy-plan-migrated", "love-diary-legacy-plan-dismissed", "love-diary-solo-user"].forEach(key => window.localStorage.removeItem(key));
  }
  function clearLocalSession() {
    clearAppBrowserData();
    setChoices({ mood: "想放松", taMood: "和我一样", vibe: "安静", time: "今晚", budget: "¥100–300", space: "都可以", special: "" });
    setMyStates(["想放松"]); setCustomStates([]); setLocationPrefs({ city: "", district: "", districtSource: "none", radius: 5000, longitude: null, latitude: null, label: "尚未定位" });
    setLegacyPlan(null); setSoloMode(false); setAiPlans(null); setMorePlans([]); setSeenPlaceIds([]); setRecommendationFeedback(emptyRecommendationFeedback()); setRecommendationFeedbackOpen(false); setRatedPlanIdentity(undefined); setHasGenerated(false); setTaskContextActive(false); setTaskLinked(false); setMemoryContentRetracted(false); setRelationshipExited(false); setSafetyExitUsed(false); setPanel("");
    history.current = []; void loadSharedSchedule(true); void loadSharedExperiences(true); go("welcome", true);
  }

  async function loadPreferences(silent = false) {
    if (!account?.authenticated) return;
    try {
      const response = await fetch("/api/preferences", { cache: "no-store" });
      const data = await response.json() as { preferences?: Preferences; error?: string };
      if (!response.ok || !data.preferences) throw new Error(data.error || "提醒设置读取失败。");
      setPreferences(data.preferences);
    } catch (error) { if (!silent) notify(error instanceof Error ? error.message : "提醒设置读取失败。"); }
  }

  async function loadMyMedia(silent = false) {
    if (!account?.authenticated) return;
    try {
      const response = await fetch("/api/media", { cache: "no-store" });
      const data = await response.json() as { media?: UploadedMedia[]; error?: string };
      if (!response.ok || !data.media) throw new Error(data.error || "照片读取失败。");
      const latest = data.media[0] ?? null;
      setUploadedMedia(latest);
    } catch (error) { if (!silent) notify(error instanceof Error ? error.message : "照片读取失败。"); }
  }

  async function updatePreference(key: keyof Preferences, value: boolean) {
    const previous = preferences;
    const next = { ...preferences, [key]: value };
    setPreferences(next); setPreferencesBusy(true);
    try {
      const response = await fetch("/api/preferences", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(next) });
      const data = await response.json() as { preferences?: Preferences; error?: string };
      if (!response.ok || !data.preferences) throw new Error(data.error || "提醒设置保存失败。");
      setPreferences(data.preferences); notify("提醒设置已保存");
    } catch (error) { setPreferences(previous); notify(error instanceof Error ? error.message : "提醒设置保存失败。"); }
    finally { setPreferencesBusy(false); }
  }

  async function uploadMemoryPhoto(file: File) {
    if (!account?.authenticated) { notify("请先登录后再上传照片"); return; }
    setMediaBusy(true);
    try {
      const form = new FormData(); form.set("file", file); form.set("visibility", "personal");
      const response = await fetch("/api/media", { method: "POST", body: form });
      const data = await response.json() as { media?: UploadedMedia; error?: string };
      if (!response.ok || !data.media) throw new Error(data.error || "照片上传失败。");
      setUploadedMedia(data.media); setMemoryContentRetracted(false); notify("照片已安全上传");
    } catch (error) { notify(error instanceof Error ? error.message : "照片上传失败。"); }
    finally { setMediaBusy(false); }
  }

  async function retractUploadedMedia() {
    if (!uploadedMedia) { setMemoryContentRetracted(true); setPanel(""); return; }
    setMediaBusy(true);
    try {
      const response = await fetch("/api/media", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: uploadedMedia.id }) });
      const data = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) throw new Error(data.error || "照片撤回失败。");
      setUploadedMedia(null); setMemoryContentRetracted(true); setPanel(""); notify("照片已撤回，在线文件已删除");
    } catch (error) { notify(error instanceof Error ? error.message : "照片撤回失败。"); }
    finally { setMediaBusy(false); }
  }

  async function createPublicShareLink() {
    if (!sharedSchedule) return;
    setShareBusy(true);
    try {
      const response = await fetch("/api/share-links", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ scheduleId: sharedSchedule.id, expiresInDays: 7 }) });
      const data = await response.json() as { link?: PublicShareLink; error?: string };
      if (!response.ok || !data.link) throw new Error(data.error || "分享链接创建失败。");
      setPublicShareLink(data.link); setManagedShareLinks(current=>[{ id:data.link!.id, scheduleId:sharedSchedule.id, title:sharedSchedule.title, expiresAt:data.link!.expiresAt, revokedAt:null, createdAt:new Date().toISOString() },...current]); notify("7 天有效的分享链接已创建");
    } catch (error) { notify(error instanceof Error ? error.message : "分享链接创建失败。"); }
    finally { setShareBusy(false); }
  }

  async function revokePublicShareLink() {
    if (!publicShareLink) return;
    setShareBusy(true);
    try {
      const response = await fetch("/api/share-links", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: publicShareLink.id }) });
      const data = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) throw new Error(data.error || "分享链接撤回失败。");
      setManagedShareLinks(current=>current.filter(link=>link.id!==publicShareLink.id)); setPublicShareLink(null); notify("分享链接已立即失效");
    } catch (error) { notify(error instanceof Error ? error.message : "分享链接撤回失败。"); }
    finally { setShareBusy(false); }
  }

  async function loadManagedShareLinks(silent = false) {
    if (!account?.authenticated) return;
    try {
      const response = await fetch("/api/share-links", { cache: "no-store" });
      const data = await response.json() as { links?: ManagedShareLink[]; error?: string };
      if (!response.ok || !data.links) throw new Error(data.error || "分享记录读取失败。");
      setManagedShareLinks(data.links.filter(link=>!link.revokedAt&&new Date(link.expiresAt).getTime()>Date.now()));
    } catch (error) { if (!silent) notify(error instanceof Error ? error.message : "分享记录读取失败。"); }
  }

  async function revokeManagedShareLink(id: string) {
    setShareBusy(true);
    try {
      const response = await fetch("/api/share-links", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) });
      const data = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) throw new Error(data.error || "分享链接撤回失败。");
      setManagedShareLinks(current=>current.filter(link=>link.id!==id)); if(publicShareLink?.id===id)setPublicShareLink(null); notify("分享链接已立即失效");
    } catch (error) { notify(error instanceof Error ? error.message : "分享链接撤回失败。"); }
    finally { setShareBusy(false); }
  }

  async function copyPublicShareLink() {
    if (!publicShareLink) return;
    try { await navigator.clipboard.writeText(new URL(publicShareLink.path, window.location.origin).href); notify("分享链接已复制"); }
    catch { notify("浏览器未允许复制，请长按链接复制"); }
  }

  async function submitFeedback() {
    if (!feedbackDraft.message.trim()) { notify("请先填写反馈内容"); return; }
    setFeedbackBusy(true);
    try {
      const response = await fetch("/api/feedback", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(feedbackDraft) });
      const data = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) throw new Error(data.error || "反馈提交失败。");
      setFeedbackDraft(current => ({ ...current, message: "" })); notify("反馈已提交，感谢你的帮助");
    } catch (error) { notify(error instanceof Error ? error.message : "反馈提交失败。"); }
    finally { setFeedbackBusy(false); }
  }

  async function exportMyData() {
    try {
      const response = await fetch("/api/account/export", { cache: "no-store" });
      if (!response.ok) { const data = await response.json() as { error?: string }; throw new Error(data.error || "数据导出失败。"); }
      const blob = await response.blob(); const url = URL.createObjectURL(blob); const link = document.createElement("a");
      link.href = url; link.download = `love-diary-export-${dateInputValue(0)}.json`; link.click(); URL.revokeObjectURL(url); notify("数据文件已下载");
    } catch (error) { notify(error instanceof Error ? error.message : "数据导出失败。"); }
  }

  async function deleteMyAccount() {
    if (deletionPhrase.trim() !== "注销账号") { setDeletionError("请输入“注销账号”完成确认。"); return; }
    setDeletionBusy(true); setDeletionError("");
    try {
      const response = await fetch("/api/account", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ confirmation: deletionPhrase.trim() }) });
      const data = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) throw new Error(data.error || "账号注销暂未完成。");
      clearAppBrowserData();
      window.location.assign("/signout-with-chatgpt?return_to=%2F");
    } catch (error) { setDeletionError(error instanceof Error ? error.message : "账号注销暂未完成，请稍后重试。"); }
    finally { setDeletionBusy(false); }
  }

  useEffect(() => {
    // The remote account snapshot is authoritative and arrives asynchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadAccount(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const refreshAccount = () => { if (document.visibilityState === "visible") { void loadAccount(true); void refreshSharedData(true); } };
    window.addEventListener("focus", refreshAccount);
    document.addEventListener("visibilitychange", refreshAccount);
    return () => {
      window.removeEventListener("focus", refreshAccount);
      document.removeEventListener("visibilitychange", refreshAccount);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?.authenticated, account?.relationship?.id]);

  useEffect(() => {
    if (!account?.authenticated) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshSharedData(false); void loadMemories(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?.authenticated, account?.relationship?.id]);

  useEffect(() => {
    if (screen !== "calendar" || !account?.authenticated || !account.relationship?.id) return;
    const refreshSharedCalendar = () => { void refreshSharedData(true); };
    const timer = window.setInterval(refreshSharedCalendar, 5000);
    return () => window.clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, account?.authenticated, account?.relationship?.id]);

  useEffect(() => {
    if (!account?.authenticated || !["results", "plan", "confirm", "schedule", "calendar"].includes(screen)) return;
    const city = ["confirm", "schedule", "calendar"].includes(screen) ? scheduleDraft.city || profile.city : viewingSavedRoute&&scheduledFacts ? scheduledFacts.city : inspirationCity;
    window.queueMicrotask(() => void loadWeather(city, true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, account?.authenticated, inspirationCity, profile.city, scheduleDraft.city, viewingSavedRoute, scheduledFacts]);

  useEffect(() => {
    if (screen === "notifications" && account?.authenticated) window.queueMicrotask(() => void loadPreferences(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, account?.authenticated]);

  useEffect(() => {
    if (screen === "storage" && account?.authenticated) window.queueMicrotask(() => { void loadMyMedia(true); void loadManagedShareLinks(true); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, account?.authenticated]);

  useEffect(() => {
    if (screen === "accountDeletion") return;
    // Destructive confirmation must never survive leaving this screen.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDeletionPhrase(""); setDeletionError("");
  }, [screen]);

  useEffect(() => {
    if (["home","memories","memory"].includes(screen) && account?.authenticated) window.queueMicrotask(() => void loadMemories(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, account?.authenticated, account?.relationship?.id]);

  useEffect(() => {
    if (screen !== "connect" || !account?.authenticated || account.relationship?.partner_id) return;
    const timer = window.setInterval(() => void loadAccount(true), 5000);
    return () => window.clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, account?.authenticated, account?.relationship?.partner_id]);

  useEffect(() => {
    if (!account?.authenticated || account.relationship?.partner_id || soloMode || relationshipExited) return;
    const relationshipRequired: Screen[] = ["contentReview", "home", "inspire", "loading", "results", "plan", "location", "confirm", "schedule", "calendar", "memory", "memories", "memoryCreate", "task", "taskHistory", "profile", "settings", "notifications", "privacy", "storage", "help", "about", "relationshipSafety", "important", "importantCreate"];
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
        const data = JSON.parse(savedDraft) as { choices?: typeof choices; myStates?: string[]; customStates?: string[]; district?: string; districtSource?: LocationPreferences["districtSource"]; radius?: number };
        // Session storage only keeps this tab's unfinished inspiration form.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (data.choices) setChoices(current => ({ ...current, ...data.choices, special: data.choices?.special ?? "" }));
        if (Array.isArray(data.myStates)) setMyStates(data.myStates.slice(0, 2));
        if (Array.isArray(data.customStates)) setCustomStates(data.customStates.slice(0, 12));
        if (typeof data.district === "string" || [3000, 5000, 10000].includes(data.radius ?? 0)) {
          setLocationPrefs(current => ({ ...current, district: data.district?.slice(0, 40) ?? "", districtSource: ["auto", "manual"].includes(data.districtSource ?? "") ? data.districtSource! : "none", radius: [3000, 5000, 10000].includes(data.radius ?? 0) ? data.radius! : current.radius }));
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
    const updateClock = () => { const now=new Date(); setNowEpoch(now.getTime()); setClock(new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false }).format(now)); };
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
    window.sessionStorage.setItem(INSPIRATION_DRAFT_KEY, JSON.stringify({ choices, myStates, customStates, district: locationPrefs.district, districtSource: locationPrefs.districtSource, radius: locationPrefs.radius }));
  }, [choices, myStates, customStates, locationPrefs.district, locationPrefs.districtSource, locationPrefs.radius]);

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

  const memoryCoverUrl = currentMemory?.mediaUrl ?? currentMemory?.partnerContribution?.mediaUrl ?? null;
  const showSyncIssue = Boolean(serviceIssues.sync && account?.authenticated && ["home", "calendar", "schedule", "important", "task"].includes(screen));
  const weatherIssueNotice = (city: string) => serviceIssues.weather ? <ServiceIssueCard issue={serviceIssues.weather} retryLabel="重新获取天气" onRetry={() => void loadWeather(city, false, true)}/> : null;
  const loadingIssue = serviceIssues.location ?? serviceIssues.ai ?? { source: "ai" as const, title: "灵感没有生成成功", detail: generationError || "已保留全部条件，可以直接重试。" };

  return (
    <main className="prototype-shell" id="main-content">
      <aside className="prototype-notes">
        <div className="brand-mark">日</div>
        <p className="kicker">恋爱日记 · V59 单人与共同体验</p>
        <h1>把一起生活的<br/>小事，好好留下。</h1>
        <p className="intro">从一个轻松的约会灵感开始，经过双方确认，成为共同安排，最后自然沉淀为回忆。</p>
        <ol className="journey" aria-label="体验流程">
          {["相遇", "我们", "灵感", "计划", "安排", "日历", "回忆"].map((label, i) => <li key={label} className={step >= i + 1 ? "done" : ""} aria-current={step === i + 1 ? "step" : undefined}><i aria-hidden="true">{step > i + 1 ? "✓" : i + 1}</i><span>{label}</span></li>)}
        </ol>
        <p className="hint">V59 在保留推荐反馈与异常恢复的同时，补齐协议、隐私政策和账号注销。</p>
      </aside>

      <section className="phone-stage">
        <div className="phone">
          <div className="statusbar" aria-hidden="true"><span>{clock}</span><span className="island"/><span>● ◒ ▰</span></div>
          <div className={`screen screen-${screen} ${hasRelationship?"":"solo-mode"}`}>
            {showSyncIssue&&<div className="service-issue-wrap"><ServiceIssueCard issue={serviceIssues.sync!} retryLabel="立即同步" busy={syncBusy} onRetry={() => void refreshSharedData(true, true)}/></div>}
            {screen === "welcome" && (
              <div className="welcome page-full">
                <div className="soft-orb orb-one"/><div className="soft-orb orb-two"/>
                <div className="welcome-symbol"><span>♥</span><span>♥</span></div>
                <div className="welcome-copy"><p className="kicker">恋爱日记</p><h2>两个人的生活，<br/>值得被温柔记住。</h2><p>一起计划，一起经历，<br/>也一起拥有属于我们的回忆。</p></div>
                <div className="welcome-actions">{account?.authenticated ? hasRelationship ? <><button className="primary-button" onClick={() => go("home")}>进入我们的空间 <Arrow /></button><a className="account-link" href="/signout-with-chatgpt?return_to=%2F">退出当前账号</a></> : <><button className="primary-button" onClick={() => {setOnboardingIntent("solo");go(soloMode?"home":"age");}}>{soloMode?"继续单人体验":"先自己体验"} <Arrow /></button><button className="ghost-button welcome-join" onClick={() => {setOnboardingIntent("invite");go(soloMode?"profileSetup":"age");}}>邀请 TA 一起使用</button><button className="account-link" onClick={() => {setOnboardingIntent("join");go(soloMode?"connect":"age");}}>我有 TA 的邀请码</button><a className="account-link" href="/signout-with-chatgpt?return_to=%2F">退出当前账号</a></> : <><a className="primary-button sign-in-button" href="/signin-with-chatgpt?return_to=%2F">使用 ChatGPT 登录 <Arrow /></a><p>登录后可先单人体验，以后再邀请 TA</p></>}</div>
              </div>
            )}

            {screen === "age" && <div className="page formal-page onboarding-page"><header><Back onClick={() => back("welcome")}/><span>开始前确认</span><i aria-hidden="true"/></header><section className="page-intro"><p className="kicker">清楚，再继续</p><h2>{onboardingIntent==="solo"?"先从自己的生活开始。":"建立两个人的共同空间。"}</h2><p className="confirm-copy">恋爱日记仅面向已满 18 周岁的用户。AI 建议不会自动变成个人计划或共同事实。</p></section><section className="consent-card"><label htmlFor="age-confirmation" aria-label="确认已满 18 周岁"><input id="age-confirmation" type="checkbox" name="age-confirmation" checked={ageChecked} onChange={e=>{setAgeChecked(e.target.checked);setAgeError("");}}/><span><b>我已满 18 周岁</b><small>未满 18 周岁无法继续使用</small></span></label><label htmlFor="agreement-confirmation" aria-label="同意用户协议与隐私政策"><input id="agreement-confirmation" type="checkbox" name="agreement-confirmation" checked={agreementChecked} onChange={e=>{setAgreementChecked(e.target.checked);setAgeError("");}}/><span><b>我已阅读并同意用户协议与隐私政策</b><small>可随时在设置中再次查看</small></span></label><div className="consent-links"><button onClick={()=>go("terms")}>用户协议</button><button onClick={()=>go("privacyPolicy")}>隐私政策</button></div></section><button className="primary-button" onClick={()=>{if(!ageChecked||!agreementChecked){setAgeError("请确认年龄，并同意用户协议与隐私政策。");window.requestAnimationFrame(()=>ageErrorRef.current?.focus());return;}go("profileSetup");}}>继续填写资料 <Arrow/></button>{ageError&&<p ref={ageErrorRef} className="field-error" role="alert" tabIndex={-1}>{ageError}</p>}</div>}

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
                  <p className="kicker">{hasRelationship?"我们在一起":"我的生活空间"}</p><h2>{hasRelationship?"第 1 天":"从今天开始"}</h2><p className="date-line">{hasRelationship?"从真实发生的今天开始":"先体验，准备好后再邀请 TA"}</p><div className="relation-stats"><span><b>{completedScheduleCount}</b><small>{hasRelationship?"已完成安排":"完成计划"}</small></span><span><b>{hasRelationship&&taskDone ? 1 : 0}</b><small>{hasRelationship?"共同任务":"灵感清单"}</small></span><button onClick={() => go("important")}><b>{importantDays.length}</b><small>重要日子</small></button></div>
                </div>
                <section className="status-note"><div><p className="kicker">{hasRelationship?"我们的近况":"我的近况"}</p><p>{adopted ? (scheduleIsShared?"已经有一件共同安排，等待你们一起经历。":"已经保存一项个人计划，随时可以继续完善。") : (hasRelationship?"这里暂时没有统计。完成第一件共同体验后，近况会自然出现。":"先找一份灵感，保存为只对自己可见的计划。")}</p></div><button onClick={() => notify(hasRelationship?"近况只根据双方确认的安排、任务与回忆生成":"单人阶段的内容默认不会向未来的伴侣公开")}>查看依据</button></section>
                {needsHistoryReview&&<section className="history-review-card"><div><p className="kicker">历史内容仍保持私密</p><h3>确认过去的个人计划如何处理</h3><p>系统不会自动分享。你可以继续保密，或只发送选中的计划。</p></div><button className="secondary-button" onClick={()=>go("contentReview")}>现在确认 <Arrow/></button></section>}
                {legacyPlan&&!adopted&&account?.authenticated&&<section className="legacy-plan-card" aria-labelledby="legacy-plan-title"><div><p className="kicker">发现旧版本计划</p><h3 id="legacy-plan-title">{legacyPlan.title}</h3><p>{legacyPlan.date} · {legacyPlan.time} · {legacyPlan.city}</p><small>旧计划不会自动恢复。确认后才会导入你的账户，且默认仅自己可见。</small></div><div><button className="secondary-button" disabled={scheduleBusy} onClick={()=>void savePersonalPlan("legacy_import",legacyPlan)}>{scheduleBusy?"正在导入…":"导入旧计划"}</button><button className="ghost-button" disabled={scheduleBusy} onClick={()=>{window.localStorage.setItem("love-diary-legacy-plan-dismissed","1");setLegacyPlan(null);}}>暂不导入</button></div></section>}
                <section className="content-section"><div className="section-heading"><div><p className="kicker">下一件小事</p><h3>{adopted ? (scheduleDraft.title || currentPlan.title) : "今晚，想一起做点什么？"}</h3></div><span aria-hidden="true">→</span></div>
                  {adopted ? <button className="event-card" onClick={() => go("schedule")}><span className="date-block"><b>{String(eventDate.getDate()).padStart(2,"0")}</b><small>{eventWeekday}</small></span><span><b>{scheduleDraft.time} · {scheduleDraft.city || profile.city}</b><small>{scheduleIsShared ? (partnerAccepted ? "双方已接受" : isScheduleCreator ? "等待 TA 接受" : "待你确认") : "我的计划 · 仅自己可见"}</small></span><i aria-hidden="true">›</i></button> : <button className="inspiration-card" onClick={() => go("inspire")}><div className="spark" aria-hidden="true">✦</div><div><b>获取一份约会灵感</b><small>告诉我们此刻的心情，剩下的交给灵感</small></div><i aria-hidden="true">›</i></button>}
                </section>
                {!hasRelationship&&<section className="solo-invite-card"><div><p className="kicker">想一起使用时</p><h3>邀请 TA 建立共同空间</h3><p>个人计划不会自动共享，由你决定发出哪些内容。</p></div><button className="secondary-button" onClick={()=>{setOnboardingIntent("invite");go("connect");}}>邀请 TA <Arrow/></button></section>}
                <section className="content-section memory-peek"><div className="section-heading"><div><p className="kicker">{hasRelationship?"最近的回忆":"我的记录"}</p><h3>{memories[0]?.title??"经历发生后，会自然留在这里"}</h3></div><button onClick={() => go("memories")}>查看全部</button></div>{memories[0]?<button className="photo-card" onClick={()=>openMemory(memories[0])}><div className="photo-art"><span>{new Intl.DateTimeFormat("zh-CN",{month:"2-digit",day:"2-digit"}).format(localDate(memories[0].eventDate))}</span></div><p>{memories[0].city} · {new Intl.DateTimeFormat("zh-CN",{month:"long",day:"numeric"}).format(localDate(memories[0].eventDate))}</p></button>:<button className="empty-content-card" onClick={startNewMemory}><span>♡</span><div><b>{hasRelationship?"还没有共同回忆":"还没有我的记录"}</b><small>完成计划后确认，或手动留下一条真实记录</small></div><i aria-hidden="true">›</i></button>}</section>
                <section className="content-section task-peek"><div className="section-heading"><div><p className="kicker">{hasRelationship?"共同任务":"以后可以一起做"}</p><h3>{hasRelationship?(activeTask?.title??"一起交换一首最近常听的歌"):"交换一首最近常听的歌"}</h3></div>{hasRelationship&&<button onClick={() => go("taskHistory")}>{taskDone ? "查看历史" : "查看任务"}</button>}</div><button className="task-card" onClick={() => go("task")}><span aria-hidden="true">♫</span><div><b>{hasRelationship?(taskAccepted?"任务进行中":activeTask?"等待双方确认":"给平常加一点新鲜"):"共同体验预览"}</b><small>{hasRelationship?(taskAccepted?"去规划一个适合分享音乐的晚上":"任务是邀请，不是待办压力"):"建立关系后，双方确认才会加入共同任务"}</small></div><i aria-hidden="true">›</i></button></section>
                <button className="demo-reset" onClick={resetJourney}>↺ 重置演示状态（保留已保存计划）</button>
                {bottomNav("home")}
              </div>
            )}

            {screen === "inspire" && (
              <div className="page tab-page form-page">
                <header><button className="location-button" onClick={() => setPanel("cityEdit")} aria-label={`切换城市，当前为${inspirationCity}`}>{inspirationCity}⌄</button><span className="header-title">找灵感</span><button className="text-button" onClick={() => {setMyStates(["想放松"]);setChoices({ mood:"想放松",taMood:"和我一样",vibe:"安静",time:"今晚",budget:"¥100–300",space:"都可以",special:"" });}}>重置条件</button></header>
                {taskContextActive && <div className="context-banner"><span>本次灵感目标</span><b>为「交换一首最近常听的歌」找灵感</b><button onClick={() => setTaskContextActive(false)} aria-label="移除共同任务灵感目标">×</button></div>}
                <div className="form-intro"><p className="kicker">{hasRelationship?"此刻的你们":"此刻的我"}</p><h2>{hasRelationship?<>今天想和 TA<br/>怎么度过？</>:<>今天想<br/>怎么度过？</>}</h2><p>不用先想好具体活动，选几个此刻最在意的条件就好。</p></div>
                <section className="nearby-settings" aria-labelledby="nearby-title"><div className="nearby-heading"><div><p className="kicker">从哪里出发</p><h3 id="nearby-title">优先推荐附近地点</h3></div><button type="button" onClick={useCurrentLocation} disabled={isLocating} aria-describedby="location-status">⌖ {isLocating ? "正在定位…" : "使用当前位置"}</button></div><p id="location-status" className="location-status" aria-live="polite">{locationPrefs.label}</p><label>商圈或区域（可选）<input ref={districtInputRef} name="business-district" autoComplete="address-level3" value={locationPrefs.district} onChange={event=>{const district=event.target.value;setLocationPrefs({...locationPrefs,district,districtSource:district.trim()?"manual":"none"});if(district.trim())clearServiceIssue("location");}} maxLength={40} placeholder={locationPrefs.longitude === null ? "定位后自动填写，也可以手动输入" : "未识别到商圈，请手动输入"}/><small className="field-help">{locationPrefs.districtSource==="manual"?(locationPrefs.longitude===null?"已按手动商圈搜索；未定位时无法校验距离范围。":`已按手动商圈优先搜索，并限制在当前位置 ${locationPrefs.radius/1000} 公里内。`):"定位变化后会自动更新；自动结果也可以继续修改。"}</small></label><fieldset className="radius-choice"><legend>地点搜索范围</legend>{[[3000,"3 公里"],[5000,"5 公里"],[10000,"10 公里"]] .map(([radius,label])=><button type="button" key={radius} className={locationPrefs.radius===radius?"active":""} aria-pressed={locationPrefs.radius===radius} onClick={()=>setLocationPrefs({...locationPrefs,radius:Number(radius)})}>{label}</button>)}</fieldset><small>定位只用于本次附近搜索，不保存在共同资料中；也可以拒绝定位并手动填写商圈。</small></section>
                {serviceIssues.location&&<ServiceIssueCard issue={serviceIssues.location} retryLabel="重新定位" onRetry={useCurrentLocation} secondaryLabel="手动填写商圈" onSecondary={()=>districtInputRef.current?.focus()}/>}
                <MultiChoice title="我的状态（最多选2项）" options={["想放松", "有点累", "想热闹", "想尝鲜", "想认真聊聊", ...customStates]} values={myStates} setValues={(values)=>{setMyStates(values);setChoices({...choices,mood:values[0]??"想放松"});}}/>
                <div className="custom-state-editor"><label htmlFor="custom-state">没有合适的状态？</label><div><input id="custom-state" aria-label="自定义状态" name="custom-state" autoComplete="off" value={newState} onChange={e=>setNewState(e.target.value)} maxLength={10} placeholder="例如：刚加完班…"/><button onClick={()=>{const value=newState.trim();if(!value)return;if(!customStates.includes(value))setCustomStates([...customStates,value]);setNewState("");notify("已加入自定义状态，可立即选择");}}>＋ 添加</button></div>{customStates.length>0&&<p>自定义状态可重复使用；点击右侧删除： {customStates.map(state=><button key={state} onClick={()=>{setCustomStates(customStates.filter(x=>x!==state));setMyStates(myStates.filter(x=>x!==state));}}>{state} ×</button>)}</p>}</div>
                {hasRelationship&&<Choice title="TA 呢？" options={["和我一样", "想放松", "想热闹", "不知道"]} value={choices.taMood} setValue={(taMood) => setChoices({...choices,taMood})}/>}
                <Choice title="想要什么感觉？" options={["安静", "热闹", "都可以"]} value={choices.vibe} setValue={(vibe) => setChoices({...choices,vibe})}/>
                <Choice title="时间" options={["现在出发", "今晚", "周末", "暂不确定"]} value={choices.time} setValue={(time) => setChoices({...choices, time})}/>
                <Choice title={`本次安排总预算${hasRelationship?"（两人合计）":""}`} options={["¥100以内", "¥100–300", "¥300+"]} value={choices.budget} setValue={(budget) => setChoices({...choices, budget})}/><p className="budget-help">用于筛选地点；交通、临时加购等额外支出请在出发前确认。</p>
                <Choice title="活动空间" options={["都可以", "室内", "户外"]} value={choices.space} setValue={(space) => setChoices({...choices, space})}/>
                <label className="special-request">还有需要特别照顾的吗？<input name="special-requirements" autoComplete="off" maxLength={120} value={choices.special} onChange={e=>setChoices({...choices,special:e.target.value})} placeholder="例如：少走路、避免辛辣或需要无障碍设施…"/><small className="ai-privacy-note">选填。留空时不会出现在灵感方案中；请勿填写姓名、手机号、邮箱或其他私密内容。</small></label>
                <div className="sticky-cta"><button className="primary-button" onClick={() => generate(false)}>获取 3 个灵感 <span>✦</span></button></div>
                {bottomNav("inspire")}
              </div>
            )}

            {screen === "loading" && (
              <div className="page loading-page"><header><Back onClick={() => back("inspire")}/><span>正在寻找灵感</span><i aria-hidden="true"/></header>{loadingFailed ? <div className="error-state"><ServiceIssueCard variant="blocking" issue={loadingIssue} retryLabel={loadingIssue.source==="location"&&locationPrefs.radius<10000?"扩大到 10 公里重试":"再试一次"} onRetry={()=>{if(loadingIssue.source==="location"&&locationPrefs.radius<10000){const next={...locationPrefs,radius:10000};setLocationPrefs(next);void generate(false,generationRefresh.current,recommendationFeedback,next);}else void generate(false,generationRefresh.current);}} secondaryLabel="调整商圈与条件" onSecondary={()=>go("inspire")}/></div> : <div className="ai-loading" role="status" aria-live="polite"><div className="loading-orbit" aria-hidden="true"><span>✦</span></div><p className="kicker">{hasRelationship?"读懂你们此刻的心情":"读懂你此刻的心情"}</p><h2>正在把今晚，<br/>想得刚刚好。</h2><div className="loading-steps"><span className="on">✓ 匹配{hasRelationship?"你们":"你的"}状态</span><span className="on">• 安排合适的节奏</span><span>• 整理 1 主 + 2 备选</span></div><p>通常在 30 秒内完成；超时会自动采用备用方案，返回仍可保留已选条件。</p></div>}</div>
            )}

            {["results", "plan", "location", "confirm"].includes(screen) && !aiPlans && <div className="page formal-page"><header><Back onClick={() => go("inspire")}/><span>灵感参考</span><i aria-hidden="true"/></header><section className="empty-formal"><span>✦</span><h2>本次灵感尚未生成或已失效</h2><p>已保存的安排仍在日历中。当前版本尚未保存完整灵感路线，不会使用演示内容替代。</p><button className="primary-button" onClick={() => go("inspire")}>返回灵感条件 <Arrow/></button></section></div>}

            {screen === "results" && aiPlans && (
              <div className="page result-page">
                <header><Back onClick={() => back("inspire")}/><span>{hasRelationship?"为你们想到的":"为你想到的"}</span><button className="text-button" onClick={() => go("inspire")}>调整条件</button></header>
                <div className="result-intro"><p className="kicker">{inspirationCity} · {choices.time} · {choices.mood} · {locationPrefs.longitude===null?"商圈搜索 · 距离待定位":`搜索范围 ${locationPrefs.radius/1000} km`}</p><h2>{choices.space === "室内" ? <>留在室内，<br/>也能认真约会。</> : <>不赶时间，<br/>也不辜负今晚。</>}</h2>{inspirationWeather&&<p className="weather-summary">{weatherSource(weather)} · {inspirationWeather.date} · {weatherLabel(inspirationWeather)}</p>}{candidatePool&&candidatePool.candidateCount>0&&<p className="candidate-pool-summary">已从高德返回的 {candidatePool.rawCount} 条结果中，筛出 {candidatePool.candidateCount} 个供进一步核对的候选地点</p>}</div>
                {weatherIssueNotice(inspirationCity)}
                <div className="result-pool-actions"><span>{eligibleMorePlans.length>0?`本批还有 ${eligibleMorePlans.length} 个未展示方案`:"本批候选已接近看完"}</span><button type="button" onClick={replacePlanBatch}>换一批</button></div>
                <div className="plan-stack"><button className={`plan-card primary main-plan ${selectedPlan === 0 ? "chosen" : ""}`} aria-pressed={selectedPlan === 0} onClick={() => {setSelectedPlan(0);setRecommendationFeedbackOpen(false);}}><div className="plan-top"><span>主灵感 · {dynamicPlans[0].places?.length ? "真实地点组合" : "活动方向 · 地点待核验"}</span>{selectedPlan === 0 && <i>✓ 当前方案</i>}</div><h3>{dynamicPlans[0].title}</h3><p className="plan-meta">{choices.time} · 预算偏好 {choices.budget} · {choices.space}</p><b className="plan-introduction-label">方案简介</b><p>{dynamicPlans[0].desc}</p>{dynamicPlans[0].places?.[0]&&<span className="place-preview"><b>真实地点</b>{dynamicPlans[0].includedPlaces?.map(place=>place.name).join(" + ")||dynamicPlans[0].places[0].name} · {placeDistance(dynamicPlans[0].places[0])}</span>}<span className="plan-cost">{planBudgetText(dynamicPlans[0],choices.budget,hasRelationship)} · {planDistanceText(dynamicPlans[0],locationPrefs.radius)}</span>{choices.special.trim()&&<span className="prep-note">特别照顾：{choices.special.trim()}</span>}</button><div className="alternative-title"><b>也可以试试</b><button type="button" onClick={() => replaceSelectedPlan()}>换一个</button></div>{dynamicPlans.slice(1).map((plan, offset) => {const i=offset+1;return <button key={plan.title} className={`plan-card alternative ${selectedPlan === i ? "chosen" : ""}`} aria-pressed={selectedPlan === i} onClick={() => {setSelectedPlan(i);setRecommendationFeedbackOpen(false);}}><div><h3>{plan.title}</h3><p className="plan-meta">{plan.meta}</p>{plan.places?.[0]&&<p className="alternative-place">{plan.includedPlaces?.map(place=>place.name).join(" + ")||plan.places[0].name} · {placeDistance(plan.places[0])}</p>}<small className="alternative-cost">{planBudgetText(plan,choices.budget,hasRelationship)}</small></div><i aria-hidden="true">›</i></button>})}</div>
                <section className="plan-feedback" aria-labelledby="plan-feedback-title"><div><b id="plan-feedback-title">这条灵感合适吗？</b><small>反馈会用于调整你后续看到的排序，不会保存心情、特别照顾或精确位置。</small></div><div className="plan-feedback-actions"><button type="button" className="suitable" disabled={recommendationFeedbackBusy||ratedPlanIdentity===planIdentity(currentPlan)} onClick={likeCurrentPlan}>{ratedPlanIdentity===planIdentity(currentPlan)?"✓ 已记录":"✓ 合适"}</button><button type="button" aria-expanded={recommendationFeedbackOpen} onClick={()=>setRecommendationFeedbackOpen(value=>!value)}>不合适</button></div>{recommendationFeedbackOpen&&<div className="plan-feedback-reasons" role="group" aria-label="选择不合适的原因">{(["太远","太贵","不新奇","不符合状态","地点不准确"] as FeedbackReason[]).map(reason=><button type="button" key={reason} disabled={recommendationFeedbackBusy} onClick={()=>dislikeCurrentPlan(reason)}>{reason}</button>)}</div>}</section>
                <div className="sticky-cta"><button className="primary-button" onClick={() => go("plan")}>查看详细计划 <Arrow /></button></div>
              </div>
            )}

            {screen === "plan" && aiPlans && (
              <div className="page detail-page">
                <div className="detail-hero"><header><Back onClick={() => back("results")}/><span>AI 详细计划</span><button className="icon-button" onClick={() => notify("为保护灵感条件，当前版本不会生成公开计划链接")} aria-label="分享计划说明">↗</button></header><p className="kicker">候选方案 · 尚未进入日历</p><h2>{currentPlan.title}</h2><p className="plan-summary">{currentPlan.desc}</p><div className="detail-meta"><span>{inspirationCity} · {choices.time}</span><span>{currentPlan.duration || "约 3.5 小时"}</span><span>预算偏好 {choices.budget}</span></div></div>
                <section className="plan-introduction"><p className="kicker">完整方案介绍</p><h3>{viewingSavedRoute?"保存时的灵感参考":"为什么会推荐这个灵感"}</h3><p>{currentPlan.desc}</p><div><b>推荐依据</b><p>{viewingSavedRoute?"以下内容是采用安排时保存的快照；价格、营业状态和路程仍需出发前确认。":`${hasRelationship?"结合你们":"结合你"}选择的“${myStates.join("、") || choices.mood}”、${choices.vibe}氛围、${choices.time}和${choices.budget}总预算进行筛选。`}</p></div><div><b>地点与体验</b><p>{currentPlace?(viewingSavedRoute?`保存时选择了“${currentPlace.name}”；可打开地图重新核实。`:`以高德真实地点“${currentPlace.name}”为核心。${currentPlan.distanceVerified ? `地点在设定的 ${locationPrefs.radius/1000} 公里直线搜索范围内，实际路程请查看地图。` : "当前按商圈搜索，尚未核验与你的距离；请定位或打开地图确认。"}`):`当前方案尚未匹配到可核验的真实地点，可返回调整商圈或搜索范围。`}</p></div><div><b>采用之后</b><p>{viewingSavedRoute?"这是已保存安排的参考信息，不会随着新的灵感选择而改变。":`这仍是候选灵感。确认日期和时间后才会进入日历；${hasRelationship?"共同安排仍需双方分别确认。":"你可以继续保存为个人计划。"}`}</p></div></section>
                <section className="timeline"><p className="kicker">这次的节奏</p>{(currentPlan.timeline ?? [
                  { time: "18:30", title: "在地铁口见面", description: "不用赶，先买两杯喜欢的饮料" }, { time: "19:00", title: "沿江慢慢散步", description: "推荐路线 2.3 km · 约 45 分钟" }, { time: "20:00", title: "河畔小酒馆", description: "靠窗位 · 分享甜点与低度酒" }, { time: "21:40", title: "一起回家", description: "今晚留一个问题给彼此" }
                ]).map((node, i) => <div className="timeline-item" key={`${node.time}-${node.title}`}><span>{node.time}</span><i aria-hidden="true">{i + 1}</i><div>{node.title === currentPlace?.name ? <a className="place-link" href="#location" onClick={(event) => {event.preventDefault();go("location");}}><b>{node.title}</b><em>查看地点 ›</em></a> : <b>{node.title}</b>}<p>{node.description}</p>{node.title === currentPlace?.name && <button className="replace-place" disabled={currentPlaceCandidates.length < 2} onClick={() => {const next=((selectedPlaceIndexes[selectedPlan]??0)+1)%currentPlaceCandidates.length;setSelectedPlaceIndexes(values=>values.map((value,planIndex)=>planIndex===selectedPlan?next:value));setPlaceVersion(next);notify(`已切换为${currentPlaceCandidates[next]?.name}`);}}>换一个地点</button>}</div></div>)}</section>
                {currentPlace&&<section className="recommendation-reasons"><p className="kicker">为什么推荐这里</p><h3>{currentPlace.name}</h3><div>{currentPlace.recommendationReasons.map(reason=><span key={reason}>✓ {reason}</span>)}</div><small>评分、价格与营业信息来自高德；可能随时变化，请在出发前复查。</small></section>}
                {(currentPlan.includedPlaces?.length??0)>1&&<section className="included-places"><p className="kicker">方案包含</p>{currentPlan.includedPlaces?.map((place,index)=><div key={place.id}><span>{index+1}</span><b>{place.name}</b><small>{placeDistance(place)}</small></div>)}</section>}
                <section className="execution-info"><p className="kicker">执行信息</p><div><span>地点</span><b>{currentPlace ? (viewingSavedRoute?"已保存地点参考":"高德地图已匹配") : "AI 建议 · 尚未核验"}</b></div><div><span>范围</span><b>{planDistanceText(currentPlan,locationPrefs.radius)}</b></div><div><span>交通</span><b>打开高德地图后查看实时路线</b></div><div><span>天气</span><b>{inspirationWeather?`${weatherLabel(inspirationWeather)} · ${weatherSource(weather)}`:choices.time==="暂不确定"?"时间确定后显示预报":"当前时间不在未来 4 天预报内"}</b></div><div><span>预算</span><b>{currentBudgetText}</b></div></section>
                {weatherIssueNotice(inspirationCity)}
                <section className="warm-note"><span>♡</span><p><b>一个小提示</b><br/>{hasRelationship?"把手机收起来十分钟，问问对方：最近有什么小事让你开心？":"给自己留十分钟，不赶时间地感受今天。"}</p></section>
                <div className="sticky-cta"><button className="primary-button" onClick={() => {setScheduleDraft(draft => ({...draft, title: currentPlan.title, city: inspirationCity, date: inspirationWeather?.date ?? draft.date}));go("confirm");}}>采用这个安排 <Arrow /></button><p>下一步确认日期与时间；确认前不会进入日历</p></div>
              </div>
            )}

            {screen === "location" && aiPlans && <div className="page formal-page location-page"><header><Back onClick={() => back("plan")}/><span>地点详情</span>{currentPlace ? <a className="icon-button" href={amapMapUrl} target="_blank" rel="noreferrer" aria-label="在高德地图中打开地点">↗</a> : <button className="icon-button" onClick={() => notify("本方案尚未匹配到真实地点")} aria-label="地点尚未匹配">↗</button>}</header><div className={`place-photo ${placeVersion ? "alternate" : ""}`}><span>{currentPlace ? (viewingSavedRoute?"安排中保存的地点参考":"高德地图地点数据") : "AI 地点建议 · 未核验"}</span></div><section className="place-title"><p className="kicker">{currentPlace ? (viewingSavedRoute?"保存时的地点 · 请重新核实":"真实地点已匹配 · 营业信息请出发前确认") : "尚未匹配到真实地点"}</p><h2>{currentPlace?.name || currentPlan.title}</h2><p>{currentPlace?.address || `请在${inspirationCity}重新生成或更换搜索条件`}</p></section><section className="info-group"><InfoRow label="计划时段" value="以最终安排为准"/><InfoRow label="地点类型" value={currentPlace?.type || "AI 建议"}/><InfoRow label="坐标" value={currentPlace?.location || "尚未获取"}/><InfoRow label="营业时间" value="高德地点搜索未提供，需另行确认"/><InfoRow label="地点来源" value={currentPlace ? (viewingSavedRoute?"采用安排时保存的快照":"高德地图 Web 服务") : "AIHubMix 建议"}/></section><PlaceCandidates places={currentPlaceCandidates} selectedId={currentPlace?.id} saved={viewingSavedRoute} onSelect={(index)=>{setSelectedPlaceIndexes(values=>values.map((value,planIndex)=>planIndex===selectedPlan?index:value));setPlaceVersion(index);}}/><section className="place-notice"><b>执行提示</b><p>{currentPlace ? (viewingSavedRoute?"这是采用安排时保存的地点参考，不能证明当前营业、价格或距离；请在地图中重新确认。":"地点名称、地址和坐标来自高德地图；营业状态、排队情况与价格可能变化，请出发前确认。") : "AI 不会编造具体商家。重新生成后，系统会尝试用高德地图匹配真实地点。"}</p></section>{currentPlace ? <a className="primary-button map-link" href={amapMapUrl} target="_blank" rel="noreferrer">在高德地图中查看 <Arrow/></a> : <button className="primary-button" onClick={() => {go("inspire");notify("请调整关键词后重新生成");}}>返回调整条件 <Arrow/></button>}<button className="ghost-button" disabled={dynamicPlans.length < 2} onClick={() => {setSelectedPlan((selectedPlan+1)%dynamicPlans.length);go("plan");}}>查看另一个方案</button></div>}

            {screen === "confirm" && aiPlans && <div className="page formal-page confirm-page"><header><Back onClick={() => back("plan")}/><span>{hasRelationship?"确认安排":"保存我的计划"}</span><i aria-hidden="true"/></header><section className="page-intro"><p className="kicker">最后确认一次</p><h2>{hasRelationship?<>发给 TA，<br/>一起决定。</>:<>先为自己，<br/>保存这个计划。</>}</h2><p className="confirm-copy">{hasRelationship?"你确认后将发出共同安排邀请；TA 接受前它会显示为“待确认”。":"计划默认仅自己可见；以后邀请 TA 时，也不会自动共享。"}</p></section><section className="confirm-card"><label>安排名称<input required name="schedule-title" autoComplete="off" value={scheduleDraft.title || currentPlan.title} onChange={e=>{setScheduleDraft({...scheduleDraft,title:e.target.value});setFormError("");}}/></label><label>日期<input required name="schedule-date" type="date" autoComplete="off" value={scheduleDraft.date} onChange={e=>{setScheduleDraft({...scheduleDraft,date:e.target.value});setFormError("");}}/></label><label>开始时间<input required name="schedule-time" type="time" autoComplete="off" value={scheduleDraft.time} onInput={e=>{const time=e.currentTarget.value;setScheduleDraft(current=>({...current,time}));setFormError("");}}/></label><label>所在城市<input required name="schedule-city" autoComplete="address-level2" value={scheduleDraft.city || profile.city} onChange={e=>{setScheduleDraft({...scheduleDraft,city:e.target.value});setFormError("");}}/></label></section>{scheduleWeather&&weather&&<WeatherNotice day={scheduleWeather} reportTime={weather.reportTime} source={weatherSource(weather)}/>} {weatherIssueNotice(scheduleDraft.city || profile.city)} {formError&&<p className="field-error" role="alert">{formError}</p>}{taskContextActive && <section className="link-context"><span>♫</span><div><b>关联共同任务</b><p>交换一首最近常听的歌</p></div><em>安排确认后关联</em></section>}<button className="primary-button" disabled={scheduleBusy} onClick={()=>hasRelationship?void createSharedSchedule():void savePersonalPlan()}>{scheduleBusy?"正在保存…":hasRelationship?"发给 TA 确认":"保存到我的计划"} <Arrow/></button>{!hasRelationship&&<button className="ghost-button" onClick={()=>{setOnboardingIntent("invite");go("connect");}}>邀请 TA 一起决定</button>}<button className="ghost-button" onClick={() => back("plan")}>返回继续查看</button></div>}

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
                <header><Back onClick={() => back("calendar")}/><span>安排详情</span>{!scheduleCompleted?<button className="text-button" onClick={() => setPanel("edit")}>编辑</button>:<i aria-hidden="true"/>}</header>
                <div className={`confirmation ${cancelled ? "is-cancelled" : ""} ${scheduleIsShared&&!partnerAccepted&&!cancelled?"is-pending":""}`}><span>{cancelled ? "×" : scheduleIsShared&&!partnerAccepted ? "◷" : "✓"}</span><p>{cancelled ? "安排已取消" : scheduleCompleted ? (scheduleIsShared?"双方已确认完成":"已确认完成") : !scheduleIsShared ? "我的计划 · 仅自己可见" : !partnerAccepted ? "等待 TA 接受" : scheduleCompletionPending ? "等待另一位参与者确认完成" : "双方已接受 · 正式安排"}</p></div>
                <div className="schedule-title"><p className="kicker">{eventDateLong}</p><h2>{scheduleDraft.title || currentPlan.title}</h2><p>{scheduleDraft.time} · {scheduleDraft.city || profile.city}</p></div>
                <section className="schedule-card"><div><span className="label">时间</span><b>{eventMonthDay} {scheduleDraft.time}</b></div><div><span className="label">集合</span><b>{scheduledFacts?.places[0]?.name||"尚未确认，请出发前核实"}</b></div><div><span className="label">天气</span><b>{scheduleWeather?weatherLabel(scheduleWeather):"仅显示未来 4 天预报"}</b></div><div><span className="label">预算</span><b>{scheduledFacts?.priceNote||"以确认安排时为准"}</b></div><button onClick={viewSavedRoute}>{canViewScheduledInspiration ? "查看已保存的路线" : "旧安排没有保存路线"} <span>›</span></button></section>
                {weatherIssueNotice(scheduleDraft.city || profile.city)}
                {!cancelled&&(!scheduleIsShared||partnerAccepted)&&<section className="share-control"><div><b>对外分享</b><p>只包含已确认的名称、日期、时间和城市，7 天后自动失效。</p></div>{publicShareLink?<><a href={publicShareLink.path} target="_blank" rel="noreferrer">查看公开页</a><button disabled={shareBusy} onClick={()=>void copyPublicShareLink()}>复制链接</button><button className="danger-text" disabled={shareBusy} onClick={()=>void revokePublicShareLink()}>立即撤回</button></>:<button disabled={shareBusy} onClick={()=>void createPublicShareLink()}>{shareBusy?"正在创建…":"创建分享链接"}</button>}</section>}
                {taskLinked && <button className="linked-task" onClick={() => go("task")}><span>♫</span><div><small>关联情侣任务</small><b>交换一首最近常听的歌</b></div><i aria-hidden="true">›</i></button>}
                {!scheduleIsShared ? <div className="schedule-actions confirm-wait">{scheduleCompleted?<><div className="recorded-note"><b>这次经历已记录 ♡</b><p>基础回忆只保存已确认的安排事实。</p></div><button className="primary-button" onClick={()=>void openMemoryForSchedule()}>查看回忆 <Arrow/></button></>:!canConfirmCompletion?<div className="wait-card"><span>◷</span><div><b>等待出发</b><p>到达安排开始时间后才能确认完成</p></div></div>:<button className="primary-button" disabled={scheduleBusy} onClick={()=>void updateScheduleCompletion("request_complete")}>{scheduleBusy?"正在确认…":"确认已完成"} <Arrow/></button>}{!scheduleCompleted&&<>{hasRelationship?<button className="ghost-button" disabled={scheduleBusy} onClick={()=>void sharePersonalPlan()}>发给 TA 一起决定</button>:<button className="ghost-button" onClick={()=>{setOnboardingIntent("invite");go("connect");}}>邀请 TA 一起决定</button>}<button className="ghost-button danger-text" onClick={()=>setPanel("cancel")}>删除这个计划</button></>}</div> : <><div className="people-row"><div className="avatar a">{profile.name.slice(0,1)}</div><div><b>{scheduleCompleted?"双方已确认完成":scheduleCompletionPending?(scheduleCompletionRequesterIsMe?"你已确认完成":"TA 已确认完成"):!partnerAccepted?(isScheduleCreator?"你已发出邀请":"TA 已发出邀请"):"双方已经接受"}</b><p>{scheduleCompleted?"双方的基础回忆已分别保存":scheduleCompletionPending?(scheduleCompletionRequesterIsMe?"正在等待 TA 确认":"等待你的独立确认"):!partnerAccepted?(isScheduleCreator?"等待 TA 接受":"接受后进入共同日历"):"安排已进入双方共同日历"}</p></div><div className="avatar b">{partnerProfile.name.slice(0,1)}</div></div>{!partnerAccepted?<div className="schedule-actions confirm-wait"><div className="wait-card"><span>◷</span><div><b>{isScheduleCreator?"等待 TA 接受":"TA 发来一项共同安排"}</b><p>接受后才会成为正式共同安排</p></div></div>{!isScheduleCreator&&<button className="primary-button" disabled={scheduleBusy} onClick={()=>void acceptSharedSchedule()}>{scheduleBusy?"正在同步…":"接受这个安排"} <Arrow/></button>}</div>:scheduleCompleted?<div className="schedule-actions"><div className="recorded-note"><b>这次经历已记录 ♡</b><p>各自的文字和照片仍由各自管理。</p></div><button className="primary-button" onClick={()=>void openMemoryForSchedule()}>查看我的回忆 <Arrow/></button></div>:!canConfirmCompletion?<div className="schedule-actions confirm-wait"><div className="wait-card"><span>◷</span><div><b>等待一起出发</b><p>到达安排开始时间后，双方才能确认完成</p></div></div><button className="ghost-button danger-text" onClick={()=>setPanel("cancel")}>取消这个安排</button></div>:scheduleCompletionPending?<div className="schedule-actions confirm-wait"><div className="wait-card"><span>◷</span><div><b>{scheduleCompletionRequesterIsMe?"等待 TA 确认完成":"TA 已确认完成"}</b><p>两位不同的参与者确认后才生成基础回忆</p></div></div>{!scheduleCompletionRequesterIsMe&&<button className="primary-button" disabled={scheduleBusy} onClick={()=>void updateScheduleCompletion("confirm_complete")}>{scheduleBusy?"正在确认…":"确认双方已完成"} <Arrow/></button>}</div>:<div className="schedule-actions"><button className="primary-button" disabled={scheduleBusy} onClick={()=>void updateScheduleCompletion("request_complete")}>{scheduleBusy?"正在确认…":"我已完成"} <Arrow/></button><button className="ghost-button danger-text" onClick={()=>setPanel("cancel")}>取消这个安排</button></div>}</>}
                {bottomNav("calendar")}
              </div>
            )}

            {screen === "calendar" && (
              <div className="page tab-page calendar-page">
                <header><div><p className="kicker">{hasRelationship?"我的与共同日历":"我的日历"}</p><h2>{calendarTitle}</h2></div><button className="round-button" onClick={() => setPanel("calendarAdd")} aria-label="添加日历内容">＋</button></header>
                <div className="month-switch"><button onClick={() => {setMonthOffset(v=>v-1);setSelectedDay(1);}} aria-label="上一个月">‹</button><button className="today-button" onClick={jumpToToday}>今日</button><button onClick={() => {setMonthOffset(v=>v+1);setSelectedDay(1);}} aria-label="下一个月">›</button></div>
                <div className="week-row">{["一","二","三","四","五","六","日"].map(x => <span key={x}>{x}</span>)}</div>
                <div className="month-grid">{Array.from({length: Math.ceil((leadingDays + daysInMonth) / 7) * 7}, (_, i) => {
                  const d = i - leadingDays + 1; const valid=d>0&&d<=daysInMonth;
                  const dateKey=`${calendarYear}-${String(calendarMonth+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
                  const dayStatus=valid?calendarDayStatus(dateKey):{kind:"normal" as const,label:"" as const};
                  const daySchedules=valid?schedules.filter(schedule=>schedule.event_date===dateKey):[]; const dayImportantDays=valid?importantDaysOnDate(dateKey):[];
                  const hasShared=daySchedules.some(schedule=>schedule.visibility==="shared"); const hasPersonal=daySchedules.some(schedule=>schedule.visibility==="personal"); const isToday=isCurrentMonth&&d===today.getDate();
                  const states=[isToday?"今天":"",dayStatus.festivalName?`节日：${dayStatus.festivalName}`:"",dayStatus.kind==="rest"?`${dayStatus.holidayName??"法定节假日"}休息`:dayStatus.kind==="adjusted-work"?"调休上班":dayStatus.kind==="weekend"?"周末":"",hasShared?"有共同安排":"",hasPersonal?"有我的计划":"",isIdeaMonth&&d===16&&hasGenerated?"有 AI 灵感":"",dayImportantDays.length?"重要日子":""].filter(Boolean).join("，");
                  const scheduleClass=hasShared&&hasPersonal?"mixed-plan":hasShared?"official":hasPersonal?"personal-plan":"";
                  return valid ? <button key={i} onClick={()=>setSelectedDay(d)} aria-label={`${calendarYear}年${calendarMonth+1}月${d}日${states?`，${states}`:""}`} aria-pressed={d===selectedDay} className={`${d===selectedDay?"selected-day":""} ${isToday?"today":""} ${scheduleClass} ${isIdeaMonth&&d===16&&hasGenerated?"idea":""} ${dayImportantDays.length?"important-dot":""} ${dayStatus.kind==="rest"?"rest-day":""} ${dayStatus.kind==="adjusted-work"?"work-day":""} ${dayStatus.kind==="weekend"?"weekend-day":""}`}><span>{d}</span>{dayStatus.label&&<small className={`day-type ${dayStatus.kind}`}>{dayStatus.label}</small>}{dayStatus.festivalName?<small className="festival-name">{dayStatus.festivalName}</small>:dayImportantDays.length>0&&<small className="important-label">重要</small>}</button> : <span key={i} aria-hidden="true"/>;
                })}</div>
                <div className="legend"><span><i className="personal-dot"/>我的计划</span><span><i className="solid-dot"/>共同安排</span><span><i className="ring-dot"/>AI 灵感</span><span><i className="rest-swatch"/>法定休息</span><span><i className="work-swatch"/>调休上班</span></div>
                {hasRelationship&&<p className="calendar-sync-note">共同安排与重要日子约 5 秒自动同步；个人计划仍仅自己可见。</p>}
                {calendarYear===holidaySource.year?<a className="holiday-source" href={holidaySource.url} target="_blank" rel="noreferrer">2026 年节假日 · 国务院办公厅安排（2025-11-04 发布）</a>:<p className="holiday-source">当前年份显示固定日期节日与普通周末；官方放假、调休数据待年度通知发布后更新。</p>}
                <section className="day-agenda"><p className="kicker">{calendarMonth+1}月{selectedDay}日</p>{calendarWeather&&weather&&<WeatherNotice day={calendarWeather} reportTime={weather.reportTime} source={weatherSource(weather)}/>} {weatherIssueNotice(scheduleDraft.city || profile.city)} {(()=>{const dateKey=`${calendarYear}-${String(calendarMonth+1).padStart(2,"0")}-${String(selectedDay).padStart(2,"0")}`;const dayStatus=calendarDayStatus(dateKey);const daySchedules=schedules.filter(schedule=>schedule.event_date===dateKey);const dayImportantDays=importantDaysOnDate(dateKey);const festival=dayStatus.festivalName?<div className="festival-banner"><span aria-hidden="true">日</span><div><b>{dayStatus.festivalName}</b><small>{dayStatus.kind==="rest"?"法定休息日":dayStatus.kind==="adjusted-work"?"调休上班日":"节日提醒"}</small></div></div>:null;let content;if(daySchedules.length||dayImportantDays.length)content=<div className="agenda-list">{daySchedules.map(schedule=><button key={schedule.id} className={`agenda-item ${schedule.visibility==="personal"?"personal-agenda":""}`} onClick={()=>openSchedule(schedule)}><i aria-hidden="true"/><span><b>{schedule.event_time}</b><small>{schedule.visibility==="shared"?"共同安排":"我的计划"}</small></span><div><b>{schedule.title}</b><small>{schedule.status==="completed"?"已完成":schedule.visibility==="shared"?(["confirmed","completion_pending"].includes(schedule.status)?"双方已接受":"等待确认"):"仅自己可见"} · {schedule.city}</small></div><em aria-hidden="true">›</em></button>)}{dayImportantDays.map(day=><button key={day.id} className="agenda-item important-agenda" onClick={() => go("important")}><i aria-hidden="true"/><span><b>全天</b></span><div><b>{day.title}</b><small>{day.visibility==="personal"?"我的重要日子":day.status==="confirmed"?"共同重要日子":"等待 TA 确认"} · {day.repeat_rule==="yearly"?"每年重复":"不重复"}</small></div><em aria-hidden="true">›</em></button>)}</div>;else if(isIdeaMonth&&selectedDay===16&&hasGenerated)content=<div className="idea-day"><span aria-hidden="true">✦</span><div><b>AI 轻量建议</b><p>周日下午适合去城市周边走走，尚未成为正式安排。</p></div><button onClick={()=>go("inspire")}>继续规划</button></div>;else content=<div className="empty-day"><span aria-hidden="true">☼</span><p>这一天还没有{hasRelationship?"共同安排、个人计划或重要日子":"个人计划或重要日子"}</p><button onClick={() => go("inspire")}>找点灵感</button></div>;return <>{festival}{content}</>;})()}</section>
                {bottomNav("calendar")}
              </div>
            )}

            {screen === "memory" && currentMemory && <div className="page memory-page"><div className={`memory-cover ${memoryCoverUrl?"with-photo":""}`} style={memoryCoverUrl?{backgroundImage:`linear-gradient(#3a38415e,#5b3b32cc),url(${memoryCoverUrl})`}:undefined}><header><Back onClick={()=>back("memories")}/><span>回忆详情</span><i aria-hidden="true"/></header><div className="moon">☽</div><div className="city-lights">•• · • ·• ••</div><div className="cover-copy"><p>{new Intl.DateTimeFormat("zh-CN",{year:"numeric",month:"long",day:"numeric"}).format(localDate(currentMemory.eventDate))} · {currentMemory.city}</p><h2>{currentMemory.title}</h2></div></div><section className="ownership-strip" aria-label="内容来源"><span>{currentMemory.scheduleId?"已确认安排事实":"我的记录"}</span>{currentMemory.note&&<span>文字 · 我填写</span>}{currentMemory.mediaUrl&&<span>照片 · 我上传</span>}{currentMemory.partnerContribution?.note&&<span>文字 · TA 分享</span>}{currentMemory.partnerContribution?.mediaUrl&&<span>照片 · TA 分享</span>}</section><section className="memory-story"><p><i className="ai-label">事实记录</i> {currentMemory.scheduleId?"这条基础回忆只记录已完成安排的名称、日期、城市与保存过的路线，不推断当时的感受。":"这是一条由你主动创建的个人记录。"}</p>{currentMemory.note&&<blockquote>“{currentMemory.note}”<small>— {profile.name}主动补充 · 可随时修改</small></blockquote>}{currentMemory.partnerContribution?.note&&<blockquote>“{currentMemory.partnerContribution.note}”<small>— TA 主动分享</small></blockquote>}<button className="memory-edit-link" onClick={()=>setPanel("memoryEdit")}>＋ 编辑我的照片或文字</button></section>{currentMemory.facts?.timeline?.length?<details className="day-route"><summary>已保存的行程 <span>展开查看</span></summary>{currentMemory.facts.timeline.map((node,index)=><div key={`${node.time}-${index}`}><b>{node.time||"行程"}</b><p>{node.title}{node.description?` · ${node.description}`:""}</p></div>)}</details>:<section className="empty-inline"><span>○</span><p>这条记录没有保存路线，不会自动补造。</p></section>}<section className="memory-footer"><p>已保存到你的账户；共同安排的基础事实由双方各自保留。</p><button className="primary-button" onClick={()=>setPanel("memoryEdit")}>编辑我的内容 <Arrow/></button>{currentMemory.shareContribution&&(currentMemory.note||currentMemory.mediaUrl)&&<button className="ghost-button danger-text" onClick={()=>setPanel("retractMemory")}>撤回已分享的文字和照片</button>}<button className="ghost-button danger-text" onClick={()=>setPanel("deleteMemory")}>删除我的回忆副本</button></section></div>}

            {screen === "memory" && !currentMemory && <div className="page formal-page"><header><Back onClick={()=>back("memories")}/><span>回忆详情</span><i aria-hidden="true"/></header><section className="empty-formal"><span>○</span><h2>回忆不存在</h2><p>这条回忆可能已删除或仍在同步。</p><button className="primary-button" onClick={()=>go("memories")}>返回回忆列表 <Arrow/></button></section></div>}

            {screen === "memories" && <div className="page formal-page memories-page"><header><Back onClick={()=>back("home")}/><span>{hasRelationship?"我们的回忆":"我的记录"}</span><button className="round-button" onClick={startNewMemory} aria-label="添加回忆">＋</button></header><section className="page-intro"><p className="kicker">先生活，再记录</p><h2>真实经历过的，<br/>自然留在这里。</h2></section>{memories.map(memory=><button key={memory.id} className="memory-list-card text-only" onClick={()=>openMemory(memory)}><div><b>{memory.title}</b><small>{new Intl.DateTimeFormat("zh-CN",{month:"long",day:"numeric"}).format(localDate(memory.eventDate))} · {memory.city}</small><p>{memory.scheduleId?"由完成确认生成，只记录已保存的安排事实。":"由你主动创建，默认仅自己可见。"}</p></div><i aria-hidden="true">›</i></button>)}{!memories.length&&<section className="empty-formal memory-empty"><span>♡</span><h2>还没有回忆</h2><p>完成一项安排，或手动记录一件已经发生的事。</p><button className="primary-button" onClick={startNewMemory}>添加一条真实记录 <Arrow/></button></section>}</div>}

            {screen === "memoryCreate" && <div className="page formal-page create-memory-page"><header><Back onClick={()=>back("memories")}/><span>添加个人记录</span><i aria-hidden="true"/></header><section className="page-intro compact"><p className="kicker">一条简单记录也已经完整</p><h2>把真实发生的事，<br/>留在这里。</h2></section><section className="create-form"><label>记录名称 <em>必填</em><input required name="memory-title" autoComplete="off" value={memoryDraft.title} onChange={e=>{setMemoryDraft({...memoryDraft,title:e.target.value});setFormError("");}}/></label><label>日期 <em>必填</em><input required max={dateInputValue(0)} name="memory-date" type="date" autoComplete="off" value={memoryDraft.date} onChange={e=>{setMemoryDraft({...memoryDraft,date:e.target.value});setFormError("");}}/></label><label>城市 <em>必填</em><input required name="memory-place" autoComplete="address-level2" value={memoryDraft.place} onChange={e=>setMemoryDraft({...memoryDraft,place:e.target.value})}/></label><PhotoUpload added={Boolean(uploadedMedia)} busy={mediaBusy} onFile={file=>void uploadMemoryPhoto(file)}/><label>写点什么 <small>选填，由我管理</small><textarea name="memory-copy" autoComplete="off" value={memoryDraft.copy} onChange={e=>setMemoryDraft({...memoryDraft,copy:e.target.value})}/></label></section>{formError&&<p className="field-error" role="alert">{formError}</p>}<p className="ownership-note">手动记录默认仅自己可见；建立关系后也不会自动共享。</p><button className="primary-button" disabled={memoryBusy} onClick={()=>void saveMemory(true)}>{memoryBusy?"正在保存…":"保存这条记录"} <Arrow/></button></div>}

            {screen === "profile" && <div className="page formal-page"><header><Back onClick={() => back("home")}/><span>{hasRelationship?"我们的资料":"我的资料"}</span><button className="text-button" onClick={() => setPanel("profileEdit")}>编辑</button></header><section className="profile-hero"><div className="connect-visual"><div className="avatar a">{profile.name.slice(0,1)}</div>{hasRelationship&&<><span>♡</span><div className="avatar b">{partnerProfile.name.slice(0,1)}</div></>}</div><h2>{hasRelationship?`${profile.name} & ${partnerProfile.name}`:profile.name}</h2><p>{hasRelationship?"共同空间已连接 · 双方分别管理个人资料":"单人体验中 · 个人内容默认仅自己可见"}</p></section>{hasRelationship&&<section className="info-group"><p className="group-label">关系资料</p><InfoRow label="在一起纪念日" value={relationshipImportantDay?new Intl.DateTimeFormat("zh-CN",{year:"numeric",month:"long",day:"numeric"}).format(nextImportantDate(relationshipImportantDay.event_date,relationshipImportantDay.repeat_rule)):"尚未由双方确认"}/><InfoRow label="当前城市" value={profile.city}/><InfoRow label="关系状态" value="已连接"/></section>}<section className="info-group"><p className="group-label">我的资料</p><InfoRow label="昵称" value={profile.name}/><InfoRow label="生日" value={profile.birthday||"未填写"}/><InfoRow label="当前城市" value={profile.city}/></section>{hasRelationship?<section className="info-group"><p className="group-label">TA 已确认的资料</p><InfoRow label="昵称" value={partnerProfile.name}/><InfoRow label="生日" value={partnerProfile.birthday||"由 TA 决定是否共享"}/><p className="partner-note">TA 的资料只能由 TA 修改；你可以请求更正，但不能代为覆盖。</p></section>:<section className="solo-profile-cta"><p className="kicker">以后也可以一起使用</p><h2>邀请 TA 建立共同空间</h2><p>你的历史计划与回忆不会自动共享。</p><button className="primary-button" onClick={()=>{setOnboardingIntent("invite");go("connect");}}>邀请 TA <Arrow/></button></section>}{hasRelationship&&<button className="secondary-button safety-entry" onClick={() => go("relationshipSafety")}>管理关系与数据安全 <Arrow/></button>}</div>}

            {screen === "important" && <div className="page formal-page"><header><Back onClick={() => back("home")}/><span>{hasRelationship?"我们的重要日子":"我的重要日子"}</span><button className="round-button" onClick={() => go("importantCreate")} aria-label="添加重要日子">＋</button></header>{importantAdded&&primaryImportantDay ? <><section className="important-hero"><p className="kicker">下一个重要日子</p><h2>{primaryImportantDay.title}</h2><strong>{primaryImportantDay.visibility==="shared"?(primaryImportantDay.status==="confirmed"?"双方已确认":"等待双方确认"):"仅自己可见"}</strong><p>{importantDateLong} · {primaryImportantDay.repeat_rule==="yearly"?"每年重复":"不重复"}</p>{primaryImportantDay.visibility==="shared"&&primaryImportantDay.status==="pending_partner"&&!isPrimaryImportantCreator&&<button className="primary-button" disabled={importantBusy} onClick={()=>void acceptImportantDay(primaryImportantDay.id)}>{importantBusy?"正在确认…":"确认这个重要日子"} <Arrow/></button>}{primaryImportantDay.status!=="pending_partner"&&<button className="primary-button" onClick={() => {setChoices({...choices,time:"暂不确定"});go("inspire");}}>为这一天找灵感 <Arrow/></button>}</section><section className="info-group"><p className="group-label">全部重要日子</p>{profile.birthday&&<InfoRow label={`${profile.name}的生日`} value={`${profile.birthday} · 仅本人管理`}/>} {importantDays.map(day=><InfoRow key={day.id} label={day.title} value={`${new Intl.DateTimeFormat("zh-CN",{month:"long",day:"numeric"}).format(localDate(day.event_date))} · ${day.visibility==="personal"?"我的":day.status==="confirmed"?"共同":"待确认"}`}/>)}</section></> : <section className="empty-formal"><span>♡</span><h2>还没有重要日子</h2><p>{hasRelationship?"生日、纪念日或只属于你们的一天，确认后会进入共同日历。":"生日、纪念日或只属于自己的一天，都可以先保存在这里。"}</p><button className="primary-button" onClick={()=>go("importantCreate")}>添加第一个重要日子 <Arrow/></button></section>}</div>}

            {screen === "importantCreate" && <div className="page formal-page"><header><Back onClick={()=>back("important")}/><span>添加重要日子</span><i aria-hidden="true"/></header><section className="page-intro compact"><p className="kicker">由你确认的事实</p><h2>记住一个，<br/>{hasRelationship?"对你们":"对自己"}重要的日子。</h2><p className="confirm-copy">{hasRelationship?"保存后先发给 TA 确认；确认前不会作为双方共同事实。":"当前会保存为个人内容，以后不会自动分享给 TA。"}</p></section><section className="create-form"><label>名称 <em>必填</em><input required name="important-title" autoComplete="off" value={importantDraft.title} onChange={e=>{setImportantDraft({...importantDraft,title:e.target.value});setFormError("");}}/></label><label>日期 <em>必填</em><input required name="important-date" type="date" autoComplete="off" value={importantDraft.date} onChange={e=>{setImportantDraft({...importantDraft,date:e.target.value});setFormError("");}}/></label><label>重复方式<select name="important-repeat" value={importantDraft.repeatRule} onChange={e=>setImportantDraft({...importantDraft,repeatRule:e.target.value as "yearly"|"none"})}><option value="yearly">每年重复</option><option value="none">不重复</option></select></label><label>提前提醒<select name="important-reminder" value={importantDraft.reminderDays} onChange={e=>setImportantDraft({...importantDraft,reminderDays:Number(e.target.value)})}><option value="7">提前 7 天</option><option value="1">提前 1 天</option><option value="0">当天提醒</option></select></label></section>{formError&&<p className="field-error" role="alert">{formError}</p>}<button className="primary-button" disabled={importantBusy} onClick={()=>void createImportantDay()}>{importantBusy?"正在保存…":hasRelationship?"发给 TA 确认":"保存到我的重要日子"} <Arrow/></button></div>}

            {screen === "taskHistory" && <div className="page formal-page"><header><Back onClick={() => back("home")}/><span>共同任务</span><i aria-hidden="true"/></header><section className="page-intro"><p className="kicker">当前任务</p><h2>偶尔想到一件，<br/>值得一起做的小事。</h2></section>{activeTask?<button className="task-history-current" onClick={() => go("task")}><span>♫</span><div><b>{activeTask.title}</b><small>{activeTask.status==="pending_partner"?"等待接受":activeTask.status==="completion_pending"?"等待完成确认":"进行中"}</small></div><i aria-hidden="true">›</i></button>:<div className="empty-inline"><span>○</span><p>当前没有进行中的共同任务</p></div>}<p className="month-title">历史任务</p>{tasks.filter(task=>["completed","cancelled"].includes(task.status)).length?tasks.filter(task=>["completed","cancelled"].includes(task.status)).map(task=><div className="history-row" key={task.id}><span>{task.status==="completed"?"✓":"↻"}</span><div><b>{task.title}</b><small>{task.status==="completed"?"双方已确认完成":"已结束"}</small></div></div>):<div className="empty-inline"><span>○</span><p>还没有已完成或已结束的任务</p></div>}</div>}

            {screen === "settings" && <div className="page tab-page formal-page settings-page"><header><div><p className="kicker">恋爱日记</p><h2>设置</h2></div><i aria-hidden="true"/></header><button type="button" className="settings-profile" onClick={() => go("profile")}><div className="avatar a">{profile.name.slice(0,1)}</div><div><b>{profile.name}</b><small>{hasRelationship?`与${partnerProfile.name}已连接`:"单人体验中 · 内容仅自己可见"}</small></div><i aria-hidden="true">›</i></button><section className="settings-group"><SettingRow icon="♢" label={hasRelationship?"我们的资料":"我的资料"} onClick={() => go("profile")}/><SettingRow icon="◌" label={hasRelationship?"我们的重要日子":"我的重要日子"} onClick={() => go("important")}/>{!hasRelationship&&<SettingRow icon="♡" label="邀请 TA 一起使用" value="随时可以" onClick={() => {setOnboardingIntent("invite");go("connect");}}/>}</section><section className="settings-group">{hasRelationship&&<SettingRow icon="♡" label="关系与数据安全" value="可随时退出" onClick={() => go("relationshipSafety")}/>}<SettingRow icon="♢" label="通知与提醒" onClick={() => go("notifications")}/><SettingRow icon="◉" label="隐私与 AI 数据说明" onClick={() => go("privacy")}/><SettingRow icon="▢" label="照片与存储" onClick={() => go("storage")}/></section><section className="settings-group"><SettingRow icon="§" label="用户协议" onClick={() => go("terms")}/><SettingRow icon="◈" label="隐私政策" onClick={() => go("privacyPolicy")}/><SettingRow icon="×" label="注销账号" value="永久删除" onClick={() => go("accountDeletion")}/></section><section className="settings-group"><SettingRow icon="?" label="帮助与反馈" onClick={() => go("help")}/><SettingRow icon="○" label="关于恋爱日记" value="V59" onClick={() => go("about")}/></section>{bottomNav("settings")}</div>}

            {screen === "notifications" && <div className="page formal-page"><header><Back onClick={() => back("settings")}/><span>通知与提醒</span><i aria-hidden="true"/></header><section className="page-intro compact"><p className="kicker">只提醒重要的事</p><h2>不让{hasRelationship?"共同":"日常"}生活，<br/>变成通知压力。</h2></section><section className="settings-group">{hasRelationship&&<ToggleRow label="共同安排提醒" note="开始前与变更时提醒" value={preferences.scheduleReminders} disabled={preferencesBusy} onChange={value=>void updatePreference("scheduleReminders",value)}/>}<ToggleRow label="重要日子提醒" note={hasRelationship?"按双方设置的提前时间提醒":"按你设置的提前时间提醒"} value={preferences.importantDayReminders} disabled={preferencesBusy} onChange={value=>void updatePreference("importantDayReminders",value)}/>{hasRelationship&&<ToggleRow label="TA 的状态变化" note="接受安排、完成确认" value={preferences.partnerUpdates} disabled={preferencesBusy} onChange={value=>void updatePreference("partnerUpdates",value)}/>}</section><p className="policy-note">设置保存在你的账户中；不会发送连续签到、任务催促或关系评分通知。</p></div>}

            {screen === "privacy" && <div className="page formal-page"><header><Back onClick={() => back("settings")}/><span>隐私与 AI</span><i aria-hidden="true"/></header><section className="page-intro compact"><p className="kicker">你的生活，由你决定</p><h2>AI 提供建议，<br/>不会替你确认事实。</h2></section><section className="principle-card"><span>01</span><div><b>建议不是正式安排</b><p>只有你主动采用并确认后，内容才会进入个人或共同日历；备用方案与 AI 方案会清楚标明来源。</p></div></section><section className="principle-card"><span>02</span><div><b>不推断关系与感受</b><p>不生成忠诚度、关系评分、分手概率或心理诊断；用户文字不会被自动覆盖。</p></div></section><section className="principle-card"><span>03</span><div><b>只发送生成所需条件</b><p>请勿输入姓名、联系方式或私密内容；系统会拦截常见联系方式，临时灵感条件不会写入网址。</p></div></section><section className="principle-card"><span>04</span><div><b>每个人都能独立离开</b><p>退出不需要对方确认；自己的敏感内容可以立即撤回，对方离线副本无法远程删除。</p></div></section><section className="principle-card"><span>05</span><div><b>公开原型不等于公开关系</b><p>账号资料、关系与已确认计划通过安全连接同步；灵感表单只保存在当前标签页会话中，不写入网址。</p></div></section><section className="principle-card"><span>06</span><div><b>运行监测不读取生活内容</b><p>只记录服务来源、响应时间、固定失败类型和是否启用备用方案；不记录聊天文字、心情、特别照顾、精确位置、IP 或密钥。</p></div></section>{hasRelationship?<button className="secondary-button safety-entry" onClick={() => go("relationshipSafety")}>查看关系安全设置 <Arrow/></button>:<button className="secondary-button safety-entry" onClick={() => {setOnboardingIntent("invite");go("connect");}}>了解关系建立与退出 <Arrow/></button>}<button className="subtle-danger" onClick={() => setPanel("clearData")}>清空本机会话</button></div>}

            {screen === "storage" && <div className="page formal-page"><header><Back onClick={() => back("settings")}/><span>照片、分享与导出</span><i aria-hidden="true"/></header><section className="page-intro compact"><p className="kicker">上传者始终保有控制权</p><h2>你的内容，<br/>随时可以收回。</h2><p className="confirm-copy">照片以原文件存储；共同照片仅对当前关系成员开放。撤回会删除在线文件，但无法远程删除已保存的离线副本。</p></section>{uploadedMedia?<section className="media-card"><div style={{backgroundImage:`url(${uploadedMedia.url})`}} role="img" aria-label="最近上传的照片"/><p><b>最近上传的照片</b><small>{uploadedMedia.visibility==="shared"?"当前关系成员可查看":"仅自己可见"}</small></p><button className="danger-button" disabled={mediaBusy} onClick={()=>void retractUploadedMedia()}>{mediaBusy?"正在删除…":"撤回并删除在线文件"}</button></section>:<section className="empty-formal compact-empty"><span>▧</span><h2>还没有上传照片</h2><p>支持 JPG、PNG 和 WebP，单张最大 8MB。</p></section>}<PhotoUpload added={Boolean(uploadedMedia)} busy={mediaBusy} onFile={file=>void uploadMemoryPhoto(file)}/><p className="group-label">仍然有效的公开分享</p><section className="settings-group share-management">{managedShareLinks.length?managedShareLinks.map(link=><div key={link.id}><p><b>{link.title}</b><small>{new Intl.DateTimeFormat("zh-CN",{month:"long",day:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(link.expiresAt))} 到期 · 原链接只在创建时显示</small></p><button disabled={shareBusy} onClick={()=>void revokeManagedShareLink(link.id)}>撤回</button></div>):<p className="empty-setting-copy">没有仍然有效的公开分享链接</p>}</section><button className="secondary-button export-button" onClick={()=>void exportMyData()}>导出我的数据 <Arrow/></button></div>}

            {screen === "help" && <div className="page formal-page"><header><Back onClick={() => back("settings")}/><span>帮助与反馈</span><i aria-hidden="true"/></header><section className="page-intro compact"><p className="kicker">先回答最常见的问题</p><h2>遇到问题，<br/>可以直接告诉我们。</h2></section><section className="help-list"><details><summary>为什么 AI 灵感不会自动进入日历？</summary><p>AI 只提供建议。只有你主动采用并确认日期、时间后，才会形成个人计划或共同安排。</p></details><details><summary>单人计划会自动分享给 TA 吗？</summary><p>不会。建立关系后仍需由你逐项选择是否发送给 TA。</p></details><details><summary>撤回照片后会发生什么？</summary><p>在线原文件会删除，当前关系成员不再能访问；平台无法删除对方此前保存的离线副本或截屏。</p></details></section><section className="feedback-form"><label>问题类型<select value={feedbackDraft.category} onChange={event=>setFeedbackDraft({...feedbackDraft,category:event.target.value})}><option>产品建议</option><option>功能异常</option><option>隐私与安全</option><option>其他</option></select></label><label>具体情况<textarea maxLength={1000} value={feedbackDraft.message} onChange={event=>setFeedbackDraft({...feedbackDraft,message:event.target.value})} placeholder="请描述发生了什么、你期待怎样改进"/></label><p>{feedbackDraft.message.length}/1000</p><button className="primary-button" disabled={feedbackBusy||!feedbackDraft.message.trim()} onClick={()=>void submitFeedback()}>{feedbackBusy?"正在提交…":"提交反馈"} <Arrow/></button></section></div>}

            {screen === "about" && <div className="page formal-page about-page"><header><Back onClick={() => back("settings")}/><span>关于恋爱日记</span><i aria-hidden="true"/></header><div className="about-mark">♡</div><section className="page-intro compact"><p className="kicker">V59 · 账号与隐私控制更完整</p><h2>让共同生活，<br/>更容易被认真对待。</h2><p className="confirm-copy">恋爱日记帮助两个人从灵感走到正式安排，再把真实发生的事自然留成回忆。AI 只提供建议，不替任何人确认事实或评价关系。</p></section><section className="info-group"><InfoRow label="当前版本" value="V59"/><InfoRow label="账号注销" value="永久删除个人云端数据"/><InfoRow label="推荐反馈" value="只记录必要的排序信号"/><InfoRow label="运行监测" value="不含聊天、精确位置或密钥"/><InfoRow label="数据原则" value="个人所有 · 双方确认"/></section><a className="secondary-button map-link" href={holidaySource.url} target="_blank" rel="noreferrer">查看 2026 年节假日来源 <Arrow/></a></div>}

            {screen === "relationshipSafety" && <div className="page formal-page safety-page"><header><Back onClick={() => back("settings")}/><span>关系与数据安全</span><i aria-hidden="true"/></header><section className="page-intro compact"><p className="kicker">离开不需要许可</p><h2>你的安全，<br/>不由对方决定。</h2><p className="confirm-copy">任何一方都能独立退出。共同空间解散可以协商，但不能阻止个人离开。</p></section><section className="safety-status"><span>✓</span><div><b>当前共享权限正常</b><p>照片、文字与 AI 衍生内容均记录来源和撤回状态。</p></div></section><section className="settings-group"><SettingRow icon="◎" label="查看我的内容与授权" value="照片与分享" onClick={()=>go("storage")}/><SettingRow icon="⇩" label="导出我的数据" value="不含 TA 已撤回内容" onClick={()=>void exportMyData()}/><SettingRow icon="!" label="举报骚扰或内容滥用" onClick={()=>setPanel("reportSafety")}/></section><section className="safety-explainer"><b>退出后保留什么？</b><p>你自己的内容和必要共同事实可形成只读归档；TA 撤回的内容会显示为占位说明。新关系永远不能访问旧关系数据。</p></section><button className="secondary-button" onClick={()=>setPanel("normalExit")}>退出当前关系</button><button className="danger-button safety-danger" onClick={()=>setPanel("safetyExit")}>立即退出并保护我的内容</button><p className="policy-note">安全退出会先撤销共享、下载和历史文件链接，再通知对方。</p></div>}

            {screen === "relationshipArchive" && <div className="page formal-page archive-page"><header><span/><span>{safetyExitUsed?"安全退出完成":"旧关系归档"}</span><i aria-hidden="true"/></header><div className="success-symbol protected">✓</div><section className="page-intro compact"><p className="kicker">{safetyExitUsed?"共享权限已撤销":"你已独立退出"}</p><h2>{safetyExitUsed?"你的内容，已受到保护。":"这段记录，现在只读保存。"}</h2><p className="confirm-copy">退出无需对方确认。对方已收到不含举报详情的通知；新关系无法访问这里的数据。</p></section><section className="protection-checklist"><div><span>✓</span><p><b>敏感内容已撤回</b><small>对方无法继续查看或下载</small></p></div><div><span>✓</span><p><b>历史访问链接已失效</b><small>离线截屏与已导出文件无法远程删除</small></p></div><div><span>✓</span><p><b>AI 衍生内容已清理</b><small>关系评价、摘要和画像不再保留</small></p></div></section>{!safetyExitUsed&&<section className="archive-card"><p className="kicker">只读共同事实</p><b>晚风散步与河畔小酒馆</b><small>{eventDateLong} · 双方曾确认</small><p>个人文字和照片仍受各自撤回权限控制。</p></section>}<button className="primary-button" onClick={()=>{setRelationshipExited(false);setSafetyExitUsed(false);history.current=[];go("connect",true);}}>建立新的关系 <Arrow/></button><button className="ghost-button" onClick={()=>notify("旧关系数据不会带入新的共同空间")}>了解数据隔离</button></div>}

            {screen === "task" && <div className="page task-page"><header><Back onClick={() => back("home")}/><span>{hasRelationship?"共同任务":"共同体验预览"}</span>{hasRelationship?<button className="text-button" onClick={()=>go("taskHistory")}>历史</button>:<i aria-hidden="true"/>}</header><div className="task-hero"><span>{taskDone&&!activeTask?"✓":"♫"}</span><p className="kicker">{hasRelationship?(activeTask?"当前共同任务":"任务灵感"):"建立关系后可开启"}</p><h2>交换一首<br/>最近常听的歌</h2><p>不是为了猜对彼此，而是借一首歌，听见最近没有说出口的心情。</p></div><div className="task-rule"><span>01</span><p><b>各自选一首</b><br/>先不要告诉对方原因</p><span>02</span><p><b>一起完整听完</b><br/>再分享为什么选择它</p></div>{!hasRelationship?<div className="task-actions"><div className="accepted-badge">这是共同功能预览，不会记录完成状态</div><button className="primary-button" onClick={()=>{setOnboardingIntent("invite");go("connect");}}>邀请 TA 一起使用 <Arrow/></button><button className="ghost-button" onClick={()=>go("home")}>先继续单人体验</button></div>:taskLinked?<div className="task-actions"><div className="linked-plan-preview"><b>已规划</b><p>{currentPlan.title}</p><small>{eventMonthDay} 18:30 · 当前关联安排</small></div><button className="primary-button" onClick={()=>go("schedule")}>查看安排 <Arrow/></button></div>:!activeTask?<div className="task-actions"><button className="primary-button" disabled={taskBusy} onClick={()=>void startSharedTask()}>{taskBusy?"正在发送…":"发给 TA 一起做"} <Arrow/></button><p className="policy-note">TA 接受后才会成为双方的共同任务。</p></div>:activeTask.status==="pending_partner"?<div className="task-actions"><div className="accepted-badge">{isTaskCreator?"等待 TA 接受":"TA 邀请你一起完成"}</div>{!isTaskCreator&&<button className="primary-button" disabled={taskBusy} onClick={()=>void updateSharedTask("accept")}>{taskBusy?"正在确认…":"接受这个任务"} <Arrow/></button>}<button className="ghost-button" disabled={taskBusy} onClick={()=>void updateSharedTask("cancel")}>结束这项任务</button></div>:activeTask.status==="completion_pending"?<div className="task-actions"><div className="accepted-badge">{isTaskCompletionRequester?"等待 TA 确认完成":"TA 已确认完成，等待你的确认"}</div>{!isTaskCompletionRequester&&<button className="primary-button" disabled={taskBusy} onClick={()=>void updateSharedTask("confirm_complete")}>{taskBusy?"正在确认…":"确认双方已完成"} <Arrow/></button>}</div>:<div className="task-actions"><div className="accepted-badge">✓ 双方已接受这项任务</div><button className="primary-button" onClick={() => {setTaskContextActive(true);setChoices({...choices, mood:"想放松"}); go("inspire");}}>去规划一个晚上 <Arrow/></button><button className="ghost-button" disabled={taskBusy} onClick={()=>void updateSharedTask("request_complete")}>我已经完成</button></div>}</div>}
            {screen === "terms" && (
              <TermsPage onBack={() => back("settings")}/>
            )}
            {screen === "privacyPolicy" && (
              <PrivacyPolicyPage onBack={() => back("settings")} onOpenAiPrivacy={() => go("privacy")}/>
            )}
            {screen === "accountDeletion" && (
              <AccountDeletionPage hasRelationship={hasRelationship} phrase={deletionPhrase} busy={deletionBusy} error={deletionError} onPhraseChange={value=>{setDeletionPhrase(value);setDeletionError("");}} onExport={()=>void exportMyData()} onDelete={()=>void deleteMyAccount()} onBack={()=>back("settings")}/>
            )}
          </div>
        </div>
      </section>
      {panel && !["profileEdit","cityEdit","normalExit","safetyExit","reportSafety","clearData"].includes(panel) && <div className="modal-backdrop"><section ref={modalRef} className="bottom-sheet" role="dialog" aria-modal="true" aria-label="操作面板" tabIndex={-1}><div className="sheet-handle" aria-hidden="true"/><button type="button" className="sheet-close" onClick={() => setPanel("")} aria-label="关闭面板">×</button>{panel === "edit" && <><p className="kicker">编辑正式安排</p><h2>{scheduleIsShared?"这已经是你们的安排":"这是你的个人计划"}</h2><label>安排名称<input required name="schedule-title" autoComplete="off" value={scheduleDraft.title || currentPlan.title} onChange={e=>setScheduleDraft({...scheduleDraft,title:e.target.value})}/></label><label>日期与时间<input required name="edit-date-time" type="datetime-local" autoComplete="off" value={`${scheduleDraft.date}T${scheduleDraft.time}`} onInput={e=>{const [date,time]=e.currentTarget.value.split("T");setScheduleDraft(current=>({...current,date,time}));}}/></label><label>所在城市<input required name="schedule-city-edit" autoComplete="address-level2" value={scheduleDraft.city || profile.city} onChange={e=>setScheduleDraft({...scheduleDraft,city:e.target.value})}/></label><button className="primary-button" disabled={scheduleBusy} onClick={()=>void saveScheduleEdits()}>{scheduleBusy?"正在保存…":"保存修改"} <Arrow/></button></>}{panel === "cancel" && <><div className="danger-symbol">!</div><h2>{scheduleIsShared?"确定取消这个安排？":"确定删除这个计划？"}</h2><p className="sheet-copy">{scheduleIsShared?"取消后会保留记录；若关联任务，任务会解除关联但安排历史不会消失。":"删除后会从你的首页和日历中移除，且无法恢复。"}</p><button className="danger-button" disabled={scheduleBusy} onClick={() => {setCancelled(true);setTaskLinked(false);setPanel("");}}>{scheduleBusy?"正在处理…":scheduleIsShared?"确认取消":"确认删除"}</button><button className="ghost-button" disabled={scheduleBusy} onClick={() => setPanel("")}>{scheduleIsShared?"保留安排":"暂不删除"}</button></>}{panel === "memoryEdit" && <><p className="kicker">我的内容，由我管理</p><h2>补充一点真实细节</h2><PhotoUpload added={Boolean(uploadedMedia)&&!memoryContentRetracted} busy={mediaBusy} onFile={file=>void uploadMemoryPhoto(file)}/><label>回忆名称<input name="memory-title-edit" autoComplete="off" value={memoryDraft.title} onChange={e=>setMemoryDraft({...memoryDraft,title:e.target.value})}/></label><label>想留住的一句话<textarea name="memory-note" autoComplete="off" value={memoryNote} onChange={e => setMemoryNote(e.target.value)}/></label>{currentMemory?.scheduleId&&hasRelationship&&<label className="check-row"><input type="checkbox" checked={memoryShare} onChange={e=>setMemoryShare(e.target.checked)}/><span>将我的这段文字和照片分享给 TA</span></label>}<p className="sheet-copy">照片和文字会标记为由你上传，可随时撤回；AI 不会自动覆盖。</p><button className="primary-button" disabled={memoryBusy} onClick={()=>void saveMemory(false)}>{memoryBusy?"正在保存…":"保存到回忆"} <Arrow/></button></>}{panel === "retractMemory"&&<><div className="danger-symbol">↩</div><p className="kicker">撤回我的内容</p><h2>让对方也无法继续访问？</h2><p className="sheet-copy">你上传的照片会从双方在线副本中删除；共同确认的日期、地点与活动仍作为各自历史事实保留。</p><div className="risk-note"><b>撤回不等于远程销毁</b><p>对方此前的截屏或离线导出文件无法由平台删除。</p></div><button className="danger-button" disabled={mediaBusy} onClick={()=>void retractCurrentMemoryContent()}>{memoryBusy?"正在撤回…":"撤回我的文字和照片"}</button><button className="ghost-button" onClick={()=>setPanel("")}>暂不撤回</button></>}{panel === "deleteMemory"&&<><div className="danger-symbol">!</div><h2>删除我的回忆副本？</h2><p className="sheet-copy">删除只影响你的基础回忆副本。已分享给 TA 的个人文字或照片需要先撤回，系统不会悄悄替你保留共享内容。</p><button className="danger-button" disabled={memoryBusy} onClick={()=>void deleteCurrentMemory()}>{memoryBusy?"正在删除…":"删除我的副本"}</button><button className="ghost-button" onClick={()=>setPanel("")}>取消</button></>}{panel === "calendarAdd"&&<><p className="kicker">{hasRelationship?"添加到我的与共同日历":"添加到我的日历"}</p><h2>想记录什么？</h2><button className="sheet-choice" onClick={()=>{setPanel("");go("inspire");}}><span>＋</span><div><b>添加安排</b><p>手动创建，或先从灵感开始</p></div><i aria-hidden="true">›</i></button><button className="sheet-choice" onClick={()=>{setPanel("");go("importantCreate");}}><span>♡</span><div><b>添加重要日子</b><p>生日、纪念日或其他值得记住的日期</p></div><i aria-hidden="true">›</i></button></>}</section></div>}
      {["profileEdit","cityEdit","normalExit","safetyExit","reportSafety","clearData"].includes(panel) && <div className="modal-backdrop"><section ref={modalRef} className="bottom-sheet" role="dialog" aria-modal="true" aria-label="确认操作" tabIndex={-1}><div className="sheet-handle" aria-hidden="true"/><button type="button" className="sheet-close" onClick={() => setPanel("")} aria-label="关闭面板">×</button>{panel==="profileEdit"&&<><p className="kicker">编辑我的资料</p><h2>每个人管理自己的资料</h2><label>昵称<input name="my-name" autoComplete="name" spellCheck={false} maxLength={30} value={profile.name} onChange={e=>{setProfile({...profile,name:e.target.value});setProfileError("");}}/></label><label>生日<input name="my-birthday" autoComplete="bday" inputMode="numeric" maxLength={20} value={profile.birthday} onChange={e=>setProfile({...profile,birthday:e.target.value})}/></label><label>当前城市<input name="city" autoComplete="address-level2" maxLength={40} value={profile.city} onChange={e=>setProfile({...profile,city:e.target.value})}/></label>{hasRelationship&&<><label>TA 的昵称<input name="partner-name" autoComplete="off" value={partnerProfile.name} readOnly aria-describedby="partner-permission-note"/></label><label>TA 共享的生日<input name="partner-birthday" autoComplete="off" value={partnerProfile.birthday||"未共享"} readOnly aria-describedby="partner-permission-note"/></label><p id="partner-permission-note" className="sheet-copy">TA 的个人资料只能由 TA 修改；这里仅展示 TA 主动共享的内容。</p></>}<button className="primary-button" disabled={accountBusy} onClick={()=>void saveProfileEdits()}>{accountBusy?"正在保存…":"保存修改"} <Arrow/></button></>}{panel==="cityEdit"&&<><p className="kicker">灵感城市</p><h2>这次想去哪里？</h2><label>城市<input name="inspiration-city" autoComplete="address-level2" maxLength={40} value={profile.city} onChange={e=>setProfile({...profile,city:e.target.value})}/></label>{!profile.city.trim()&&<p className="field-error" role="alert">请输入城市后再保存。</p>}<button className="primary-button" disabled={accountBusy} onClick={()=>{if(!profile.city.trim())return;setPanel("");void saveSelectedCity(profile.city);}}>保存城市 <Arrow/></button></>}{panel==="normalExit"&&<><div className="danger-symbol">↗</div><p className="kicker">无需对方确认</p><h2>退出当前关系？</h2><p className="sheet-copy">共享权限会立即结束。你自己的内容与必要共同事实形成只读归档；对方撤回的内容会同步消失。</p><div className="risk-note"><b>不会提供退出前导出期</b><p>这样可以避免另一方在最后时刻批量保存敏感内容。</p></div><button className="danger-button" disabled={accountBusy} onClick={()=>void leaveRelationship(false)}>{accountBusy?"正在退出…":"确认独立退出"}</button><button className="ghost-button" disabled={accountBusy} onClick={()=>setPanel("")}>继续保留关系</button></>}{panel==="safetyExit"&&<><div className="danger-symbol">!</div><p className="kicker">立即保护</p><h2>退出并撤回敏感内容？</h2><div className="protection-mini"><p>✓ 无需 TA 同意</p><p>✓ 立即撤回我的敏感照片与文字</p><p>✓ 阻止继续查看、下载和批量导出</p><p>✓ 撤销历史文件链接后再通知 TA</p></div><p className="sheet-copy">平台无法远程删除对方此前的截屏或离线文件。举报详情不会出现在关系通知中。</p><button className="danger-button" disabled={accountBusy} onClick={()=>void leaveRelationship(true)}>{accountBusy?"正在保护并退出…":"立即退出并保护我的内容"}</button><button className="ghost-button" disabled={accountBusy} onClick={()=>setPanel("")}>取消</button></>}{panel==="reportSafety"&&<><div className="danger-symbol">!</div><p className="kicker">举报与证据保护</p><h2>发生了什么？</h2><div className="report-choices"><button className={reportReason==="骚扰或控制"?"selected":""} aria-pressed={reportReason==="骚扰或控制"} onClick={()=>setReportReason("骚扰或控制")}>骚扰或控制</button><button className={reportReason==="勒索或威胁"?"selected":""} aria-pressed={reportReason==="勒索或威胁"} onClick={()=>setReportReason("勒索或威胁")}>勒索或威胁</button><button className={reportReason==="亲密影像滥用"?"selected":""} aria-pressed={reportReason==="亲密影像滥用"} onClick={()=>setReportReason("亲密影像滥用")}>亲密影像滥用</button></div><p className="sheet-copy">提交后先停止相关内容传播与下载，再进入审核。撤回你自己的内容无需等待审核。</p><button className="danger-button" disabled={!reportReason||accountBusy} onClick={()=>void leaveRelationship(true)}>{accountBusy?"正在提交并保护…":"提交举报并立即保护"}</button><button className="ghost-button" disabled={accountBusy} onClick={()=>setPanel("")}>暂不提交</button></>}{panel==="clearData"&&<><div className="danger-symbol">!</div><h2>清空本机会话？</h2><p className="sheet-copy">只会删除当前浏览器里的灵感草稿、显示偏好与旧版本快照；账户资料和服务端安排不会删除。</p><button className="danger-button" onClick={clearLocalSession}>确认清空本机会话</button><button className="ghost-button" onClick={()=>setPanel("")}>取消</button></>}</section></div>}
      {birthdayPickerOpen && <BirthdayCalendar value={profile.birthday} onConfirm={value=>{setProfile({...profile,birthday:value});setBirthdayPickerOpen(false);}} onClose={()=>setBirthdayPickerOpen(false)}/>} 
      {cityPickerOpen && <CityPicker value={profile.city} onConfirm={value=>{void saveSelectedCity(value);setCityPickerOpen(false);}} onClose={()=>setCityPickerOpen(false)}/>}
      <div className="toast-region" aria-live="polite" aria-atomic="true">{toast && <div className="toast">{toast}</div>}</div>
    </main>
  );
}

function TermsPage({ onBack }: { onBack: () => void }) {
  return <div className="page formal-page legal-page"><header><Back onClick={onBack}/><span>用户协议</span><i aria-hidden="true"/></header><section className="page-intro compact"><p className="kicker">测试版用户协议</p><h2>先说清楚，<br/>再一起使用。</h2><p className="legal-date">更新与生效日期：2026 年 9 月 3 日</p></section><article className="legal-document">
    <section><h3>1. 协议范围</h3><p>本协议适用于“恋爱日记”测试版服务。当前服务由恋爱日记项目提供，仍处于个人开发者测试阶段；商业化或运营主体发生变化时，我们会更新主体信息和协议，并在重要变化生效前提示你。</p></section>
    <section><h3>2. 使用条件与账号</h3><p>服务仅面向已满 18 周岁的用户。你需要使用自己的 ChatGPT 账号登录，并对账号下的操作负责。请勿共用账号、冒用他人身份或代替伴侣确认个人资料和共同事实。</p></section>
    <section><h3>3. 个人内容与共同内容</h3><p>个人计划默认仅本人可见；建立关系后，仍需由你逐项选择是否分享。共同安排、重要日子、任务和完成状态须经过相应确认。任何一方都可独立退出关系，另一方不能阻止。</p></section>
    <section><h3>4. AI、地点与天气信息</h3><p>AI 灵感仅供参考，不构成事实、承诺、医疗或其他专业意见，也不会自动进入日历。地点、价格、距离、营业时间、交通和天气来自第三方或模型推断，可能延迟或不完整；出发前请向地点经营者或官方渠道再次确认。</p></section>
    <section><h3>5. 你上传的内容</h3><p>你应当有权上传照片和文字，并尊重伴侣及第三人的肖像、隐私和知识产权。你保留对原创内容的相应权利，同时授权服务为存储、同步和向你指定的关系成员展示这些内容而进行必要处理。</p></section>
    <section><h3>6. 不允许的行为</h3><ul><li>上传违法、侵权、骚扰、威胁或未经同意的私密内容；</li><li>利用服务跟踪、控制、冒充或伤害他人；</li><li>攻击、绕过权限、批量抓取或干扰服务运行。</li></ul></section>
    <section><h3>7. 服务变更与中断</h3><p>测试版可能调整功能、暂停维护或出现第三方服务中断。我们会尽力保护已保存的数据并提供明确的失败提示，但不保证服务永久不间断。对影响你权益的重要变化，我们会以产品内提示等合理方式告知。</p></section>
    <section><h3>8. 退出与注销</h3><p>你可以退出当前关系而保留账号，也可以在“设置 → 注销账号”中永久删除账号。注销会删除你的个人资料与个人内容，并结束当前关系；伴侣仍可保留其本人内容和已经由双方确认的必要共同事实。</p></section>
    <section><h3>9. 反馈与争议</h3><p>如有账号、内容或安全问题，请通过“设置 → 帮助与反馈”联系我们。我们会根据问题类型处理。协议的订立、履行和解释适用中华人民共和国法律；产生争议时，双方应先友好协商。</p></section>
    <p className="legal-footnote">当前为公开测试版协议。正式商业化前将根据实际运营主体、服务范围与数据链路进行专业法律审核和更新。</p>
  </article></div>;
}

function PrivacyPolicyPage({ onBack, onOpenAiPrivacy }: { onBack: () => void; onOpenAiPrivacy: () => void }) {
  return <div className="page formal-page legal-page"><header><Back onClick={onBack}/><span>隐私政策</span><i aria-hidden="true"/></header><section className="page-intro compact"><p className="kicker">测试版隐私政策</p><h2>只处理完成服务<br/>真正需要的数据。</h2><p className="legal-date">更新与生效日期：2026 年 9 月 3 日</p></section><article className="legal-document">
    <section><h3>1. 我们处理哪些信息</h3><ul><li><b>账号信息：</b>ChatGPT 登录提供的稳定用户标识、邮箱和可选姓名；</li><li><b>你主动填写的资料：</b>昵称、生日、城市及关系邀请；</li><li><b>产品内容：</b>个人或共同安排、重要日子、任务、回忆、照片和分享状态；</li><li><b>灵感条件：</b>状态、氛围、预算、时间、地点范围及你主动填写的特别照顾；</li><li><b>反馈和偏好：</b>提醒开关、合适/不合适原因与帮助反馈；</li><li><b>运行数据：</b>服务来源、响应时间、固定失败类型和备用方案是否触发。</li></ul></section>
    <section><h3>2. 为什么处理这些信息</h3><p>用于识别你的账号、保存并同步内容、建立双方授权的共同空间、生成灵感、展示地点与天气、发送你选择的提醒、处理反馈、保护账号安全和改善服务稳定性。不会使用你的关系内容生成忠诚度、分手概率或心理诊断。</p></section>
    <section><h3>3. 定位与自由输入</h3><p>精确位置仅在你主动允许定位时用于当次附近地点查询，不写入个人资料、运行监测或网址。未主动填写“特别照顾”时不会向 AI 发送该字段；请勿在自由输入中填写姓名、电话、身份证号或其他高度敏感信息。</p></section>
    <section><h3>4. 第三方服务</h3><p>为完成服务，数据可能由 ChatGPT 登录、OpenAI Sites 托管、Cloudflare D1/R2 存储、AIHubMix/所选模型生成、高德地点与天气，以及 Open-Meteo 备用天气服务处理。我们只发送完成当次功能所需的字段；密钥只保存在服务端，运行监测不记录聊天文字、精确位置或伴侣私密内容。</p><p>部分第三方服务可能在境外处理数据。正式商业化前，我们会根据实际链路补充运营主体、处理地点、单独告知与同意机制；测试期间请勿输入高度敏感信息。</p></section>
    <section><h3>5. 伴侣之间如何共享</h3><p>个人计划默认仅本人可见。共同内容仅对当前关系成员开放，并按创建、接受、完成和撤回状态展示。关系退出后停止新的共享；对方已保存的离线副本或截图无法由平台远程删除。</p></section>
    <section><h3>6. 保存期限</h3><p>账号与产品内容在账号存续和功能所需期间保存；照片在你撤回或注销时删除在线文件；公开分享链接到期或撤回后失效；匿名运行监测最多保留 30 天。法律要求另有保存期限的，按法律规定处理并限制用途。</p></section>
    <section><h3>7. 你的权利</h3><p>你可以查看和修改资料、导出自己的数据、撤回照片与分享、关闭提醒、退出关系，并在设置中注销账号。若功能内无法完成更正、删除或投诉，请通过“帮助与反馈”联系我们。</p></section>
    <section><h3>8. 注销后如何处理</h3><p>注销会删除你的账号资料、个人计划、个人回忆、照片、反馈、偏好和有效分享，并结束当前关系。双方已确认的共同事实可保留给伴侣，但会移除你的个人文字、照片与账号关联；重新登录会被视为新账号，不能恢复旧关系。</p></section>
    <section><h3>9. 安全与未成年人</h3><p>我们使用身份校验、服务端权限判断、私有文件访问、输入限制与最小化运行监测等措施保护数据。发生可能影响你权益的安全事件时，将依法采取补救和告知措施。本服务不面向未满 18 周岁的用户。</p></section>
    <section><h3>10. 联系与更新</h3><p>隐私问题可通过“设置 → 帮助与反馈”选择“隐私与安全”提交。重要政策变化会通过产品内提示等合理方式告知，不会用笼统授权替代必要的再次确认。</p></section>
    <button className="secondary-button legal-related" onClick={onOpenAiPrivacy}>查看 AI 数据使用原则 <Arrow/></button>
    <p className="legal-footnote">当前为公开测试版隐私政策，不代表已经完成商业化运营所需的全部合规程序。</p>
  </article></div>;
}

function AccountDeletionPage({ hasRelationship, phrase, busy, error, onPhraseChange, onExport, onDelete, onBack }: { hasRelationship: boolean; phrase: string; busy: boolean; error: string; onPhraseChange: (value: string) => void; onExport: () => void; onDelete: () => void; onBack: () => void }) {
  return <div className="page formal-page deletion-page"><header><Back onClick={onBack}/><span>注销账号</span><i aria-hidden="true"/></header><section className="page-intro compact"><p className="kicker">永久且不可恢复</p><h2>先确认会删除什么。</h2><p className="confirm-copy">如需留存内容，请先导出数据。注销不是退出登录，也不能在之后恢复旧关系。</p></section><section className="deletion-summary"><h3>注销后会立即发生</h3><ul><li>删除你的资料、个人计划、个人回忆、照片、反馈和使用偏好；</li><li>撤销你创建的有效公开分享链接；</li>{hasRelationship&&<li>结束当前关系，双方停止继续同步；</li>}<li>退出当前 ChatGPT 登录会话。</li></ul></section><section className="deletion-boundary"><b>不会替伴侣删除什么？</b><p>伴侣自己的资料与个人内容仍由 TA 管理。双方已确认的共同事实可在 TA 账号中保留，但你的个人文字、照片和账号关联会移除。平台无法远程删除别人已经保存的离线副本或截图。</p></section><button className="secondary-button" disabled={busy} onClick={onExport}>先导出我的数据 <Arrow/></button><label className="deletion-confirm">输入“注销账号”确认<input name="account-deletion-confirmation" autoComplete="off" value={phrase} onChange={event=>onPhraseChange(event.target.value)} placeholder="注销账号" aria-describedby="deletion-help"/></label><p id="deletion-help" className="policy-note">只有完全匹配后，永久注销按钮才会启用。</p>{error&&<p className="field-error" role="alert">{error}</p>}<button className="danger-button" disabled={busy||phrase.trim()!=="注销账号"} onClick={onDelete}>{busy?"正在删除账号与云端数据…":"永久注销账号"}</button></div>;
}

function Choice({ title, options, value, setValue }: { title: string; options: string[]; value: string; setValue: (v: string) => void }) {
  return <section className="choice-group" role="group" aria-label={title}><h3>{title}</h3><div>{options.map(option => <Pill key={option} active={option === value} onClick={() => setValue(option)}>{option}</Pill>)}</div></section>;
}

function MultiChoice({ title, options, values, setValues }: { title: string; options: string[]; values: string[]; setValues: (v: string[]) => void }) {
  return <section className="choice-group" role="group" aria-label={title}><h3>{title}</h3><div>{options.map(option => <Pill key={option} active={values.includes(option)} onClick={() => values.includes(option) ? setValues(values.filter(v=>v!==option)) : values.length < 2 ? setValues([...values,option]) : setValues([values[1],option])}>{option}</Pill>)}</div><p className="choice-help" aria-live="polite">已选择 {values.length}/2 · 选择第 3 项时会替换最早选择</p></section>;
}

function PlaceCandidates({ places, selectedId, onSelect, saved = false }: { places: Place[]; selectedId?: string; onSelect: (index: number) => void; saved?: boolean }) {
  const distanceFormatter = new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
  return <section className="place-candidates" aria-labelledby="place-candidates-title"><div className="section-heading"><div><p className="kicker">{places.length>1?"附近候选":"方案地点"}</p><h3 id="place-candidates-title">{places.length>1?"选择更合适的地点":"本方案的主地点"}</h3></div><span>{places.length} 个{saved?"保存地点":"真实地点"}</span></div>{places.length ? places.map((place, index) => <button type="button" key={place.id} className={selectedId === place.id ? "selected" : ""} aria-pressed={selectedId === place.id} onClick={() => onSelect(index)}><div><b>{place.name}</b><small title={place.businessArea || place.address}>{place.businessArea || place.address}</small><em>{place.recommendationReasons.slice(0,2).join(" · ")}</em></div><span>{place.distance !== null ? `${distanceFormatter.format(place.distance / 1000)}\u00a0公里` : "距离待定位"}</span></button>) : <p className="candidate-empty">附近没有匹配到地点，请扩大范围或调整商圈。</p>}</section>;
}

function planBudgetText(plan: Plan, budget: string, hasRelationship: boolean) {
  if (plan.budgetMatch === "under" && plan.estimatedCost) return `已知地点消费约 ¥${plan.estimatedCost} · 未达到预算偏好`;
  if (plan.budgetMatch !== "matched" || !plan.estimatedCost) return `预算偏好 ${budget} · 价格待确认`;
  return `已知地点消费约 ¥${plan.estimatedCost}${hasRelationship ? " / 两人" : ""}`;
}

function planDistanceText(plan: Plan, fallbackRadius: number) {
  const radius = (plan.searchRadius ?? fallbackRadius) / 1000;
  return plan.distanceVerified === false ? `商圈搜索 · ${radius} km 距离待定位` : `搜索范围 ${radius} km`;
}

function placeDistance(place: Place) {
  if (place.distance === null) return "距离待定位";
  return place.distance < 1000 ? `约 ${Math.max(100,Math.round(place.distance/100)*100)} 米` : `约 ${(place.distance/1000).toFixed(1)} 公里`;
}

function InfoRow({ label, value }: { label: string; value: string }) { return <div className="info-row"><span>{label}</span><b>{value}</b><i aria-hidden="true">›</i></div>; }
function WeatherNotice({ day, reportTime, source }: { day: WeatherDay; reportTime: string; source: string }) { return <div className="weather-notice"><span aria-hidden="true">☁</span><div><b>{weatherLabel(day)}</b><small>{day.date} · {source} · {reportTime||"以最新预报为准"}</small></div></div>; }
function ServiceIssueCard({ issue, retryLabel, onRetry, secondaryLabel, onSecondary, busy = false, variant = "inline" }: { issue: ServiceIssue; retryLabel: string; onRetry: () => void; secondaryLabel?: string; onSecondary?: () => void; busy?: boolean; variant?: "inline" | "blocking" }) {
  return <section className={`service-issue ${variant}`} role="status" aria-live="polite" aria-atomic="true"><span aria-hidden="true">!</span><div className="service-issue-copy"><b>{issue.title}</b><p>{issue.detail}</p></div><div className="service-issue-actions"><button type="button" disabled={busy} onClick={onRetry}>{busy?"正在重试…":retryLabel}</button>{secondaryLabel&&onSecondary&&<button type="button" onClick={onSecondary}>{secondaryLabel}</button>}</div></section>;
}
function SettingRow({ icon, label, value, onClick }: { icon: string; label: string; value?: string; onClick?: () => void }) { return <button className="setting-row" onClick={onClick}><span aria-hidden="true">{icon}</span><b>{label}</b>{value && <small>{value}</small>}<i aria-hidden="true">›</i></button>; }
function ToggleRow({ label, note, value, disabled, onChange }: { label: string; note: string; value: boolean; disabled?: boolean; onChange: (value: boolean) => void }) { return <div className="toggle-row"><div><b>{label}</b><small>{note}</small></div><button type="button" role="switch" aria-label={label} aria-checked={value} className={value?"on":""} disabled={disabled} onClick={()=>onChange(!value)}><i aria-hidden="true"/></button></div>; }
function PhotoUpload({ added, busy, onFile }: { added: boolean; busy: boolean; onFile: (file: File) => void }) { return <label className={`photo-upload ${added ? "added" : ""}`}><input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={event=>{const file=event.currentTarget.files?.[0];if(file)onFile(file);event.currentTarget.value="";}}/><span>{busy?"…":added?"✓":"+"}</span>{busy?"正在安全上传…":added?"已上传 1 张 · 可随时撤回":"选择照片（JPG、PNG 或 WebP，最大 8MB）"}</label>; }

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
