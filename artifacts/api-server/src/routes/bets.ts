import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, streakBetsTable } from "@workspace/db";
import { PlaceBetBody } from "@workspace/api-zod";
import { newId, todayKey } from "../lib/ids";
import { buildSnapshot, currentStreakForChild } from "../lib/snapshot";
import { parseBody } from "../lib/validate";
import { requireAuth, requireChild } from "../middlewares/auth";

const router: IRouter = Router();

const BONUS_BY_DURATION: Record<number, number> = { 7: 10, 14: 20, 20: 35 };

router.post("/streak-bets", requireAuth, requireChild, async (req, res) => {
  const data = parseBody(PlaceBetBody, req.body, res);
  if (!data) return;
  const familyId = req.auth!.familyId;
  const childId = req.auth!.childId!;

  if (data.childId !== childId) {
    res.status(400).json({ error: "Aposta inválida" });
    return;
  }
  const bonusPercent = BONUS_BY_DURATION[data.durationDays];
  if (!bonusPercent) {
    res.status(400).json({ error: "Duração inválida" });
    return;
  }

  const existing = await db
    .select()
    .from(streakBetsTable)
    .where(eq(streakBetsTable.familyId, familyId));
  if (existing.some((b) => b.childId === childId && b.status === "active")) {
    res.status(400).json({ error: "Já existe uma aposta ativa" });
    return;
  }

  const startStreak = await currentStreakForChild(familyId, childId);
  await db.insert(streakBetsTable).values({
    id: newId(),
    childId,
    familyId,
    durationDays: data.durationDays,
    startDate: todayKey(),
    startStreak,
    status: "active",
    bonusPercent,
    bonusCentsAwarded: 0,
  });
  res.json(await buildSnapshot(familyId));
});

export default router;
