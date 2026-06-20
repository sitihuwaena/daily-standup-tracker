import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { holidays } from "@/lib/db/schema";
import { asc, eq, and, sql } from "drizzle-orm";
import { validateRequest } from "@/lib/auth/validate-request";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get("year");
    const month = searchParams.get("month");

    const conditions = [];

    if (month) {
      // filter by YYYY-MM
      conditions.push(sql`to_char(${holidays.holiday_date}::date, 'YYYY-MM') = ${month}`);
    } else if (year) {
      conditions.push(sql`extract(year from ${holidays.holiday_date}::date) = ${parseInt(year)}`);
    }

    const data = await db
      .select()
      .from(holidays)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(holidays.holiday_date));

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
    const { holiday_date, name } = body;

    if (!holiday_date || !name) {
      return NextResponse.json({ error: "holiday_date dan name wajib diisi" }, { status: 422 });
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(holiday_date) || isNaN(Date.parse(holiday_date))) {
      return NextResponse.json({ error: "Format holiday_date tidak valid (YYYY-MM-DD)" }, { status: 422 });
    }

    const [existing] = await db
      .select()
      .from(holidays)
      .where(eq(holidays.holiday_date, holiday_date));

    if (existing) {
      return NextResponse.json({ error: "Tanggal ini sudah terdaftar sebagai hari libur" }, { status: 409 });
    }

    const [data] = await db
      .insert(holidays)
      .values({ holiday_date, name: name.trim() })
      .returning();

    return NextResponse.json({ data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
