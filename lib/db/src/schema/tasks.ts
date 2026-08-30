import { pgTable, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const tasksTable = pgTable("tasks", {
  id: text("id").primaryKey(),
  familyId: text("family_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  rewardCents: integer("reward_cents").notNull().default(0),
  frequency: text("frequency").notNull().default("daily"),
  assignmentType: text("assignment_type").notNull().default("all"),
  assignedChildIds: text("assigned_child_ids").array().notNull().default([]),
  active: boolean("active").notNull().default(true),
  createdAt: text("created_at").notNull(),
});

export type TaskRow = typeof tasksTable.$inferSelect;
