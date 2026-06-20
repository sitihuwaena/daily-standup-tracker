import { date, pgTable, text, timestamp, unique, uuid, varchar } from "drizzle-orm/pg-core";
import { engineers } from "./engineers";
import { projects } from "./projects";
import { sprints } from "./sprints";

export const standupReports = pgTable("standup_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  engineer_id: uuid("engineer_id").notNull().references(() => engineers.id),
  project_id: uuid("project_id").notNull().references(() => projects.id),
  sprint_id: uuid("sprint_id").notNull().references(() => sprints.id),
  report_date: date("report_date").notNull(),
  yesterday: text("yesterday").notNull(),
  today: text("today").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  submitted_at: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  reviewed_at: timestamp("reviewed_at", { withTimezone: true }),
}, (t) => ({
  unq: unique().on(t.engineer_id, t.project_id, t.report_date),
}));
