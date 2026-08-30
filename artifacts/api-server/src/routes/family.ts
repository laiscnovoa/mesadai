import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, familiesTable, childrenTable, streakBetsTable } from "@workspace/db";
import { AddChildBody, UpdateCycleBody, CloseCycleBody } from "@workspace/api-zod";
import { newId, todayKey, nowIso } from "../lib/ids";
import { buildSnapshot } from "../lib/snapshot";
import { parseBody } from "../lib/validate";
import { requireAuth, requireParent } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/snapshot", requireAuth, async (req, res) => {
  const snapshot = await buildSnapshot(req.auth!.familyId);
  if (!snapshot) {
    res.status(404).json({ error: "Família não encontrada" });
    return;
  }
  res.json(snapshot);
});

router.post("/children", requireAuth, requireParent, async (req, res) => {
  const data = parseBody(AddChildBody, req.body, res);
  if (!data) return;
  const familyId = req.auth!.familyId;
  await db.insert(childrenTable).values({
    id: newId(),
    familyId,
    name: data.name.trim(),
    nickname: data.nickname.toLowerCase().trim(),
  });
  res.json(await buildSnapshot(familyId));
});

router.post("/cycle/update", requireAuth, requireParent, async (req, res) => {
  const data = parseBody(UpdateCycleBody, req.body, res);
  if (!data) return;
  const familyId = req.auth!.familyId;
  await db
    .update(familiesTable)
    .set({ cycleEndDate: data.cycleEndDate })
    .where(eq(familiesTable.id, familyId));
  res.json(await buildSnapshot(familyId));
});

router.post("/cycle/close", requireAuth, requireParent, async (req, res) => {
  const data = parseBody(CloseCycleBody, req.body, res);
  if (!data) return;
  const familyId = req.auth!.familyId;

  const bets = await db
    .select()
    .from(streakBetsTable)
    .where(eq(streakBetsTable.familyId, familyId));
  for (const bet of bets) {
    if (bet.status === "active") {
      await db
        .update(streakBetsTable)
        .set({ status: "lost", resolvedAt: nowIso() })
        .where(eq(streakBetsTable.id, bet.id));
    }
  }

  await db
    .update(familiesTable)
    .set({ cycleStartDate: todayKey(), cycleEndDate: data.cycleEndDate })
    .where(eq(familiesTable.id, familyId));
  res.json(await buildSnapshot(familyId));
});

export default router;
