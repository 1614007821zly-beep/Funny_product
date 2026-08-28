export type CalendarDayKind = "rest" | "adjusted-work" | "weekend" | "normal";

export type CalendarDayStatus = {
  kind: CalendarDayKind;
  label: "休" | "班" | "周末" | "";
  holidayName?: string;
  festivalName?: string;
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

const annualFestivals: Record<string, string> = {
  "01-01": "元旦",
  "02-14": "情人节",
  "05-01": "劳动节",
  "05-20": "520",
  "10-01": "国庆节",
  "12-25": "圣诞节",
};

const festivalsByDate: Record<string, string> = {
  "2026-02-17": "春节",
  "2026-04-05": "清明节",
  "2026-06-19": "端午节",
  "2026-08-19": "七夕",
  "2026-09-25": "中秋节",
};

export function calendarDayStatus(dateKey: string): CalendarDayStatus {
  const festivalName = festivalsByDate[dateKey] ?? annualFestivals[dateKey.slice(5)];
  if (adjustedWorkDays.has(dateKey)) return { kind: "adjusted-work", label: "班", festivalName };
  const holiday = holidayRanges.find(([start, end]) => dateKey >= start && dateKey <= end);
  if (holiday) return { kind: "rest", label: "休", holidayName: holiday[2], festivalName };
  const date = new Date(`${dateKey}T12:00:00+08:00`);
  if ([0, 6].includes(date.getDay())) return { kind: "weekend", label: "周末", festivalName };
  return { kind: "normal", label: "", festivalName };
}
