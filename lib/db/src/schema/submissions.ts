import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";

export const submissionsTable = pgTable("submissions", {
  id: text("id").primaryKey(),
  taskId: text("task_id").notNull(),
  childId: text("child_id").notNull(),
  familyId: text("family_id").notNull(),
  photoUri: text("photo_uri").notNull().default(""),
  status: text("status").notNull(),
  rewardCentsAwarded: integer("reward_cents_awarded").notNull().default(0),
  submittedForDate: text("submitted_for_date").notNull(),
  submittedAt: text("submitted_at").notNull(),
  reviewedAt: text("reviewed_at"),
  reviewNote: text("review_note"),
  appealText: text("appeal_text"),
  appealSubmittedAt: text("appeal_submitted_at"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SubmissionRow = typeof submissionsTable.$inferSelect;
