import { date, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

export const holidays = pgTable("holidays", {
  id: uuid("id").primaryKey().defaultRandom(),
  holiday_date: date("holiday_date").notNull(),
  name: text("name").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  unq: unique().on(t.holiday_date),
}));
