export type CalendarDayKind = "rest" | "adjusted-work" | "weekend" | "normal";

export type CalendarDayStatus = {
  kind: CalendarDayKind;
  label: "休" | "班" | "周末" | "";
  holidayName?: string;
};

export const holidaySource = {
  year: 2026,
  title: "国务院办公厅关于2026年部分节假日安排的通知",
  publishedAt: "2025-11-04",
  url: "https://www.beijing.gov.cn/gate/big5/www.beijing.gov.cn/zhengce/zhengcefagui/202511/t20251104_4258873.html",
};

const holidayRanges = [
  ["2026-01-01", "2026-01-03", "元旦"],
  ["2026-02-15", "2026-02-23", "春节"],
  ["2026-04-04", "2026-04-06", "清明节"],
  ["2026-05-01", "2026-05-05", "劳动节"],
  ["2026-06-19", "2026-06-21", "端午节"],
  ["2026-09-25", "2026-09-27", "中秋节"],
  ["2026-10-01", "2026-10-07", "国庆节"],
] as const;

const adjustedWorkDays = new Set(["2026-01-04", "2026-02-14", "2026-02-28", "2026-05-09", "2026-09-20", "2026-10-10"]);

export function calendarDayStatus(dateKey: string): CalendarDayStatus {
  if (adjustedWorkDays.has(dateKey)) return { kind: "adjusted-work", label: "班" };
  const holiday = holidayRanges.find(([start, end]) => dateKey >= start && dateKey <= end);
  if (holiday) return { kind: "rest", label: "休", holidayName: holiday[2] };
  const date = new Date(`${dateKey}T12:00:00+08:00`);
  if ([0, 6].includes(date.getDay())) return { kind: "weekend", label: "周末" };
  return { kind: "normal", label: "" };
}
