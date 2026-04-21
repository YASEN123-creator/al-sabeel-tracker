'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipForward, RotateCcw, Clock, Edit3, Trash2, X, BellOff, Plus, Minus, Filter } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { updateSession, deleteSession, upsertSettings, createSession } from '@/lib/api';
import { useT } from '@/lib/i18n';
import type { Session } from '@/lib/types';
import { SkeletonChart } from '@/components/Skeleton';

export default function Sessions() {
  const {
    sessions, projects, tasks, settings,
    updateSession: updateSessionInStore, removeSession, addSession,
    timerState, timerSeconds,
    activeProjectId, setActiveProjectId, activeTaskId, setActiveTaskId,
    setSettings, dataLoading, addToast, darkMode,
  } = useAppStore();
  const t = useT();

  const [showModal, setShowModal] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [editProjectId, setEditProjectId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editDuration, setEditDuration] = useState(0);

  // Add Session Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addProjectId, setAddProjectId] = useState<string | null>(null);
  const [addTaskId, setAddTaskId] = useState<string | null>(null);
  const [addDate, setAddDate] = useState(new Date().toISOString().split('T')[0]);
  const [addStartTime, setAddStartTime] = useState('12:00');
  const [addEndTime, setAddEndTime] = useState('13:00');
  const [addDuration, setAddDuration] = useState(60);

  // Filters
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('allTime');
  const [visibleCount, setVisibleCount] = useState(20);

  const workDuration = (settings?.pomodoro_work_duration || 25) * 60;
  const breakDuration = (settings?.pomodoro_break_duration || 5) * 60;
  const isPomodoroEnabled = settings?.enable_pomodoro !== false;
  const workMin = settings?.pomodoro_work_duration || 25;
  const breakMin = settings?.pomodoro_break_duration || 5;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progress = timerState === 'idle' ? 0 : ((timerState === 'break' ? breakDuration : workDuration) - timerSeconds) / (timerState === 'break' ? breakDuration : workDuration);
  const circumference = 2 * Math.PI * 120;
  const strokeDashoffset = circumference * (1 - progress);

  const changeWorkDuration = async (delta: number) => {
    const newVal = Math.max(1, Math.min(120, workMin + delta));
    const userId = useAppStore.getState().userId || '';
    try {
      const updated = await upsertSettings(userId, { pomodoro_work_duration: newVal });
      setSettings(updated);
    } catch { /* silent */ }
  };

  const changeBreakDuration = async (delta: number) => {
    const newVal = Math.max(1, Math.min(60, breakMin + delta));
    const userId = useAppStore.getState().userId || '';
    try {
      const updated = await upsertSettings(userId, { pomodoro_break_duration: newVal });
      setSettings(updated);
    } catch { /* silent */ }
  };

  const statusLabel = timerState === 'break' ? t('sess.break') : timerState === 'running' ? t('sess.running') : timerState === 'paused' ? t('sess.paused') : t('sess.ready');

  // Filter sessions
  const filteredSessions = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Start of week (Saturday)
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - ((dayOfWeek + 1) % 7));
    const startOfWeekStr = startOfWeek.toISOString().split('T')[0];

    // Start of month
    const startOfMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    return sessions.filter((s) => {
      if (filterProject !== 'all' && s.project_id !== filterProject) return false;
      if (filterStatus === 'today' && s.session_date !== todayStr) return false;
      if (filterStatus === 'thisWeek' && s.session_date < startOfWeekStr) return false;
      if (filterStatus === 'thisMonth' && s.session_date < startOfMonthStr) return false;
      return true;
    });
  }, [sessions, filterProject, filterStatus]);

  const visibleSessions = filteredSessions.slice(0, visibleCount);
  const hasMore = filteredSessions.length > visibleCount;

  const openEditSession = (session: Session) => {
    setEditingSession(session);
    setEditProjectId(session.project_id);
    setEditDate(session.session_date);
    setEditStartTime(session.start_time?.slice(11, 16) || '');
    setEditEndTime(session.end_time?.slice(11, 16) || '');
    setEditDuration(session.duration);
    setShowModal(true);
  };

  const openAddSession = () => {
    setAddProjectId(null);
    setAddTaskId(null);
    setAddDate(new Date().toISOString().split('T')[0]);
    setAddStartTime('12:00');
    setAddEndTime('13:00');
    setAddDuration(60);
    setShowAddModal(true);
  };

  const handleAddSession = async () => {
    if (addDuration <= 0) return;
    try {
      const session = await createSession(useAppStore.getState().userId || '', {
        project_id: addProjectId,
        task_id: addTaskId,
        start_time: addDate + 'T' + addStartTime + ':00',
        end_time: addEndTime ? addDate + 'T' + addEndTime + ':00' : null,
        duration: addDuration,
        session_date: addDate,
      });
      addSession(session);
      setShowAddModal(false);
      addToast(t('sess.addSessionSuccess'), 'success');
    } catch { addToast(t('toast.error'), 'error'); }
  };

  const handleSaveEdit = async () => {
    if (!editingSession) return;
    try {
      const updates: Partial<Session> = {
        project_id: editProjectId,
        session_date: editDate,
        duration: editDuration,
        start_time: editDate + 'T' + editStartTime + ':00',
        end_time: editEndTime ? editDate + 'T' + editEndTime + ':00' : null,
      };
     const updated = await updateSession(editingSession.id, useAppStore.getState().userId || '', updates);
      updateSessionInStore(updated);
      setShowModal(false);
      addToast(t('toast.saved'), 'success');
    } catch { addToast(t('toast.error'), 'error'); }
  };

  const handleDeleteSession = async (id: string) => {
    if (!confirm(t('sess.deleteConfirm'))) return;
    try {
  await deleteSession(id, useAppStore.getState().userId || '');
      removeSession(id);
      addToast(t('toast.deleted'), 'success');
    } catch { addToast(t('toast.error'), 'error'); }
  };

  const actualProjects = projects.filter(p => !p.is_folder);
  const getTaskName = (taskId: string | null) => {
    if (!taskId) return null;
    return tasks.find(t => t.id === taskId)?.title;
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t('sess.title')}</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">{t('sess.subtitle')}</p>
      </div>

      {/* Timer Section */}
      {isPomodoroEnabled && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-gray-100 dark:border-slate-700 shadow-sm mb-8">
          <div className="flex flex-col items-center">
            <div className="flex gap-6 mb-6">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">{t('sess.workDuration')}:</span>
                <button onClick={() => changeWorkDuration(-5)} className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 flex items-center justify-center text-gray-600 dark:text-gray-300"><Minus size={14} /></button>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-100 w-12 text-center">{workMin} {t('sess.minutes')}</span>
                <button onClick={() => changeWorkDuration(5)} className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 flex items-center justify-center text-gray-600 dark:text-gray-300"><Plus size={14} /></button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">{t('sess.breakDuration')}:</span>
                <button onClick={() => changeBreakDuration(-1)} className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 flex items-center justify-center text-gray-600 dark:text-gray-300"><Minus size={14} /></button>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-100 w-12 text-center">{breakMin} {t('sess.minutes')}</span>
                <button onClick={() => changeBreakDuration(1)} className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 flex items-center justify-center text-gray-600 dark:text-gray-300"><Plus size={14} /></button>
              </div>
            </div>

            <div className="flex gap-2 mb-6 w-full max-w-sm">
              <select value={activeProjectId || ''} onChange={(e) => setActiveProjectId(e.target.value || null)} className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-600 text-sm bg-white dark:bg-slate-700 focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 text-slate-800 dark:text-slate-100">
                <option value="">{t('sess.selectProject')}</option>
                {actualProjects.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
              </select>
              <select value={activeTaskId || ''} onChange={(e) => setActiveTaskId(e.target.value || null)} className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-600 text-sm bg-white dark:bg-slate-700 focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 text-slate-800 dark:text-slate-100">
                <option value="">{t('sess.selectTask')}</option>
                {tasks.filter((t) => !t.is_completed).map((t) => (<option key={t.id} value={t.id}>{t.title}</option>))}
              </select>
            </div>

            <div className="relative w-64 h-64 mb-6">
              <svg className="w-64 h-64 transform -rotate-90" viewBox="0 0 256 256">
                <circle cx="128" cy="128" r="120" fill="none" stroke={darkMode ? '#334155' : '#e2e8f0'} strokeWidth="8" />
                <circle cx="128" cy="128" r="120" fill="none" stroke={timerState === 'break' ? '#10B981' : timerState === 'running' ? '#1E293B' : '#64748B'} strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className="transition-all duration-300" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-bold text-slate-800 dark:text-slate-100 font-mono tracking-wider">{formatTime(timerSeconds)}</span>
                <span className="text-sm text-gray-400 dark:text-gray-500 mt-2">{statusLabel}</span>
                {timerState === 'running' && (
                  <span className="text-xs text-gray-300 dark:text-gray-600 mt-1 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                    {t('sess.bgWorking')}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={() => useAppStore.getState().resetTimer?.()} className="p-3 rounded-xl bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"><RotateCcw size={18} className="text-gray-600 dark:text-gray-300" /></button>
              {(timerState === 'idle' || timerState === 'paused') ? (
                <button onClick={() => timerState === 'idle' ? useAppStore.getState().startTimer?.() : useAppStore.getState().resumeTimer?.()} className="p-4 rounded-2xl bg-slate-800 dark:bg-blue-600 hover:bg-slate-700 dark:hover:bg-blue-700 transition-colors shadow-lg"><Play size={24} className="text-white" /></button>
              ) : (
                <button onClick={() => useAppStore.getState().pauseTimer?.()} className="p-4 rounded-2xl bg-slate-800 dark:bg-blue-600 hover:bg-slate-700 dark:hover:bg-blue-700 transition-colors shadow-lg"><Pause size={24} className="text-white" /></button>
              )}
              <button onClick={() => useAppStore.getState().skipTimer?.()} className="p-3 rounded-xl bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"><SkipForward size={18} className="text-gray-600 dark:text-gray-300" /></button>
            </div>

            {timerState === 'running' && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-4 flex items-center gap-1"><BellOff size={12} />{t('sess.noSound')}</p>
            )}
          </div>
        </div>
      )}

      {/* Sessions History with Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{t('sess.history')}</h2>
          <div className="flex items-center gap-3">
            <button onClick={openAddSession} className="flex items-center gap-2 px-4 py-2 bg-slate-800 dark:bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-slate-700 dark:hover:bg-blue-700 transition-colors">
              <Plus size={14} />{t('sess.addSession')}
            </button>
            <span className="text-xs text-gray-400 dark:text-gray-500">{t('sess.showing')} {visibleSessions.length} {t('sess.of')} {filteredSessions.length}</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <Filter size={14} className="text-gray-400 dark:text-gray-500" />
            <select value={filterProject} onChange={(e) => { setFilterProject(e.target.value); setVisibleCount(20); }} className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 text-sm bg-white dark:bg-slate-700 focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 text-slate-800 dark:text-slate-100">
              <option value="all">{t('sess.allProjects')}</option>
              {actualProjects.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
            </select>
          </div>
          <div className="flex gap-1">
            {[
              ['allTime', t('sess.allTime')],
              ['today', t('sess.today')],
              ['thisWeek', t('sess.thisWeek')],
              ['thisMonth', t('sess.thisMonth')],
            ].map(([val, label]) => (
              <button key={val} onClick={() => { setFilterStatus(val); setVisibleCount(20); }} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterStatus === val ? 'bg-slate-800 dark:bg-blue-600 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {dataLoading ? (
          <SkeletonChart />
        ) : visibleSessions.length === 0 ? (
          <div className="py-8 text-center">
            <Clock size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-gray-400 dark:text-gray-500 text-sm">{t('sess.noSessions')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {visibleSessions.map((session) => {
              const project = projects.find((p) => p.id === session.project_id);
              const taskName = getTaskName(session.task_id);
              const hours = Math.floor(session.duration / 60);
              const mins = session.duration % 60;
              return (
                <motion.div key={session.id} whileHover={{ scale: 1.003 }} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors group">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: project?.color || '#94a3b8' }} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{project?.name || t('common.noProject')}</p>
                        {taskName && (
                          <span className="text-xs bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full truncate max-w-[150px]">{taskName}</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{session.session_date} {session.start_time?.slice(11, 16) || ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-sm font-medium text-slate-600 dark:text-gray-300">{hours > 0 ? `${hours}h ` : ''}{mins}m</span>
                    <div className="hidden group-hover:flex gap-1">
                      <button onClick={() => openEditSession(session)} className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"><Edit3 size={13} className="text-gray-400 dark:text-gray-500" /></button>
                      <button onClick={() => handleDeleteSession(session.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 transition-colors"><Trash2 size={13} className="text-red-400" /></button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
            {hasMore && (
              <button onClick={() => setVisibleCount(prev => prev + 20)} className="w-full py-3 text-center text-sm text-slate-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700/50 rounded-xl transition-colors font-medium">
                {t('sess.loadMore')}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {showModal && editingSession && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/30 dark:bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-xl border border-gray-100 dark:border-slate-700">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{t('sess.editSession')}</h2>
                <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"><X size={18} className="text-gray-400 dark:text-gray-500" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">{t('proj.name')}</label>
                  <select value={editProjectId || ''} onChange={(e) => setEditProjectId(e.target.value || null)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 text-sm bg-white dark:bg-slate-700 focus:outline-none text-slate-800 dark:text-slate-100">
                    <option value="">{t('common.noProject')}</option>
                    {actualProjects.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">{t('sess.date')}</label>
                  <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none text-slate-800 dark:text-slate-100" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">{t('sess.startTime')}</label>
                    <input type="time" value={editStartTime} onChange={(e) => setEditStartTime(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none text-slate-800 dark:text-slate-100" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">{t('sess.endTime')}</label>
                    <input type="time" value={editEndTime} onChange={(e) => setEditEndTime(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none text-slate-800 dark:text-slate-100" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">{t('sess.duration')}</label>
                  <input type="number" value={editDuration} onChange={(e) => setEditDuration(parseInt(e.target.value) || 0)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none text-slate-800 dark:text-slate-100" min="0" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={handleSaveEdit} className="flex-1 py-2.5 bg-slate-800 dark:bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-slate-700 dark:hover:bg-blue-700 transition-colors">{t('sess.saveEdit')}</button>
                  <button onClick={() => setShowModal(false)} className="px-4 py-2.5 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">{t('proj.cancel')}</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Session Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/30 dark:bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-xl border border-gray-100 dark:border-slate-700">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{t('sess.addSessionTitle')}</h2>
                <button onClick={() => setShowAddModal(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"><X size={18} className="text-gray-400 dark:text-gray-500" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">{t('proj.name')}</label>
                  <select value={addProjectId || ''} onChange={(e) => setAddProjectId(e.target.value || null)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 text-sm bg-white dark:bg-slate-700 focus:outline-none text-slate-800 dark:text-slate-100">
                    <option value="">{t('common.noProject')}</option>
                    {actualProjects.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">{t('sess.taskName')}</label>
                  <select value={addTaskId || ''} onChange={(e) => setAddTaskId(e.target.value || null)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 text-sm bg-white dark:bg-slate-700 focus:outline-none text-slate-800 dark:text-slate-100">
                    <option value="">{t('sess.selectTask')}</option>
                    {tasks.filter((t) => !t.is_completed).map((t) => (<option key={t.id} value={t.id}>{t.title}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">{t('sess.date')}</label>
                  <input type="date" value={addDate} onChange={(e) => setAddDate(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none text-slate-800 dark:text-slate-100" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">{t('sess.startTime')}</label>
                    <input type="time" value={addStartTime} onChange={(e) => setAddStartTime(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none text-slate-800 dark:text-slate-100" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">{t('sess.endTime')}</label>
                    <input type="time" value={addEndTime} onChange={(e) => setAddEndTime(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none text-slate-800 dark:text-slate-100" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">{t('sess.duration')}</label>
                  <input type="number" value={addDuration} onChange={(e) => setAddDuration(parseInt(e.target.value) || 0)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none text-slate-800 dark:text-slate-100" min="1" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={handleAddSession} className="flex-1 py-2.5 bg-slate-800 dark:bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-slate-700 dark:hover:bg-blue-700 transition-colors">{t('proj.create')}</button>
                  <button onClick={() => setShowAddModal(false)} className="px-4 py-2.5 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">{t('proj.cancel')}</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
