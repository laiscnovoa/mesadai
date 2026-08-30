import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, goalsTable } from "@workspace/db";
import { AddGoalBody } from "@workspace/api-zod";
import { newId, nowIso } from "../lib/ids";
import { buildSnapshot } from "../lib/snapshot";
import { parseBody } from "../lib/validate";
import { requireAuth, requireChild } from "../middlewares/auth";

const router: IRouter = Router();

router.post("/goals", requireAuth, requireChild, async (req, res) => {
  const data = parseBody(AddGoalBody, req.body, res);
  if (!data) return;
  const familyId = req.auth!.familyId;
  const childId = req.auth!.childId!;
  await db.insert(goalsTable).values({
    id: newId(),
    childId,
    familyId,
    title: data.title.trim(),
    targetCents: data.targetCents,
    createdAt: nowIso(),
  });
  res.json(await buildSnapshot(familyId));
});

router.delete("/goals/:id", requireAuth, requireChild, async (req, res) => {
  const familyId = req.auth!.familyId;
  const childId = req.auth!.childId!;
  const id = String(req.params.id);
  await db
    .delete(goalsTable)
    .where(
      and(
        eq(goalsTable.id, id),
        eq(goalsTable.familyId, familyId),
        eq(goalsTable.childId, childId),
      ),
    );
  res.json(await buildSnapshot(familyId));
});

export default router;
