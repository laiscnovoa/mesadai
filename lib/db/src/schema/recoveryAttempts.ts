import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const recoveryAttemptsTable = pgTable("recovery_attempts", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
});

export type RecoveryAttempt = typeof recoveryAttemptsTable.$inferSelect;