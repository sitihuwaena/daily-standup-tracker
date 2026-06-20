import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  const backendUrl = process.env.BACKEND_URL || "http://localhost:3001"
  const res = await fetch(`${backendUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(
      { message: data.message || "Email atau password salah" },
      { status: res.status }
    )
  }

  const data = await res.json()
  const token = data.token

  const response = NextResponse.json({ ok: true })
  response.cookies.set("pm_token", token, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  })
  return response
}
