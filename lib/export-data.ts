import { db } from "@/lib/db";
import { utilizationRecords, engineers, holidays } from "@/lib/db/schema";
import { asc, eq, sql } from "drizzle-orm";
import type {
  ExportData,
  EngineerMetrics,
  EngineerStatus,
  TeamMetrics,
  UtilizationGridCell,
  UtilizationGridRow,
  UtilizationValue,
} from "@/types";

const ACTIVE_VALUES: UtilizationValue[] = ["L", "M", "H"];
const ABSENCE_VALUES: UtilizationValue[] = ["C", "S", "I", "I*"];

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
  return days.filter((d) => !isSunday(d) && !holidayDates.has(toDateStr(d))).length;
}

function calcBurnoutStreak(records: { record_date: string; value: string }[]): number {
  const sorted = records
    .filter((r) => r.value === "H")
    .map((r) => r.record_date)
    .sort();

  if (sorted.length === 0) return 0;

  let maxStreak = 1;
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

  return maxStreak;
}

function determineStatus(burnoutStreak: number, healthyWorkloadPercent: number): EngineerStatus {
  if (burnoutStreak >= 5) return "BURNOUT";
  if (burnoutStreak >= 3 || healthyWorkloadPercent < 60) return "MONITOR";
  if (healthyWorkloadPercent < 30) return "UNDERUTIL";
  return "HEALTHY";
}

export async function buildExportData(month: string): Promise<ExportData> {
  const [year, mon] = month.split("-").map(Number);
  const days = getDaysInMonth(year, mon);

  const holidayRows = await db
    .select()
    .from(holidays)
    .where(sql`to_char(${holidays.holiday_date}::date, 'YYYY-MM') = ${month}`)
    .orderBy(asc(holidays.holiday_date));

  const holidayDates = new Set(holidayRows.map((h) => h.holiday_date));
  const working_days = calcWorkingDays(days, holidayDates);

  const allEngineers = await db
    .select()
    .from(engineers)
    .where(eq(engineers.is_active, true))
    .orderBy(asc(engineers.name));

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
    const activeCount = engRecords.filter((r) => (ACTIVE_VALUES as string[]).includes(r.value)).length;
    const mCount = engRecords.filter((r) => r.value === "M").length;
    const absenceCount = engRecords.filter((r) => (ABSENCE_VALUES as string[]).includes(r.value)).length;
    const avg_utilization_percent = working_days > 0 ? activeCount / working_days * 100 : 0;
    const healthy_workload_percent = activeCount > 0 ? mCount / activeCount * 100 : 0;
    const burnout_streak = calcBurnoutStreak(engRecords);
    const status = determineStatus(burnout_streak, healthy_workload_percent);

    return { engineer, status, avg_utilization_percent, healthy_workload_percent, burnout_streak, total_absences: absenceCount, working_days };
  });

  const totalActive = engineerMetrics.reduce((sum, em) => {
    const engRecords = recordsByEngineer.get(em.engineer.id) ?? [];
    return sum + engRecords.filter((r) => (ACTIVE_VALUES as string[]).includes(r.value)).length;
  }, 0);
  const totalM = engineerMetrics.reduce((sum, em) => {
    const engRecords = recordsByEngineer.get(em.engineer.id) ?? [];
    return sum + engRecords.filter((r) => r.value === "M").length;
  }, 0);

  const team: TeamMetrics = {
    avg_utilization_percent: working_days > 0 && allEngineers.length > 0 ? totalActive / (working_days * allEngineers.length) * 100 : 0,
    healthy_workload_percent: totalActive > 0 ? totalM / totalActive * 100 : 0,
    burnout_risk_count: engineerMetrics.filter((e) => e.status === "BURNOUT").length,
    underutilized_count: engineerMetrics.filter((e) => e.status === "UNDERUTIL").length,
  };

  const utilization_grid: UtilizationGridRow[] = allEngineers.map((engineer) => {
    const engRecords = recordsByEngineer.get(engineer.id) ?? [];
    const recordMap = new Map(engRecords.map((r) => [r.record_date, r]));

    const cells: UtilizationGridCell[] = days.map((day) => {
      const dateStr = toDateStr(day);
      const existing = recordMap.get(dateStr);
      if (existing) return { date: dateStr, value: existing.value as UtilizationValue, source: existing.source as "auto" | "manual" };
      if (isSunday(day)) return { date: dateStr, value: "F", source: "weekend" };
      if (holidayDates.has(dateStr)) return { date: dateStr, value: "F", source: "holiday" };
      return { date: dateStr, value: null, source: null };
    });

    return { engineer, cells };
  });

  const monthDate = new Date(year, mon - 1, 1);
  const monthLabel = monthDate.toLocaleDateString("id-ID", { month: "long", year: "numeric" });

  return {
    month: monthLabel,
    generated_at: new Date().toISOString(),
    team_metrics: team,
    engineer_metrics: engineerMetrics,
    utilization_grid,
    holidays: holidayRows,
  };
}
