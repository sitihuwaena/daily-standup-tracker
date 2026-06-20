import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { engineers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { validateRequest } from "@/lib/auth/validate-request";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session } = await validateRequest();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { is_active } = body;

    if (typeof is_active !== "boolean") {
      return NextResponse.json({ error: "is_active harus boolean" }, { status: 422 });
    }

    const [existing] = await db.select().from(engineers).where(eq(engineers.id, id));
    if (!existing) {
      return NextResponse.json({ error: "Engineer tidak ditemukan" }, { status: 404 });
    }

    const [data] = await db
      .update(engineers)
      .set({ is_active })
      .where(eq(engineers.id, id))
      .returning();

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
