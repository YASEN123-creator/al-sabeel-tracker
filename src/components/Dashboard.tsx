'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Clock, FolderPlus, Play, Calendar } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { useT } from '@/lib/i18n';
import { SkeletonGrid, SkeletonChart } from '@/components/Skeleton';

const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function Dashboard() {
  const { sessions, projects, tasks, setActiveView, dataLoading, darkMode } = useAppStore();
  const t = useT();
  const lang = useAppStore(s => s.language || 'ar');

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());

  const months = lang === 'ar' ? MONTHS_AR : MONTHS_EN;

  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      const d = new Date(s.session_date);
      if (d.getFullYear() !== selectedYear) return false;
      if (d.getMonth() + 1 !== selectedMonth) return false;
      if (selectedDay && d.getDate() !== selectedDay) return false;
      return true;
    });
  }, [sessions, selectedYear, selectedMonth, selectedDay]);

  const filteredMinutes = filteredSessions.reduce((acc, s) => acc + s.duration, 0);
  const filteredHours = (filteredMinutes / 60).toFixed(1);

  const todaySessions = sessions.filter(s => s.session_date === todayStr);
  const todayMinutes = todaySessions.reduce((acc, s) => acc + s.duration, 0);
  const todayHours = Math.floor(todayMinutes / 60);
  const todayMins = todayMinutes % 60;

  const monthSessions = useMemo(() => {
    return sessions.filter(s => {
      const d = new Date(s.session_date);
      return d.getFullYear() === selectedYear && d.getMonth() + 1 === selectedMonth;
    });
  }, [sessions, selectedYear, selectedMonth]);

  const monthMinutes = monthSessions.reduce((acc, s) => acc + s.duration, 0);

  const filteredProjectIds = new Set<string>(filteredSessions.map(s => s.project_id).filter((id): id is string => Boolean(id)));

  const completedTasks = tasks.filter((t) => t.is_completed).length;
  const totalTasks = tasks.length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Chart data based on filter
  const chartData = useMemo(() => {
    const actualProjects = projects.filter(p => !p.is_folder);

    if (selectedDay) {
      // Single day - show hours per project
      const projectMap: Record<string, number> = {};
      filteredSessions.forEach(s => {
        const proj = actualProjects.find(p => p.id === s.project_id);
        const name = proj?.name || (lang === 'ar' ? 'بدون مشروع' : 'No Project');
        projectMap[name] = (projectMap[name] || 0) + s.duration;
      });
      return Object.entries(projectMap).map(([name, mins]) => ({
        name,
        hours: Math.round((mins / 60) * 10) / 10,
      }));
    } else {
      // Month view - show hours per day
      const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
      const data: { name: string; hours: number }[] = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const dayStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const daySessions = monthSessions.filter(s => s.session_date === dayStr);
        const hours = Math.round((daySessions.reduce((acc, s) => acc + s.duration, 0) / 60) * 10) / 10;
        data.push({ name: String(d), hours });
      }
      return data;
    }
  }, [filteredSessions, selectedDay, selectedMonth, selectedYear, monthSessions, projects, lang]);

  const chartTitle = selectedDay
    ? `${t('dash.dayChartTitle')} ${selectedDay} ${months[selectedMonth - 1]}`
    : `${t('dash.monthChartTitle')} ${months[selectedMonth - 1]} ${selectedYear}`;

  const actualProjects = projects.filter(p => !p.is_folder);

  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t('dash.title')}</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">{t('dash.subtitle')}</p>
      </div>

      {dataLoading ? (
        <>
          <SkeletonGrid />
          <div className="mt-6"><SkeletonChart /></div>
          <div className="mt-6"><SkeletonChart /></div>
        </>
      ) : (
        <>
          {/* Date Filter */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-100 dark:border-slate-700 shadow-sm mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Calendar size={16} className="text-gray-400 dark:text-gray-500" />
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('dash.filter')}</h3>
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-600 text-sm bg-white dark:bg-slate-700 focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 text-slate-800 dark:text-slate-100">
                {Array.from({ length: 6 }, (_, i) => today.getFullYear() - 2 + i).map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <select value={selectedMonth} onChange={(e) => { setSelectedMonth(parseInt(e.target.value)); setSelectedDay(null); }} className="px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-600 text-sm bg-white dark:bg-slate-700 focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 text-slate-800 dark:text-slate-100">
                {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
              <select value={selectedDay || ''} onChange={(e) => setSelectedDay(e.target.value ? parseInt(e.target.value) : null)} className="px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-600 text-sm bg-white dark:bg-slate-700 focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 text-slate-800 dark:text-slate-100">
                <option value="">{t('dash.allDays')}</option>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <button onClick={() => { setSelectedDay(today.getDate()); setSelectedMonth(today.getMonth() + 1); setSelectedYear(today.getFullYear()); }} className="text-xs text-slate-600 dark:text-gray-300 hover:text-slate-800 dark:hover:text-slate-100 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                {lang === 'ar' ? 'اليوم' : 'Today'}
              </button>
            </div>

            {/* Filtered Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              <div className="bg-gray-50 dark:bg-slate-900 rounded-xl p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">{selectedDay ? t('dash.dayHours') : t('dash.monthHours')}</p>
                <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{filteredHours}h</p>
              </div>
              <div className="bg-gray-50 dark:bg-slate-900 rounded-xl p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">{selectedDay ? t('dash.daySessions') : t('dash.monthSessions')}</p>
                <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{filteredSessions.length}</p>
              </div>
              <div className="bg-gray-50 dark:bg-slate-900 rounded-xl p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('dash.projectsWorked')}</p>
                <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{filteredProjectIds.size}</p>
              </div>
              <div className="bg-gray-50 dark:bg-slate-900 rounded-xl p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('dash.monthHours')}</p>
                <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{(monthMinutes / 60).toFixed(1)}h</p>
              </div>
            </div>

            {/* Projects worked on */}
            {filteredProjectIds.size > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {[...filteredProjectIds].map((pid: string) => {
                  const p = actualProjects.find(proj => proj.id === pid);
                  if (!p) return null;
                  return (
                    <span key={pid} className="inline-flex items-center gap-1 text-xs bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 px-2.5 py-1 rounded-full">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color || '#94a3b8' }} />
                      {p.name}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <motion.div whileHover={{ scale: 1.02 }} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-100 dark:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-500 dark:text-gray-400">{t('dash.todayTime')}</span>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center"><Clock size={18} className="text-emerald-600" /></div>
              </div>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{todayHours}h {todayMins}m</p>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-100 dark:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-500 dark:text-gray-400">{t('dash.projects')}</span>
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center"><FolderPlus size={18} className="text-blue-600" /></div>
              </div>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{actualProjects.length}</p>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-100 dark:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-500 dark:text-gray-400">{t('dash.completedTasks')}</span>
                <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950 flex items-center justify-center"><Play size={18} className="text-purple-600" /></div>
              </div>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{completedTasks}/{totalTasks}</p>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-100 dark:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-500 dark:text-gray-400">{t('dash.completionRate')}</span>
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950 flex items-center justify-center"><TargetIcon size={18} className="text-amber-600" /></div>
              </div>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{completionRate}%</p>
            </motion.div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-3 mb-8">
            <button onClick={() => setActiveView('sessions')} className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 dark:bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-slate-700 dark:hover:bg-blue-700 transition-colors"><Play size={16} />{t('dash.startSession')}</button>
            <button onClick={() => setActiveView('projects')} className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-xl text-sm font-medium border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"><FolderPlus size={16} />{t('dash.addProject')}</button>
          </div>

          {/* Chart - Connected to Filter */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700 shadow-sm mb-8">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-1">{chartTitle}</h2>
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
              {selectedDay
                ? (lang === 'ar' ? 'عدد الساعات لكل مشروع في هذا اليوم' : 'Hours per project on this day')
                : (lang === 'ar' ? 'عدد الساعات التي عملتها كل يوم خلال الشهر' : 'Hours worked per day during the month')}
            </p>
            {chartData.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">{t('dash.noFilteredSessions')}</div>
            ) : (
              <div className="h-56 w-full overflow-x-auto">
                <ResponsiveContainer width="100%" height={220} minWidth={selectedDay ? 300 : chartData.length * 30}>
                  <BarChart data={chartData} barSize={selectedDay ? 32 : chartData.length > 20 ? 8 : 18}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? '#334155' : '#e2e8f0'} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: darkMode ? '#94a3b8' : '#475569', fontSize: 11 }} interval={selectedDay ? 0 : Math.floor(chartData.length / 10)} label={{ value: selectedDay ? (lang === 'ar' ? 'المشروع' : 'Project') : (lang === 'ar' ? 'اليوم' : 'Day'), position: 'insideBottom', offset: -5, style: { fill: darkMode ? '#94a3b8' : '#64748b', fontSize: 11 } }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: darkMode ? '#94a3b8' : '#475569', fontSize: 11 }} allowDecimals={false} label={{ value: lang === 'ar' ? 'ساعة' : 'Hours', angle: -90, position: 'insideLeft', offset: -5, style: { fill: darkMode ? '#94a3b8' : '#64748b', fontSize: 11 } }} />
                    <Tooltip contentStyle={{
                      background: darkMode ? '#1e293b' : '#ffffff',
                      border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
                      borderRadius: '12px',
                      color: darkMode ? '#f1f5f9' : '#1e293b',
                      fontSize: '12px',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                    }} formatter={(value) => [`${value} ${t('analytics.hour')}`, t('analytics.time')]} cursor={{ fill: darkMode ? 'rgba(148, 163, 184, 0.1)' : 'rgba(30, 41, 59, 0.05)' }} />
                    <Bar dataKey="hours" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Filtered Sessions */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">{t('dash.filteredSessions')}</h2>
            {filteredSessions.length === 0 ? (
              <p className="text-gray-400 dark:text-gray-500 text-sm py-8 text-center">{t('dash.noFilteredSessions')}</p>
            ) : (
              <div className="space-y-3">
                {filteredSessions.slice(0, 20).map((session) => {
                  const project = projects.find((p) => p.id === session.project_id);
                  const task = tasks.find((t) => t.id === session.task_id);
                  const hours = Math.floor(session.duration / 60);
                  const mins = session.duration % 60;
                  return (
                    <motion.div key={session.id} whileHover={{ scale: 1.005 }} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: project?.color || '#94a3b8' }} />
                        <div>
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{project?.name || t('dash.noProject')}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-gray-400 dark:text-gray-500">{session.session_date}</p>
                            {task && <p className="text-xs text-blue-500 dark:text-blue-400">{task.title}</p>}
                          </div>
                        </div>
                      </div>
                      <span className="text-sm font-medium text-slate-600 dark:text-gray-300">{hours > 0 ? `${hours}h ` : ''}{mins}m</span>
                    </motion.div>
                  );
                })}
                {filteredSessions.length > 20 && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 text-center pt-2">
                    {lang === 'ar' ? `عرض 20 من ${filteredSessions.length} جلسة` : `Showing 20 of ${filteredSessions.length} sessions`}
                  </p>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </motion.div>
  );
}

function TargetIcon({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
    </svg>
  );
}
