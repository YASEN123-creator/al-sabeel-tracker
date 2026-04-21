import { create } from 'zustand';
import type { Project, Task, Session, Goal, UserSettings, ActiveView, TimerState, Toast, DeletedProject, LibraryResource, VideoItem, AppNotification } from './types';
import type { Lang } from './i18n';

interface AppState {
  userId: string | null;
  setUserId: (id: string | null) => void;

  userEmail: string | null;
  setUserEmail: (email: string | null) => void;

  language: Lang;
  setLanguage: (lang: Lang) => void;

  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;

  dataLoading: boolean;
  setDataLoading: (loading: boolean) => void;

  projects: Project[];
  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  updateProject: (project: Project) => void;
  removeProject: (id: string) => void;

  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (task: Task) => void;
  removeTask: (id: string) => void;

  sessions: Session[];
  setSessions: (sessions: Session[]) => void;
  addSession: (session: Session) => void;
  updateSession: (session: Session) => void;
  removeSession: (id: string) => void;

  goals: Goal[];
  setGoals: (goals: Goal[]) => void;
  addGoal: (goal: Goal) => void;
  updateGoal: (goal: Goal) => void;
  removeGoal: (id: string) => void;

  settings: UserSettings | null;
  setSettings: (settings: UserSettings) => void;

  timerState: TimerState;
  setTimerState: (state: TimerState) => void;
  timerSeconds: number;
  setTimerSeconds: (seconds: number) => void;
  timerStartedAt: number | null;
  setTimerStartedAt: (t: number | null) => void;
  timerTotalAtStart: number;
  setTimerTotalAtStart: (t: number) => void;
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;
  activeTaskId: string | null;
  setActiveTaskId: (id: string | null) => void;

  startTimer: (() => void) | null;
  setStartTimer: (fn: (() => void) | null) => void;
  pauseTimer: (() => void) | null;
  setPauseTimer: (fn: (() => void) | null) => void;
  resumeTimer: (() => void) | null;
  setResumeTimer: (fn: (() => void) | null) => void;
  skipTimer: (() => void) | null;
  setSkipTimer: (fn: (() => void) | null) => void;
  resetTimer: (() => void) | null;
  setResetTimer: (fn: (() => void) | null) => void;

  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  toasts: Toast[];
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;

  darkMode: boolean;
  toggleDarkMode: () => void;

  deletedProjects: DeletedProject[];
  moveToTrash: (project: Project) => void;
  restoreFromTrash: (projectId: string) => void;
  emptyTrash: () => void;

  projectRatings: Record<string, number>;
  setProjectRating: (projectId: string, rating: number) => void;

  libraryResources: LibraryResource[];
  addLibraryResource: (resource: LibraryResource) => void;
  updateLibraryResource: (resource: LibraryResource) => void;
  removeLibraryResource: (id: string) => void;

  videoItems: VideoItem[];
  addVideoItem: (video: VideoItem) => void;
  updateVideoItem: (video: VideoItem) => void;
  removeVideoItem: (id: string) => void;

  notifications: AppNotification[];
  addNotification: (notification: AppNotification) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  clearNotifications: () => void;
  unreadCount: () => number;
}

