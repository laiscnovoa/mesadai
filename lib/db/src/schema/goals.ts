import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";

export const goalsTable = pgTable("goals", {
  id: text("id").primaryKey(),
  childId: text("child_id").notNull(),
  familyId: text("family_id").notNull(),
  title: text("title").notNull(),
  targetCents: integer("target_cents").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

export type GoalRow = typeof goalsTable.$inferSelect;
