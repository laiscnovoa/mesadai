import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const devicesTable = pgTable("devices", {
  id: text("id").primaryKey(),
  token: text("token").notNull().unique(),
  familyId: text("family_id").notNull(),
  role: text("role").notNull(),
  childId: text("child_id"),
  label: text("label"),
  pushToken: text("push_token"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
});

export type DeviceRow = typeof devicesTable.$inferSelect;
