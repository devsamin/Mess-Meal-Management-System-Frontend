import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic auth check: send visitors without a session cookie to /login.
 * Real authorization happens in Django on every API call.
 */
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has("mm_refresh");
  const { pathname, search } = request.nextUrl;

  if (pathname === "/login") {
    return hasSession ? NextResponse.redirect(new URL("/", request.url)) : NextResponse.next();
  }
  if (!hasSession) {
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Everything except API routes, Next internals and static files.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)"],
};
