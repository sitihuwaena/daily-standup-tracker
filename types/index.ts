import type { engineers, projects, sprints, holidays, standupReports, utilizationRecords } from "@/lib/db/schema";

export type Engineer = typeof engineers.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Sprint = typeof sprints.$inferSelect;
export type Holiday = typeof holidays.$inferSelect;
export type StandupReport = typeof standupReports.$inferSelect;
export type UtilizationRecord = typeof utilizationRecords.$inferSelect;

export type NewEngineer = typeof engineers.$inferInsert;
export type NewProject = typeof projects.$inferInsert;
export type NewSprint = typeof sprints.$inferInsert;
export type NewHoliday = typeof holidays.$inferInsert;
export type NewStandupReport = typeof standupReports.$inferInsert;
export type NewUtilizationRecord = typeof utilizationRecords.$inferInsert;

export type UtilizationValue = "L" | "M" | "H" | "C" | "S" | "I" | "I*" | "F";

export type EngineerStatus = "HEALTHY" | "MONITOR" | "BURNOUT" | "UNDERUTIL";

export interface UtilizationGridCell {
  date: string;
  value: UtilizationValue | null;
  source: "auto" | "manual" | "weekend" | "holiday" | null;
}

export interface UtilizationGridRow {
  engineer: Engineer;
  cells: UtilizationGridCell[];
}

export interface StandupReportWithDetails extends StandupReport {
  engineer_name: string;
  project_name: string;
}

export interface TeamMetrics {
  avg_utilization_percent: number;
  healthy_workload_percent: number;
  burnout_risk_count: number;
  underutilized_count: number;
}

export interface EngineerMetrics {
  engineer: Engineer;
  status: EngineerStatus;
  avg_utilization_percent: number;
  healthy_workload_percent: number;
  burnout_streak: number;
  total_absences: number;
  working_days: number;
}

export interface DashboardMetrics {
  month: string;
  team: TeamMetrics;
  engineers: EngineerMetrics[];
}

export interface ExportData {
  month: string;
  generated_at: string;
  team_metrics: TeamMetrics;
  engineer_metrics: EngineerMetrics[];
  utilization_grid: UtilizationGridRow[];
  holidays: Holiday[];
}
