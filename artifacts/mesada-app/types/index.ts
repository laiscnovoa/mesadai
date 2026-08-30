export const generateId = () =>
  Date.now().toString() + Math.random().toString(36).substr(2, 9);

export const getTodayKey = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export const formatCurrency = (cents: number): string =>
  `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;

export const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export const addDays = (dateStr: string, days: number): string => {
  const date = new Date(dateStr + 'T00:00:00');
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};

export type TaskFrequency = 'daily' | 'weekly' | 'once';
export type TaskAssignmentType = 'all' | 'individual' | 'first';
export type SubmissionStatus =
  | 'pending'
  | 'approved'
  | 'partial'
  | 'rejected'
  | 'appealed'
  | 'appeal_rejected';
export type UserRole = 'parent' | 'child' | null;

export interface Family {
  id: string;
  name: string;
  parentName: string;
  cycleEndDate: string;
  cycleStartDate: string;
}

export interface Child {
  id: string;
  name: string;
  nickname: string;
  familyId: string;
}

export interface Task {
  id: string;
  familyId: string;
  title: string;
  description: string;
  rewardCents: number;
  frequency: TaskFrequency;
  assignmentType: TaskAssignmentType;
  assignedChildIds: string[];
  active: boolean;
  createdAt: string;
}

export interface TaskSubmission {
  id: string;
  taskId: string;
  childId: string;
  familyId: string;
  photoUri: string;
  status: SubmissionStatus;
  rewardCentsAwarded: number;
  submittedForDate: string;
  submittedAt: string;
  reviewedAt?: string;
  reviewNote?: string;
  appealText?: string;
  appealSubmittedAt?: string;
}

export interface SavingsGoal {
  id: string;
  childId: string;
  title: string;
  targetCents: number;
  createdAt: string;
}

export interface Mission {
  task: Task;
  submission: TaskSubmission | null;
}

export interface SubmissionWithTask {
  submission: TaskSubmission;
  task: Task;
  child: Child;
}

export interface SetupData {
  familyName: string;
  parentName: string;
  parentPin: string;
  cycleEndDate: string;
  childName: string;
  childNickname: string;
}

export type StreakBetStatus = 'active' | 'won' | 'lost';
export type StreakBetDuration = 7 | 14 | 20;

export interface StreakBet {
  id: string;
  childId: string;
  familyId: string;
  durationDays: StreakBetDuration;
  startDate: string;
  startStreak: number;
  status: StreakBetStatus;
  bonusPercent: number;
  bonusCentsAwarded: number;
  resolvedAt?: string;
}

export const STREAK_BET_BONUS: Record<StreakBetDuration, number> = {
  7: 10,
  14: 20,
  20: 35,
};
