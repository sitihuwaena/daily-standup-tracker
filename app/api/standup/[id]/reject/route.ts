import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { standupReports } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { validateRequest } from "@/lib/auth/validate-request";

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session } = await validateRequest();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const [report] = await db.select().from(standupReports).where(eq(standupReports.id, id));
    if (!report) {
      return NextResponse.json({ error: "Laporan tidak ditemukan" }, { status: 404 });
    }
    if (report.status !== "pending") {
      return NextResponse.json({ error: "Laporan harus berstatus pending untuk ditolak" }, { status: 400 });
    }

    const [data] = await db
      .update(standupReports)
      .set({ status: "rejected", reviewed_at: new Date() })
      .where(eq(standupReports.id, id))
      .returning();

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
