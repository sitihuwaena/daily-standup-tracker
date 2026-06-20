import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { standupReports, engineers, projects, sprints } from "@/lib/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { validateRequest } from "@/lib/auth/validate-request";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { engineer_id, project_id, sprint_id, report_date, yesterday, today } = body;

    if (!engineer_id || !project_id || !sprint_id || !report_date || !yesterday || !today) {
      return NextResponse.json({ error: "Semua field wajib diisi" }, { status: 422 });
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(report_date) || isNaN(Date.parse(report_date))) {
      return NextResponse.json({ error: "Format report_date tidak valid (YYYY-MM-DD)" }, { status: 422 });
    }

    if (yesterday.length < 10 || yesterday.length > 2000) {
      return NextResponse.json({ error: "yesterday harus antara 10-2000 karakter" }, { status: 422 });
    }
    if (today.length < 10 || today.length > 2000) {
      return NextResponse.json({ error: "today harus antara 10-2000 karakter" }, { status: 422 });
    }

    const [engineer] = await db
      .select()
      .from(engineers)
      .where(and(eq(engineers.id, engineer_id), eq(engineers.is_active, true)));
    if (!engineer) {
      return NextResponse.json({ error: "Engineer tidak ditemukan atau tidak aktif" }, { status: 422 });
    }

    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, project_id), eq(projects.is_active, true)));
    if (!project) {
      return NextResponse.json({ error: "Project tidak ditemukan atau tidak aktif" }, { status: 422 });
    }

    const [sprint] = await db
      .select()
      .from(sprints)
      .where(
        and(
          eq(sprints.id, sprint_id),
          eq(sprints.project_id, project_id),
          eq(sprints.is_active, true)
        )
      );
    if (!sprint) {
      return NextResponse.json({ error: "Sprint tidak ditemukan atau tidak aktif di project ini" }, { status: 422 });
    }

    const [existing] = await db
      .select()
      .from(standupReports)
      .where(
        and(
          eq(standupReports.engineer_id, engineer_id),
          eq(standupReports.project_id, project_id),
          eq(standupReports.report_date, report_date)
        )
      );
    if (existing) {
      return NextResponse.json({ error: "Laporan untuk engineer, project, dan tanggal ini sudah ada" }, { status: 409 });
    }

    const [data] = await db
      .insert(standupReports)
      .values({ engineer_id, project_id, sprint_id, report_date, yesterday, today, status: "pending" })
      .returning();

    return NextResponse.json({ data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { session } = await validateRequest();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    if (!date) {
      return NextResponse.json({ error: "Query param 'date' wajib diisi (YYYY-MM-DD)" }, { status: 422 });
    }

    const rows = await db
      .select({
        id: standupReports.id,
        engineer_id: standupReports.engineer_id,
        project_id: standupReports.project_id,
        sprint_id: standupReports.sprint_id,
        report_date: standupReports.report_date,
        yesterday: standupReports.yesterday,
        today: standupReports.today,
        status: standupReports.status,
        submitted_at: standupReports.submitted_at,
        reviewed_at: standupReports.reviewed_at,
        engineer_name: engineers.name,
        project_name: projects.name,
      })
      .from(standupReports)
      .leftJoin(engineers, eq(standupReports.engineer_id, engineers.id))
      .leftJoin(projects, eq(standupReports.project_id, projects.id))
      .where(eq(standupReports.report_date, date))
      .orderBy(asc(standupReports.submitted_at));

    const data = rows.map((r) => ({
      ...r,
      engineer_name: r.engineer_name ?? "",
      project_name: r.project_name ?? "",
    }));

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
