import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "dashboard_session";
const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/me",
  "/api/auth/google/login",
  "/api/auth/callback/google",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static files, Next.js internal assets, and public auth endpoints
  if (
    PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(path + "/")) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Check session cookie
  const token = request.cookies.get(COOKIE_NAME)?.value;

  // Simple edge token validation check (token exists & has valid format)
  const isAuthenticated = Boolean(token && token.includes("."));

  if (!isAuthenticated) {
    // If requesting API endpoint, return 401 JSON
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    // For page requests, redirect to /login
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If authenticated user visits /login, redirect to main dashboard /
  if (pathname === "/login" && isAuthenticated) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
