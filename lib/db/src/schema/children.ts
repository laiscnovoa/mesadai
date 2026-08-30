import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const childrenTable = pgTable("children", {
  id: text("id").primaryKey(),
  familyId: text("family_id").notNull(),
  name: text("name").notNull(),
  nickname: text("nickname").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ChildRow = typeof childrenTable.$inferSelect;
