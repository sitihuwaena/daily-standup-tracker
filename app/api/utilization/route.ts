import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { utilizationRecords, engineers, holidays } from "@/lib/db/schema";
import { and, asc, eq, sql } from "drizzle-orm";
import { validateRequest } from "@/lib/auth/validate-request";
import type { UtilizationValue, UtilizationGridCell, UtilizationGridRow } from "@/types";

const UTILIZATION_VALUES: UtilizationValue[] = ["L", "M", "H", "C", "S", "I", "I*", "F"];

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const date = new Date(year, month - 1, 1);
  while (date.getMonth() === month - 1) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

function isSunday(date: Date): boolean {
  return date.getDay() === 0;
}

function toDateStr(date: Date): string {
  return date.toISOString().split("T")[0];
}

export async function GET(request: NextRequest) {
  try {
    const { session } = await validateRequest();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");
    const engineer_id = searchParams.get("engineer_id");

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: "Query param 'month' wajib diisi (YYYY-MM)" }, { status: 422 });
    }

    const [year, mon] = month.split("-").map(Number);
    const days = getDaysInMonth(year, mon);

    // Get holidays for the month
    const holidayRows = await db
      .select()
      .from(holidays)
      .where(sql`to_char(${holidays.holiday_date}::date, 'YYYY-MM') = ${month}`);
    const holidayDates = new Set(holidayRows.map((h) => h.holiday_date));

    // Get active engineers
    const engineerQuery = db.select().from(engineers).where(eq(engineers.is_active, true)).orderBy(asc(engineers.name));
    const allEngineers = engineer_id
      ? (await engineerQuery).filter((e) => e.id === engineer_id)
      : await engineerQuery;

    // Get all utilization records for the month
    const records = await db
      .select()
      .from(utilizationRecords)
      .where(sql`to_char(${utilizationRecords.record_date}::date, 'YYYY-MM') = ${month}`);

    const recordMap = new Map<string, typeof records[0]>();
    for (const r of records) {
      recordMap.set(`${r.engineer_id}:${r.record_date}`, r);
    }

    const data: UtilizationGridRow[] = allEngineers.map((engineer) => {
      const cells: UtilizationGridCell[] = days.map((day) => {
        const dateStr = toDateStr(day);
        const existing = recordMap.get(`${engineer.id}:${dateStr}`);

        if (existing) {
          return {
            date: dateStr,
            value: existing.value as UtilizationValue,
            source: existing.source as "auto" | "manual",
          };
        }
        if (isSunday(day)) {
          return { date: dateStr, value: "F", source: "weekend" };
        }
        if (holidayDates.has(dateStr)) {
          return { date: dateStr, value: "F", source: "holiday" };
        }
        return { date: dateStr, value: null, source: null };
      });

      return { engineer, cells };
    });

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
    const { engineer_id, record_date, value } = body;

    if (!engineer_id || !record_date || !value) {
      return NextResponse.json({ error: "engineer_id, record_date, dan value wajib diisi" }, { status: 422 });
    }

    if (!UTILIZATION_VALUES.includes(value as UtilizationValue)) {
      return NextResponse.json({ error: `value harus salah satu dari: ${UTILIZATION_VALUES.join(", ")}` }, { status: 422 });
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(record_date) || isNaN(Date.parse(record_date))) {
      return NextResponse.json({ error: "Format record_date tidak valid (YYYY-MM-DD)" }, { status: 422 });
    }

    const date = new Date(record_date + "T00:00:00");
    if (isSunday(date)) {
      return NextResponse.json({ error: "Tidak bisa mengisi utilization untuk hari Minggu" }, { status: 422 });
    }

    const [holiday] = await db
      .select()
      .from(holidays)
      .where(eq(holidays.holiday_date, record_date));
    if (holiday) {
      return NextResponse.json({ error: "Tidak bisa mengisi utilization untuk hari libur" }, { status: 422 });
    }

    const [engineer] = await db
      .select()
      .from(engineers)
      .where(and(eq(engineers.id, engineer_id), eq(engineers.is_active, true)));
    if (!engineer) {
      return NextResponse.json({ error: "Engineer tidak ditemukan atau tidak aktif" }, { status: 422 });
    }

    const allRecords = await db
      .select()
      .from(utilizationRecords)
      .where(eq(utilizationRecords.engineer_id, engineer_id));
    const existing = allRecords.find((r) => r.record_date === record_date);

    if (existing) {
      return NextResponse.json({ error: "Record sudah ada untuk engineer dan tanggal ini. Gunakan PATCH untuk update." }, { status: 409 });
    }

    const [data] = await db
      .insert(utilizationRecords)
      .values({ engineer_id, record_date, value, source: "manual", standup_report_id: null })
      .returning();

    return NextResponse.json({ data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
