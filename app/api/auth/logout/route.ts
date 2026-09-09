import { assertSameOrigin, clearSessionCookie, deleteCurrentSession } from "../../../../lib/standalone-auth";

export async function POST(request: Request) {
  assertSameOrigin(request);
  await deleteCurrentSession();
  return Response.json({ ok: true }, { headers: { "set-cookie": clearSessionCookie(), "cache-control": "no-store" } });
}
