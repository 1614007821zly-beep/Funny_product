import { AuthError, assertSameOrigin, loginStandaloneUser, sessionCookie } from "../../../../lib/standalone-auth";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = await request.json() as { email?: string; password?: string };
    const session = await loginStandaloneUser(body.email ?? "", body.password ?? "");
    return Response.json({ ok: true }, { headers: { "set-cookie": sessionCookie(session.token, session.expiresAt), "cache-control": "no-store" } });
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 500;
    const message = error instanceof AuthError ? error.message : "登录暂时不可用，请稍后重试。";
    return Response.json({ error: message }, { status, headers: { "cache-control": "no-store" } });
  }
}
