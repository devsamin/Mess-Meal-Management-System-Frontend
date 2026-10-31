/**
 * Same-origin proxy to the Django API.
 *
 * The browser calls /api/backend/<path>; this handler attaches the JWT access
 * token from an httpOnly cookie, refreshes it once if it has expired, and
 * streams the response back. Tokens never reach client-side JavaScript.
 */
import { NextResponse, type NextRequest } from "next/server";
import {
  ACCESS_COOKIE,
  API_URL,
  REFRESH_COOKIE,
  clearSessionCookies,
  refreshAccessToken,
  setSessionCookies,
} from "@/lib/server/session";

const PASS_REQUEST_HEADERS = ["content-type", "accept", "accept-language"];
const PASS_RESPONSE_HEADERS = ["content-type", "content-disposition", "cache-control"];

function upstreamUrl(path: string[], search: string) {
  const safe = path.map(encodeURIComponent).join("/");
  if (path[0] === "media") return `${API_URL}/${safe}${search}`;
  return `${API_URL}/api/v1/${safe}/${search}`; // DRF routes end with a slash
}

async function handle(request: NextRequest, ctx: RouteContext<"/api/backend/[...path]">) {
  const { path } = await ctx.params;
  if (path.some((p) => p === ".." || p === ".")) {
    return NextResponse.json({ detail: "Invalid path." }, { status: 400 });
  }
  const url = upstreamUrl(path, request.nextUrl.search);

  const headers = new Headers();
  for (const name of PASS_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  // Buffer the body so the request can be replayed after a token refresh.
  const body = ["GET", "HEAD"].includes(request.method) ? undefined : await request.arrayBuffer();

  let access = request.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;
  let refreshed = false;

  if (!access && refresh) {
    access = (await refreshAccessToken(refresh)) ?? undefined;
    refreshed = Boolean(access);
  }

  const send = (token?: string) => {
    const h = new Headers(headers);
    if (token) h.set("Authorization", `Bearer ${token}`);
    return fetch(url, { method: request.method, headers: h, body, cache: "no-store", redirect: "manual" });
  };

  let upstream: Response;
  try {
    upstream = await send(access);
    if (upstream.status === 401 && refresh && !refreshed) {
      const fresh = await refreshAccessToken(refresh);
      if (fresh) {
        access = fresh;
        refreshed = true;
        upstream = await send(access);
      }
    }
  } catch {
    return NextResponse.json({ detail: "The API server is unreachable." }, { status: 502 });
  }

  const resHeaders = new Headers();
  for (const name of PASS_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) resHeaders.set(name, value);
  }
  const res = new NextResponse(upstream.status === 204 ? null : upstream.body, {
    status: upstream.status,
    headers: resHeaders,
  });
  if (upstream.status === 401) {
    clearSessionCookies(res);
  } else if (refreshed && access) {
    setSessionCookies(res, { access });
  }
  return res;
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
