import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";

export const streakBetsTable = pgTable("streak_bets", {
  id: text("id").primaryKey(),
  childId: text("child_id").notNull(),
  familyId: text("family_id").notNull(),
  durationDays: integer("duration_days").notNull(),
  startDate: text("start_date").notNull(),
  startStreak: integer("start_streak").notNull().default(0),
  status: text("status").notNull().default("active"),
  bonusPercent: integer("bonus_percent").notNull().default(0),
  bonusCentsAwarded: integer("bonus_cents_awarded").notNull().default(0),
  resolvedAt: text("resolved_at"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type StreakBetRow = typeof streakBetsTable.$inferSelect;
