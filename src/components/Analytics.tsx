'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  Tooltip, PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import { useAppStore } from '@/lib/store';
import { useT } from '@/lib/i18n';
import { Filter, X } from 'lucide-react';

const COLORS = ['#4f46e5', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
const BRIGHT_COLORS = ['#818cf8', '#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#f472b6', '#22d3ee'];

type FilterRange = '30' | '90' | '120' | '365';

export default function Analytics() {
  const { sessions, projects, tasks, settings, darkMode } = useAppStore();
  const t = useT();
  const lang = useAppStore(s => s.language || 'ar');
  const [filter, setFilter] = useState<FilterRange>('30');
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');

  // Only actual projects (not folders)
  const actualProjects = projects.filter(p => !p.is_folder);

  // Toggle project selection
  const toggleProject = (projectId: string) => {
    setSelectedProjectIds(prev => {
      if (prev.includes(projectId)) {
        return prev.filter(id => id !== projectId);
      }
      return [...prev, projectId];
    });
  };

  // Clear all filters
  const clearProjectFilter = () => {
    setSelectedProjectIds([]);
  };

  // Select all projects
  const selectAllProjects = () => {
    setSelectedProjectIds(actualProjects.map(p => p.id));
  };

  // Filter sessions by date range AND selected projects
  const filteredSessions = useMemo(() => {
    const now = new Date();
    const days = parseInt(filter);
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    return sessions.filter((s) => {
      if (s.session_date < cutoffStr) return false;
      if (selectedProjectIds.length > 0 && !selectedProjectIds.includes(s.project_id || '')) return false;
      return true;
    });
  }, [sessions, filter, selectedProjectIds]);

  const totalMinutes = filteredSessions.reduce((acc, s) => acc + s.duration, 0);
  const totalHours = (totalMinutes / 60).toFixed(1);
  const avgDailyHours = filteredSessions.length > 0
    ? ((totalMinutes / 60) / parseInt(filter)).toFixed(1)
    : '0';

  // Daily hours chart - stacked by project
  const dailyHoursData = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    filteredSessions.forEach((s) => {
      if (!map[s.session_date]) map[s.session_date] = {};
      const project = projects.find(p => p.id === s.project_id);
      const name = project?.name || (lang === 'ar' ? 'بدون مشروع' : 'No Project');
      if (!map[s.session_date][name]) map[s.session_date][name] = 0;
      map[s.session_date][name] += s.duration;
    });

    // Get unique project names
    const projectNames = new Set<string>();
    Object.values(map).forEach(dayMap => {
      Object.keys(dayMap).forEach(name => projectNames.add(name));
    });

    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, dayMap]) => {
        const entry: Record<string, string | number> = {
          name: new Date(date).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' }),
        };
        let totalDay = 0;
        Object.entries(dayMap).forEach(([projName, mins]) => {
          entry[projName] = Math.round((mins / 60) * 10) / 10;
          totalDay += mins;
        });
        entry[t('analytics.totalLabel')] = Math.round((totalDay / 60) * 10) / 10;
        return entry;
      });
  }, [filteredSessions, projects, lang, t]);

  // Get the project names used in daily chart
  const dailyProjectNames = useMemo(() => {
    const names = new Set<string>();
    dailyHoursData.forEach(entry => {
      Object.keys(entry).forEach(key => {
        if (key !== 'name' && key !== t('analytics.totalLabel')) names.add(key);
      });
    });
    return Array.from(names);
  }, [dailyHoursData, t]);

  // Get color for a project name - ensure visibility in dark mode
  const getProjectColor = useCallback((name: string) => {
    const project = projects.find(p => p.name === name);
    if (project?.color) {
      // In dark mode, avoid very dark colors that blend with background
      if (darkMode) {
        const darkColors = ['#1E293B', '#334155', '#0f172a', '#1e293b', '#111827', '#1f2937', '#374151', '#1e3a5f'];
        const color = project.color;
        if (color && darkColors.some(dc => color.toLowerCase() === dc.toLowerCase())) {
          const idx = dailyProjectNames.indexOf(name);
          return BRIGHT_COLORS[idx % BRIGHT_COLORS.length];
        }
      }
      return project.color;
    }
    const idx = dailyProjectNames.indexOf(name);
    return COLORS[idx % COLORS.length];
  }, [projects, dailyProjectNames, darkMode]);

  // Sessions per day chart
  const sessionsPerDayData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredSessions.forEach((s) => {
      if (!map[s.session_date]) map[s.session_date] = 0;
      map[s.session_date] += 1;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({
        name: new Date(date).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' }),
        sessions: count,
      }));
  }, [filteredSessions, lang]);

  // Project distribution
  const projectDistribution = useMemo(() => {
    const map: Record<string, number> = {};
    filteredSessions.forEach((s) => {
      const project = projects.find(p => p.id === s.project_id);
      const name = project?.name || (lang === 'ar' ? 'بدون مشروع' : 'No Project');
      if (!map[name]) map[name] = 0;
      map[name] += s.duration;
    });
    return Object.entries(map).map(([name, minutes]) => {
      const project = projects.find(p => p.name === name);
      const color = project?.color || COLORS[Object.keys(map).indexOf(name) % COLORS.length];
      return {
        name,
        value: Math.round((minutes / 60) * 10) / 10,
        color,
      };
    });
  }, [filteredSessions, projects, lang]);

  // Task completion stats
  const completedInPeriod = tasks.filter((task) => {
    if (!task.is_completed || !task.updated_at) return false;
    const now = new Date();
    const days = parseInt(filter);
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return new Date(task.updated_at) >= cutoff;
  }).length;

  // Task completion stats filtered by selected projects
  const completedTasksFiltered = selectedProjectIds.length > 0
    ? tasks.filter(task => {
        if (!task.is_completed || !task.updated_at) return false;
        if (!selectedProjectIds.includes(task.project_id || '')) return false;
        const now = new Date();
        const days = parseInt(filter);
        const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        return new Date(task.updated_at) >= cutoff;
      }).length
    : completedInPeriod;

  if (settings?.enable_analytics === false) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <BarChart3Icon size={48} className="text-gray-300 dark:text-gray-600 mb-4" />
        <h2 className="text-lg font-semibold text-gray-400 dark:text-gray-500">{t('analytics.disabled')}</h2>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{t('analytics.disabledHint')}</p>
      </div>
    );
  }

  const isFilteringByProject = selectedProjectIds.length > 0;

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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t('analytics.title')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{t('analytics.subtitle')}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {([['30', t('analytics.30days')], ['90', t('analytics.90days')], ['120', t('analytics.120days')], ['365', t('analytics.365days')]] as const).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFilter(val as FilterRange)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === val
                  ? 'bg-slate-800 dark:bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Project Filter */}
      {actualProjects.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-100 dark:border-slate-700 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-gray-400 dark:text-gray-500" />
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('analytics.filter')}</h3>
              {isFilteringByProject && (
                <span className="text-xs bg-slate-800 dark:bg-blue-600 text-white px-2 py-0.5 rounded-full">
                  {selectedProjectIds.length} {t('analytics.selected')}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {actualProjects.length > 1 && (
                <>
                  <button
                    onClick={selectAllProjects}
                    className="text-xs text-slate-600 dark:text-gray-300 hover:text-slate-800 dark:hover:text-slate-100 transition-colors px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700"
                  >
                    {t('analytics.selectAll')}
                  </button>
                  {isFilteringByProject && (
                    <button
                      onClick={clearProjectFilter}
                      className="text-xs text-red-500 hover:text-red-700 transition-colors px-2 py-1 rounded-md hover:bg-red-50 dark:hover:bg-red-950"
                    >
                      {t('analytics.clearAll')}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* All projects button */}
            <button
              onClick={clearProjectFilter}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                !isFilteringByProject
                  ? 'bg-slate-800 dark:bg-blue-600 text-white border-slate-800 dark:border-blue-600'
                  : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700'
              }`}
            >
              {!isFilteringByProject && <span className="text-emerald-400">✓</span>}
              {t('analytics.all')}
            </button>
            {actualProjects.map((project) => {
              const isSelected = selectedProjectIds.includes(project.id);
              return (
                <button
                  key={project.id}
                  onClick={() => toggleProject(project.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                    isSelected
                      ? 'border-slate-800 dark:border-blue-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700'
                  }`}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: project.color || '#94a3b8' }}
                  />
                  {isSelected && <span className="text-emerald-500 font-bold">✓</span>}
                  {project.name}
                  {isSelected && (
                    <X size={10} className="text-gray-400 dark:text-gray-500 mr-0.5" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Chart Type Toggle */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-sm text-gray-500 dark:text-gray-400">{t('analytics.chartType')}:</span>
        <div className="flex gap-1 bg-gray-100 dark:bg-slate-700 rounded-lg p-0.5">
          <button onClick={() => setChartType('bar')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${chartType === 'bar' ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
            {t('analytics.bar')}
          </button>
          <button onClick={() => setChartType('pie')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${chartType === 'pie' ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
            {t('analytics.pie')}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-100 dark:border-slate-700 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            {isFilteringByProject ? t('analytics.selectedHours') : t('analytics.totalHours')}
          </p>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{totalHours}h</p>
          {isFilteringByProject && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {t('analytics.from')} {((sessions.reduce((acc, s) => acc + s.duration, 0)) / 60).toFixed(1)}h {t('analytics.total')}
            </p>
          )}
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-100 dark:border-slate-700 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t('analytics.avgDaily')}</p>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{avgDailyHours}h</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-100 dark:border-slate-700 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            {isFilteringByProject ? t('analytics.selectedTasks') : t('analytics.completedTasks')}
          </p>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{isFilteringByProject ? completedTasksFiltered : completedInPeriod}</p>
        </div>
      </div>

      {/* Time Per Project - Bar or Pie based on chartType */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700 shadow-sm mb-6">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-1">{t('analytics.distribution')}</h2>
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">{t('analytics.distributionDesc')}</p>
        {projectDistribution.length === 0 ? (
          <div className="h-52 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">{t('analytics.noData')}</div>
        ) : chartType === 'bar' ? (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={100}>
              <BarChart data={projectDistribution} barSize={36}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: tickFill, fontSize: 12, fontWeight: 500 }} label={{ value: lang === 'ar' ? 'المشروع' : 'Project', position: 'insideBottom', offset: -5, style: { fill: labelFill, fontSize: 11 } }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: tickFill, fontSize: 11 }} allowDecimals={false} label={{ value: lang === 'ar' ? 'ساعة' : 'Hours', angle: -90, position: 'insideLeft', offset: -5, style: { fill: labelFill, fontSize: 11 } }} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value) => [`${value} ${t('analytics.hour')}`, t('analytics.time')]}
                  cursor={{ fill: darkMode ? 'rgba(148, 163, 184, 0.1)' : 'rgba(30, 41, 59, 0.05)' }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {projectDistribution.map((item, index) => (
                    <Cell key={`cell-${index}`} fill={item.color || COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 w-full flex items-center">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={100}>
              <PieChart>
                <Pie
                  data={projectDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={85}
                  dataKey="value"
                  paddingAngle={3}
                >
                  {projectDistribution.map((item, index) => (
                    <Cell key={`cell-${index}`} fill={item.color || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value) => [`${value} ${t('analytics.hour')}`, t('analytics.time')]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mr-4 min-w-[160px]">
              {projectDistribution.map((item) => {
                const totalVal = projectDistribution.reduce((acc, d) => acc + d.value, 0);
                const pct = totalVal > 0 ? Math.round((item.value / totalVal) * 100) : 0;
                return (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color || '#94a3b8' }} />
                    <span className="text-xs text-gray-600 dark:text-gray-300 truncate">{item.name}</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 mr-auto">{pct}%</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">{item.value}h</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Daily Hours Chart - Stacked by project when filtering */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700 shadow-sm mb-6">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-1">
          {isFilteringByProject ? t('analytics.dailyByProject') : t('analytics.dailyHours')}
        </h2>
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">{isFilteringByProject ? (lang === 'ar' ? 'عدد الساعات اليومية لكل مشروع خلال الفترة المحددة' : 'Daily hours per project in selected period') : (lang === 'ar' ? 'عدد الساعات التي عملتها كل يوم خلال الفترة المحددة' : 'Hours worked per day in selected period')}</p>
        {dailyHoursData.length === 0 ? (
          <div className="h-52 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">{t('analytics.noData')}</div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={100}>
              <BarChart data={dailyHoursData} barSize={dailyHoursData.length > 20 ? 12 : dailyProjectNames.length > 1 ? 20 : 28}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: tickFill, fontSize: 11 }} interval={Math.floor(dailyHoursData.length / 7)} label={{ value: lang === 'ar' ? 'التاريخ' : 'Date', position: 'insideBottom', offset: -5, style: { fill: labelFill, fontSize: 11 } }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: tickFill, fontSize: 11 }} allowDecimals={false} label={{ value: lang === 'ar' ? 'ساعة' : 'Hours', angle: -90, position: 'insideLeft', offset: -5, style: { fill: labelFill, fontSize: 11 } }} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value, name) => [`${value} ${t('analytics.hour')}`, name]}
                  cursor={{ fill: darkMode ? 'rgba(148, 163, 184, 0.1)' : 'rgba(30, 41, 59, 0.05)' }}
                />
                {dailyProjectNames.length > 1 ? (
                  <>
                    {dailyProjectNames.map((projName) => (
                      <Bar
                        key={projName}
                        dataKey={projName}
                        stackId="a"
                        fill={getProjectColor(projName)}
                        radius={[4, 4, 0, 0] as [number, number, number, number]}
                      />
                    ))}
                    <Legend
                      verticalAlign="top"
                      height={36}
                      formatter={(value) => (
                        <span style={{ color: labelFill, fontSize: '12px' }}>{value}</span>
                      )}
                    />
                  </>
                ) : (
                  <Bar dataKey={dailyProjectNames[0] || 'hours'} fill={darkMode ? '#6366f1' : '#1E293B'} radius={[6, 6, 0, 0]} />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Sessions per Day */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-1">{t('analytics.sessionsDay')}</h2>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">{lang === 'ar' ? 'عدد الجلسات التي عملتها كل يوم' : 'Number of sessions completed per day'}</p>
          {sessionsPerDayData.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">{t('analytics.noData')}</div>
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={100}>
                <AreaChart data={sessionsPerDayData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: tickFill, fontSize: 11 }} interval={Math.floor(sessionsPerDayData.length / 7)} label={{ value: lang === 'ar' ? 'التاريخ' : 'Date', position: 'insideBottom', offset: -5, style: { fill: labelFill, fontSize: 11 } }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: tickFill, fontSize: 11 }} allowDecimals={false} label={{ value: lang === 'ar' ? 'جلسة' : 'Sessions', angle: -90, position: 'insideLeft', offset: -5, style: { fill: labelFill, fontSize: 11 } }} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value) => [`${value} ${t('analytics.session')}`, t('analytics.sessionsDay')]}
                  />
                  <Area type="monotone" dataKey="sessions" stroke="#4f46e5" fill="url(#areaGradient)" strokeWidth={2.5} dot={{ fill: '#4f46e5', r: 4, strokeWidth: 2, stroke: darkMode ? '#1e293b' : '#fff' }} activeDot={{ r: 6, fill: '#4f46e5', strokeWidth: 2, stroke: darkMode ? '#1e293b' : '#fff' }} />
                  <defs>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Project Distribution Pie (always shown as pie in the grid) */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-1">{t('analytics.timePerProject')}</h2>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">{lang === 'ar' ? 'نسبة الوقت المستغرق في كل مشروع' : 'Percentage of time spent on each project'}</p>
          {projectDistribution.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">{t('analytics.noData')}</div>
          ) : (
            <div className="h-52 w-full flex items-center">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={100}>
                <PieChart>
                  <Pie
                    data={projectDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={85}
                    dataKey="value"
                    paddingAngle={3}
                  >
                    {projectDistribution.map((item, index) => (
                      <Cell key={`cell-${index}`} fill={item.color || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value) => [`${value} ${t('analytics.hour')}`, t('analytics.time')]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mr-4 min-w-[160px]">
                {projectDistribution.map((item) => {
                  const totalVal = projectDistribution.reduce((acc, d) => acc + d.value, 0);
                  const pct = totalVal > 0 ? Math.round((item.value / totalVal) * 100) : 0;
                  return (
                    <div key={item.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color || '#94a3b8' }} />
                      <span className="text-xs text-gray-600 dark:text-gray-300 truncate">{item.name}</span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100 mr-auto">{pct}%</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">{item.value}h</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function BarChart3Icon({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" />
    </svg>
  );
}
