import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { utilizationRecords, engineers, holidays } from "@/lib/db/schema";
import { asc, eq, sql } from "drizzle-orm";
import { validateRequest } from "@/lib/auth/validate-request";
import type { EngineerMetrics, EngineerStatus, TeamMetrics, UtilizationValue } from "@/types";

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

function calcWorkingDays(days: Date[], holidayDates: Set<string>): number {
  // Sabtu dihitung hari kerja; Minggu dan holiday tidak
  return days.filter((d) => !isSunday(d) && !holidayDates.has(toDateStr(d))).length;
}

function calcBurnoutStreak(records: { record_date: string; value: string }[]): number {
  const sorted = records
    .filter((r) => r.value === "H")
    .map((r) => r.record_date)
    .sort();

  if (sorted.length === 0) return 0;

  let maxStreak = 0;
  let currentStreak = 1;

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 1;
    }
  }

  return Math.max(maxStreak, sorted.length > 0 ? 1 : 0);
}

function determineStatus(burnoutStreak: number, healthyWorkloadPercent: number): EngineerStatus {
  if (burnoutStreak >= 5) return "BURNOUT";
  if (burnoutStreak >= 3 || healthyWorkloadPercent < 60) return "MONITOR";
  if (healthyWorkloadPercent < 30) return "UNDERUTIL";
  return "HEALTHY";
}

const ACTIVE_VALUES: UtilizationValue[] = ["L", "M", "H"];
const ABSENCE_VALUES: UtilizationValue[] = ["C", "S", "I", "I*"];

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

    const [year, mon] = month.split("-").map(Number);
    const days = getDaysInMonth(year, mon);

    const holidayRows = await db
      .select()
      .from(holidays)
      .where(sql`to_char(${holidays.holiday_date}::date, 'YYYY-MM') = ${month}`);
    const holidayDates = new Set(holidayRows.map((h) => h.holiday_date));

    const working_days = calcWorkingDays(days, holidayDates);

    const allEngineers = await db
      .select()
      .from(engineers)
      .where(eq(engineers.is_active, true))
      .orderBy(asc(engineers.name));

    if (allEngineers.length === 0) {
      const team: TeamMetrics = {
        avg_utilization: 0,
        healthy_workload_pct: 0,
        burnout_count: 0,
        underutil_count: 0,
        engineers: [],
      };
      return NextResponse.json({ data: { month, team, engineers: [] } });
    }

    const records = await db
      .select()
      .from(utilizationRecords)
      .where(sql`to_char(${utilizationRecords.record_date}::date, 'YYYY-MM') = ${month}`);

    const recordsByEngineer = new Map<string, typeof records>();
    for (const r of records) {
      if (!recordsByEngineer.has(r.engineer_id)) {
        recordsByEngineer.set(r.engineer_id, []);
      }
      recordsByEngineer.get(r.engineer_id)!.push(r);
    }

    const engineerMetrics: EngineerMetrics[] = allEngineers.map((engineer) => {
      const engRecords = recordsByEngineer.get(engineer.id) ?? [];

      const activeCount = engRecords.filter((r) =>
        (ACTIVE_VALUES as string[]).includes(r.value)
      ).length;
      const mCount = engRecords.filter((r) => r.value === "M").length;
      const absenceCount = engRecords.filter((r) =>
        (ABSENCE_VALUES as string[]).includes(r.value)
      ).length;

      const avg_utilization =
        working_days > 0 ? activeCount / working_days * 100 : 0;

      const healthy_workload_pct =
        activeCount > 0 ? mCount / activeCount * 100 : 0;

      const streak_h = calcBurnoutStreak(engRecords);

      const status = determineStatus(streak_h, healthy_workload_pct);
      return {
        engineer_id: engineer.id,
        engineer_name: engineer.name,
        status,
        avg_utilization,
        healthy_workload_pct,
        streak_h,
        total_absence: absenceCount,
        working_days,
        utilization_days: activeCount,
        absence_days: absenceCount,
      };
    });

    // Team metrics
    const totalActiveAcrossAll = engineerMetrics.reduce((sum, em) => {
      const engRecords = recordsByEngineer.get(em.engineer_id) ?? [];
      return sum + engRecords.filter((r) => (ACTIVE_VALUES as string[]).includes(r.value)).length;
    }, 0);

    const totalMAll = engineerMetrics.reduce((sum, em) => {
      const engRecords = recordsByEngineer.get(em.engineer_id) ?? [];
      return sum + engRecords.filter((r) => r.value === "M").length;
    }, 0);

    const teamAvgUtil =
      working_days > 0 && allEngineers.length > 0
        ? totalActiveAcrossAll / (working_days * allEngineers.length) * 100
        : 0;

    const teamHealthyWorkload =
      totalActiveAcrossAll > 0 ? totalMAll / totalActiveAcrossAll * 100 : 0;

    const burnout_count = engineerMetrics.filter((e) => e.status === "BURNOUT").length;
    const underutil_count = engineerMetrics.filter((e) => e.status === "UNDERUTIL").length;

    const team: TeamMetrics = {
      avg_utilization: teamAvgUtil,
      healthy_workload_pct: teamHealthyWorkload,
      burnout_count,
      engineers: engineerMetrics,
      underutil_count,
    };

    return NextResponse.json({ data: { month, team, engineers: engineerMetrics } });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
