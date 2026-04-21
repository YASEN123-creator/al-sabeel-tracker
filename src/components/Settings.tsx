'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { Save, Bell, Timer, User, Clock, FolderKanban, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useT } from '@/lib/i18n';
import { upsertSettings } from '@/lib/api';
import type { UserSettings } from '@/lib/types';

export default function Settings() {
  const { settings, setSettings, language, addToast } = useAppStore();
  const userEmail = useAppStore(s => s.userEmail);
  const { sessions, tasks, projects } = useAppStore();
  const t = useT();
  const lang = language || 'ar';
  const isRTL = lang !== 'en';
  const [saved, setSaved] = useState(false);

  const [enablePomodoro, setEnablePomodoro] = useState(settings?.enable_pomodoro ?? true);
  const [enableGoals, setEnableGoals] = useState(settings?.enable_goals ?? true);
  const [enableAnalytics, setEnableAnalytics] = useState(settings?.enable_analytics ?? true);
  const [workDuration, setWorkDuration] = useState(settings?.pomodoro_work_duration ?? 25);
  const [breakDuration, setBreakDuration] = useState(settings?.pomodoro_break_duration ?? 5);

  // Computed stats
  const totalSessions = sessions.length;
  const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
  const totalHours = (totalMinutes / 60).toFixed(1);
  const totalProjects = projects.filter(p => !p.is_folder).length;
  const completedTasks = tasks.filter(t => t.is_completed).length;

  const handleSave = async () => {
    try {
      const userId = useAppStore.getState().settings?.user_id || '';
      const updated = await upsertSettings(userId, {
        enable_pomodoro: enablePomodoro,
        enable_goals: enableGoals,
        enable_analytics: enableAnalytics,
        pomodoro_work_duration: workDuration,
        pomodoro_break_duration: breakDuration,
      } as Partial<UserSettings>);
      setSettings(updated);
      setSaved(true);
      addToast(t('toast.saved'), 'success');
      setTimeout(() => setSaved(false), 2000);
    } catch { addToast(t('toast.error'), 'error'); }
  };

  const toggleKnob = (enabled: boolean) => ({
    className: `absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${enabled ? (isRTL ? 'right-0.5' : 'left-0.5') : (isRTL ? 'right-[22px]' : 'left-[22px]')}`,
  });

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t('settings.title')}</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">{t('settings.subtitle')}</p>
      </div>

      <div className="space-y-6 max-w-2xl">
        {/* Profile Section */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center">
              <User size={20} className="text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-800 dark:text-slate-100">{t('profile.title')}</h2>
              <p className="text-xs text-gray-400 dark:text-gray-500">{t('settings.profileDesc')}</p>
            </div>
          </div>
          {/* Avatar + Email */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-slate-800 dark:bg-blue-600 text-white flex items-center justify-center text-xl font-bold shrink-0">
              {userEmail ? userEmail.charAt(0).toUpperCase() : '?'}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{userEmail || '-'}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">{lang === 'ar' ? 'حساب نشط' : 'Active account'}</p>
            </div>
          </div>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 dark:bg-slate-900 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <Timer size={14} className="text-blue-500" />
                <span className="text-xs text-gray-400 dark:text-gray-500">{t('profile.totalSessions')}</span>
              </div>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{totalSessions}</p>
            </div>
            <div className="bg-gray-50 dark:bg-slate-900 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock size={14} className="text-emerald-500" />
                <span className="text-xs text-gray-400 dark:text-gray-500">{t('profile.totalHours')}</span>
              </div>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{totalHours} <span className="text-xs font-normal text-gray-400 dark:text-gray-500">{t('common.hours')}</span></p>
            </div>
            <div className="bg-gray-50 dark:bg-slate-900 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <FolderKanban size={14} className="text-orange-500" />
                <span className="text-xs text-gray-400 dark:text-gray-500">{t('profile.totalProjects')}</span>
              </div>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{totalProjects}</p>
            </div>
            <div className="bg-gray-50 dark:bg-slate-900 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 size={14} className="text-violet-500" />
                <span className="text-xs text-gray-400 dark:text-gray-500">{t('profile.totalTasks')}</span>
              </div>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{completedTasks}</p>
            </div>
          </div>
        </div>

        {/* Feature Toggles */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center"><Bell size={20} className="text-blue-600" /></div>
            <div>
              <h2 className="font-semibold text-slate-800 dark:text-slate-100">{t('settings.features')}</h2>
              <p className="text-xs text-gray-400 dark:text-gray-500">{t('settings.featuresDesc')}</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('settings.pomodoro')}</p><p className="text-xs text-gray-400 dark:text-gray-500">{t('settings.pomodoroDesc')}</p></div>
              <button onClick={() => setEnablePomodoro(!enablePomodoro)} className={`relative w-11 h-6 rounded-full transition-colors ${enablePomodoro ? 'bg-slate-800 dark:bg-blue-600' : 'bg-gray-300 dark:bg-slate-600'}`}><span {...toggleKnob(enablePomodoro)} /></button>
            </div>
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('settings.goalsFeature')}</p><p className="text-xs text-gray-400 dark:text-gray-500">{t('settings.goalsDesc')}</p></div>
              <button onClick={() => setEnableGoals(!enableGoals)} className={`relative w-11 h-6 rounded-full transition-colors ${enableGoals ? 'bg-slate-800 dark:bg-blue-600' : 'bg-gray-300 dark:bg-slate-600'}`}><span {...toggleKnob(enableGoals)} /></button>
            </div>
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('settings.analyticsFeature')}</p><p className="text-xs text-gray-400 dark:text-gray-500">{t('settings.analyticsDesc')}</p></div>
              <button onClick={() => setEnableAnalytics(!enableAnalytics)} className={`relative w-11 h-6 rounded-full transition-colors ${enableAnalytics ? 'bg-slate-800 dark:bg-blue-600' : 'bg-gray-300 dark:bg-slate-600'}`}><span {...toggleKnob(enableAnalytics)} /></button>
            </div>
          </div>
        </div>

        {/* Timer Settings */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950 flex items-center justify-center"><Timer size={20} className="text-purple-600" /></div>
            <div>
              <h2 className="font-semibold text-slate-800 dark:text-slate-100">{t('settings.timer')}</h2>
              <p className="text-xs text-gray-400 dark:text-gray-500">{t('settings.timerDesc')}</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">{t('settings.workDuration')}</label>
              <input type="number" value={workDuration} onChange={(e) => setWorkDuration(parseInt(e.target.value) || 25)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none text-slate-800 dark:text-slate-100" min="1" max="120" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">{t('settings.breakDuration')}</label>
              <input type="number" value={breakDuration} onChange={(e) => setBreakDuration(parseInt(e.target.value) || 5)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none text-slate-800 dark:text-slate-100" min="1" max="60" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2.5 bg-slate-800 dark:bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-slate-700 dark:hover:bg-blue-700 transition-colors"><Save size={16} />{t('settings.save')}</button>
          {saved && <motion.span initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="text-sm text-emerald-600 font-medium">{t('settings.saved')}</motion.span>}
        </div>
      </div>
    </motion.div>
  );
}
