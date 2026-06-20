import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { lucia } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const sessionId = request.cookies.get(lucia.sessionCookieName)?.value ?? null;

  if (pathname.startsWith("/pm")) {
    if (!sessionId) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    const { session } = await lucia.validateSession(sessionId);
    if (!session) {
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.set(lucia.createBlankSessionCookie().name, "", {
        maxAge: 0,
      });
      return response;
    }
    return NextResponse.next();
  }

  if (pathname === "/login" && sessionId) {
    const { session } = await lucia.validateSession(sessionId);
    if (session) {
      return NextResponse.redirect(new URL("/pm/review", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/pm/:path*", "/login"],
};
