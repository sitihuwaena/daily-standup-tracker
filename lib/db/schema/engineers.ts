import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const engineers = pgTable("engineers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  is_active: boolean("is_active").notNull().default(true),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
