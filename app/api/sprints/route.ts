import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sprints, projects } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { validateRequest } from "@/lib/auth/validate-request";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const all = searchParams.get("all") === "true";
    const project_id = searchParams.get("project_id");

    const conditions = [];
    if (!all) {
      conditions.push(eq(sprints.is_active, true));
    } else {
      const { session } = await validateRequest();
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }
    if (project_id) {
      conditions.push(eq(sprints.project_id, project_id));
    }

    const data = await db
      .select()
      .from(sprints)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(sprints.start_date));

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
    const { project_id, name, start_date, end_date } = body;

    if (!project_id || !name || !start_date || !end_date) {
      return NextResponse.json({ error: "Semua field wajib diisi" }, { status: 422 });
    }

    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, project_id), eq(projects.is_active, true)));

    if (!project) {
      return NextResponse.json({ error: "Project tidak ditemukan atau tidak aktif" }, { status: 422 });
    }

    if (new Date(end_date) <= new Date(start_date)) {
      return NextResponse.json({ error: "end_date harus lebih besar dari start_date" }, { status: 422 });
    }

    const [existingSprint] = await db
      .select()
      .from(sprints)
      .where(and(eq(sprints.project_id, project_id), eq(sprints.name, name.trim())));

    if (existingSprint) {
      return NextResponse.json({ error: "Nama sprint sudah ada di project ini" }, { status: 422 });
    }

    const [data] = await db
      .insert(sprints)
      .values({ project_id, name: name.trim(), start_date, end_date })
      .returning();

    return NextResponse.json({ data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
