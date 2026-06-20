import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { standupReports, utilizationRecords } from "@/lib/db/schema";
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
      return NextResponse.json({ error: "Laporan harus berstatus pending untuk dikonfirmasi" }, { status: 400 });
    }

    const result = await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(utilizationRecords)
        .where(
          eq(utilizationRecords.engineer_id, report.engineer_id)
        );

      // Check specific date conflict
      const allRecords = await tx
        .select()
        .from(utilizationRecords)
        .where(eq(utilizationRecords.engineer_id, report.engineer_id));

      const dateConflict = allRecords.find((r) => r.record_date === report.report_date);
      if (dateConflict) {
        throw new Error("CONFLICT:Utilization record untuk engineer dan tanggal ini sudah ada");
      }

      await tx.insert(utilizationRecords).values({
        engineer_id: report.engineer_id,
        record_date: report.report_date,
        value: "M",
        source: "auto",
        standup_report_id: report.id,
      });

      const [updated] = await tx
        .update(standupReports)
        .set({ status: "confirmed", reviewed_at: new Date() })
        .where(eq(standupReports.id, id))
        .returning();

      return updated;
    });

    return NextResponse.json({ data: result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.startsWith("CONFLICT:")) {
      return NextResponse.json({ error: msg.replace("CONFLICT:", "") }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
