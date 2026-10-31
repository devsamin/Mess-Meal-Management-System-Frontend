import { NextResponse, type NextRequest } from "next/server";
import { API_URL, setSessionCookies } from "@/lib/server/session";

export async function POST(request: NextRequest) {
  let body: { username?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "Invalid request." }, { status: 400 });
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) headers["X-Forwarded-For"] = forwardedFor; // lets Django throttle per client

  let upstream: Response;
  try {
    upstream = await fetch(`${API_URL}/api/v1/auth/login/`, {
      method: "POST",
      headers,
      body: JSON.stringify({ username: body.username ?? "", password: body.password ?? "" }),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ detail: "The server is unreachable. Please try again." }, { status: 502 });
  }

  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    const detail =
      upstream.status === 401 ? "Wrong username or password." : (data?.detail ?? "Could not sign in.");
    return NextResponse.json({ detail }, { status: upstream.status === 401 ? 401 : upstream.status });
  }

  const res = NextResponse.json({ ok: true });
  setSessionCookies(res, { access: data.access, refresh: data.refresh });
  return res;
}
