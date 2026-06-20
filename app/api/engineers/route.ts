import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { engineers } from "@/lib/db/schema";
import { eq, ilike, asc } from "drizzle-orm";
import { validateRequest } from "@/lib/auth/validate-request";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const all = searchParams.get("all") === "true";

    if (all) {
      const { session } = await validateRequest();
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const data = await db.select().from(engineers).orderBy(asc(engineers.name));
      return NextResponse.json({ data });
    }

    const data = await db
      .select()
      .from(engineers)
      .where(eq(engineers.is_active, true))
      .orderBy(asc(engineers.name));

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session } = await validateRequest();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json({ error: "Nama engineer wajib diisi" }, { status: 422 });
    }
    if (name.trim().length > 100) {
      return NextResponse.json({ error: "Nama engineer maksimal 100 karakter" }, { status: 422 });
    }

    const [existing] = await db
      .select()
      .from(engineers)
      .where(ilike(engineers.name, name.trim()));

    if (existing) {
      return NextResponse.json({ error: "Nama engineer sudah terdaftar" }, { status: 409 });
    }

    const [data] = await db
      .insert(engineers)
      .values({ name: name.trim() })
      .returning();

    return NextResponse.json({ data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
