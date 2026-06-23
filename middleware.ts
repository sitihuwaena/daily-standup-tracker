import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { lucia } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Get session ID from Lucia's session cookie
  const sessionId = request.cookies.get(lucia.sessionCookieName)?.value ?? null;
  
  if (pathname.startsWith("/pm")) {
    if (!sessionId) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    
    // Validate session
    const { session } = await lucia.validateSession(sessionId);
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  if (pathname === "/login" && sessionId) {
    // Check if session is valid before redirecting
    const { session } = await lucia.validateSession(sessionId);
    if (session) {
      return NextResponse.redirect(new URL("/pm/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/pm/:path*", "/login"],
}
