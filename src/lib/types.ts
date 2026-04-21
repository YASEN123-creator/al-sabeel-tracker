export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string | null;
  is_folder: boolean;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  is_completed: boolean;
  is_recurring: boolean;
  recurring_days: number[] | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  project_id: string | null;
  task_id: string | null;
  start_time: string;
  end_time: string | null;
  duration: number;
  session_date: string;
  created_at: string;
  updated_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  project_id: string | null;
  goal_type: 'daily_hours' | 'weekly_hours' | 'daily_tasks' | 'weekly_tasks';
  target_value: number;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  enable_pomodoro: boolean;
  enable_goals: boolean;
  enable_analytics: boolean;
  pomodoro_work_duration: number;
  pomodoro_break_duration: number;
  created_at: string;
  updated_at: string;
}

export interface DeletedProject {
  project: Project;
  deletedAt: string;
}

export interface LibraryResource {
  id: string;
  name: string;
  type: 'book' | 'article' | 'pdf' | 'link' | 'note' | 'other';
  category: string;
  url: string;
  description: string;
  createdAt: string;
}

export interface VideoItem {
  id: string;
  name: string;
  category: string;
  url: string;
  duration: string;
  description: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'timer' | 'task' | 'goal' | 'streak' | 'resource' | 'video' | 'info';
  read: boolean;
  createdAt: string;
}

export type ActiveView = 'dashboard' | 'projects' | 'tasks' | 'sessions' | 'analytics' | 'goals' | 'settings' | 'library' | 'notifications' | 'video';

export type TimerState = 'idle' | 'running' | 'paused' | 'break';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}
