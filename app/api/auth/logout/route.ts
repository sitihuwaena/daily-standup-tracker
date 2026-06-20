import { NextResponse } from "next/server";
import { lucia } from "@/lib/auth";
import { validateRequest } from "@/lib/auth/validate-request";
import { cookies } from "next/headers";

export async function POST() {
  try {
    const { session } = await validateRequest();

    if (!session) {
      return NextResponse.json({ error: "Tidak ada sesi aktif" }, { status: 401 });
    }

    await lucia.invalidateSession(session.id);

    const sessionCookie = lucia.createBlankSessionCookie();
    const cookieStore = await cookies();
    cookieStore.set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);

    return NextResponse.json({ message: "Logout berhasil" }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
