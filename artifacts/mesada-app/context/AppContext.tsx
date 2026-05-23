import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Family, Child, Task, TaskSubmission, SavingsGoal,
  Mission, SubmissionWithTask, UserRole, SubmissionStatus,
  generateId, getTodayKey, SetupData,
} from '@/types';

const STORAGE_KEY = 'mesada_data_v1';
const SESSION_KEY = 'mesada_session_v1';

interface AppData {
  family: Family | null;
  children: Child[];
  tasks: Task[];
  submissions: TaskSubmission[];
  goals: SavingsGoal[];
}

interface SessionState {
  currentRole: UserRole;
  currentChildId: string | null;
}

interface AppContextType {
  isLoading: boolean;
  family: Family | null;
  children: Child[];
  tasks: Task[];
  submissions: TaskSubmission[];
  goals: SavingsGoal[];
  currentRole: UserRole;
  currentChildId: string | null;

  setupParent: (data: SetupData) => Promise<void>;
  updateCycleEndDate: (newEndDate: string) => void;
  loginAsParent: () => void;
  loginAsChild: (pin: string, nickname: string) => boolean;
  logout: () => void;

  addTask: (data: Omit<Task, 'id' | 'familyId' | 'createdAt' | 'active'>) => void;
  updateTask: (task: Task) => void;
  toggleTask: (taskId: string) => void;
  deleteTask: (taskId: string) => void;

  submitTask: (taskId: string, photoUri: string) => void;
  reviewSubmission: (id: string, status: 'approved' | 'partial' | 'rejected', rewardCents: number, note?: string) => void;
  submitAppeal: (id: string, text: string) => void;
  reviewAppeal: (id: string, approved: boolean, note?: string) => void;

  addGoal: (title: string, targetCents: number) => void;
  deleteGoal: (goalId: string) => void;

  addChild: (name: string, nickname: string) => void;
  closeCycle: (newEndDate: string) => void;

  getCurrentChild: () => Child | null;
  getTodaysMissions: (childId?: string) => Mission[];
  getChildBalance: (childId: string) => number;
  getChildStreak: (childId: string) => number;
  getChildXP: (childId: string) => number;
  getChildLevel: (childId: string) => number;
  getPendingSubmissions: () => SubmissionWithTask[];
  getCycleEndDate: () => Date | null;
  getCycleDay: () => number;
}

const AppContext = createContext<AppContextType | null>(null);

const defaultData: AppData = { family: null, children: [], tasks: [], submissions: [], goals: [] };
const defaultSession: SessionState = { currentRole: null, currentChildId: null };

