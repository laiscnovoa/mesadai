import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, submissionsTable, tasksTable, familiesTable } from "@workspace/db";
import { SubmitTaskBody, ReviewSubmissionBody, AppealSubmissionBody, ReviewAppealBody } from "@workspace/api-zod";
import { newId, nowIso, todayKey } from "../lib/ids";
import { buildSnapshot } from "../lib/snapshot";
import { parseBody } from "../lib/validate";
import { requireAuth, requireParent, requireChild } from "../middlewares/auth";
import { queuePush, pushTokensForRole, pushTokensForChild } from "../lib/push";

const router: IRouter = Router();

router.post("/submissions", requireAuth, requireChild, async (req, res) => {
  const data = parseBody(SubmitTaskBody, req.body, res);
  if (!data) return;
  const familyId = req.auth!.familyId;
  const childId = req.auth!.childId!;
  const today = todayKey();

  // Authorization / business-rule enforcement: the client filters which tasks a
  // child may submit, but in the multi-device/cloud model the server must not
  // trust the client. Re-validate task ownership and assignment rules here.
  const taskRows = await db
    .select()
    .from(tasksTable)
    .where(and(eq(tasksTable.id, data.taskId), eq(tasksTable.familyId, familyId)));
  const task = taskRows[0];
  if (!task || !task.active) {
    res.status(404).json({ error: "Tarefa não encontrada" });
    return;
  }

  const assignmentType = task.assignmentType ?? "all";
  if (assignmentType === "individual") {
    if (!(task.assignedChildIds ?? []).includes(childId)) {
      res.status(403).json({ error: "Tarefa não atribuída a esta criança" });
      return;
    }
  } else if (assignmentType === "first") {
    const familyRows = await db
      .select()
      .from(familiesTable)
      .where(eq(familiesTable.id, familyId));
    const cycleStart = familyRows[0]
      ? new Date(familyRows[0].cycleStartDate + "T00:00:00")
      : new Date(0);
    const taskSubs = await db
      .select()
      .from(submissionsTable)
      .where(eq(submissionsTable.taskId, data.taskId));
    const claimedByOther = taskSubs.some(
      (s) =>
        s.childId !== childId &&
        (s.status === "approved" || s.status === "partial") &&
        new Date(s.submittedAt) >= cycleStart,
    );
    if (claimedByOther) {
      res.status(403).json({ error: "Tarefa já conquistada por outra criança" });
      return;
    }
  }

  const existing = await db
    .select()
    .from(submissionsTable)
    .where(
      and(
        eq(submissionsTable.taskId, data.taskId),
        eq(submissionsTable.childId, childId),
        eq(submissionsTable.submittedForDate, today),
      ),
    );
  const blocking = existing.find((s) => s.status === "pending" || s.status === "approved");
  if (blocking) {
    res.json(await buildSnapshot(familyId));
    return;
  }

  const submissionId = newId();
  await db.insert(submissionsTable).values({
    id: submissionId,
    taskId: data.taskId,
    childId,
    familyId,
    photoUri: data.photoUri ?? "",
    status: "pending",
    rewardCentsAwarded: 0,
    submittedForDate: today,
    submittedAt: nowIso(),
  });

  // Notify the parent device(s) that there is a new proof to review.
  queuePush(() => pushTokensForRole(familyId, "parent"), {
    title: "Nova tarefa para validar 📸",
    body: `${task.title} aguarda sua avaliação.`,
    data: { type: "submission", submissionId },
  });

  res.json(await buildSnapshot(familyId));
});

router.post("/submissions/:id/review", requireAuth, requireParent, async (req, res) => {
  const data = parseBody(ReviewSubmissionBody, req.body, res);
  if (!data) return;
  const familyId = req.auth!.familyId;
  const id = String(req.params.id);

  const rows = await db
    .select()
    .from(submissionsTable)
    .where(and(eq(submissionsTable.id, id), eq(submissionsTable.familyId, familyId)));
  if (!rows[0]) {
    res.status(404).json({ error: "Envio não encontrado" });
    return;
  }

  await db
    .update(submissionsTable)
    .set({
      status: data.status,
      rewardCentsAwarded: data.rewardCents,
      reviewedAt: nowIso(),
      reviewNote: data.note ?? null,
    })
    .where(eq(submissionsTable.id, id));

  // Notify the child device(s) that their submission was reviewed.
  {
    const approved = data.status === "approved";
    queuePush(() => pushTokensForChild(familyId, rows[0].childId), {
      title: approved ? "Tarefa aprovada! 🎉" : "Tarefa revisada",
      body: approved
        ? "Você ganhou sua recompensa. Confira!"
        : "Veja o que o responsável comentou.",
      data: { type: "review", submissionId: id },
    });
  }

  res.json(await buildSnapshot(familyId));
});

router.post("/submissions/:id/appeal", requireAuth, requireChild, async (req, res) => {
  const data = parseBody(AppealSubmissionBody, req.body, res);
  if (!data) return;
  const familyId = req.auth!.familyId;
  const childId = req.auth!.childId!;
  const id = String(req.params.id);

  const rows = await db
    .select()
    .from(submissionsTable)
    .where(and(eq(submissionsTable.id, id), eq(submissionsTable.familyId, familyId)));
  const sub = rows[0];
  if (!sub || sub.childId !== childId) {
    res.status(404).json({ error: "Envio não encontrado" });
    return;
  }

  await db
    .update(submissionsTable)
    .set({
      status: "appealed",
      appealText: data.text,
      appealSubmittedAt: nowIso(),
    })
    .where(eq(submissionsTable.id, id));
  res.json(await buildSnapshot(familyId));
});

router.post("/submissions/:id/appeal-review", requireAuth, requireParent, async (req, res) => {
  const data = parseBody(ReviewAppealBody, req.body, res);
  if (!data) return;
  const familyId = req.auth!.familyId;
  const id = String(req.params.id);

  const rows = await db
    .select()
    .from(submissionsTable)
    .where(and(eq(submissionsTable.id, id), eq(submissionsTable.familyId, familyId)));
  const sub = rows[0];
  if (!sub) {
    res.status(404).json({ error: "Envio não encontrado" });
    return;
  }

  const taskRows = await db.select().from(tasksTable).where(eq(tasksTable.id, sub.taskId));
  const task = taskRows[0];

  await db
    .update(submissionsTable)
    .set({
      status: data.approved ? "approved" : "appeal_rejected",
      rewardCentsAwarded: data.approved ? task?.rewardCents ?? 0 : 0,
      reviewedAt: nowIso(),
      reviewNote: data.note ?? null,
    })
    .where(eq(submissionsTable.id, id));

  // Notify the child device(s) that their appeal was reviewed.
  queuePush(() => pushTokensForChild(familyId, sub.childId), {
    title: data.approved ? "Recurso aceito! 🎉" : "Recurso revisado",
    body: data.approved
      ? "Sua tarefa foi aprovada. Confira!"
      : "Veja o que o responsável comentou.",
    data: { type: "review", submissionId: id },
  });

  res.json(await buildSnapshot(familyId));
});

export default router;