export const useAppStore = create<AppState>((set) => ({
  userId: null,
  setUserId: (userId) => set({ userId }),

  userEmail: null,
  setUserEmail: (userEmail) => set({ userEmail }),

  language: (typeof window !== 'undefined' && localStorage.getItem('sabeel_lang') as Lang) || 'ar',
  setLanguage: (language) => {
    if (typeof window !== 'undefined') localStorage.setItem('sabeel_lang', language);
    set({ language });
  },

  activeView: 'dashboard',
  setActiveView: (view) => set({ activeView: view }),

  dataLoading: true,
  setDataLoading: (dataLoading) => set({ dataLoading }),

  projects: [],
  setProjects: (projects) => set({ projects }),
  addProject: (project) => set((s) => ({ projects: [...s.projects, project] })),
  updateProject: (project) => set((s) => ({ projects: s.projects.map((p) => (p.id === project.id ? project : p)) })),
  removeProject: (id) => set((s) => ({ projects: s.projects.filter((p) => p.id !== id) })),

  tasks: [],
  setTasks: (tasks) => set({ tasks }),
  addTask: (task) => set((s) => ({ tasks: [...s.tasks, task] })),
  updateTask: (task) => set((s) => ({ tasks: s.tasks.map((t) => (t.id === task.id ? task : t)) })),
  removeTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

  sessions: [],
  setSessions: (sessions) => set({ sessions }),
  addSession: (session) => set((s) => ({ sessions: [...s.sessions, session] })),
  updateSession: (session) => set((s) => ({ sessions: s.sessions.map((se) => (se.id === session.id ? session : se)) })),
  removeSession: (id) => set((s) => ({ sessions: s.sessions.filter((se) => se.id !== id) })),

  goals: [],
  setGoals: (goals) => set({ goals }),
  addGoal: (goal) => set((s) => ({ goals: [...s.goals, goal] })),
  updateGoal: (goal) => set((s) => ({ goals: s.goals.map((g) => (g.id === goal.id ? goal : g)) })),
  removeGoal: (id) => set((s) => ({ goals: s.goals.filter((g) => g.id !== id) })),

  settings: null,
  setSettings: (settings) => set({ settings }),

  timerState: 'idle',
  setTimerState: (timerState) => set({ timerState }),
  timerSeconds: 25 * 60,
  setTimerSeconds: (timerSeconds) => set({ timerSeconds }),
  timerStartedAt: null,
  setTimerStartedAt: (timerStartedAt) => set({ timerStartedAt }),
  timerTotalAtStart: 25 * 60,
  setTimerTotalAtStart: (timerTotalAtStart) => set({ timerTotalAtStart }),
  activeProjectId: null,
  setActiveProjectId: (activeProjectId) => set({ activeProjectId }),
  activeTaskId: null,
  setActiveTaskId: (activeTaskId) => set({ activeTaskId }),

  startTimer: null,
  setStartTimer: (fn) => set({ startTimer: fn }),
  pauseTimer: null,
  setPauseTimer: (fn) => set({ pauseTimer: fn }),
  resumeTimer: null,
  setResumeTimer: (fn) => set({ resumeTimer: fn }),
  skipTimer: null,
  setSkipTimer: (fn) => set({ skipTimer: fn }),
  resetTimer: null,
  setResetTimer: (fn) => set({ resetTimer: fn }),

  // Default sidebar state: open on desktop, closed on mobile
  isSidebarOpen: typeof window !== 'undefined' ? window.innerWidth >= 768 : true,
  toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),
  setSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),

  toasts: [],
  addToast: (message, type) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => {
      useAppStore.getState().removeToast(id);
    }, 3000);
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  darkMode: typeof window !== 'undefined' ? localStorage.getItem('sabeel_dark') === 'true' : false,
  toggleDarkMode: () => set((s) => {
    const next = !s.darkMode;
    if (typeof window !== 'undefined') localStorage.setItem('sabeel_dark', String(next));
    return { darkMode: next };
  }),

  deletedProjects: typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('sabeel_trash') || '[]') : [],
  moveToTrash: (project) => {
    const deletedItem: DeletedProject = { project, deletedAt: new Date().toISOString() };
    set((s) => {
      const updated = [...s.deletedProjects, deletedItem];
      if (typeof window !== 'undefined') localStorage.setItem('sabeel_trash', JSON.stringify(updated));
      return { deletedProjects: updated, projects: s.projects.filter((p) => p.id !== project.id) };
    });
  },
  restoreFromTrash: (projectId) => {
    set((s) => {
      const item = s.deletedProjects.find((d) => d.project.id === projectId);
      if (!item) return s;
      const updated = s.deletedProjects.filter((d) => d.project.id !== projectId);
      if (typeof window !== 'undefined') localStorage.setItem('sabeel_trash', JSON.stringify(updated));
      return { deletedProjects: updated, projects: [item.project, ...s.projects] };
    });
  },
  emptyTrash: () => {
    if (typeof window !== 'undefined') localStorage.setItem('sabeel_trash', '[]');
    set({ deletedProjects: [] });
  },

  projectRatings: typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('sabeel_ratings') || '{}') : {},
  setProjectRating: (projectId, rating) => {
    set((s) => {
      const updated = { ...s.projectRatings, [projectId]: rating };
      if (typeof window !== 'undefined') localStorage.setItem('sabeel_ratings', JSON.stringify(updated));
      return { projectRatings: updated };
    });
  },

  libraryResources: typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('sabeel_library') || '[]') : [],
  addLibraryResource: (resource) => {
    set((s) => {
      const updated = [...s.libraryResources, resource];
      if (typeof window !== 'undefined') localStorage.setItem('sabeel_library', JSON.stringify(updated));
      return { libraryResources: updated };
    });
  },
  updateLibraryResource: (resource) => {
    set((s) => {
      const updated = s.libraryResources.map((r) => (r.id === resource.id ? resource : r));
      if (typeof window !== 'undefined') localStorage.setItem('sabeel_library', JSON.stringify(updated));
      return { libraryResources: updated };
    });
  },
  removeLibraryResource: (id) => {
    set((s) => {
      const updated = s.libraryResources.filter((r) => r.id !== id);
      if (typeof window !== 'undefined') localStorage.setItem('sabeel_library', JSON.stringify(updated));
      return { libraryResources: updated };
    });
  },

  videoItems: typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('sabeel_videos') || '[]') : [],
  addVideoItem: (video) => {
    set((s) => {
      const updated = [...s.videoItems, video];
      if (typeof window !== 'undefined') localStorage.setItem('sabeel_videos', JSON.stringify(updated));
      return { videoItems: updated };
    });
  },
  updateVideoItem: (video) => {
    set((s) => {
      const updated = s.videoItems.map((v) => (v.id === video.id ? video : v));
      if (typeof window !== 'undefined') localStorage.setItem('sabeel_videos', JSON.stringify(updated));
      return { videoItems: updated };
    });
  },
  removeVideoItem: (id) => {
    set((s) => {
      const updated = s.videoItems.filter((v) => v.id !== id);
      if (typeof window !== 'undefined') localStorage.setItem('sabeel_videos', JSON.stringify(updated));
      return { videoItems: updated };
    });
  },

  notifications: typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('sabeel_notifications') || '[]') : [],
  addNotification: (notification) => {
    set((s) => {
      const updated = [notification, ...s.notifications].slice(0, 50);
      if (typeof window !== 'undefined') localStorage.setItem('sabeel_notifications', JSON.stringify(updated));
      return { notifications: updated };
    });
  },
  markNotificationRead: (id) => {
    set((s) => {
      const updated = s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
      if (typeof window !== 'undefined') localStorage.setItem('sabeel_notifications', JSON.stringify(updated));
      return { notifications: updated };
    });
  },
  markAllNotificationsRead: () => {
    set((s) => {
      const updated = s.notifications.map((n) => ({ ...n, read: true }));
      if (typeof window !== 'undefined') localStorage.setItem('sabeel_notifications', JSON.stringify(updated));
      return { notifications: updated };
    });
  },
  clearNotifications: () => {
    if (typeof window !== 'undefined') localStorage.setItem('sabeel_notifications', '[]');
    set({ notifications: [] });
  },
  unreadCount: () => {
    return useAppStore.getState().notifications.filter((n) => !n.read).length;
  },
}));
