import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Optimistic check only: no session cookie means sign in first. The real check (a valid session, and `can()`) happens on
 * the server in each page and action, because a cookie can be stale or forged.
 */
export function proxy(request: NextRequest) {
  if (getSessionCookie(request)) return NextResponse.next();
  const url = new URL("/sign-in", request.url);
  const { pathname, search } = request.nextUrl;
  if (pathname !== "/") url.searchParams.set("next", pathname + search);
  return NextResponse.redirect(url);
}

export const config = {
  // everything except the sign-in page, the auth API, Next's assets and the icon
  matcher: ["/((?!sign-in|api/auth|_next/static|_next/image|favicon.ico).*)"],
};
