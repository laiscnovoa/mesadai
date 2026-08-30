import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const familiesTable = pgTable("families", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  parentName: text("parent_name").notNull(),
  pin: text("pin").unique(),
  parentPin: text("parent_pin").notNull(),
  parentPinLookup: text("parent_pin_lookup").unique("families_parent_pin_lookup_unique"),
  cycleEndDate: text("cycle_end_date").notNull(),
  cycleStartDate: text("cycle_start_date").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Family = typeof familiesTable.$inferSelect;
