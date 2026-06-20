import { date, pgTable, timestamp, unique, uuid, varchar } from "drizzle-orm/pg-core";
import { engineers } from "./engineers";
import { standupReports } from "./standup_reports";

export const utilizationRecords = pgTable("utilization_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  engineer_id: uuid("engineer_id").notNull().references(() => engineers.id),
  record_date: date("record_date").notNull(),
  value: varchar("value", { length: 5 }).notNull(),
  source: varchar("source", { length: 10 }).notNull(),
  standup_report_id: uuid("standup_report_id").references(() => standupReports.id),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  unq: unique().on(t.engineer_id, t.record_date),
}));
