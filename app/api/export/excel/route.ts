import { NextRequest, NextResponse } from "next/server";
import { validateRequest } from "@/lib/auth/validate-request";
import { buildExportData } from "@/lib/export-data";

export async function GET(request: NextRequest) {
  try {
    const { session } = await validateRequest();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: "Query param 'month' wajib diisi (YYYY-MM)" }, { status: 422 });
    }

    const data = await buildExportData(month);

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
