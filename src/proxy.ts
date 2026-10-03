import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/register"];

// Optimistic check only (cookie presence); the real session check happens in requireUser().
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next();
  if (!request.cookies.has("wc_session")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Public assets (icons, manifest, service worker, offline page) must load without a session.
  matcher: ["/((?!api/health|_next/static|_next/image|favicon.ico|sw.js|offline.html|.*\\.(?:png|svg|ico|webmanifest)$).*)"],
};
