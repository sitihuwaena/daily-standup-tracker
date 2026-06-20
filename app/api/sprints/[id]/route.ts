import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sprints } from "@/lib/db/schema";
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

    const [existing] = await db.select().from(sprints).where(eq(sprints.id, id));
    if (!existing) {
      return NextResponse.json({ error: "Sprint tidak ditemukan" }, { status: 404 });
    }

    const [data] = await db
      .update(sprints)
      .set({ is_active })
      .where(eq(sprints.id, id))
      .returning();

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
