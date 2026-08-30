import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const pairingCodesTable = pgTable("pairing_codes", {
  code: text("code").primaryKey(),
  familyId: text("family_id").notNull(),
  childId: text("child_id").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PairingCodeRow = typeof pairingCodesTable.$inferSelect;
