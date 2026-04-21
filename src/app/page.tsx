'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/useAuth';
import { useAppStore } from '@/lib/store';
import { useTimer } from '@/lib/useTimer';
import {
  fetchProjects, fetchTasks, fetchSessions,
  fetchGoals, fetchSettings, upsertSettings,
  updateTask as updateTaskApi
} from '@/lib/api';
import AuthForm from '@/components/AuthForm';
import Toast from '@/components/Toast';
import Sidebar from '@/components/Sidebar';
import Dashboard from '@/components/Dashboard';
import Projects from '@/components/Projects';
import Tasks from '@/components/Tasks';
import Sessions from '@/components/Sessions';
import Analytics from '@/components/Analytics';
import Goals from '@/components/Goals';
import Settings from '@/components/Settings';
import Library from '@/components/Library';
import Notifications from '@/components/Notifications';
import VideoLibrary from '@/components/VideoLibrary';

export default function HomePage() {
  const { user, loading: authLoading, signIn, signUp, signInAsGuest, signOut, resetPassword } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authError, setAuthError] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);

  const {
    activeView, isSidebarOpen, language, darkMode,
    setProjects, setTasks, setSessions, setGoals, setSettings: setStoreSettings,
    setUserId,
  } = useAppStore();

  // Apply dark mode class to document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Timer persists across views (called here in page.tsx)
  useTimer();

  // Track last loaded user to prevent duplicate loading
  const lastLoadedUserRef = { current: '' as string };

  // Load all data when user changes
  const loadAllData = useCallback(async (userId: string) => {
    if (lastLoadedUserRef.current === userId) return;
    lastLoadedUserRef.current = userId;

    try {
      let settingsData: Awaited<ReturnType<typeof fetchSettings>> = null;
      try {
        settingsData = await fetchSettings(userId);
      } catch {
        settingsData = null;
      }

      const [projectsData, tasksData, sessionsData, goalsData] = await Promise.all([
        fetchProjects(userId),
        fetchTasks(userId),
        fetchSessions(userId),
        fetchGoals(userId),
      ]);

      setProjects(projectsData);
      setTasks(tasksData);
      setSessions(sessionsData);
      setGoals(goalsData);

      if (settingsData) {
        setStoreSettings(settingsData);
      } else {
        try {
          const defaultSettings = await upsertSettings(userId, {
            enable_pomodoro: true,
            enable_goals: true,
            enable_analytics: true,
            pomodoro_work_duration: 25,
            pomodoro_break_duration: 5,
          });
          setStoreSettings(defaultSettings);
        } catch {
          // Table doesn't exist
        }
      }
    } catch (_loadErr) {
      const msg = _loadErr instanceof Error ? _loadErr.message : '';
      if (msg.includes('rate limit') || msg.includes('الحد المسموح')) {
        console.warn('Rate limited during data load. Will retry on next interaction.');
        lastLoadedUserRef.current = '';
      } else {
        console.error('Error loading data:', _loadErr);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setProjects, setTasks, setSessions, setGoals, setStoreSettings]);

  // Reset recurring tasks based on their selected days
  useEffect(() => {
    const resetRecurringTasks = async () => {
      const store = useAppStore.getState();
      if (!store.userId) return;

      const todayStr = new Date().toISOString().split('T')[0];
      const lastResetKey = `sabeel_recurring_reset_${store.userId}`;
      const todayDay = new Date().getDay(); // 0=Sun, 1=Mon, ..., 6=Sat

      // Check if already reset today
      try {
        const lastReset = localStorage.getItem(lastResetKey);
        if (lastReset === todayStr) return;
      } catch { /* ignore */ }

      const tasksToReset = store.tasks.filter(
        (t: any) => {
          if (!t.is_recurring || !t.is_completed || !t.updated_at) return false;
          if (t.updated_at.startsWith(todayStr)) return false;
          if (!t.recurring_days || t.recurring_days.length === 0) return true;
          return t.recurring_days.includes(todayDay);
        }
      );

      if (tasksToReset.length === 0) {
        localStorage.setItem(lastResetKey, todayStr);
        return;
      }

      for (const task of tasksToReset) {
        try {
        const updated = await updateTaskApi(task.id, store.userId || '', { is_completed: false });
          store.updateTask(updated);
        } catch { /* silent */ }
      }

      try {
        localStorage.setItem(lastResetKey, todayStr);
      } catch { /* ignore */ }

      if (tasksToReset.length > 0) {
        store.addToast(
          store.language === 'ar' ? `تم تجديد ${tasksToReset.length} مهمة متكررة` : `Renewed ${tasksToReset.length} recurring tasks`,
          'info'
        );
      }
    };

    const timer = setTimeout(resetRecurringTasks, 3000);
    return () => clearTimeout(timer);
  }, [user]);

  useEffect(() => {
    if (user) {
      setUserId(user.id);
      if (user.email) {
        useAppStore.getState().setUserEmail(user.email);
      }
      useAppStore.getState().setDataLoading(true);
      loadAllData(user.id).finally(() => useAppStore.getState().setDataLoading(false));
    } else {
      setUserId(null);
      useAppStore.getState().setUserEmail(null);
    }
  }, [user, loadAllData, setUserId]);

  // Auth handlers
  const [loginCooldown, setLoginCooldown] = useState(0);

  const handleAuthSubmit = async (email: string, password: string) => {
    if (loginCooldown > 0) {
      const lang = useAppStore.getState().language || 'ar';
      setAuthError(lang === 'ar'
        ? `انتظر ${loginCooldown} ثانية قبل المحاولة مرة أخرى`
        : `Wait ${loginCooldown} seconds before trying again`);
      return;
    }

    setAuthError('');
    setAuthSubmitting(true);
    try {
      if (authMode === 'login') {
        await signIn(email, password);
      } else {
        await signUp(email, password);
        // After successful signup, switch to login mode
        const lang = useAppStore.getState().language || 'ar';
        setAuthError(lang === 'ar'
          ? 'تم إنشاء الحساب بنجاح! سجل دخول الآن.'
          : 'Account created! Sign in now.');
        setAuthMode('login');
        return;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'حدث خطأ غير متوقع';
      const isRateLimit = (
        message.includes('rate limit') ||
        message.includes('Too many requests') ||
        message.includes('429') ||
        message.includes('over_request_rate_limit')
      );

      if (isRateLimit) {
        setLoginCooldown(60);
        const interval = setInterval(() => {
          setLoginCooldown(prev => {
            if (prev <= 1) { clearInterval(interval); return 0; }
            return prev - 1;
          });
        }, 1000);
        setAuthError('تم تجاوز عدد المحاولات. استخدم "دخول سريع" بالأعلى أو انتظر قليلاً وحاول مرة أخرى.');
      } else if (message.includes('Invalid login') || message.includes('Invalid credentials')) {
        setAuthError('البريد الإلكتروني أو كلمة المرور غير صحيحة');
      } else if (message.includes('User already registered')) {
        setAuthError('هذا البريد الإلكتروني مسجل بالفعل');
      } else if (message.includes('Password should be at least')) {
        setAuthError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      } else {
        setAuthError(message.length > 100 ? 'حدث خطأ. تأكد من البيانات وحاول مرة أخرى.' : message);
      }
    } finally {
      setAuthSubmitting(false);
    }
  };

  const [isRateLimited, setIsRateLimited] = useState(false);

  const handleGuestLogin = async () => {
    setAuthError('');
    setGuestLoading(true);
    try {
      await signInAsGuest();
    } catch {
      const lang = useAppStore.getState().language || 'ar';
      setAuthError(lang === 'ar'
        ? 'فشل في الدخول السريع. تأكد من اتصال الإنترنت وحاول مرة أخرى.'
        : 'Quick login failed. Check your internet and try again.');
    } finally {
      setGuestLoading(false);
    }
  };

  useEffect(() => {
    setIsRateLimited(loginCooldown > 0);
  }, [loginCooldown]);

  const handleSignOut = async () => {
    try {
      setUserId(null);
      await signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir={language === 'en' ? 'ltr' : 'rtl'}>
        <div className="text-center">
          <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-2xl font-bold text-white">س</span>
          </div>
          <p className="text-gray-400 text-sm">{language === 'en' ? 'Loading...' : 'جاري التحميل...'}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthForm
        mode={authMode}
        onSubmit={handleAuthSubmit}
        onSwitch={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setAuthError(''); }}
        onGuestLogin={handleGuestLogin}
        onResetPassword={resetPassword}
        error={authError}
        loading={authSubmitting}
        guestLoading={guestLoading}
        loginCooldown={loginCooldown}
        isRateLimited={isRateLimited}
      />
    );
  }

  const renderView = () => {
    switch (activeView) {
      case 'dashboard': return <Dashboard />;
      case 'projects': return <Projects />;
      case 'tasks': return <Tasks />;
      case 'sessions': return <Sessions />;
      case 'analytics': return <Analytics />;
      case 'goals': return <Goals />;
      case 'settings': return <Settings />;
      case 'library': return <Library />;
      case 'notifications': return <Notifications />;
      case 'video': return <VideoLibrary />;
      default: return <Dashboard />;
    }
  };

  const dir = language === 'en' ? 'ltr' : 'rtl';

  return (
    <div className="min-h-screen" dir={dir}>
      <Toast />
      <Sidebar onSignOut={handleSignOut} />
      <main className={`min-h-screen p-4 md:p-8 overflow-auto transition-all duration-300 ${isSidebarOpen ? (language === 'en' ? 'md:ml-64' : 'md:mr-64') : ''}`}>
        <div className="max-w-5xl mx-auto">
          {renderView()}
        </div>
      </main>
    </div>
  );
}
