import { eq } from "drizzle-orm";
import {
  db,
  familiesTable,
  childrenTable,
  tasksTable,
  submissionsTable,
  goalsTable,
  streakBetsTable,
  type SubmissionRow,
} from "@workspace/db";
import { newId, nowIso, todayKey } from "./ids";

export const BONUS_TASK_ID = "__streak_bet_bonus__";

export interface FamilyShape {
  id: string;
  name: string;
  parentName: string;
  cycleEndDate: string;
  cycleStartDate: string;
}
export interface ChildShape {
  id: string;
  familyId: string;
  name: string;
  nickname: string;
}
export interface TaskShape {
  id: string;
  familyId: string;
  title: string;
  description: string;
  rewardCents: number;
  frequency: string;
  assignmentType: string;
  assignedChildIds: string[];
  active: boolean;
  createdAt: string;
}
export interface SubmissionShape {
  id: string;
  taskId: string;
  childId: string;
  familyId: string;
  photoUri: string;
  status: string;
  rewardCentsAwarded: number;
  submittedForDate: string;
  submittedAt: string;
  reviewedAt: string | null;
  reviewNote: string | null;
  appealText: string | null;
  appealSubmittedAt: string | null;
}
export interface GoalShape {
  id: string;
  childId: string;
  title: string;
  targetCents: number;
  createdAt: string;
}
export interface StreakBetShape {
  id: string;
  childId: string;
  familyId: string;
  durationDays: number;
  startDate: string;
  startStreak: number;
  status: string;
  bonusPercent: number;
  bonusCentsAwarded: number;
  resolvedAt: string | null;
}
export interface FamilySnapshotShape {
  family: FamilyShape;
  children: ChildShape[];
  tasks: TaskShape[];
  submissions: SubmissionShape[];
  goals: GoalShape[];
  streakBets: StreakBetShape[];
}

// --- compute helpers (mirror the client) -----------------------------------

function computeStreak(submissions: SubmissionRow[], childId: string): number {
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const hasApproved = submissions.some(
      (s) =>
        s.childId === childId &&
        s.submittedForDate === dateKey &&
        (s.status === "approved" || s.status === "partial") &&
        s.taskId !== BONUS_TASK_ID,
    );
    if (hasApproved) streak++;
    else if (i > 0) break;
  }
  return streak;
}

function computeBalance(
  family: FamilyShape,
  submissions: SubmissionRow[],
  childId: string,
): number {
  const cycleStart = new Date(family.cycleStartDate + "T00:00:00");
  return submissions
    .filter(
      (s) =>
        s.childId === childId &&
        (s.status === "approved" || s.status === "partial") &&
        new Date(s.submittedAt) >= cycleStart,
    )
    .reduce((sum, s) => sum + s.rewardCentsAwarded, 0);
}

function hasBetStreakBroken(
  submissions: SubmissionRow[],
  childId: string,
  startDate: string,
): boolean {
  const today = todayKey();
  const todayDate = new Date(today + "T00:00:00");
  const d = new Date(startDate + "T00:00:00");
  d.setDate(d.getDate() + 1);
  while (d < todayDate) {
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const hasApproved = submissions.some(
      (s) =>
        s.childId === childId &&
        s.submittedForDate === dateKey &&
        (s.status === "approved" || s.status === "partial") &&
        s.taskId !== BONUS_TASK_ID,
    );
    if (!hasApproved) return true;
    d.setDate(d.getDate() + 1);
  }
  return false;
}

