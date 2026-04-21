'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Edit3, X, CheckCircle2, Circle, Filter, Search, Repeat } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { createTask, updateTask, deleteTask } from '@/lib/api';
import type { Task } from '@/lib/types';
import { useT } from '@/lib/i18n';
import { SkeletonList } from '@/components/Skeleton';

// Day order: for Arabic (Sat-first) and English (Sun-first)
const DAY_KEYS_AR = [6, 0, 1, 2, 3, 4, 5]; // Sat, Sun, Mon, Tue, Wed, Thu, Fri
const DAY_KEYS_EN = [0, 1, 2, 3, 4, 5, 6]; // Sun, Mon, Tue, Wed, Thu, Fri, Sat

const DAY_LABEL_KEYS = [
  'tasks.daySun', // 0
  'tasks.dayMon', // 1
  'tasks.dayTue', // 2
  'tasks.dayWed', // 3
  'tasks.dayThu', // 4
  'tasks.dayFri', // 5
  'tasks.daySat', // 6
];

export default function Tasks() {
  const t = useT();
  const lang = useAppStore(s => s.language || 'ar');
  const { tasks, projects, addTask, updateTask: updateTaskInStore, removeTask, dataLoading, addToast } = useAppStore();
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringDays, setRecurringDays] = useState<number[]>([]);
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [error, setError] = useState('');

  const resetForm = () => { setTitle(''); setDescription(''); setProjectId(null); setDueDate(''); setIsRecurring(false); setRecurringDays([]); setEditingTask(null); setError(''); };
  const openCreate = () => { resetForm(); setShowModal(true); };
  const openEdit = (task: Task) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description || '');
    setProjectId(task.project_id);
    setDueDate(task.due_date || '');
    setIsRecurring(task.is_recurring || false);
    setRecurringDays(task.recurring_days || []);
    setShowModal(true);
  };

  const toggleDay = (day: number) => {
    setRecurringDays(prev => {
      if (prev.includes(day)) {
        return prev.filter(d => d !== day);
      }
      return [...prev, day].sort();
    });
  };

  const selectAllDays = () => {
    setRecurringDays([0, 1, 2, 3, 4, 5, 6]);
  };

  const dayOrder = lang === 'ar' ? DAY_KEYS_AR : DAY_KEYS_EN;

  const getDaysLabel = (days: number[] | null) => {
    if (!days || days.length === 0) return null;
    if (days.length === 7) return t('tasks.everyDay');
    return days.map(d => t(DAY_LABEL_KEYS[d])).join(' - ');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError(t('tasks.titleRequired')); return; }
    try {
      const taskData = {
        title: title.trim(),
        description: description.trim() || null,
        project_id: projectId,
        due_date: dueDate || null,
        is_recurring: isRecurring,
        recurring_days: isRecurring ? (recurringDays.length > 0 ? recurringDays : null) : null,
      };
      if (editingTask) {
     const updated = await updateTask(editingTask.id, useAppStore.getState().userId || '', taskData);
        updateTaskInStore(updated);
      } else {
        const task = await createTask(useAppStore.getState().userId || '', taskData);
        addTask(task);
      }
      setShowModal(false); resetForm();
      addToast(editingTask ? t('toast.saved') : t('toast.success'), 'success');
    } catch (err) {
      let msg = '';
      if (err instanceof Error) {
        msg = err.message;
      } else if (typeof err === 'object' && err !== null && 'message' in err) {
        msg = String((err as any).message);
      } else {
        msg = String(err);
      }
      setError(`${lang === 'ar' ? 'خطأ' : 'Error'}: ${msg}`);
      addToast(t('toast.error'), 'error');
    }
  };

  const handleToggleComplete = async (task: Task) => {
    try {
const updated = await updateTask(task.id, useAppStore.getState().userId || '', { is_completed: !task.is_completed });
      updateTaskInStore(updated);
    } catch { /* silent */ }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('tasks.deleteConfirm'))) return;
 try { await deleteTask(id, useAppStore.getState().userId || ''); removeTask(id); addToast(t('toast.deleted'), 'success'); } catch { addToast(t('toast.error'), 'error'); }
  };

  const filteredTasks = tasks.filter((task) => {
    if (filterProject !== 'all' && task.project_id !== filterProject) return false;
    if (filterStatus === 'active' && task.is_completed) return false;
    if (filterStatus === 'completed' && !task.is_completed) return false;
    if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'oldest': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case 'dueDate': {
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }
      case 'name': return a.title.localeCompare(b.title);
      default: {
        const aRecurring = a.is_recurring ? 0 : 1;
        const bRecurring = b.is_recurring ? 0 : 1;
        if (aRecurring !== bRecurring) return aRecurring - bRecurring;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    }
  });

  const getProjectName = (pid: string | null) => { if (!pid) return null; return projects.find((p) => p.id === pid)?.name; };
  const getProjectColor = (pid: string | null) => { if (!pid) return null; return projects.find((p) => p.id === pid)?.color; };

  // Group tasks by project
  const groupedTasks = filteredTasks.reduce((acc, task) => {
    const key = task.project_id || '__no_project__';
    if (!acc[key]) acc[key] = [];
    acc[key].push(task);
    return acc;
  }, {} as Record<string, Task[]>);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t('tasks.title')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{t('tasks.subtitle')}</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 dark:bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-slate-700 dark:hover:bg-blue-700 transition-colors"><Plus size={16} />{t('tasks.newTask')}</button>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400 dark:text-gray-500" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t('tasks.search')} className="w-full pr-9 pl-4 py-2 rounded-xl border border-gray-200 dark:border-slate-600 text-sm focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100" />
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Filter size={14} className="text-gray-400 dark:text-gray-500" />
          <select value={filterProject} onChange={(e) => setFilterProject(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 text-sm bg-white dark:bg-slate-800 focus:outline-none text-slate-800 dark:text-slate-100">
            <option value="all">{t('tasks.all')}</option>
            {projects.filter(p => !p.is_folder).map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
          </select>
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 text-sm bg-white dark:bg-slate-800 focus:outline-none text-slate-800 dark:text-slate-100">
          <option value="all">{t('tasks.all')}</option>
          <option value="active">{t('tasks.active')}</option>
          <option value="completed">{t('tasks.completed')}</option>
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 text-sm bg-white dark:bg-slate-800 focus:outline-none text-slate-800 dark:text-slate-100">
          <option value="newest">{t('tasks.sortNewest')}</option>
          <option value="oldest">{t('tasks.sortOldest')}</option>
          <option value="dueDate">{t('tasks.sortDueDate')}</option>
          <option value="name">{t('tasks.sortName')}</option>
        </select>
      </div>

      {dataLoading ? <SkeletonList /> : filteredTasks.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-12 text-center">
          <CheckCircle2 size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-semibold text-gray-400 dark:text-gray-500">{t('tasks.noTasks')}</h3>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{t('tasks.noTasksHint')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedTasks).map(([key, groupTasks]: [string, Task[]]) => {
            const projName = key === '__no_project__' ? null : getProjectName(key);
            const projColor = key === '__no_project__' ? null : getProjectColor(key);
            const completedInGroup = groupTasks.filter((t: Task) => t.is_completed).length;
            const totalInGroup = (groupTasks as Task[]).length;

            return (
              <div key={key}>
                {/* Project group header with colored left border card */}
                {projName && (
                  <div
                    className="flex items-center gap-3 mb-3 px-4 py-2.5 bg-white/60 dark:bg-slate-800/60 rounded-xl border border-gray-100 dark:border-slate-700"
                    style={{ borderLeftWidth: '4px', borderLeftColor: projColor || '#94a3b8' }}
                  >
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: projColor || '#94a3b8' }} />
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{projName}</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto tabular-nums">
                      {completedInGroup}/{totalInGroup}
                    </span>
                    {/* Mini progress bar */}
                    <div className="w-16 h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: totalInGroup > 0 ? `${(completedInGroup / totalInGroup) * 100}%` : '0%',
                          backgroundColor: projColor || '#94a3b8',
                        }}
                      />
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  {groupTasks.map((task) => (
                    <motion.div
                      key={task.id}
                      whileHover={{ scale: 1.003 }}
                      className={`bg-white dark:bg-slate-800 rounded-xl p-4 border-l-4 shadow-sm hover:shadow-md transition-all flex items-center gap-4 ${task.is_completed ? 'opacity-60 border-l-gray-300 dark:border-l-gray-600' : `border-l-[${projColor || '#94a3b8'}]`}`}
                    >
                      <button onClick={() => handleToggleComplete(task)} className="flex-shrink-0">
                        {task.is_completed ? <CheckCircle2 size={22} className="text-emerald-500" /> : <Circle size={22} className="text-gray-300 dark:text-gray-600 hover:text-slate-400 dark:hover:text-gray-500 transition-colors" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm font-medium ${task.is_completed ? 'line-through text-gray-400 dark:text-gray-500' : 'text-slate-700 dark:text-slate-200'}`}>{task.title}</span>
                          {task.is_recurring && (
                            <span className="text-xs flex items-center gap-1 text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full">
                              <Repeat size={10} />
                              {getDaysLabel(task.recurring_days) || (lang === 'ar' ? 'يومية' : 'Daily')}
                            </span>
                          )}
                        </div>
                        {!projName && task.project_id && (
                          <span className="ml-2 text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${getProjectColor(task.project_id)}15`, color: getProjectColor(task.project_id) || '#94a3b8' }}>{getProjectName(task.project_id)}</span>
                        )}
                        {task.due_date && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{task.due_date}</p>}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => openEdit(task)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"><Edit3 size={14} className="text-gray-400 dark:text-gray-500" /></button>
                        <button onClick={() => handleDelete(task.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 transition-colors"><Trash2 size={14} className="text-red-400" /></button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/30 dark:bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-xl border border-gray-100 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{editingTask ? t('tasks.editTask') : t('tasks.newTask')}</h2>
                <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"><X size={18} className="text-gray-400 dark:text-gray-500" /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">{t('tasks.titleField')}</label>
                  <input type="text" value={title} onChange={(e) => { setTitle(e.target.value); setError(''); }} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 text-sm focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100" placeholder={t('tasks.titleField')} autoFocus />
                  {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">{t('tasks.description')}</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 text-sm focus:outline-none resize-none bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100" rows={2} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">{t('tasks.project')}</label>
                  <select value={projectId || ''} onChange={(e) => setProjectId(e.target.value || null)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 text-sm bg-white dark:bg-slate-700 focus:outline-none text-slate-800 dark:text-slate-100">
                    <option value="">{t('tasks.noProject')}</option>
                    {projects.filter(p => !p.is_folder).map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">{t('tasks.dueDate')}</label>
                  <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none text-slate-800 dark:text-slate-100" />
                </div>
                <div className="pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} className="w-4 h-4 rounded" />
                    <span className="text-sm text-slate-600 dark:text-slate-300">{t('tasks.recurring')}</span>
                  </label>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('tasks.recurringDesc')}</p>
                </div>

                {/* Day Selector - only show when recurring is enabled */}
                <AnimatePresence>
                  {isRecurring && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('tasks.selectDays')}</label>
                        <button
                          type="button"
                          onClick={selectAllDays}
                          className="text-xs text-blue-500 dark:text-blue-400 hover:underline font-medium"
                        >
                          {t('tasks.everyDay')}
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {dayOrder.map((day) => {
                          const isSelected = recurringDays.includes(day);
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => toggleDay(day)}
                              className={`w-10 h-10 rounded-xl text-xs font-bold transition-all duration-200 ${
                                isSelected
                                  ? 'bg-blue-500 dark:bg-blue-600 text-white shadow-md shadow-blue-500/30 dark:shadow-blue-600/30 scale-105'
                                  : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-600'
                              }`}
                            >
                              {t(DAY_LABEL_KEYS[day]).charAt(0)}
                            </button>
                          );
                        })}
                      </div>
                      {recurringDays.length > 0 && (
                        <p className="text-xs text-blue-500 dark:text-blue-400 mt-2">
                          {getDaysLabel(recurringDays)}
                        </p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex gap-3 pt-2">
                  <button type="submit" className="flex-1 py-2.5 bg-slate-800 dark:bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-slate-700 dark:hover:bg-blue-700 transition-colors">{editingTask ? t('tasks.editTask') : t('tasks.createTask')}</button>
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
