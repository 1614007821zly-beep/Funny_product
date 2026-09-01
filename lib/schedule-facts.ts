/** A bounded, immutable copy of the selected suggestion, not proof of a visit. */
export type ScheduleFacts = {
  version: 1;
  title: string;
  city: string;
  summary: string;
  duration: string;
  budgetPreference: string;
  priceNote: string;
  capturedAt: string;
  timeline: { time: string; title: string; description: string }[];
  places: { id: string; name: string; address: string; location: string; cost: string; openTimeToday: string; distance: number | null }[];
};

const text = (v: unknown, max: number) => typeof v === "string" ? v.trim().slice(0, max) : "";
export function normalizeScheduleFacts(value: unknown): ScheduleFacts | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (v.version !== 1 || !text(v.title, 80) || !text(v.city, 40) || !Array.isArray(v.timeline) || !Array.isArray(v.places) || v.timeline.length > 12 || v.places.length > 12) return null;
  const timeline = v.timeline.map(item => {
    const n = item && typeof item === "object" ? item as Record<string, unknown> : {};
    return { time: text(n.time, 40), title: text(n.title, 120), description: text(n.description, 800) };
  });
  const places = v.places.map(item => {
    const p = item && typeof item === "object" ? item as Record<string, unknown> : {};
    const location = text(p.location, 60);
    const coordinates = location.split(",").map(Number);
    const validLocation = /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(location) && Math.abs(coordinates[0]) <= 180 && Math.abs(coordinates[1]) <= 90;
    return { id: text(p.id, 100), name: text(p.name, 120), address: text(p.address, 240), location: validLocation ? location : "", cost: text(p.cost, 60), openTimeToday: text(p.openTimeToday, 120), distance: typeof p.distance === "number" && Number.isFinite(p.distance) && p.distance >= 0 ? p.distance : null };
  });
  if (timeline.some(n => !n.title) || places.some(p => !p.id || !p.name)) return null;
  return { version: 1, title: text(v.title, 80), city: text(v.city, 40), summary: text(v.summary, 1500), duration: text(v.duration, 80), budgetPreference: text(v.budgetPreference, 80), priceNote: text(v.priceNote, 240), capturedAt: text(v.capturedAt, 40), timeline, places };
}

export function readScheduleFacts(json: string | null | undefined) {
  try { return normalizeScheduleFacts(JSON.parse(json || "{}")); } catch { return null; }
}

export function validEventDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function hasScheduleStarted(date: string, time: string, now = Date.now()) {
  const starts = Date.parse(`${date}T${time}:00+08:00`);
  return Number.isFinite(starts) && starts <= now;
}
