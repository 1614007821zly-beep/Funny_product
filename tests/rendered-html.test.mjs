import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Love Diary V1.17 experience", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html lang="zh-CN">/);
  assert.match(html, /<title>恋爱日记 V1\.17/);
  assert.match(html, /href="#main-content">跳到主要内容<\/a>/);
  assert.match(html, /<main class="prototype-shell" id="main-content">/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /使用 ChatGPT 登录/);
  assert.doesNotMatch(html, /codex-preview|Building your site|react-loading-skeleton/i);
});

test("keeps accessibility and interaction safeguards in source", async () => {
  const [page, css, layout, api, accountApi, inviteApi, joinApi, leaveApi, historySharingApi, schedulesApi, importantDaysApi, tasksApi, preferencesApi, feedbackApi, mediaApi, shareLinksApi, exportApi, sharePage, holidays, schema, releaseMigration, sharedScheduleMigration, unifiedScheduleMigration, historySharingMigration, sharedExperienceMigration, stageFourMigration, hosting] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/inspiration/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/account/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/relationship/invite/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/relationship/join/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/relationship/leave/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/relationship/history-sharing/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/schedules/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/important-days/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/tasks/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/preferences/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/feedback/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/media/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/share-links/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/account/export/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/share/[token]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/china-holidays.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0002_release_ended_relationships.sql", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0003_rainy_saracen.sql", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0004_fuzzy_beyonder.sql", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0005_acoustic_ben_grimm.sql", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0006_lowly_mastermind.sql", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0007_high_gwen_stacy.sql", import.meta.url), "utf8"),
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
  ]);

  assert.match(layout, /className="skip-link"/);
  assert.match(page, /role="dialog"/);
  assert.match(page, /aria-modal="true"/);
  assert.match(page, /aria-live="polite"/);
  assert.match(page, /type="datetime-local"/);
  assert.match(page, /aria-pressed=\{reportReason/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /overscroll-behavior:contain/);
  assert.doesNotMatch(css, /transition:\s*all/);
  assert.doesNotMatch(css, /outline:\s*(?:none|0)(?:[;}])/);
  assert.doesNotMatch(page, /modal-backdrop" onClick/);
  assert.match(page, /fetch\("\/api\/inspiration"/);
  assert.match(api, /process\.env\.AIHUBMIX_API_KEY/);
  assert.match(api, /process\.env\.AMAP_WEB_SERVICE_KEY/);
  assert.match(api, /aihubmix\.com\/v1\/chat\/completions/);
  assert.match(api, /lfm-2\.5-2\.6b-free/);
  assert.match(api, /response_format/);
  assert.match(api, /while \(timeline\.length < 3\)/);
  assert.match(api, /fetchWithNetworkRetry/);
  assert.match(api, /restapi\.amap\.com\/v5\/place\/text/);
  assert.match(api, /restapi\.amap\.com\/v5\/place\/around/);
  assert.match(api, /sortrule/);
  assert.match(page, /navigator\.geolocation/);
  assert.match(page, /PlaceCandidates/);
  assert.match(page, /daySchedules=valid\?schedules\.filter/);
  assert.match(page, /距离待定位/);
  assert.match(api, /value === null \|\| value === undefined \|\| value === ""/);
  assert.match(api, /RATE_LIMIT/);
  assert.match(api, /getChatGPTUser/);
  assert.match(api, /AUTH_REQUIRED/);
  assert.match(api, /ai_usage_limits/);
  assert.match(api, /DAILY_LIMIT/);
  assert.match(api, /ai_service_state/);
  assert.match(api, /AI_CIRCUIT_OPEN/);
  assert.match(api, /SENSITIVE_INPUT/);
  assert.match(page, /AI 尚未配置，当前显示备用方案/);
  assert.match(page, /\/signin-with-chatgpt\?return_to=/);
  assert.match(page, /fetch\("\/api\/relationship\/join"/);
  assert.match(page, /input\.type = "text"/);
  assert.match(page, /BirthdayCalendar/);
  assert.match(page, /出生年份/);
  assert.match(page, /cityOptions/);
  assert.match(page, /CityPicker/);
  assert.match(page, /搜索并选择城市/);
  assert.match(page, /visibilitychange/);
  assert.match(page, /readonly-profile-input/);
  assert.match(page, /inviteCodeValue\|\|"尚未生成"/);
  assert.match(page, /relationshipRequired/);
  assert.match(page, /setInviteCodeValue\(data\.invite\?\.code \?\? ""\)/);
  assert.match(css, /label:has\(\.readonly-profile-input\)/);
  assert.match(css, /\.bottom-sheet label:focus-within\{box-shadow:none\}/);
  assert.match(accountApi, /getChatGPTUser/);
  assert.match(accountApi, /authenticated: true/);
  assert.match(inviteApi, /expiresAt/);
  assert.match(joinApi, /env\.DB\.batch/);
  assert.match(leaveApi, /UPDATE relationship_members SET left_at=\? WHERE relationship_id=\? AND left_at IS NULL/);
  assert.match(leaveApi, /UPDATE relationship_invites SET status='cancelled'/);
  assert.match(page, /fetch\("\/api\/relationship\/leave"/);
  assert.match(releaseMigration, /WHERE `status` = 'ended'/);
  assert.match(page, /fetch\("\/api\/schedules"/);
  assert.match(page, /接受这个安排/);
  assert.match(page, /先自己体验/);
  assert.match(page, /保存到我的计划/);
  assert.match(page, /我的计划 · 仅自己可见/);
  assert.match(page, /个人计划不会自动共享/);
  assert.match(page, /love-diary-solo-user/);
  assert.match(page, /TA 已发出邀请/);
  assert.match(page, /scheduleDraft\.title \|\| currentPlan\.title/);
  assert.match(page, /schedule\.visibility==="shared"\?"共同安排":"我的计划"/);
  assert.match(page, /活动日期到来后，双方才能确认完成并生成基础回忆/);
  assert.match(page, /setCompleted\(false\); setMyConfirmed\(false\); setTaConfirmed\(false\)/);
  assert.match(schedulesApi, /pending_partner/);
  assert.match(schedulesApi, /body\.action === "cancel"/);
  assert.match(schedulesApi, /body\.action === "delete"/);
  assert.match(schedulesApi, /body\.action === "update"/);
  assert.match(schedulesApi, /body\.action === "share"/);
  assert.match(schedulesApi, /visibility === "shared"/);
  assert.match(schedulesApi, /legacy_import/);
  assert.match(schedulesApi, /source_reference/);
  assert.match(schedulesApi, /version=version\+1/);
  assert.match(schedulesApi, /status='cancelled'/);
  assert.match(page, /cancelCurrentSchedule/);
  assert.match(page, /saveScheduleEdits/);
  assert.match(page, /发给 TA 一起决定/);
  assert.match(page, /单人阶段的计划/);
  assert.match(page, /historySharingSelection/);
  assert.match(page, /我的与共同日历/);
  assert.match(page, /daySchedules\.some\(schedule=>schedule\.visibility==="personal"\)/);
  assert.match(historySharingApi, /env\.DB\.batch/);
  assert.match(historySharingApi, /history_sharing_mode/);
  assert.match(historySharingApi, /visibility='shared'/);
  assert.match(page, /city: profile\.city/);
  assert.match(page, /monthOffsetFromToday/);
  assert.match(page, /onClick=\{jumpToToday\}>今日/);
  assert.match(page, /isToday\?"today":""/);
  assert.match(page, /title: currentPlan\.title/);
  assert.match(page, /确定删除这个计划/);
  assert.match(page, /choices\.special\.trim\(\)&&<span className="prep-note">特别照顾/);
  assert.match(page, /留空时不会出现在灵感方案中/);
  assert.match(api, /if \(input\.special\) promptLines\.push/);
  assert.doesNotMatch(api, /特殊要求：\$\{input\.special \|\| "无"\}/);
  assert.match(css, /one visible focus surface per compound field/);
  assert.match(css, /button\.idea\.selected-day:after\{display:none\}/);
  assert.match(schedulesApi, /created_by_user_id === identity\.userId/);
  assert.match(schema, /sharedSchedules/);
  assert.match(schema, /export const schedules/);
  assert.match(schema, /aiUsageLimits/);
  assert.match(sharedScheduleMigration, /CREATE TABLE `shared_schedules`/);
  assert.match(unifiedScheduleMigration, /CREATE TABLE `schedules`/);
  assert.match(unifiedScheduleMigration, /INSERT OR IGNORE INTO `schedules`/);
  assert.match(unifiedScheduleMigration, /FROM `shared_schedules`/);
  assert.match(historySharingMigration, /ADD `history_sharing_mode`/);
  assert.match(historySharingMigration, /ADD `history_sharing_reviewed_at`/);
  assert.match(page, /partnerMood: hasRelationship \? choices\.taMood : undefined/);
  assert.match(page, /hasRelationship&&<Choice title="TA 呢？"/);
  assert.match(page, /fetch\("\/api\/tasks"/);
  assert.match(page, /fetch\("\/api\/important-days"/);
  assert.match(page, /共同体验预览/);
  assert.match(tasksApi, /completion_pending/);
  assert.match(tasksApi, /completion_requested_by_user_id === identity\.userId/);
  assert.match(tasksApi, /INSERT OR IGNORE INTO relationship_tasks/);
  assert.match(importantDaysApi, /visibility === "shared"/);
  assert.match(importantDaysApi, /pending_partner/);
  assert.match(importantDaysApi, /version=version\+1/);
  assert.match(schema, /export const importantDays/);
  assert.match(schema, /export const relationshipTasks/);
  assert.match(sharedExperienceMigration, /CREATE TABLE `important_days`/);
  assert.match(sharedExperienceMigration, /CREATE TABLE `relationship_tasks`/);
  assert.match(sharedExperienceMigration, /idx_relationship_tasks_one_open/);
  assert.match(page, /window\.sessionStorage\.setItem\(INSPIRATION_DRAFT_KEY/);
  assert.match(page, /window\.history\.replaceState\(\{ screen: initialScreen \}, "", `#\$\{initialScreen\}`\)/);
  assert.doesNotMatch(page, /new URLSearchParams/);
  assert.doesNotMatch(page, /window\.localStorage\.setItem\("love-diary-v112"/);
  assert.match(page, /旧计划不会自动恢复/);
  assert.match(page, /AI 服务暂时繁忙，已切换为可继续编辑的备用方案/);
  assert.match(page, /hasRelationship&&<><label>TA 的昵称/);
  assert.match(css, /@media\(max-width:960px\)/);
  assert.match(page, /onClick=\{\(\)=>void saveProfileEdits\(\)\}/);
  assert.match(page, /重置演示状态（保留已保存计划）/);
  assert.match(page, /fetch\("\/api\/preferences"/);
  assert.match(page, /fetch\("\/api\/feedback"/);
  assert.match(page, /fetch\("\/api\/media"/);
  assert.match(page, /fetch\("\/api\/share-links"/);
  assert.match(page, /fetch\("\/api\/account\/export"/);
  assert.match(page, /calendarDayStatus\(dateKey\)/);
  assert.match(page, /国务院办公厅安排/);
  assert.match(preferencesApi, /ON CONFLICT\(user_id\) DO UPDATE/);
  assert.match(feedbackApi, /INSERT INTO feedback_entries/);
  assert.match(mediaApi, /env\.MEDIA\.put/);
  assert.match(mediaApi, /hasValidImageSignature/);
  assert.match(mediaApi, /只有上传者可以撤回这张照片/);
  assert.match(mediaApi, /env\.MEDIA\.delete/);
  assert.match(shareLinksApi, /schedule\.status === "confirmed"/);
  assert.match(shareLinksApi, /token_hash/);
  assert.match(shareLinksApi, /revoked_at/);
  assert.match(sharePage, /不包含心情、特别照顾、定位或搜索条件/);
  assert.match(exportApi, /created_by_user_id=\?/);
  assert.match(holidays, /2026-02-15/);
  assert.match(holidays, /2026-10-10/);
  assert.match(holidays, /weekend/);
  assert.match(stageFourMigration, /CREATE TABLE `user_preferences`/);
  assert.match(stageFourMigration, /CREATE TABLE `user_media`/);
  assert.match(stageFourMigration, /CREATE TABLE `schedule_share_links`/);
  assert.match(stageFourMigration, /CREATE TABLE `feedback_entries`/);
  assert.match(hosting, /"r2": "MEDIA"/);
  assert.match(schema, /relationshipMembers/);
  assert.match(schema, /relationshipInvites/);
  assert.doesNotMatch(page, /AIHUBMIX_API_KEY|AMAP_WEB_SERVICE_KEY/);
});
