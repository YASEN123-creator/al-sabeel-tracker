'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Edit3, X, FolderOpen, Folder, ChevronDown, ChevronLeft, Clock, FileText, Timer, Search, CheckCircle2, Circle, LayoutGrid, RotateCcw, Star, Calendar } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { createProject, updateProject, deleteProject, createSession, updateTask } from '@/lib/api';
import { useT } from '@/lib/i18n';
import type { Project, Task } from '@/lib/types';

const COLORS = ['#1E293B', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

export default function Projects() {
  const { projects, sessions, addProject, updateProject: updateProjectInStore, removeProject, tasks, addSession, updateTask: updateTaskInStore, deletedProjects, moveToTrash, restoreFromTrash, emptyTrash, addToast, projectRatings, setProjectRating } = useAppStore();
  const t = useT();
  const [showModal, setShowModal] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailProject, setDetailProject] = useState<Project | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [timeProjectId, setTimeProjectId] = useState<string | null>(null);
  const [timeProjectName, setTimeProjectName] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#1E293B');
  const [isFolder, setIsFolder] = useState(false);
  const [parentId, setParentId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [timeDate, setTimeDate] = useState(new Date().toISOString().split('T')[0]);
  const [timeHours, setTimeHours] = useState('1');
  const [timeMinutes, setTimeMinutes] = useState('0');
  const [togglingTaskId, setTogglingTaskId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'folder'>('folder');
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const allProjectsFiltered = searchQuery
    ? projects.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : projects;
  const rootFolders = allProjectsFiltered.filter(p => p.is_folder && !p.parent_id);
  const rootProjects = allProjectsFiltered.filter(p => !p.is_folder && !p.parent_id);
  const getChildren = (folderId: string) => projects.filter(p => p.parent_id === folderId);

  const getTasksForFolder = (folderId: string): { project: Project; task: Task }[] => {
    const children = getChildren(folderId);
    const childProjectIds = children.map(p => p.id);
    return tasks
      .filter(task => task.project_id && childProjectIds.includes(task.project_id))
      .map(task => {
        const project = children.find(p => p.id === task.project_id);
        return { project: project!, task };
      });
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  const toggleProject = (projectId: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  };

  const openAddTime = (project: Project) => {
    setTimeProjectId(project.id);
    setTimeProjectName(project.name);
    setTimeDate(new Date().toISOString().split('T')[0]);
    setTimeHours('1');
    setTimeMinutes('0');
    setShowTimeModal(true);
  };

  const openDetail = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setDetailProject(project);
    setShowDetailModal(true);
  };

  const handleSaveTime = async () => {
    if (!timeProjectId) return;
    const hours = parseFloat(timeHours) || 0;
    const mins = parseInt(timeMinutes) || 0;
    const totalMinutes = Math.round(hours * 60 + mins);
    if (totalMinutes <= 0) return;

    try {
      const session = await createSession(useAppStore.getState().userId || '', {
        project_id: timeProjectId,
        task_id: null,
        start_time: timeDate + 'T12:00:00',
        end_time: timeDate + 'T12:00:00',
        duration: totalMinutes,
        session_date: timeDate,
      });
      addSession(session);
      setShowTimeModal(false);
    } catch { /* silent */ }
  };

  const getProjectTime = (projectId: string) => {
    const totalMinutes = sessions.filter((s) => s.project_id === projectId).reduce((acc, s) => acc + s.duration, 0);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getProjectTasks = (projectId: string) => {
    return tasks.filter((t) => t.project_id === projectId && !t.is_completed).length;
  };

  const getFolderTime = (folderId: string) => {
    const childProjectIds = getChildren(folderId).map(p => p.id);
    const totalMinutes = sessions.filter(s => s.project_id && childProjectIds.includes(s.project_id)).reduce((acc, s) => acc + s.duration, 0);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getFolderTasks = (folderId: string) => {
    const childProjectIds = getChildren(folderId).map(p => p.id);
    return tasks.filter(t => t.project_id && childProjectIds.includes(t.project_id) && !t.is_completed).length;
  };

  const handleToggleTask = async (task: Task) => {
    setTogglingTaskId(task.id);
    try {
      const updated = await updateTask(task.id, useAppStore.getState().userId || '', { is_completed: !task.is_completed });
      updateTaskInStore(updated);
    } catch {
      // silent
    } finally {
      setTogglingTaskId(null);
    }
  };

  const resetForm = () => { setName(''); setDescription(''); setColor('#1E293B'); setIsFolder(false); setParentId(null); setEditingProject(null); setError(''); };

  const openCreateProject = () => { resetForm(); setShowModal(true); };
  const openCreateFolder = () => { resetForm(); setIsFolder(true); setShowModal(true); };
  const openCreateInFolder = (folderId: string) => { resetForm(); setParentId(folderId); setShowModal(true); };

  const openEdit = (project: Project) => {
    setEditingProject(project);
    setName(project.name);
    setDescription(project.description || '');
    setColor(project.color || '#1E293B');
    setIsFolder(project.is_folder || false);
    setParentId(project.parent_id || null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError(t('proj.requiredName')); return; }
    try {
      if (editingProject) {
        const updated = await updateProject(editingProject.id, useAppStore.getState().userId || '', { name: name.trim(), description: description.trim() || null, color, is_folder: isFolder, parent_id: isFolder ? null : parentId });
        updateProjectInStore(updated);
      } else {
        const project = await createProject(useAppStore.getState().userId || '', { name: name.trim(), description: description.trim() || undefined, color, is_folder: isFolder, parent_id: isFolder ? null : parentId });
        addProject(project);
      }
      setShowModal(false); resetForm();
    } catch (err) {
      let msg = '';
      if (err instanceof Error) {
        msg = err.message;
      } else if (typeof err === 'object' && err !== null && 'message' in err) {
        msg = String((err as any).message);
      } else {
        msg = String(err);
      }
      setError(`خطأ: ${msg}`);
    }
  };

  const handleDelete = (id: string) => {
    const project = projects.find(p => p.id === id);
    if (!confirm(project?.is_folder ? t('proj.deleteFolderConfirm') : t('proj.moveToTrashConfirm'))) return;
    const proj = projects.find(p => p.id === id);
    if (proj) {
      moveToTrash(proj);
      addToast(t('proj.deletedSuccess'), 'success');
    }
  };

  const handlePermanentDelete = async (id: string) => {
    try { await deleteProject(id, useAppStore.getState().userId || ''); emptyTrash(); } catch { /* silent */ }
  };

  const handleRestore = (id: string) => {
    if (confirm(t('proj.restoreConfirm'))) {
      restoreFromTrash(id);
      addToast(t('proj.restoreSuccess'), 'success');
    }
  };

  const availableFolders = projects.filter(p => p.is_folder && (!editingProject || p.id !== editingProject.id));

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toISOString().split('T')[0];
    } catch {
      return dateStr;
    }
  };

  /* ───── Star Rating Component ───── */
  const StarRating = ({ projectId, size = 14 }: { projectId: string; size?: number }) => {
    const rating = projectRatings[projectId] || 3;
    return (
      <div className="flex gap-0.5" onClick={(e) => e.stopPropagation()}>
        {[1, 2, 3].map((star) => (
          <button key={star} onClick={() => setProjectRating(projectId, star === rating ? 0 : star)} className="transition-transform hover:scale-110">
            <Star size={size} className={star <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-gray-600'} fill={star <= rating ? 'currentColor' : 'none'} />
          </button>
        ))}
      </div>
    );
  };

  /* ───── Detail modal computed values ───── */
  const detailTasks = detailProject ? tasks.filter(t => t.project_id === detailProject.id) : [];
  const detailPendingTasks = detailTasks.filter(t => !t.is_completed);
  const detailCompletedTasks = detailTasks.filter(t => t.is_completed);
  const detailSessions = detailProject ? sessions.filter(s => s.project_id === detailProject.id) : [];
  const detailTotalMinutes = detailSessions.reduce((acc, s) => acc + s.duration, 0);
  const detailHours = Math.floor(detailTotalMinutes / 60);
  const detailMins = detailTotalMinutes % 60;
  const detailTotalTime = detailHours > 0 ? `${detailHours}h ${detailMins}m` : `${detailMins}m`;
  const lastSession = detailSessions.length > 0 ? detailSessions[detailSessions.length - 1] : null;
  const lastSessionHours = lastSession ? Math.floor(lastSession.duration / 60) : 0;
  const lastSessionMins = lastSession ? lastSession.duration % 60 : 0;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      {/* Search */}
      {projects.length > 0 && (
        <div className="mb-6">
          <div className="relative">
            <Search size={16} className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400 dark:text-gray-500" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t('proj.search')} className="w-full pr-9 pl-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 text-sm focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100" />
          </div>
        </div>
      )}

      {/* Header with title + quick action buttons */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t('proj.title')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{t('proj.subtitle')}</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap justify-end">
          {projects.length > 0 && (
            <div className="flex gap-1 bg-gray-100 dark:bg-slate-700 rounded-lg p-0.5">
              <button onClick={() => setViewMode('grid')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
                <LayoutGrid size={14} />{t('proj.gridView')}
              </button>
              <button onClick={() => setViewMode('folder')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === 'folder' ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
                <FolderOpen size={14} />{t('proj.folderView')}
              </button>
            </div>
          )}
          {/* Prominent quick action button */}
          <button onClick={openCreateProject} className="flex items-center gap-2 px-5 py-3 bg-black text-white rounded-xl text-sm font-bold hover:bg-gray-800 dark:hover:bg-gray-800 transition-colors shadow-lg">
            <Plus size={18} />{t('proj.newActivity') || 'إضافة نشاط جديد'}
          </button>
          <button onClick={openCreateFolder} className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-medium hover:bg-amber-600 transition-colors">
            <Folder size={16} />{t('proj.newFolder')}
          </button>
          <button onClick={openCreateProject} className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 dark:bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-slate-700 dark:hover:bg-blue-700 transition-colors">
            <Plus size={16} />{t('proj.newProject')}
          </button>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-12 text-center">
          <FolderOpen size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-semibold text-gray-400 dark:text-gray-500">{t('proj.noProjects')}</h3>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{t('proj.noProjectsHint')}</p>
          <div className="flex gap-3 justify-center mt-4">
            <button onClick={openCreateFolder} className="px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-medium hover:bg-amber-600 transition-colors">{t('proj.createFolder')}</button>
            <button onClick={openCreateProject} className="px-4 py-2 bg-slate-800 dark:bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-slate-700 dark:hover:bg-blue-700 transition-colors">{t('proj.createProject')}</button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* ───── Folders ───── */}
          {rootFolders.length > 0 && (
            <div className="space-y-3">
              {rootFolders.map((folder) => {
                const children = getChildren(folder.id);
                const isExpanded = expandedFolders.has(folder.id);
                const folderTasks = getTasksForFolder(folder.id);
                const pendingFolderTasks = folderTasks.filter(ft => !ft.task.is_completed);
                const hasContent = children.length > 0 || pendingFolderTasks.length > 0;
                return (
                  <div key={folder.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
                    <motion.div whileHover={{ scale: 1.005 }} className="flex items-center justify-between p-5 cursor-pointer hover:bg-amber-50/50 dark:hover:bg-slate-700/50 transition-colors" onClick={() => toggleFolder(folder.id)}>
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-50 dark:bg-amber-950">
                          {isExpanded ? <FolderOpen size={20} className="text-amber-500" /> : <Folder size={20} className="text-amber-500" />}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            {folder.name}
                            <span className="text-xs bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full font-normal">{children.length} {t('proj.project')}</span>
                          </h3>
                          {folder.description && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-1">{folder.description}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="hidden sm:flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1"><Clock size={14} />{getFolderTime(folder.id)}</span>
                          <span className="text-xs bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full font-medium">{getFolderTasks(folder.id)} {t('proj.task')}</span>
                        </div>
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => openAddTime(folder)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors" title={t('proj.addTime')}><Timer size={14} className="text-blue-500" /></button>
                          <button onClick={() => openCreateInFolder(folder.id)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors" title={t('proj.addChild')}><Plus size={14} className="text-emerald-500" /></button>
                          <button onClick={() => openEdit(folder)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"><Edit3 size={14} className="text-gray-400 dark:text-gray-500" /></button>
                          <button onClick={() => handleDelete(folder.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 transition-colors"><Trash2 size={14} className="text-red-400" /></button>
                        </div>
                        {isExpanded ? <ChevronDown size={18} className="text-gray-400 dark:text-gray-500" /> : <ChevronLeft size={18} className="text-gray-400 dark:text-gray-500" />}
                      </div>
                    </motion.div>
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                          <div className="border-t border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/50 p-4">
                            {!hasContent ? (
                              <div className="text-center py-6">
                                <FileText size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                                <p className="text-sm text-gray-400 dark:text-gray-500 mb-3">{t('proj.noChildren')}</p>
                                <button onClick={() => openCreateInFolder(folder.id)} className="px-3 py-1.5 bg-slate-800 dark:bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-slate-700 dark:hover:bg-blue-700 transition-colors"><Plus size={12} className="inline ml-1" />{t('proj.addChild')}</button>
                              </div>
                            ) : (
                              <>
                                {/* Child Projects - Collapsible Accordion */}
                                {children.length > 0 && (
                                  <div className="space-y-2 mb-4">
                                    {children.map((child) => {
                                      const isChildExpanded = expandedProjects.has(child.id);
                                      const childTasks = tasks.filter(ct => ct.project_id === child.id);
                                      const childPendingTasks = childTasks.filter(ct => !ct.is_completed);
                                      const childCompletedTasks = childTasks.filter(ct => ct.is_completed);
                                      const childSessions = sessions.filter(cs => cs.project_id === child.id);
                                      return (
                                        <div key={child.id} className={`bg-white dark:bg-slate-800 rounded-xl border shadow-sm overflow-hidden transition-all duration-200 ${isChildExpanded ? 'border-blue-200 dark:border-blue-800/50 shadow-md' : 'border-gray-100 dark:border-slate-700 hover:shadow-sm'}`}>
                                          {/* Child Project Header */}
                                          <motion.div
                                            whileHover={{ scale: 1.002 }}
                                            className="flex items-center gap-3 p-3.5 cursor-pointer hover:bg-gray-50/80 dark:hover:bg-slate-700/40 transition-colors"
                                            onClick={() => toggleProject(child.id)}
                                          >
                                            {/* Color indicator */}
                                            <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: child.color || '#94a3b8' }} />

                                            {/* Star rating */}
                                            <div className="flex-shrink-0">
                                              <StarRating projectId={child.id} size={14} />
                                            </div>

                                            {/* Project name & description */}
                                            <div className="flex-1 min-w-0">
                                              <h4 className="font-semibold text-slate-800 dark:text-slate-100 text-sm truncate">{child.name}</h4>
                                              {child.description && (
                                                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-1">{child.description}</p>
                                              )}
                                            </div>

                                            {/* Metadata badges */}
                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                              <span className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-[11px] font-semibold">
                                                <Clock size={10} />
                                                {getProjectTime(child.id)}
                                              </span>
                                              <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold">
                                                {childPendingTasks.length} {t('proj.task')}
                                              </span>

                                              {/* Actions */}
                                              <div className="flex gap-0.5" onClick={(e) => e.stopPropagation()}>
                                                <button onClick={() => openAddTime(child)} className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors" title={t('proj.addTime')}><Timer size={12} className="text-blue-500" /></button>
                                                <button onClick={() => openEdit(child)} className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"><Edit3 size={12} className="text-gray-400 dark:text-gray-500" /></button>
                                                <button onClick={() => handleDelete(child.id)} className="p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-950 transition-colors"><Trash2 size={12} className="text-red-400" /></button>
                                              </div>

                                              {/* Expand/collapse */}
                                              <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${isChildExpanded ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400' : 'bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-gray-500'}`}>
                                                {isChildExpanded ? <ChevronDown size={14} /> : <ChevronLeft size={14} />}
                                              </div>
                                            </div>
                                          </motion.div>

                                          {/* Expanded Content */}
                                          <AnimatePresence>
                                            {isChildExpanded && (
                                              <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.2, ease: 'easeInOut' }}
                                                className="overflow-hidden"
                                              >
                                                <div className="border-t border-gray-100 dark:border-slate-700/80 bg-gradient-to-b from-gray-50/80 to-white dark:from-slate-900/60 dark:to-slate-900/30 px-3.5 py-3">
                                                  {/* Summary stats */}
                                                  <div className="flex items-center gap-3 mb-3 text-[11px] text-gray-400 dark:text-gray-500">
                                                    <span className="flex items-center gap-1"><Clock size={10} className="text-blue-400" />{getProjectTime(child.id)}</span>
                                                    <span className="flex items-center gap-1">{childCompletedTasks.length}/{childTasks.length} {t('proj.completedTasks')}</span>
                                                    <span className="text-emerald-500">{formatDate(child.created_at)}</span>
                                                  </div>

                                                  {/* Tasks List */}
                                                  {childTasks.length === 0 ? (
                                                    <div className="text-center py-4">
                                                      <p className="text-xs text-gray-400 dark:text-gray-500">{t('proj.noProjectTasks')}</p>
                                                    </div>
                                                  ) : (
                                                    <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
                                                      {childPendingTasks.length > 0 && (
                                                        <div className="flex items-center gap-2 mb-1.5">
                                                          <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                                                            {childPendingTasks.length} {t('proj.pendingTasks')}
                                                          </span>
                                                          <div className="h-px flex-1 bg-gray-200 dark:bg-slate-700/60" />
                                                        </div>
                                                      )}
                                                      {childPendingTasks.map((task) => (
                                                        <motion.div
                                                          key={task.id}
                                                          layout
                                                          initial={{ opacity: 0, y: -3 }}
                                                          animate={{ opacity: 1, y: 0 }}
                                                          exit={{ opacity: 0, x: 15 }}
                                                          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 transition-colors group"
                                                        >
                                                          <button
                                                            onClick={(e) => { e.stopPropagation(); handleToggleTask(task); }}
                                                            disabled={togglingTaskId === task.id}
                                                            className="flex-shrink-0 transition-transform hover:scale-110"
                                                          >
                                                            {togglingTaskId === task.id ? (
                                                              <div className="w-4 h-4 rounded-full border-2 border-gray-300 dark:border-gray-600 animate-spin" style={{ borderTopColor: 'transparent' }} />
                                                            ) : task.is_completed ? (
                                                              <CheckCircle2 size={16} className="text-emerald-500" />
                                                            ) : (
                                                              <Circle size={16} className="text-gray-300 dark:text-gray-600 group-hover:text-gray-400 dark:group-hover:text-gray-500" />
                                                            )}
                                                          </button>
                                                          <span className={`flex-1 text-xs ${task.is_completed ? 'line-through text-gray-400 dark:text-gray-500' : 'text-slate-700 dark:text-slate-200'}`}>
                                                            {task.title}
                                                          </span>
                                                          {task.due_date && (
                                                            <span className="flex-shrink-0 text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-0.5">
                                                              <Calendar size={9} />
                                                              {new Date(task.due_date).toLocaleDateString()}
                                                            </span>
                                                          )}
                                                        </motion.div>
                                                      ))}
                                                      {childCompletedTasks.length > 0 && (
                                                        <>
                                                          <div className="flex items-center gap-2 mt-2 mb-1.5">
                                                            <span className="text-[10px] font-bold text-emerald-400 dark:text-emerald-500 uppercase tracking-widest">
                                                              {childCompletedTasks.length} {t('proj.completedTasks')}
                                                            </span>
                                                            <div className="h-px flex-1 bg-emerald-100 dark:bg-emerald-900/30" />
                                                          </div>
                                                          {childCompletedTasks.map((task) => (
                                                            <motion.div
                                                              key={task.id}
                                                              layout
                                                              initial={{ opacity: 0 }}
                                                              animate={{ opacity: 1 }}
                                                              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/50"
                                                            >
                                                              <button
                                                                onClick={(e) => { e.stopPropagation(); handleToggleTask(task); }}
                                                                disabled={togglingTaskId === task.id}
                                                                className="flex-shrink-0"
                                                              >
                                                                {togglingTaskId === task.id ? (
                                                                  <div className="w-4 h-4 rounded-full border-2 border-gray-300 dark:border-gray-600 animate-spin" style={{ borderTopColor: 'transparent' }} />
                                                                ) : (
                                                                  <CheckCircle2 size={16} className="text-emerald-500" />
                                                                )}
                                                              </button>
                                                              <span className="flex-1 text-xs line-through text-gray-400 dark:text-gray-500">
                                                                {task.title}
                                                              </span>
                                                            </motion.div>
                                                          ))}
                                                        </>
                                                      )}
                                                    </div>
                                                  )}
                                                </div>
                                              </motion.div>
                                            )}
                                          </AnimatePresence>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                {/* Hint text */}
                                <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center mt-1">
                                  {t('proj.expandHint') || 'اضغط على أي مشروع لعرض التفاصيل والمهام'}
                                </p>
                              </>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}

          {/* ───── Root Projects - Grid View ───── */}
          {rootProjects.length > 0 && viewMode === 'grid' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rootProjects.map((project) => (
                <motion.div key={project.id} whileHover={{ scale: 1.02 }} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${project.color}15` }}><FolderOpen size={20} style={{ color: project.color || '#94a3b8' }} /></div>
                      <div>
                        <h3 className="font-semibold text-slate-800 dark:text-slate-100">{project.name}</h3>
                        {project.description && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-1">{project.description}</p>}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openAddTime(project)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors" title={t('proj.addTime')}><Timer size={14} className="text-blue-500" /></button>
                      <button onClick={() => openEdit(project)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"><Edit3 size={14} className="text-gray-400 dark:text-gray-500" /></button>
                      <button onClick={() => handleDelete(project.id)} className="px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 transition-colors text-xs text-red-500 font-medium">حذف</button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs mb-3">
                    <StarRating projectId={project.id} size={14} />
                    <span className="text-emerald-500 dark:text-emerald-400 font-medium">{formatDate(project.created_at)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400"><Clock size={14} /><span>{getProjectTime(project.id)}</span></div>
                    <span className="text-xs bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full font-medium">{getProjectTasks(project.id)} {t('proj.pendingTasks')}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* ───── Root Projects - Folder View (Accordion Cards) ───── */}
          {rootProjects.length > 0 && viewMode === 'folder' && (
            <div className="space-y-3">
              {rootProjects.map((project) => {
                const isExpanded = expandedProjects.has(project.id);
                const projectTasks = tasks.filter(t => t.project_id === project.id);
                const pendingTasks = projectTasks.filter(t => !t.is_completed);
                const completedTasks = projectTasks.filter(t => t.is_completed);
                const projectSessions = sessions.filter(s => s.project_id === project.id);
                return (
                  <div key={project.id} className={`bg-white dark:bg-slate-800 rounded-2xl border shadow-sm overflow-hidden transition-all duration-200 ${isExpanded ? 'border-blue-200 dark:border-blue-800/60 shadow-md ring-1 ring-blue-100 dark:ring-blue-900/30' : 'border-gray-100 dark:border-slate-700 hover:shadow-md'}`}>
                    {/* Accordion Header - Card Style */}
                    <motion.div whileHover={{ scale: 1.002 }} className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50/80 dark:hover:bg-slate-700/40 transition-colors" onClick={() => toggleProject(project.id)}>
                      {/* Star rating */}
                      <div className="flex-shrink-0">
                        <StarRating projectId={project.id} size={18} />
                      </div>

                      {/* Color indicator bar */}
                      <div className="w-1 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: project.color || '#94a3b8' }} />

                      {/* Project name */}
                      <button
                        onClick={(e) => openDetail(project, e)}
                        className="flex-1 min-w-0 text-right"
                      >
                        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-[15px] truncate hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                          {project.name}
                        </h3>
                        {project.description && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-1">{project.description}</p>
                        )}
                      </button>

                      {/* Metadata badges */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Time badge */}
                        <span className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-xs font-semibold">
                          <Clock size={12} />
                          {getProjectTime(project.id)}
                        </span>

                        {/* Date badge */}
                        <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-50 dark:bg-slate-700/60 text-gray-500 dark:text-gray-400 text-xs font-medium">
                          <Calendar size={12} />
                          {formatDate(project.created_at)}
                        </span>

                        {/* Task count badge */}
                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                          {pendingTasks.length} {t('proj.task')}
                        </span>

                        {/* Delete button */}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(project.id); }}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 transition-colors group/del"
                          title={t('proj.moveToTrash') || 'حذف'}
                        >
                          <Trash2 size={15} className="text-gray-300 dark:text-gray-600 group-hover/del:text-red-500 transition-colors" />
                        </button>

                        {/* Expand/collapse chevron */}
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${isExpanded ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400' : 'bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-gray-500'}`}>
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronLeft size={16} />}
                        </div>
                      </div>
                    </motion.div>

                    {/* Expanded Content */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: 'easeInOut' }} className="overflow-hidden">
                          <div className="border-t border-gray-100 dark:border-slate-700/80 bg-gradient-to-b from-gray-50/80 to-white dark:from-slate-900/60 dark:to-slate-900/30 px-4 py-4">

                            {/* Quick actions toolbar */}
                            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200/80 dark:border-slate-700/80">
                              <button onClick={() => openAddTime(project)} className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors shadow-sm">
                                <Timer size={13} />{t('proj.addTime')}
                              </button>
                              <button onClick={() => openEdit(project)} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-700 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">
                                <Edit3 size={13} />{t('proj.editProject')}
                              </button>
                              {/* Summary stats */}
                              <div className="flex items-center gap-3 ms-auto text-xs text-gray-400 dark:text-gray-500">
                                <span className="flex items-center gap-1"><Clock size={12} className="text-blue-400" />{getProjectTime(project.id)}</span>
                                <span className="flex items-center gap-1">{completedTasks.length}/{projectTasks.length} {t('proj.completedTasks')}</span>
                              </div>
                            </div>

                            {/* Tasks List with Checkboxes */}
                            {projectTasks.length === 0 ? (
                              <div className="text-center py-6">
                                <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-3">
                                  <FileText size={24} className="text-gray-300 dark:text-gray-600" />
                                </div>
                                <p className="text-sm text-gray-400 dark:text-gray-500">{t('proj.noProjectTasks')}</p>
                              </div>
                            ) : (
                              <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
                                {/* Pending tasks section header */}
                                {pendingTasks.length > 0 && (
                                  <div className="flex items-center gap-2 mb-2 mt-1">
                                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                                      {pendingTasks.length} {t('proj.pendingTasks')}
                                    </span>
                                    <div className="h-px flex-1 bg-gray-200 dark:bg-slate-700/60" />
                                  </div>
                                )}
                                {pendingTasks.map((task) => (
                                  <motion.div
                                    key={task.id}
                                    layout
                                    initial={{ opacity: 0, y: -5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 hover:shadow-sm transition-all group"
                                  >
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleToggleTask(task); }}
                                      disabled={togglingTaskId === task.id}
                                      className="flex-shrink-0 transition-transform hover:scale-110"
                                    >
                                      {togglingTaskId === task.id ? (
                                        <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600 animate-spin" style={{ borderTopColor: 'transparent' }} />
                                      ) : (
                                        <Circle size={20} className="text-gray-300 dark:text-gray-600 group-hover:text-blue-400 dark:group-hover:text-blue-500 transition-colors" />
                                      )}
                                    </button>
                                    <span className="flex-1 text-sm text-slate-700 dark:text-slate-200 font-medium">
                                      {task.title}
                                    </span>
                                    {task.is_recurring && (
                                      <span className="text-[10px] text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full font-medium">{t('tasks.recurring')}</span>
                                    )}
                                    {task.due_date && (
                                      <span className="flex-shrink-0 text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-0.5">
                                        <Clock size={10} />
                                        {new Date(task.due_date).toLocaleDateString()}
                                      </span>
                                    )}
                                  </motion.div>
                                ))}

                                {/* Completed tasks section */}
                                {completedTasks.length > 0 && (
                                  <>
                                    <div className="flex items-center gap-2 mt-3 mb-2">
                                      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                                        {completedTasks.length} {t('proj.completedTasks')}
                                      </span>
                                      <div className="h-px flex-1 bg-gray-200 dark:bg-slate-700/60" />
                                    </div>
                                    {completedTasks.map((task) => (
                                      <motion.div
                                        key={task.id}
                                        layout
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/50 group opacity-60"
                                      >
                                        <button
                                          onClick={(e) => { e.stopPropagation(); handleToggleTask(task); }}
                                          disabled={togglingTaskId === task.id}
                                          className="flex-shrink-0 transition-transform hover:scale-110"
                                        >
                                          <CheckCircle2 size={20} className="text-emerald-500" />
                                        </button>
                                        <span className="flex-1 text-sm text-gray-400 dark:text-gray-500 line-through">
                                          {task.title}
                                        </span>
                                      </motion.div>
                                    ))}
                                  </>
                                )}
                              </div>
                            )}

                            {/* Recent Sessions */}
                            {projectSessions.length > 0 && (
                              <div className="mt-4 pt-3 border-t border-gray-200/80 dark:border-slate-700/80">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                                    <Clock size={11} />
                                    {projectSessions.length} {t('proj.sessions')}
                                  </span>
                                  <div className="h-px flex-1 bg-gray-200 dark:bg-slate-700/60" />
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                                  {projectSessions.slice(0, 6).map((session) => {
                                    const hours = Math.floor(session.duration / 60);
                                    const mins = session.duration % 60;
                                    return (
                                      <div key={session.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700">
                                        <span className="text-[11px] text-gray-500 dark:text-gray-400">{session.session_date}</span>
                                        <span className="text-[11px] font-semibold text-slate-600 dark:text-gray-300">{hours > 0 ? `${hours}h ` : ''}{mins}m</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Progress bar at bottom */}
                            {projectTasks.length > 0 && (
                              <div className="mt-4 pt-3 border-t border-gray-200/80 dark:border-slate-700/80">
                                <div className="flex items-center justify-between text-xs mb-1.5">
                                  <span className="text-gray-400 dark:text-gray-500 font-medium">
                                    {completedTasks.length}/{projectTasks.length} {t('proj.completedTasks')}
                                  </span>
                                  <span className="text-slate-600 dark:text-gray-300 font-bold">
                                    {Math.round((completedTasks.length / projectTasks.length) * 100)}%
                                  </span>
                                </div>
                                <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(completedTasks.length / projectTasks.length) * 100}%` }}
                                    transition={{ duration: 0.5, ease: 'easeOut' }}
                                    className="h-full rounded-full"
                                    style={{ backgroundColor: project.color || '#10B981' }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ───── Trash Section ───── */}
      {deletedProjects.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Trash2 size={18} className="text-red-400" />
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{t('proj.trash')}</h2>
              <span className="text-xs bg-red-50 dark:bg-red-950 text-red-500 px-2 py-0.5 rounded-full">{deletedProjects.length}</span>
            </div>
            <button onClick={() => { if (confirm(t('proj.emptyTrashConfirm'))) { emptyTrash(); addToast(t('proj.emptyTrashSuccess'), 'success'); } }} className="text-xs text-red-400 hover:text-red-500 transition-colors font-medium">
              {t('proj.emptyTrash')}
            </button>
          </div>
          <div className="space-y-2">
            {deletedProjects.map(({ project, deletedAt }) => (
              <motion.div key={project.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center justify-between p-4 rounded-xl bg-red-50/50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${project.color || '#94a3b8'}15` }}>
                    <Folder size={16} style={{ color: project.color || '#94a3b8' }} />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">{project.name}</h4>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500">{t('proj.deletedAt')} {new Date(deletedAt).toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleRestore(project.id)} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-medium hover:bg-emerald-600 transition-colors">
                    <RotateCcw size={12} />{t('proj.restore')}
                  </button>
                  <button onClick={() => handlePermanentDelete(project.id)} className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-950 transition-colors">
                    <Trash2 size={14} className="text-red-400" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* ───── Create/Edit Modal ───── */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/30 dark:bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-xl border border-gray-100 dark:border-slate-700">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{isFolder ? (editingProject ? t('proj.editFolder') : t('proj.newFolder')) : (editingProject ? t('proj.editProject') : t('proj.newProject'))}</h2>
                <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"><X size={18} className="text-gray-400 dark:text-gray-500" /></button>
              </div>
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mb-4 ${isFolder ? 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                {isFolder ? <Folder size={12} /> : <FileText size={12} />}{isFolder ? t('proj.type') : t('proj.projectType')}
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">{isFolder ? t('proj.folderName') : t('proj.name')}</label>
                  <input type="text" value={name} onChange={(e) => { setName(e.target.value); setError(''); }} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 text-sm focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100" placeholder={isFolder ? t('proj.folderName') : t('proj.name')} autoFocus />
                  {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">{t('proj.description')}</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 text-sm focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 resize-none bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100" rows={2} placeholder={t('proj.descPlaceholder')} />
                </div>
                {!isFolder && availableFolders.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">{t('proj.insideFolder')}</label>
                    <select value={parentId || ''} onChange={(e) => setParentId(e.target.value || null)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 text-sm bg-white dark:bg-slate-700 focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 text-slate-800 dark:text-slate-100">
                      <option value="">{t('proj.noFolder')}</option>
                      {availableFolders.map((f) => (<option key={f.id} value={f.id}>{f.name}</option>))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">{t('proj.color')}</label>
                  <div className="flex gap-2">{COLORS.map((c) => (<button key={c} type="button" onClick={() => setColor(c)} className={`w-8 h-8 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 dark:ring-offset-slate-800 ring-slate-800 dark:ring-blue-500 scale-110' : ''}`} style={{ backgroundColor: c }} />))}</div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" className={`flex-1 py-2.5 text-white rounded-xl text-sm font-medium transition-colors ${isFolder ? 'bg-amber-500 hover:bg-amber-600' : 'bg-slate-800 dark:bg-blue-600 hover:bg-slate-700 dark:hover:bg-blue-700'}`}>{editingProject ? t('proj.save') : isFolder ? t('proj.createFolderBtn') : t('proj.create')}</button>
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2.5 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">{t('proj.cancel')}</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ───── Add Time Modal ───── */}
      <AnimatePresence>
        {showTimeModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/30 dark:bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowTimeModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-xl border border-gray-100 dark:border-slate-700">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{t('proj.addTimeTitle')}</h2>
                <button onClick={() => setShowTimeModal(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"><X size={18} className="text-gray-400 dark:text-gray-500" /></button>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{timeProjectName}</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">{t('proj.date')}</label>
                  <input type="date" value={timeDate} onChange={(e) => setTimeDate(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 text-slate-800 dark:text-slate-100" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">{t('proj.hours')}</label>
                    <input type="number" value={timeHours} onChange={(e) => setTimeHours(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 text-slate-800 dark:text-slate-100" min="0" max="24" step="0.5" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">{t('proj.minutes')}</label>
                    <input type="number" value={timeMinutes} onChange={(e) => setTimeMinutes(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 text-slate-800 dark:text-slate-100" min="0" max="59" step="5" />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={handleSaveTime} className="flex-1 py-2.5 bg-slate-800 dark:bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-slate-700 dark:hover:bg-blue-700 transition-colors">{t('proj.saveTime')}</button>
                  <button onClick={() => setShowTimeModal(false)} className="px-4 py-2.5 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">{t('proj.cancel')}</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ───── Project Detail Modal ───── */}
      <AnimatePresence>
        {showDetailModal && detailProject && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/30 dark:bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowDetailModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-xl border border-gray-100 dark:border-slate-700">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${detailProject.color}15` }}>
                    <FolderOpen size={24} style={{ color: detailProject.color || '#94a3b8' }} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{detailProject.name}</h2>
                    {detailProject.description && <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">{detailProject.description}</p>}
                  </div>
                </div>
                <button onClick={() => setShowDetailModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                  <X size={18} className="text-gray-400 dark:text-gray-500" />
                </button>
              </div>

              {/* Star rating (editable) */}
              <div className="mb-5">
                <span className="text-xs text-gray-400 dark:text-gray-500 mb-1.5 block">التقييم</span>
                <StarRating projectId={detailProject.id} size={22} />
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-gray-50 dark:bg-slate-900 rounded-xl p-3 text-center">
                  <span className="text-xs text-gray-400 dark:text-gray-500 block mb-1">تاريخ الإنشاء</span>
                  <span className="text-sm font-semibold text-emerald-500 dark:text-emerald-400">{formatDate(detailProject.created_at)}</span>
                </div>
                <div className="bg-gray-50 dark:bg-slate-900 rounded-xl p-3 text-center">
                  <span className="text-xs text-gray-400 dark:text-gray-500 block mb-1">إجمالي الوقت</span>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{detailTotalTime}</span>
                </div>
                <div className="bg-gray-50 dark:bg-slate-900 rounded-xl p-3 text-center">
                  <span className="text-xs text-gray-400 dark:text-gray-500 block mb-1">عدد الجلسات</span>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{detailSessions.length}</span>
                </div>
                <div className="bg-gray-50 dark:bg-slate-900 rounded-xl p-3 text-center">
                  <span className="text-xs text-gray-400 dark:text-gray-500 block mb-1">المهام</span>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{detailCompletedTasks.length} <span className="text-gray-400">/</span> {detailTasks.length}</span>
                </div>
              </div>

              {/* Progress bar */}
              {detailTasks.length > 0 && (
                <div className="mb-5">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-gray-400 dark:text-gray-500">تقدم المهام</span>
                    <span className="text-slate-600 dark:text-gray-300 font-medium">{Math.round((detailCompletedTasks.length / detailTasks.length) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-2">
                    <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${(detailCompletedTasks.length / detailTasks.length) * 100}%` }} />
                  </div>
                </div>
              )}

              {/* Last session info */}
              {lastSession && (
                <div className="bg-gray-50 dark:bg-slate-900 rounded-xl p-4 mb-5">
                  <span className="text-xs text-gray-400 dark:text-gray-500 block mb-2">آخر جلسة</span>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-gray-300">{lastSession.session_date}</span>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {lastSessionHours > 0 ? `${lastSessionHours}h ` : ''}{lastSessionMins}m
                    </span>
                  </div>
                </div>
              )}

              {/* Pending tasks list */}
              {detailPendingTasks.length > 0 && (
                <div className="mb-5">
                  <span className="text-xs text-gray-400 dark:text-gray-500 block mb-2">{detailPendingTasks.length} مهام معلقة</span>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {detailPendingTasks.map((task) => (
                      <div key={task.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700">
                        <Circle size={14} className="text-gray-300 dark:text-gray-600 flex-shrink-0" />
                        <span className="text-sm text-slate-700 dark:text-slate-200 truncate">{task.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Close button */}
              <button onClick={() => setShowDetailModal(false)} className="w-full py-2.5 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">
                إغلاق
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
