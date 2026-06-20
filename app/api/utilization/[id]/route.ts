import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { utilizationRecords } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { validateRequest } from "@/lib/auth/validate-request";
import type { UtilizationValue } from "@/types";

const UTILIZATION_VALUES: UtilizationValue[] = ["L", "M", "H", "C", "S", "I", "I*", "F"];

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
    const { value } = body;

    if (!value || !UTILIZATION_VALUES.includes(value as UtilizationValue)) {
      return NextResponse.json({ error: `value harus salah satu dari: ${UTILIZATION_VALUES.join(", ")}` }, { status: 422 });
    }

    const [existing] = await db.select().from(utilizationRecords).where(eq(utilizationRecords.id, id));
    if (!existing) {
      return NextResponse.json({ error: "Utilization record tidak ditemukan" }, { status: 404 });
    }

    const [data] = await db
      .update(utilizationRecords)
      .set({ value, source: "manual" })
      .where(eq(utilizationRecords.id, id))
      .returning();

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
