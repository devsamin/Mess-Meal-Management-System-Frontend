import "server-only";
import type { NextResponse } from "next/server";

/** Django base URL, server-side only (never exposed to the browser). */
export const API_URL = (process.env.API_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");

export const ACCESS_COOKIE = "mm_access";
export const REFRESH_COOKIE = "mm_refresh";

const secure = process.env.NODE_ENV === "production";
const ACCESS_MAX_AGE = 60 * Number(process.env.JWT_ACCESS_MINUTES ?? 15);
const REFRESH_MAX_AGE = 60 * 60 * 24 * Number(process.env.JWT_REFRESH_DAYS ?? 7);

export type Tokens = { access: string; refresh?: string };

export function setSessionCookies(res: NextResponse, tokens: Tokens) {
  const base = { httpOnly: true, secure, sameSite: "lax" as const, path: "/" };
  res.cookies.set(ACCESS_COOKIE, tokens.access, { ...base, maxAge: ACCESS_MAX_AGE });
  if (tokens.refresh) {
    res.cookies.set(REFRESH_COOKIE, tokens.refresh, { ...base, maxAge: REFRESH_MAX_AGE });
  }
}

export function clearSessionCookies(res: NextResponse) {
  res.cookies.delete(ACCESS_COOKIE);
  res.cookies.delete(REFRESH_COOKIE);
}

/** Exchange a refresh token for a new access token. Returns null when the session is over. */
export async function refreshAccessToken(refresh: string): Promise<string | null> {
  try {
    const r = await fetch(`${API_URL}/api/v1/auth/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
      cache: "no-store",
    });
    if (!r.ok) return null;
    const data = (await r.json()) as { access?: string };
    return data.access ?? null;
  } catch {
    return null;
  }
}
