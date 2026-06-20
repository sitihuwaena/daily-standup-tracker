import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { lucia } from "@/lib/auth";
import { authUser } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { verify } from "@node-rs/argon2";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email dan password wajib diisi" }, { status: 400 });
    }

    const [user] = await db.select().from(authUser).where(eq(authUser.email, email.toLowerCase()));

    if (!user) {
      return NextResponse.json({ error: "Email atau password salah" }, { status: 401 });
    }

    const validPassword = await verify(user.hashed_password, password);
    if (!validPassword) {
      return NextResponse.json({ error: "Email atau password salah" }, { status: 401 });
    }

    const session = await lucia.createSession(user.id, {});
    const sessionCookie = lucia.createSessionCookie(session.id);

    const cookieStore = await cookies();
    cookieStore.set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);

    return NextResponse.json({ message: "Login berhasil" }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
