'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Edit3, X, Target, TrendingUp, Flame, Calendar, Clock, CheckSquare, ListChecks } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { useAppStore } from '@/lib/store';
import { createGoal, updateGoal, deleteGoal } from '@/lib/api';
import { useT } from '@/lib/i18n';
import type { Goal } from '@/lib/types';

type ChartView = 'day' | 'month' | 'year';

const COLORS = ['#1E293B', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

export default function Goals() {
  const { goals, sessions, tasks, settings, projects, addGoal, updateGoal: updateGoalInStore, removeGoal, addToast, darkMode } = useAppStore();
  const lang = useAppStore(s => s.language || 'ar');
  const t = useT();
  const [showModal, setShowModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [goalType, setGoalType] = useState<Goal['goal_type']>('daily_hours');
  const [targetValue, setTargetValue] = useState('');
  const [goalProjectId, setGoalProjectId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [chartView, setChartView] = useState<ChartView>('month');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const actualProjects = projects.filter(p => !p.is_folder);

  const GOAL_TYPES: { value: Goal['goal_type']; label: string; unit: string }[] = [
    { value: 'daily_hours', label: lang === 'ar' ? 'ساعات يومية' : 'Daily Hours', unit: lang === 'ar' ? 'ساعة' : 'hour' },
    { value: 'weekly_hours', label: lang === 'ar' ? 'ساعات أسبوعية' : 'Weekly Hours', unit: lang === 'ar' ? 'ساعة' : 'hour' },
    { value: 'daily_tasks', label: lang === 'ar' ? 'مهام يومية' : 'Daily Tasks', unit: lang === 'ar' ? 'مهمة' : 'task' },
    { value: 'weekly_tasks', label: lang === 'ar' ? 'مهام أسبوعية' : 'Weekly Tasks', unit: lang === 'ar' ? 'مهمة' : 'task' },
  ];

  const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  const MONTHS_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const months = lang === 'ar' ? MONTHS_AR : MONTHS_EN;

  // Calculate streak
  const streak = useMemo(() => {
    const dateSet = new Set(sessions.map(s => s.session_date));
    let count = 0;
    const d = new Date();
    // Check if today has sessions, if not start from yesterday
    const todayStr = d.toISOString().split('T')[0];
    if (!dateSet.has(todayStr)) {
      d.setDate(d.getDate() - 1);
    }
    while (true) {
      const dateStr = d.toISOString().split('T')[0];
      if (dateSet.has(dateStr)) {
        count++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }
    return count;
  }, [sessions]);

  // Days worked in selected month
  const daysWorked = useMemo(() => {
    const dateSet = new Set(
      sessions.filter(s => {
        const d = new Date(s.session_date);
        return d.getFullYear() === selectedYear && d.getMonth() + 1 === selectedMonth;
      }).map(s => s.session_date)
    );
    return dateSet.size;
  }, [sessions, selectedYear, selectedMonth]);

  // Chart data based on view
  const chartData = useMemo(() => {
    if (chartView === 'day') {
      const todayStr = new Date().toISOString().split('T')[0];
      const daySessions = sessions.filter(s => s.session_date === todayStr);
      const projectMap: Record<string, number> = {};
      daySessions.forEach(s => {
        const proj = actualProjects.find(p => p.id === s.project_id);
        const name = proj?.name || (lang === 'ar' ? 'بدون مشروع' : 'No Project');
        projectMap[name] = (projectMap[name] || 0) + s.duration;
      });
      return Object.entries(projectMap).map(([name, mins]) => ({
        name,
        hours: Math.round((mins / 60) * 10) / 10,
        minutes: mins,
        hasWork: mins > 0,
      }));
    }

    if (chartView === 'month') {
      if (selectedDay) {
        // Drill down to specific day - show hours per project
        const dayStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
        const daySessions = sessions.filter(s => s.session_date === dayStr);
        const projectMap: Record<string, number> = {};
        daySessions.forEach(s => {
          const proj = actualProjects.find(p => p.id === s.project_id);
          const name = proj?.name || (lang === 'ar' ? 'بدون مشروع' : 'No Project');
          projectMap[name] = (projectMap[name] || 0) + s.duration;
        });
        return Object.entries(projectMap).map(([name, mins]) => ({
          name,
          hours: Math.round((mins / 60) * 10) / 10,
          minutes: mins,
          hasWork: mins > 0,
        }));
      }
      // Month view - show hours per day
      const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
      const data: { name: string; hours: number; hasWork: boolean }[] = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const dayStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const daySessions = sessions.filter(s => s.session_date === dayStr);
        const totalMins = daySessions.reduce((acc, s) => acc + s.duration, 0);
        data.push({
          name: String(d),
          hours: Math.round((totalMins / 60) * 10) / 10,
          hasWork: totalMins > 0,
        });
      }
      return data;
    }

    // Year view - show hours per month
    const data: { name: string; hours: number; hasWork: boolean }[] = [];
    for (let m = 1; m <= 12; m++) {
      const monthSessions = sessions.filter(s => {
        const d = new Date(s.session_date);
        return d.getFullYear() === selectedYear && d.getMonth() + 1 === m;
      });
      const totalMins = monthSessions.reduce((acc, s) => acc + s.duration, 0);
      data.push({
        name: months[m - 1],
        hours: Math.round((totalMins / 60) * 10) / 10,
        hasWork: totalMins > 0,
      });
    }
    return data;
  }, [chartView, sessions, selectedYear, selectedMonth, selectedDay, actualProjects, lang, months]);

  const chartTitle = useMemo(() => {
    if (chartView === 'day') return t('goals.dailyChart');
    if (selectedDay) return `${t('goals.dailyChart')} - ${selectedDay} ${months[selectedMonth - 1]}`;
    if (chartView === 'month') return `${t('goals.monthlyChart')} ${months[selectedMonth - 1]} ${selectedYear}`;
    return `${t('goals.monthlyChart')} ${selectedYear}`;
  }, [chartView, selectedDay, selectedMonth, selectedYear, months, t]);

  const resetForm = () => {
    setGoalType('daily_hours');
    setTargetValue('');
    setGoalProjectId(null);
    setEditingGoal(null);
    setError('');
  };

  const openCreate = () => { resetForm(); setShowModal(true); };

  const openEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setGoalType(goal.goal_type);
    setTargetValue(goal.target_value.toString());
    setGoalProjectId(goal.project_id || null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetValue || parseFloat(targetValue) <= 0) { setError(t('goals.error')); return; }
    try {
      if (editingGoal) {
       const updated = await updateGoal(editingGoal.id, useAppStore.getState().userId || '', {
          goal_type: goalType,
          target_value: parseFloat(targetValue),
          project_id: goalProjectId,
        });
        updateGoalInStore(updated);
        addToast(t('toast.saved'), 'success');
      } else {
        const goal = await createGoal(useAppStore.getState().userId || '', {
          goal_type: goalType,
          target_value: parseFloat(targetValue),
          project_id: goalProjectId,
        });
        addGoal(goal);
        addToast(t('toast.success'), 'success');
      }
      setShowModal(false);
      resetForm();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`${lang === 'ar' ? 'خطأ' : 'Error'}: ${msg}`);
      addToast(t('toast.error'), 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('goals.deleteConfirm'))) return;
    try { await deleteGoal(id, useAppStore.getState().userId || ''); removeGoal(id); addToast(t('toast.deleted'), 'success'); } catch { addToast(t('toast.error'), 'error'); }
  };

  const getActualValue = (goal: Goal): number => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - ((dayOfWeek + 1) % 7));
    const startOfWeekStr = startOfWeek.toISOString().split('T')[0];

    let goalSessions = sessions;
    if (goal.project_id) {
      goalSessions = sessions.filter(s => s.project_id === goal.project_id);
    }

    if (goal.goal_type === 'daily_hours') {
      const daySessions = goalSessions.filter(s => s.session_date === today);
      return Math.round((daySessions.reduce((acc, s) => acc + s.duration, 0) / 60) * 10) / 10;
    }
    if (goal.goal_type === 'weekly_hours') {
      const weekSessions = goalSessions.filter(s => s.session_date >= startOfWeekStr);
      return Math.round((weekSessions.reduce((acc, s) => acc + s.duration, 0) / 60) * 10) / 10;
    }
    if (goal.goal_type === 'daily_tasks') {
      let goalTasks = tasks;
      if (goal.project_id) goalTasks = tasks.filter(t => t.project_id === goal.project_id);
      return goalTasks.filter(t => t.is_completed && t.updated_at && t.updated_at.startsWith(today)).length;
    }
    if (goal.goal_type === 'weekly_tasks') {
      let goalTasks = tasks;
      if (goal.project_id) goalTasks = tasks.filter(t => t.project_id === goal.project_id);
      return goalTasks.filter(t => t.is_completed && t.updated_at && t.updated_at >= startOfWeekStr).length;
    }
    return 0;
  };

  const getProgress = (goal: Goal): number => {
    const actual = getActualValue(goal);
    const target = goal.target_value;
    return target > 0 ? Math.min(Math.round((actual / target) * 100), 100) : 0;
  };

  const getGoalTypeInfo = (type: Goal['goal_type']) => GOAL_TYPES.find(g => g.value === type);
  const getProjectName = (pid: string | null) => pid ? projects.find(p => p.id === pid)?.name : null;

  const getGoalTypeStyle = (type: Goal['goal_type'], isCompleted: boolean, projectColor?: string | null) => {
    const completed = isCompleted;
    if (projectColor) {
      return {
        icon: type.includes('hours')
          ? <Clock size={20} />
          : type === 'daily_tasks'
            ? <CheckSquare size={20} />
            : <ListChecks size={20} />,
        bg: completed ? 'bg-emerald-50 dark:bg-emerald-950' : '',
        color: completed ? 'text-emerald-500' : '',
        projectColor: projectColor,
      };
    }
    const styles: Record<string, { icon: React.ReactNode; bg: string; color: string }> = {
      daily_hours: { icon: <Clock size={20} />, bg: completed ? 'bg-emerald-50 dark:bg-emerald-950' : 'bg-blue-50 dark:bg-blue-950', color: completed ? 'text-emerald-500' : 'text-blue-500' },
      weekly_hours: { icon: <TrendingUp size={20} />, bg: completed ? 'bg-emerald-50 dark:bg-emerald-950' : 'bg-purple-50 dark:bg-purple-950', color: completed ? 'text-emerald-500' : 'text-purple-500' },
      daily_tasks: { icon: <CheckSquare size={20} />, bg: completed ? 'bg-emerald-50 dark:bg-emerald-950' : 'bg-green-50 dark:bg-green-950', color: completed ? 'text-emerald-500' : 'text-green-500' },
      weekly_tasks: { icon: <ListChecks size={20} />, bg: completed ? 'bg-emerald-50 dark:bg-emerald-950' : 'bg-orange-50 dark:bg-orange-950', color: completed ? 'text-emerald-500' : 'text-orange-500' },
    };
    return { ...styles[type], projectColor: null };
  };

  if (settings?.enable_goals === false) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Target size={48} className="text-gray-300 dark:text-gray-600 mb-4" />
        <h2 className="text-lg font-semibold text-gray-400 dark:text-gray-500">{t('goals.disabled')}</h2>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{t('goals.disabledHint')}</p>
      </div>
    );
  }

  const tooltipStyle = {
    background: darkMode ? '#1e293b' : '#ffffff',
    border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
    borderRadius: '12px',
    color: darkMode ? '#f1f5f9' : '#1e293b',
    fontSize: '12px',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
  };

  const gridStroke = darkMode ? '#334155' : '#e2e8f0';
  const tickFill = darkMode ? '#94a3b8' : '#475569';
  const labelFill = darkMode ? '#94a3b8' : '#64748b';

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t('goals.title')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{t('goals.subtitle')}</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 dark:bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-slate-700 dark:hover:bg-blue-700 transition-colors">
          <Plus size={16} />{t('goals.newGoal')}
        </button>
      </div>

      {/* Streak & Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <motion.div whileHover={{ scale: 1.02 }} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-100 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">{t('dash.streak')}</span>
            <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950 flex items-center justify-center">
              <Flame size={18} className="text-orange-500" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{streak}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('dash.streakDesc')}</p>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-100 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">{t('goals.daysWorked')}</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center">
              <Calendar size={18} className="text-emerald-500" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{daysWorked}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{months[selectedMonth - 1]} {selectedYear}</p>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-100 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">{t('goals.hoursPerDay')}</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center">
              <TrendingUp size={18} className="text-blue-500" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">
            {daysWorked > 0 ? (() => {
              const monthSessions = sessions.filter(s => {
                const d = new Date(s.session_date);
                return d.getFullYear() === selectedYear && d.getMonth() + 1 === selectedMonth;
              });
              return (monthSessions.reduce((acc, s) => acc + s.duration, 0) / 60 / daysWorked).toFixed(1);
            })() : '0'}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('goals.hoursPerDay')}</p>
        </motion.div>
      </div>

      {/* Goal Chart */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700 shadow-sm mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{chartTitle}</h2>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              {chartView === 'month' && !selectedDay && t('goals.clickDay')}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {/* View Toggle */}
            <div className="flex gap-1 bg-gray-100 dark:bg-slate-700 rounded-lg p-0.5">
              {(['day', 'month', 'year'] as ChartView[]).map(v => (
                <button key={v} onClick={() => { setChartView(v); setSelectedDay(null); }} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${chartView === v && !(v === 'month' && selectedDay) ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
                  {t(`goals.${v}View`)}
                </button>
              ))}
            </div>
            {/* Year/Month selectors */}
            {(chartView === 'month' || chartView === 'year') && (
              <>
                <select value={selectedYear} onChange={(e) => { setSelectedYear(parseInt(e.target.value)); setSelectedDay(null); }} className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 text-sm bg-white dark:bg-slate-700 focus:outline-none text-slate-800 dark:text-slate-100">
                  {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                {chartView === 'month' && (
                  <select value={selectedMonth} onChange={(e) => { setSelectedMonth(parseInt(e.target.value)); setSelectedDay(null); }} className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 text-sm bg-white dark:bg-slate-700 focus:outline-none text-slate-800 dark:text-slate-100">
                    {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                )}
              </>
            )}
            {selectedDay && (
              <button onClick={() => setSelectedDay(null)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                <X size={12} />{lang === 'ar' ? 'رجوع للشهر' : 'Back to month'}
              </button>
            )}
          </div>
        </div>

        {chartData.length === 0 ? (
          <div className="h-52 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">{t('analytics.noData')}</div>
        ) : (
          <div className="h-72 w-full overflow-x-auto">
            <ResponsiveContainer width="100%" height={240} minWidth={selectedDay || chartView === 'day' ? 300 : chartData.length * 30}>
              <BarChart data={chartData} barSize={selectedDay || chartView === 'day' ? 32 : chartData.length > 20 ? 8 : 18}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: tickFill, fontSize: 11 }} interval={selectedDay || chartView === 'day' ? 0 : Math.floor(chartData.length / 10)} label={{ value: selectedDay || chartView === 'day' ? (lang === 'ar' ? 'المشروع' : 'Project') : (chartView === 'month' ? (lang === 'ar' ? 'اليوم' : 'Day') : (lang === 'ar' ? 'الشهر' : 'Month')), position: 'insideBottom', offset: -5, style: { fill: labelFill, fontSize: 11 } }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: tickFill, fontSize: 11 }} allowDecimals={false} label={{ value: lang === 'ar' ? 'ساعة' : 'Hours', angle: -90, position: 'insideLeft', offset: -5, style: { fill: labelFill, fontSize: 11 } }} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${value}h`, t('analytics.time')]} cursor={{ fill: darkMode ? 'rgba(148, 163, 184, 0.1)' : 'rgba(30, 41, 59, 0.05)' }} />
                <Bar dataKey="hours" radius={[6, 6, 0, 0]} onClick={(data) => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  if (chartView === 'month' && !selectedDay && (data as any).hasWork) {
                    setSelectedDay(parseInt(String(data.name)));
                  }
                }} cursor={chartView === 'month' && !selectedDay ? 'pointer' : undefined}>
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={entry.hasWork !== false ? COLORS[index % COLORS.length] : (darkMode ? '#334155' : '#e2e8f0')} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Goals List */}
      {goals.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-12 text-center">
          <Target size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-semibold text-gray-400 dark:text-gray-500">{t('goals.noGoals')}</h3>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{t('goals.noGoalsHint')}</p>
          <button onClick={openCreate} className="mt-4 px-4 py-2 bg-slate-800 dark:bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-slate-700 dark:hover:bg-blue-700 transition-colors">{t('goals.newGoal')}</button>
        </div>
      ) : (
        <div className="space-y-4">
          {goals.map((goal) => {
            const progress = getProgress(goal);
            const actual = getActualValue(goal);
            const info = getGoalTypeInfo(goal.goal_type);
            const isCompleted = progress >= 100;
            const projName = getProjectName(goal.project_id);
            const proj = goal.project_id ? projects.find(p => p.id === goal.project_id) : null;
            const style = getGoalTypeStyle(goal.goal_type, isCompleted, proj?.color);

            return (
              <motion.div key={goal.id} whileHover={{ scale: 1.005 }} className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${style.bg || (isCompleted ? 'bg-emerald-50 dark:bg-emerald-950' : 'bg-blue-50 dark:bg-blue-950')}`} style={style.projectColor ? { backgroundColor: `${style.projectColor}15` } : undefined}>
                      <span className={style.color || (isCompleted ? 'text-emerald-500' : 'text-blue-500')} style={style.projectColor ? { color: isCompleted ? '#10b981' : style.projectColor } : undefined}>{style.icon}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800 dark:text-slate-100">{info?.label}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-gray-400 dark:text-gray-500">{t('goals.target')}: {goal.target_value} {info?.unit}</p>
                        {projName && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-gray-300">{projName}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(goal)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"><Edit3 size={14} className="text-gray-400 dark:text-gray-500" /></button>
                    <button onClick={() => handleDelete(goal.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 transition-colors"><Trash2 size={14} className="text-red-400" /></button>
                  </div>
                </div>
                <div className="mb-2">
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className={`font-medium ${isCompleted ? 'text-emerald-600' : 'text-slate-700 dark:text-slate-200'}`}>{actual} / {goal.target_value} {info?.unit}</span>
                    <span className={`font-bold ${isCompleted ? 'text-emerald-600' : 'text-slate-800 dark:text-slate-100'}`}>{progress}%</span>
                  </div>
                  <div className="h-3 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} className={`h-full rounded-full ${isCompleted ? 'bg-emerald-500' : 'bg-slate-800 dark:bg-blue-600'}`} />
                  </div>
                </div>
                {isCompleted && <p className="text-xs text-emerald-600 mt-2">{t('goals.completed')}</p>}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/30 dark:bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-xl border border-gray-100 dark:border-slate-700">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{editingGoal ? t('goals.editGoal') : t('goals.newGoal')}</h2>
                <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"><X size={18} className="text-gray-400 dark:text-gray-500" /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">{t('goals.type')}</label>
                  <select value={goalType} onChange={(e) => setGoalType(e.target.value as Goal['goal_type'])} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 text-sm bg-white dark:bg-slate-700 focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 text-slate-800 dark:text-slate-100">
                    {GOAL_TYPES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">{t('goals.project')}</label>
                  <select value={goalProjectId || ''} onChange={(e) => setGoalProjectId(e.target.value || null)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 text-sm bg-white dark:bg-slate-700 focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 text-slate-800 dark:text-slate-100">
                    <option value="">{t('goals.noProject')}</option>
                    {actualProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">{t('goals.target')} ({getGoalTypeInfo(goalType)?.unit})</label>
                  <input type="number" value={targetValue} onChange={(e) => { setTargetValue(e.target.value); setError(''); }} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 text-slate-800 dark:text-slate-100" placeholder={t('goals.targetPlaceholder')} min="0" step="0.5" autoFocus />
                  {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" className="flex-1 py-2.5 bg-slate-800 dark:bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-slate-700 dark:hover:bg-blue-700 transition-colors">{editingGoal ? t('proj.save') : t('goals.createGoal')}</button>
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2.5 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">{t('proj.cancel')}</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
