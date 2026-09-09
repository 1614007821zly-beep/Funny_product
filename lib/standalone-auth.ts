import { env } from "cloudflare:workers";
import { cookies } from "next/headers";
import { scrypt } from "node:crypto";

const SESSION_COOKIE = "love_diary_session";
const SESSION_SECONDS = 60 * 60 * 24 * 30;
const SCRYPT_COST = 16_384;

export type StandaloneIdentity = {
  userId: string;
  displayName: string;
  email: string;
  fullName: string | null;
};

export async function getStandaloneUser(): Promise<StandaloneIdentity | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const row = await env.DB.prepare(`SELECT u.id,u.email,u.nickname,s.expires_at
    FROM auth_sessions s JOIN users u ON u.id=s.user_id
    WHERE s.token_hash=? LIMIT 1`)
    .bind(await sha256(token)).first<{ id: string; email: string; nickname: string; expires_at: string }>();
  if (!row || Date.parse(row.expires_at) <= Date.now()) return null;
  return { userId: row.id, email: row.email, displayName: row.nickname, fullName: row.nickname };
}

export async function registerStandaloneUser(emailInput: string, password: string) {
  const email = normalizeEmail(emailInput);
  validateCredentials(email, password);
  const existing = await env.DB.prepare("SELECT id FROM users WHERE email=? LIMIT 1").bind(email).first();
  if (existing) throw new AuthError("该邮箱已经注册，请直接登录。", 409);

  const userId = crypto.randomUUID();
  const salt = randomToken(16);
  const now = new Date().toISOString();
  const passwordHash = `scrypt$${await derivePassword(password, salt, SCRYPT_COST)}`;
  const nickname = email.split("@")[0].slice(0, 30) || "新用户";
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO users (id,email,nickname,birthday,city,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?)`).bind(userId, email, nickname, null, "杭州", now, now),
    env.DB.prepare(`INSERT INTO auth_credentials
      (user_id,password_hash,password_salt,password_iterations,created_at,updated_at)
      VALUES (?,?,?,?,?,?)`).bind(userId, passwordHash, salt, SCRYPT_COST, now, now),
  ]);
  return createSession(userId);
}

export async function loginStandaloneUser(emailInput: string, password: string) {
  const email = normalizeEmail(emailInput);
  const row = await env.DB.prepare(`SELECT u.id,c.password_hash,c.password_salt,c.password_iterations
    FROM users u JOIN auth_credentials c ON c.user_id=u.id WHERE u.email=? LIMIT 1`)
    .bind(email).first<{ id: string; password_hash: string; password_salt: string; password_iterations: number }>();
  if (!row || !(await passwordMatches(password, row.password_salt, row.password_iterations, row.password_hash))) {
    throw new AuthError("邮箱或密码不正确。", 401);
  }
  return createSession(row.id);
}

export async function deleteCurrentSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token) await env.DB.prepare("DELETE FROM auth_sessions WHERE token_hash=?").bind(await sha256(token)).run();
}

export function sessionCookie(token: string, expiresAt: string) {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_SECONDS}; Expires=${new Date(expiresAt).toUTCString()}`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) throw new AuthError("请求来源无效。", 403);
}

export class AuthError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}

async function createSession(userId: string) {
  const token = randomToken(32);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_SECONDS * 1000).toISOString();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM auth_sessions WHERE expires_at<=?").bind(now.toISOString()),
    env.DB.prepare("INSERT INTO auth_sessions (token_hash,user_id,expires_at,created_at) VALUES (?,?,?,?)")
      .bind(await sha256(token), userId, expiresAt, now.toISOString()),
  ]);
  return { token, expiresAt };
}

function validateCredentials(email: string, password: string) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new AuthError("请输入有效的邮箱地址。");
  if (password.length < 10 || password.length > 128) throw new AuthError("密码需为 10–128 个字符。");
}

function normalizeEmail(value: string) { return value.trim().toLowerCase(); }

async function derivePassword(password: string, salt: string, iterations: number) {
  return new Promise<string>((resolve, reject) => {
    scrypt(password, fromBase64Url(salt), 32, { N: iterations, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (error, key) => {
      if (error) reject(error);
      else resolve(toBase64Url(new Uint8Array(key)));
    });
  });
}

async function passwordMatches(password: string, salt: string, cost: number, storedHash: string) {
  if (storedHash.startsWith("scrypt$")) return secureEqual(await derivePassword(password, salt, cost), storedHash.slice(7));
  // Backward compatibility for credentials created by the short-lived PBKDF2
  // implementation before scrypt became the standalone default.
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: fromBase64Url(salt), iterations: cost }, key, 256);
  return secureEqual(toBase64Url(new Uint8Array(bits)), storedHash);
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return toBase64Url(new Uint8Array(digest));
}

async function secureEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i += 1) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}

function randomToken(byteLength: number) { const bytes = crypto.getRandomValues(new Uint8Array(byteLength)); return toBase64Url(bytes); }
function toBase64Url(bytes: Uint8Array) { return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", ""); }
function fromBase64Url(value: string) { const normalized = value.replaceAll("-", "+").replaceAll("_", "/"); const raw = atob(normalized + "=".repeat((4 - normalized.length % 4) % 4)); return Uint8Array.from(raw, char => char.charCodeAt(0)); }
