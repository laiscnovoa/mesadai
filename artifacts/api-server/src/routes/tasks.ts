import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, tasksTable } from "@workspace/db";
import { CreateTaskBody, UpdateTaskBody } from "@workspace/api-zod";
import { newId, nowIso } from "../lib/ids";
import { buildSnapshot } from "../lib/snapshot";
import { parseBody } from "../lib/validate";
import { requireAuth, requireParent } from "../middlewares/auth";

const router: IRouter = Router();

router.post("/tasks", requireAuth, requireParent, async (req, res) => {
  const data = parseBody(CreateTaskBody, req.body, res);
  if (!data) return;
  const familyId = req.auth!.familyId;
  await db.insert(tasksTable).values({
    id: newId(),
    familyId,
    title: data.title.trim(),
    description: data.description ?? "",
    rewardCents: data.rewardCents,
    frequency: data.frequency,
    assignmentType: data.assignmentType ?? "all",
    assignedChildIds: data.assignedChildIds ?? [],
    active: true,
    createdAt: nowIso(),
  });
  res.json(await buildSnapshot(familyId));
});

router.patch("/tasks/:id", requireAuth, requireParent, async (req, res) => {
  const data = parseBody(UpdateTaskBody, req.body, res);
  if (!data) return;
  const familyId = req.auth!.familyId;
  const id = String(req.params.id);

  const existing = await db
    .select()
    .from(tasksTable)
    .where(and(eq(tasksTable.id, id), eq(tasksTable.familyId, familyId)));
  if (!existing[0]) {
    res.status(404).json({ error: "Tarefa não encontrada" });
    return;
  }

  await db
    .update(tasksTable)
    .set({
      ...(data.title !== undefined ? { title: data.title.trim() } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.rewardCents !== undefined ? { rewardCents: data.rewardCents } : {}),
      ...(data.frequency !== undefined ? { frequency: data.frequency } : {}),
      ...(data.assignmentType !== undefined ? { assignmentType: data.assignmentType } : {}),
      ...(data.assignedChildIds !== undefined ? { assignedChildIds: data.assignedChildIds } : {}),
      ...(data.active !== undefined ? { active: data.active } : {}),
    })
    .where(eq(tasksTable.id, id));
  res.json(await buildSnapshot(familyId));
});

router.post("/tasks/:id/toggle", requireAuth, requireParent, async (req, res) => {
  const familyId = req.auth!.familyId;
  const id = String(req.params.id);
  const existing = await db
    .select()
    .from(tasksTable)
    .where(and(eq(tasksTable.id, id), eq(tasksTable.familyId, familyId)));
  if (!existing[0]) {
    res.status(404).json({ error: "Tarefa não encontrada" });
    return;
  }
  await db
    .update(tasksTable)
    .set({ active: !existing[0].active })
    .where(eq(tasksTable.id, id));
  res.json(await buildSnapshot(familyId));
});

router.delete("/tasks/:id", requireAuth, requireParent, async (req, res) => {
  const familyId = req.auth!.familyId;
  const id = String(req.params.id);
  await db
    .delete(tasksTable)
    .where(and(eq(tasksTable.id, id), eq(tasksTable.familyId, familyId)));
  res.json(await buildSnapshot(familyId));
});

export default router;
