import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("关键服务异常都有持续提示和明确恢复入口", async () => {
  const [page, css] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/globals.css", root), "utf8"),
  ]);

  assert.match(page, /type ServiceIssueSource = "ai" \| "location" \| "weather" \| "sync"/);
  assert.match(page, /function ServiceIssueCard/);
  assert.match(page, /role="status" aria-live="polite" aria-atomic="true"/);
  assert.match(page, /data\.code === "NO_MATCHING_PLACES"/);
  assert.match(page, /扩大到 10 公里重试/);
  assert.match(page, /重新获取天气/);
  assert.match(page, /loadWeather\(city, false, true\)/);
  assert.match(page, /立即同步/);
  assert.match(page, /已保留当前页面内容，但可能不是最新状态/);
  assert.match(page, /setWeather\(null\)/);
  assert.match(css, /\.service-issue\{/);
  assert.match(css, /\.service-issue-actions button:disabled/);
});

test("同步失败保留旧数据，统一重试成功后再清除提示", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  assert.match(page, /async function loadSharedSchedule[\s\S]*return false;/);
  assert.match(page, /async function loadSharedExperiences[\s\S]*return false;/);
  assert.match(page, /scheduleOk && experiencesOk[\s\S]*clearServiceIssue\("sync"\)/);
  assert.doesNotMatch(page, /catch[^}]*setSchedules\(\[\]\)/);
});