// Resolve active streak bets for a family, persisting any changes.
async function resolveBets(familyId: string): Promise<void> {
  const familyRows = await db
    .select()
    .from(familiesTable)
    .where(eq(familiesTable.id, familyId));
  const family = familyRows[0];
  if (!family) return;

  const activeBets = (
    await db.select().from(streakBetsTable).where(eq(streakBetsTable.familyId, familyId))
  ).filter((b) => b.status === "active");
  if (activeBets.length === 0) return;

  const submissions = await db
    .select()
    .from(submissionsTable)
    .where(eq(submissionsTable.familyId, familyId));

  for (const bet of activeBets) {
    const currentStreak = computeStreak(submissions, bet.childId);
    const targetStreak = bet.startStreak + bet.durationDays;

    if (currentStreak >= targetStreak) {
      const balance = computeBalance(family, submissions, bet.childId);
      const bonusCents = Math.round((balance * bet.bonusPercent) / 100);
      const resolvedAt = nowIso();
      await db.insert(submissionsTable).values({
        id: newId(),
        taskId: BONUS_TASK_ID,
        childId: bet.childId,
        familyId,
        photoUri: "",
        status: "approved",
        rewardCentsAwarded: bonusCents,
        submittedForDate: todayKey(),
        submittedAt: resolvedAt,
        reviewedAt: resolvedAt,
        reviewNote: `Bônus da aposta de ${bet.durationDays} dias`,
      });
      await db
        .update(streakBetsTable)
        .set({ status: "won", bonusCentsAwarded: bonusCents, resolvedAt })
        .where(eq(streakBetsTable.id, bet.id));
    } else if (hasBetStreakBroken(submissions, bet.childId, bet.startDate)) {
      await db
        .update(streakBetsTable)
        .set({ status: "lost", resolvedAt: nowIso() })
        .where(eq(streakBetsTable.id, bet.id));
    }
  }
}

export async function currentStreakForChild(
  familyId: string,
  childId: string,
): Promise<number> {
  const subs = await db
    .select()
    .from(submissionsTable)
    .where(eq(submissionsTable.familyId, familyId));
  return computeStreak(subs, childId);
}

// --- snapshot --------------------------------------------------------------

export async function buildSnapshot(familyId: string): Promise<FamilySnapshotShape | null> {
  await resolveBets(familyId);

  const familyRows = await db
    .select()
    .from(familiesTable)
    .where(eq(familiesTable.id, familyId));
  const familyRow = familyRows[0];
  if (!familyRow) return null;

  const [childRows, taskRows, submissionRows, goalRows, betRows] = await Promise.all([
    db.select().from(childrenTable).where(eq(childrenTable.familyId, familyId)),
    db.select().from(tasksTable).where(eq(tasksTable.familyId, familyId)),
    db.select().from(submissionsTable).where(eq(submissionsTable.familyId, familyId)),
    db.select().from(goalsTable).where(eq(goalsTable.familyId, familyId)),
    db.select().from(streakBetsTable).where(eq(streakBetsTable.familyId, familyId)),
  ]);

  return {
    family: {
      id: familyRow.id,
      name: familyRow.name,
      parentName: familyRow.parentName,
      cycleEndDate: familyRow.cycleEndDate,
      cycleStartDate: familyRow.cycleStartDate,
    },
    children: childRows.map((c) => ({
      id: c.id,
      familyId: c.familyId,
      name: c.name,
      nickname: c.nickname,
    })),
    tasks: taskRows.map((t) => ({
      id: t.id,
      familyId: t.familyId,
      title: t.title,
      description: t.description,
      rewardCents: t.rewardCents,
      frequency: t.frequency,
      assignmentType: t.assignmentType,
      assignedChildIds: t.assignedChildIds,
      active: t.active,
      createdAt: t.createdAt,
    })),
    submissions: submissionRows.map((s) => ({
      id: s.id,
      taskId: s.taskId,
      childId: s.childId,
      familyId: s.familyId,
      photoUri: s.photoUri,
      status: s.status,
      rewardCentsAwarded: s.rewardCentsAwarded,
      submittedForDate: s.submittedForDate,
      submittedAt: s.submittedAt,
      reviewedAt: s.reviewedAt ?? null,
      reviewNote: s.reviewNote ?? null,
      appealText: s.appealText ?? null,
      appealSubmittedAt: s.appealSubmittedAt ?? null,
    })),
    goals: goalRows.map((g) => ({
      id: g.id,
      childId: g.childId,
      title: g.title,
      targetCents: g.targetCents,
      createdAt: g.createdAt,
    })),
    streakBets: betRows.map((b) => ({
      id: b.id,
      childId: b.childId,
      familyId: b.familyId,
      durationDays: b.durationDays,
      startDate: b.startDate,
      startStreak: b.startStreak,
      status: b.status,
      bonusPercent: b.bonusPercent,
      bonusCentsAwarded: b.bonusCentsAwarded,
      resolvedAt: b.resolvedAt ?? null,
    })),
  };
}
