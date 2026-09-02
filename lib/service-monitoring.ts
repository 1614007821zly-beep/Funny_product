import { env } from "cloudflare:workers";

export type ServiceRun = {
  service: "weather" | "location" | "places" | "ai" | "inspiration";
  source: string;
  durationMs: number;
  outcome: "success" | "empty" | "failure" | "fallback" | "skipped";
  failureType: string | null;
  fallbackTriggered: boolean;
};

const RETENTION_DAYS = 30;

export async function recordServiceRuns(runs: ServiceRun[]) {
  const now = new Date().toISOString();
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60_000).toISOString();
  await env.DB.batch([
    ...runs.slice(0, 4).map(run => env.DB.prepare(`INSERT INTO service_runs
      (id,service,source,duration_ms,outcome,failure_type,fallback_triggered,created_at)
      VALUES (?,?,?,?,?,?,?,?)`)
      .bind(crypto.randomUUID(), run.service, clean(run.source, 60), Math.min(120_000, Math.max(0, Math.round(run.durationMs))), run.outcome, run.failureType, run.fallbackTriggered ? 1 : 0, now)),
    env.DB.prepare("DELETE FROM service_runs WHERE created_at<?").bind(cutoff),
  ]);
}

export function classifyServiceFailure(error: unknown) {
  const name = error instanceof Error ? error.name : "";
  const message = error instanceof Error ? error.message : "";
  if (name === "TimeoutError" || /timeout|timed out/i.test(message)) return "timeout";
  if (/\b(?:429|rate limit)\b/i.test(message)) return "rate_limited";
  if (/\b5\d\d\b|unavailable/i.test(message)) return "upstream_unavailable";
  if (/invalid|parse|json|format/i.test(message)) return "invalid_response";
  if (name === "TypeError" || /network|fetch/i.test(message)) return "network";
  return "unknown";
}

export function serviceElapsed(startedAt: number) { return Math.max(0, Date.now() - startedAt); }

function clean(value: unknown, maxLength: number) {
  return typeof value === "string" ? Array.from(value.trim(), character => character.charCodeAt(0) < 32 ? " " : character).join("").slice(0, maxLength) : "";
}
