import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { Alert, AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { registerForPushNotifications } from '@/lib/push';
import {
  createFamily,
  createPairingCode as createPairingCodeApi,
  recoverParent as recoverParentApi,
  redeemPairing,
  getSnapshot,
  addChild as addChildApi,
  updateCycle,
  closeCycle as closeCycleApi,
  createTask,
  updateTask as updateTaskApi,
  deleteTask as deleteTaskApi,
  toggleTask as toggleTaskApi,
  submitTask as submitTaskApi,
  reviewSubmission as reviewSubmissionApi,
  appealSubmission,
  reviewAppeal as reviewAppealApi,
  addGoal as addGoalApi,
  deleteGoal as deleteGoalApi,
  placeBet as placeBetApi,
  type FamilySnapshot,
} from '@workspace/api-client-react';
import {
  Family, Child, Task, TaskSubmission, SavingsGoal,
  Mission, SubmissionWithTask, UserRole,
  getTodayKey, SetupData,
  StreakBet, StreakBetDuration,
} from '@/types';
import { configureApiClient } from '@/constants/api';

const AUTH_KEY = 'mesada_auth_v2';
const SNAP_KEY = 'mesada_snapshot_v2';
const ONBOARDING_KEY = 'mesada_onboarding_seen_v1';
const POLL_INTERVAL_MS = 15000;

interface AuthState {
  deviceToken: string;
  role: UserRole;
  familyId: string;
  childId: string | null;
}

interface AppData {
  family: Family | null;
  children: Child[];
  tasks: Task[];
  submissions: TaskSubmission[];
  goals: SavingsGoal[];
  streakBets: StreakBet[];
}

interface AppContextType {
  isLoading: boolean;
  isSyncing: boolean;
  hasSeenOnboarding: boolean;
  family: Family | null;
  children: Child[];
  tasks: Task[];
  submissions: TaskSubmission[];
  goals: SavingsGoal[];
  streakBets: StreakBet[];
  currentRole: UserRole;
  currentChildId: string | null;

  setupParent: (data: SetupData) => Promise<void>;
  recoverParent: (parentPin: string) => Promise<boolean>;
  redeemPairingCode: (code: string) => Promise<boolean>;
  createPairingCode: (childId: string) => Promise<{ code: string; expiresAt: string } | null>;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  updateCycleEndDate: (newEndDate: string) => Promise<void>;
  completeOnboarding: () => Promise<void>;

  addTask: (data: Omit<Task, 'id' | 'familyId' | 'createdAt' | 'active'>) => Promise<void>;
  isTaskClaimedForCycle: (taskId: string) => boolean;
  updateTask: (task: Task) => Promise<void>;
  toggleTask: (taskId: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;

  submitTask: (taskId: string, photoUri: string) => Promise<void>;
  reviewSubmission: (id: string, status: 'approved' | 'partial' | 'rejected', rewardCents: number, note?: string) => Promise<void>;
  submitAppeal: (id: string, text: string) => Promise<void>;
  reviewAppeal: (id: string, approved: boolean, note?: string) => Promise<void>;

  addGoal: (title: string, targetCents: number) => Promise<void>;
  deleteGoal: (goalId: string) => Promise<void>;

  addChild: (name: string, nickname: string) => Promise<void>;
  closeCycle: (newEndDate: string) => Promise<void>;

  placeBet: (childId: string, durationDays: StreakBetDuration) => Promise<boolean>;
  getActiveBet: (childId: string) => StreakBet | null;
  getChildBetHistory: (childId: string) => StreakBet[];

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

const defaultData: AppData = { family: null, children: [], tasks: [], submissions: [], goals: [], streakBets: [] };

function snapshotToData(snap: FamilySnapshot): AppData {
  return snap as unknown as AppData;
}

export function AppProvider({ children: reactChildren }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const [appData, setAppData] = useState<AppData>(defaultData);
  const [auth, setAuth] = useState<AuthState | null>(null);

  const authRef = useRef<AuthState | null>(null);
  authRef.current = auth;

  // Configure the API client once; token is read dynamically from the ref.
  useEffect(() => {
    configureApiClient(() => authRef.current?.deviceToken ?? null);
  }, []);

  const persistData = useCallback(async (data: AppData) => {
    setAppData(data);
    try {
      await AsyncStorage.setItem(SNAP_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Cache write failed', e);
    }
  }, []);

  const persistAuth = useCallback(async (next: AuthState | null) => {
    authRef.current = next;
    setAuth(next);
    try {
      if (next) await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(next));
      else await AsyncStorage.removeItem(AUTH_KEY);
    } catch (e) {
      console.warn('Auth write failed', e);
    }
  }, []);

  const applySnapshot = useCallback((snap: FamilySnapshot) => {
    void persistData(snapshotToData(snap));
  }, [persistData]);

  // Initial load: hydrate from cache for instant (offline) display, then sync.
  useEffect(() => {
    (async () => {
      try {
        const [authStr, snapStr, onboardingStr] = await Promise.all([
          AsyncStorage.getItem(AUTH_KEY),
          AsyncStorage.getItem(SNAP_KEY),
          AsyncStorage.getItem(ONBOARDING_KEY),
        ]);
        let loadedAuth: AuthState | null = null;
        if (authStr) {
          loadedAuth = JSON.parse(authStr);
          authRef.current = loadedAuth;
          setAuth(loadedAuth);
        }
        if (snapStr) setAppData(JSON.parse(snapStr));
        setHasSeenOnboarding(onboardingStr === 'true');
        setIsLoading(false);

        if (loadedAuth) {
          try {
            const snap = await getSnapshot();
            void persistData(snapshotToData(snap));
          } catch {
            // Offline or token invalid — keep cached data.
          }
        }
      } catch (e) {
        console.error('Load error', e);
        setIsLoading(false);
      }
    })();
  }, [persistData]);

  const completeOnboarding = useCallback(async () => {
    setHasSeenOnboarding(true);
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    } catch (e) {
      console.warn('Onboarding flag write failed', e);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!authRef.current) return;
    setIsSyncing(true);
    try {
      const snap = await getSnapshot();
      void persistData(snapshotToData(snap));
    } catch {
      // ignore — offline
    } finally {
      setIsSyncing(false);
    }
  }, [persistData]);

  // Background sync: poll while authenticated + on app foreground.
  useEffect(() => {
    if (!auth) return;
    const id = setInterval(() => { void refresh(); }, POLL_INTERVAL_MS);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    return () => { clearInterval(id); sub.remove(); };
  }, [auth, refresh]);

  // Register this device for push notifications once authenticated. Fails
  // silently on web / simulator / denied permission.
  useEffect(() => {
    if (!auth) return;
    void registerForPushNotifications();
  }, [auth?.deviceToken]);

  // Deep link from a tapped notification to the relevant screen.
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const handle = (data: Record<string, unknown> | undefined) => {
      if (!data) return;
      if (data.type === 'submission' && typeof data.submissionId === 'string') {
        router.push(`/review/${data.submissionId}`);
      } else if (data.type === 'review') {
        router.push('/(child)');
      }
    };

    // Cold start: app opened from a notification.
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      handle(response?.notification.request.content.data as Record<string, unknown> | undefined);
    });

    // Warm: notification tapped while app is running.
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      handle(response.notification.request.content.data as Record<string, unknown> | undefined);
    });
    return () => sub.remove();
  }, []);

  // Run an authenticated mutation, applying the returned snapshot. Shows an
  // alert + rethrows on failure so callers can react.
  const mutate = useCallback(async (fn: () => Promise<FamilySnapshot>): Promise<void> => {
    try {
      const snap = await fn();
      void persistData(snapshotToData(snap));
    } catch (e) {
      Alert.alert('Sem conexão', 'Não foi possível sincronizar agora. Verifique sua internet e tente novamente.');
      throw e;
    }
  }, [persistData]);

  // === Auth / pairing ===
  const setupParent = useCallback(async (data: SetupData): Promise<void> => {
    const result = await createFamily({
      familyName: data.familyName.trim(),
      parentName: data.parentName.trim(),
      parentPin: data.parentPin.trim(),
      cycleEndDate: data.cycleEndDate,
      childName: data.childName.trim(),
      childNickname: data.childNickname.toLowerCase().trim(),
    });
    await persistAuth({
      deviceToken: result.deviceToken,
      role: 'parent',
      familyId: result.familyId,
      childId: null,
    });
    applySnapshot(result.snapshot);
  }, [persistAuth, applySnapshot]);

  const recoverParent = useCallback(async (parentPin: string): Promise<boolean> => {
    try {
      const result = await recoverParentApi({
        parentPin: parentPin.trim(),
      });
      await persistAuth({
        deviceToken: result.deviceToken,
        role: 'parent',
        familyId: result.familyId,
        childId: null,
      });
      applySnapshot(result.snapshot);
      return true;
    } catch {
      return false;
    }
  }, [persistAuth, applySnapshot]);

  const redeemPairingCode = useCallback(async (code: string): Promise<boolean> => {
    try {
      const result = await redeemPairing({ code: code.trim().toUpperCase() });
      await persistAuth({
        deviceToken: result.deviceToken,
        role: 'child',
        familyId: result.familyId,
        childId: result.childId ?? null,
      });
      applySnapshot(result.snapshot);
      return true;
    } catch {
      return false;
    }
  }, [persistAuth, applySnapshot]);

  const createPairingCode = useCallback(async (childId: string) => {
    try {
      const res = await createPairingCodeApi({ childId });
      return { code: res.code, expiresAt: res.expiresAt };
    } catch {
      Alert.alert('Erro', 'Não foi possível gerar o código. Verifique sua conexão.');
      return null;
    }
  }, []);

  const logout = useCallback(async () => {
    await persistAuth(null);
    setAppData(defaultData);
    try { await AsyncStorage.removeItem(SNAP_KEY); } catch { /* noop */ }
  }, [persistAuth]);

  // === Mutations ===
  const addTask = useCallback((data: Omit<Task, 'id' | 'familyId' | 'createdAt' | 'active'>) =>
    mutate(() => createTask({
      title: data.title,
      description: data.description ?? '',
      rewardCents: data.rewardCents,
      frequency: data.frequency,
      assignmentType: data.assignmentType ?? 'all',
      assignedChildIds: data.assignedChildIds ?? [],
    })), [mutate]);

  const updateTask = useCallback((task: Task) =>
    mutate(() => updateTaskApi(task.id, {
      title: task.title,
      description: task.description ?? '',
      rewardCents: task.rewardCents,
      frequency: task.frequency,
      assignmentType: task.assignmentType ?? 'all',
      assignedChildIds: task.assignedChildIds ?? [],
      active: task.active,
    })), [mutate]);

  const toggleTask = useCallback((taskId: string) =>
    mutate(() => toggleTaskApi(taskId)), [mutate]);

  const deleteTask = useCallback((taskId: string) =>
    mutate(() => deleteTaskApi(taskId)), [mutate]);

  const submitTask = useCallback((taskId: string, photoUri: string) =>
    mutate(() => submitTaskApi({ taskId, photoUri })), [mutate]);

  const reviewSubmission = useCallback((id: string, status: 'approved' | 'partial' | 'rejected', rewardCents: number, note?: string) =>
    mutate(() => reviewSubmissionApi(id, { status, rewardCents, note })), [mutate]);

  const submitAppeal = useCallback((id: string, text: string) =>
    mutate(() => appealSubmission(id, { text })), [mutate]);

  const reviewAppeal = useCallback((id: string, approved: boolean, note?: string) =>
    mutate(() => reviewAppealApi(id, { approved, note })), [mutate]);

  const addGoal = useCallback((title: string, targetCents: number) =>
    mutate(() => addGoalApi({ title, targetCents })), [mutate]);

  const deleteGoal = useCallback((goalId: string) =>
    mutate(() => deleteGoalApi(goalId)), [mutate]);

  const addChild = useCallback((name: string, nickname: string) =>
    mutate(() => addChildApi({ name: name.trim(), nickname: nickname.toLowerCase().trim() })), [mutate]);

  const closeCycle = useCallback((newEndDate: string) =>
    mutate(() => closeCycleApi({ cycleEndDate: newEndDate })), [mutate]);

  const updateCycleEndDate = useCallback((newEndDate: string) =>
    mutate(() => updateCycle({ cycleEndDate: newEndDate })), [mutate]);

  const placeBet = useCallback(async (childId: string, durationDays: StreakBetDuration): Promise<boolean> => {
    try {
      const snap = await placeBetApi({ childId, durationDays });
      void persistData(snapshotToData(snap));
      return true;
    } catch {
      return false;
    }
  }, [persistData]);

  // === Derived / compute (client-side display) ===
  const computeStreak = (submissions: TaskSubmission[], childId: string): number => {
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      const hasApproved = submissions.some(
        s => s.childId === childId && s.submittedForDate === dateKey &&
          (s.status === 'approved' || s.status === 'partial') &&
          s.taskId !== '__streak_bet_bonus__'
      );
      if (hasApproved) { streak++; }
      else if (i > 0) { break; }
    }
    return streak;
  };

  const getActiveBet = (childId: string): StreakBet | null =>
    appData.streakBets.find(b => b.childId === childId && b.status === 'active') ?? null;

  const getChildBetHistory = (childId: string): StreakBet[] =>
    appData.streakBets
      .filter(b => b.childId === childId && b.status !== 'active')
      .sort((a, b) => new Date(b.resolvedAt ?? '').getTime() - new Date(a.resolvedAt ?? '').getTime());

  const getCurrentChild = (): Child | null =>
    appData.children.find(c => c.id === auth?.childId) ?? null;

  const isTaskClaimedForCycle = (taskId: string): boolean => {
    const task = appData.tasks.find(t => t.id === taskId);
    if (!task || task.assignmentType !== 'first') return false;
    const cycleStart = appData.family ? new Date(appData.family.cycleStartDate + 'T00:00:00') : new Date(0);
    return appData.submissions.some(
      s => s.taskId === taskId &&
        (s.status === 'approved' || s.status === 'partial') &&
        new Date(s.submittedAt) >= cycleStart
    );
  };

  const getTodaysMissions = (childId?: string): Mission[] => {
    const cId = childId ?? auth?.childId ?? null;
    if (!cId) return [];
    const today = getTodayKey();
    const cycleStart = appData.family ? new Date(appData.family.cycleStartDate + 'T00:00:00') : new Date(0);
    const activeTasks = appData.tasks.filter(t => {
      if (!t.active) return false;
      const aType = t.assignmentType ?? 'all';
      if (aType === 'individual') {
        return (t.assignedChildIds ?? []).includes(cId);
      }
      if (aType === 'first') {
        const alreadyClaimed = appData.submissions.some(
          s => s.taskId === t.id &&
            s.childId !== cId &&
            (s.status === 'approved' || s.status === 'partial') &&
            new Date(s.submittedAt) >= cycleStart
        );
        return !alreadyClaimed;
      }
      return true;
    });
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

  const getChildStreak = (childId: string): number =>
    computeStreak(appData.submissions, childId);

  const getChildXP = (childId: string): number =>
    appData.submissions.filter(
      s => s.childId === childId && (s.status === 'approved' || s.status === 'partial') && s.taskId !== '__streak_bet_bonus__'
    ).length * 10;

  const getChildLevel = (childId: string): number =>
    Math.floor(getChildXP(childId) / 50) + 1;

  const getPendingSubmissions = (): SubmissionWithTask[] =>
    appData.submissions
      .filter(s => (s.status === 'pending' || s.status === 'appealed') && s.taskId !== '__streak_bet_bonus__')
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
      isSyncing,
      hasSeenOnboarding,
      family: appData.family,
      children: appData.children,
      tasks: appData.tasks,
      submissions: appData.submissions,
      goals: appData.goals,
      streakBets: appData.streakBets,
      currentRole: auth?.role ?? null,
      currentChildId: auth?.childId ?? null,
      setupParent, recoverParent, redeemPairingCode, createPairingCode, refresh, logout, updateCycleEndDate, completeOnboarding,
      addTask, updateTask, toggleTask, deleteTask, isTaskClaimedForCycle,
      submitTask, reviewSubmission, submitAppeal, reviewAppeal,
      addGoal, deleteGoal, addChild, closeCycle,
      placeBet, getActiveBet, getChildBetHistory,
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
