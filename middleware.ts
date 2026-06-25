import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Get session cookie (Lucia default name is 'auth_session')
  const sessionCookie = request.cookies.get("auth_session")?.value;
  
  // Protect /pm routes - require session cookie
  if (pathname.startsWith("/pm")) {
    if (!sessionCookie) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // Redirect to dashboard if already logged in
  if (pathname === "/login" && sessionCookie) {
    return NextResponse.redirect(new URL("/pm/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/pm/:path*", "/login"],
}
