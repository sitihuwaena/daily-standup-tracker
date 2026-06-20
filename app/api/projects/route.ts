import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
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
      const data = await db.select().from(projects).orderBy(asc(projects.name));
      return NextResponse.json({ data });
    }

    const data = await db
      .select()
      .from(projects)
      .where(eq(projects.is_active, true))
      .orderBy(asc(projects.name));

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
      return NextResponse.json({ error: "Nama project wajib diisi" }, { status: 422 });
    }
    if (name.trim().length > 150) {
      return NextResponse.json({ error: "Nama project maksimal 150 karakter" }, { status: 422 });
    }

    const [existing] = await db
      .select()
      .from(projects)
      .where(ilike(projects.name, name.trim()));

    if (existing) {
      return NextResponse.json({ error: "Nama project sudah terdaftar" }, { status: 409 });
    }

    const [data] = await db
      .insert(projects)
      .values({ name: name.trim() })
      .returning();

    return NextResponse.json({ data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
