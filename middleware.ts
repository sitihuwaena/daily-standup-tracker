import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get("pm_token")?.value

  if (pathname.startsWith("/pm")) {
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url))
    }
  }

  if (pathname === "/login" && token) {
    return NextResponse.redirect(new URL("/pm/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/pm/:path*", "/login"],
}