export function AppProvider({ children: reactChildren }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [appData, setAppData] = useState<AppData>(defaultData);
  const [session, setSession] = useState<SessionState>(defaultSession);

  useEffect(() => {
    (async () => {
      try {
        const [dataStr, sessionStr] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem(SESSION_KEY),
        ]);
        if (dataStr) setAppData(JSON.parse(dataStr));
        if (sessionStr) setSession(JSON.parse(sessionStr));
      } catch (e) {
        console.error('Load error', e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const persist = useCallback(async (newData: AppData) => {
    setAppData(newData);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
  }, []);

  const persistSession = useCallback(async (newSession: SessionState) => {
    setSession(newSession);
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
  }, []);

  const setupParent = async (data: SetupData) => {
    const familyId = generateId();
    const family: Family = {
      id: familyId,
      name: data.familyName.trim(),
      parentName: data.parentName.trim(),
      pin: Math.floor(100000 + Math.random() * 900000).toString(),
      cycleEndDate: data.cycleEndDate,
      cycleStartDate: getTodayKey(),
    };
    const child: Child = {
      id: generateId(),
      name: data.childName.trim(),
      nickname: data.childNickname.toLowerCase().trim(),
      familyId,
    };
    await persist({ ...appData, family, children: [child] });
    await persistSession({ currentRole: 'parent', currentChildId: null });
  };

  const loginAsParent = () => {
    persistSession({ currentRole: 'parent', currentChildId: null });
  };

  const loginAsChild = (pin: string, nickname: string): boolean => {
    if (!appData.family) return false;
    if (appData.family.pin !== pin.trim()) return false;
    const child = appData.children.find(c => c.nickname === nickname.toLowerCase().trim());
    if (!child) return false;
    persistSession({ currentRole: 'child', currentChildId: child.id });
    return true;
  };

  const logout = () => persistSession(defaultSession);

  const addTask = (data: Omit<Task, 'id' | 'familyId' | 'createdAt' | 'active'>) => {
    if (!appData.family) return;
    const task: Task = { ...data, id: generateId(), familyId: appData.family.id, active: true, createdAt: new Date().toISOString() };
    persist({ ...appData, tasks: [...appData.tasks, task] });
  };

  const updateTask = (task: Task) => {
    persist({ ...appData, tasks: appData.tasks.map(t => t.id === task.id ? task : t) });
  };

  const toggleTask = (taskId: string) => {
    persist({ ...appData, tasks: appData.tasks.map(t => t.id === taskId ? { ...t, active: !t.active } : t) });
  };

  const deleteTask = (taskId: string) => {
    persist({ ...appData, tasks: appData.tasks.filter(t => t.id !== taskId) });
  };

  const submitTask = (taskId: string, photoUri: string) => {
    if (!appData.family || !session.currentChildId) return;
    const today = getTodayKey();
    const existing = appData.submissions.find(
      s => s.taskId === taskId && s.childId === session.currentChildId && s.submittedForDate === today
    );
    if (existing && (existing.status === 'pending' || existing.status === 'approved')) return;
    const sub: TaskSubmission = {
      id: generateId(),
      taskId,
      childId: session.currentChildId,
      familyId: appData.family.id,
      photoUri,
      status: 'pending',
      rewardCentsAwarded: 0,
      submittedForDate: today,
      submittedAt: new Date().toISOString(),
    };
    persist({ ...appData, submissions: [...appData.submissions, sub] });
  };

  const reviewSubmission = (id: string, status: 'approved' | 'partial' | 'rejected', rewardCents: number, note?: string) => {
    persist({
      ...appData,
      submissions: appData.submissions.map(s =>
        s.id === id ? { ...s, status, rewardCentsAwarded: rewardCents, reviewedAt: new Date().toISOString(), reviewNote: note } : s
      ),
    });
  };

  const submitAppeal = (id: string, text: string) => {
    persist({
      ...appData,
      submissions: appData.submissions.map(s =>
        s.id === id ? { ...s, status: 'appealed' as SubmissionStatus, appealText: text, appealSubmittedAt: new Date().toISOString() } : s
      ),
    });
  };

  const reviewAppeal = (id: string, approved: boolean, note?: string) => {
    const sub = appData.submissions.find(s => s.id === id);
    const task = appData.tasks.find(t => t.id === sub?.taskId);
    persist({
      ...appData,
      submissions: appData.submissions.map(s =>
        s.id === id ? {
          ...s,
          status: (approved ? 'approved' : 'appeal_rejected') as SubmissionStatus,
          rewardCentsAwarded: approved ? (task?.rewardCents ?? 0) : 0,
          reviewedAt: new Date().toISOString(),
          reviewNote: note,
        } : s
      ),
    });
  };

  const addGoal = (title: string, targetCents: number) => {
    if (!session.currentChildId) return;
    const goal: SavingsGoal = { id: generateId(), childId: session.currentChildId, title, targetCents, createdAt: new Date().toISOString() };
    persist({ ...appData, goals: [...appData.goals, goal] });
  };

  const deleteGoal = (goalId: string) => {
    persist({ ...appData, goals: appData.goals.filter(g => g.id !== goalId) });
  };

  const addChild = (name: string, nickname: string) => {
    if (!appData.family) return;
    const child: Child = { id: generateId(), name: name.trim(), nickname: nickname.toLowerCase().trim(), familyId: appData.family.id };
    persist({ ...appData, children: [...appData.children, child] });
  };

  const closeCycle = (newEndDate: string) => {
    if (!appData.family) return;
    persist({ ...appData, family: { ...appData.family, cycleStartDate: getTodayKey(), cycleEndDate: newEndDate } });
  };

  const updateCycleEndDate = (newEndDate: string) => {
    if (!appData.family) return;
    persist({ ...appData, family: { ...appData.family, cycleEndDate: newEndDate } });
  };

  const getCurrentChild = (): Child | null =>
    appData.children.find(c => c.id === session.currentChildId) ?? null;

  const getTodaysMissions = (childId?: string): Mission[] => {
    const cId = childId ?? session.currentChildId;
    if (!cId) return [];
    const today = getTodayKey();
    const activeTasks = appData.tasks.filter(t => t.active);
    return activeTasks.map(task => ({
      task,
      submission: appData.submissions.find(s => s.taskId === task.id && s.childId === cId && s.submittedForDate === today) ?? null,
    }));
  };

  const getChildBalance = (childId: string): number => {
    if (!appData.family) return 0;
    const cycleStart = new Date(appData.family.cycleStartDate + 'T00:00:00');
    return appData.submissions
      .filter(s => s.childId === childId && (s.status === 'approved' || s.status === 'partial') && new Date(s.submittedAt) >= cycleStart)
      .reduce((sum, s) => sum + s.rewardCentsAwarded, 0);
  };

  const getChildStreak = (childId: string): number => {
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      const hasApproved = appData.submissions.some(
        s => s.childId === childId && s.submittedForDate === dateKey && (s.status === 'approved' || s.status === 'partial')
      );
      if (hasApproved) { streak++; }
      else if (i > 0) { break; }
    }
    return streak;
  };

  const getChildXP = (childId: string): number =>
    appData.submissions.filter(s => s.childId === childId && (s.status === 'approved' || s.status === 'partial')).length * 10;

  const getChildLevel = (childId: string): number =>
    Math.floor(getChildXP(childId) / 50) + 1;

  const getPendingSubmissions = (): SubmissionWithTask[] =>
    appData.submissions
      .filter(s => s.status === 'pending' || s.status === 'appealed')
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
      .map(submission => ({
        submission,
        task: appData.tasks.find(t => t.id === submission.taskId)!,
        child: appData.children.find(c => c.id === submission.childId)!,
      }))
      .filter(item => item.task && item.child);

  const getCycleEndDate = (): Date | null => {
    if (!appData.family) return null;
    return new Date(appData.family.cycleEndDate + 'T00:00:00');
  };

  const getCycleDay = (): number => {
    if (!appData.family) return 0;
    const start = new Date(appData.family.cycleStartDate + 'T00:00:00');
    const diff = new Date().getTime() - start.getTime();
    return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)) + 1);
  };

  return (
    <AppContext.Provider value={{
      isLoading,
      family: appData.family,
      children: appData.children,
      tasks: appData.tasks,
      submissions: appData.submissions,
      goals: appData.goals,
      currentRole: session.currentRole,
      currentChildId: session.currentChildId,
      setupParent, loginAsParent, loginAsChild, logout, updateCycleEndDate,
      addTask, updateTask, toggleTask, deleteTask,
      submitTask, reviewSubmission, submitAppeal, reviewAppeal,
      addGoal, deleteGoal, addChild, closeCycle,
      getCurrentChild, getTodaysMissions, getChildBalance, getChildStreak,
      getChildXP, getChildLevel, getPendingSubmissions, getCycleEndDate, getCycleDay,
    }}>
      {reactChildren}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
