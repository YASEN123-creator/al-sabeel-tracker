import type { Project, Task, Session, Goal, UserSettings } from './types';

// Check if Supabase is configured with real credentials
function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return !!(url && key && !url.includes('placeholder') && !key.includes('placeholder') && key.length > 50);
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ==================== LocalStorage Helpers (Offline Mode) ====================
function getLocalData<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function setLocalData<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch { /* ignore */ }
}

function getLocalSingle<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ==================== Online Mode: Supabase with Retry ====================
let supabaseInstance: any = null;

async function getSupabase(): Promise<any> {
  if (supabaseInstance) return supabaseInstance;
  const mod = await import('@/lib/supabase');
  supabaseInstance = mod.supabase;
  return supabaseInstance;
}

class RateLimitError extends Error {
  constructor(message: string, public retryAfter: number) {
    super(message);
    this.name = 'RateLimitError';
  }
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const error = err as { message?: string; status?: number; code?: string };
      const isRateLimited = error?.status === 429 ||
        error?.message?.includes('rate limit') ||
        error?.message?.includes('Too many requests') ||
        error?.code === '429';

      if (isRateLimited && attempt < maxRetries) {
        const waitTime = Math.min(1000 * Math.pow(2, attempt), 8000);
        console.warn(`Rate limited. Retrying in ${waitTime}ms... (attempt ${attempt + 1}/${maxRetries})`);
        await sleep(waitTime);
        continue;
      }

      if (isRateLimited) {
        throw new RateLimitError('تم تجاوز الحد المسموح من الطلبات. حاول بعد قليل.', 10);
      }

      throw err;
    }
  }
  throw new Error('فشل بعد عدة محاولات');
}

const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 30_000;

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data as T;
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, data: unknown) {
  cache.set(key, { data, timestamp: Date.now() });
}

function clearCache() {
  cache.clear();
}

function isValidUserId(userId: string | null | undefined): boolean {
  return !!(userId && userId.length > 10 && userId.includes('-'));
}

// ==================== Projects ====================
export async function fetchProjects(userId: string): Promise<Project[]> {
  if (!isValidUserId(userId)) return [];

  if (!isSupabaseConfigured()) {
    return getLocalData<Project>('sabeel_projects');
  }

  const cacheKey = `projects_${userId}`;
  const cached = getCached<Project[]>(cacheKey);
  if (cached) return cached;

  return withRetry(async () => {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    const result = data || [];
    setCache(cacheKey, result);
    return result;
  });
}

export async function createProject(userId: string, project: { name: string; description?: string; color?: string; is_folder?: boolean; parent_id?: string | null }): Promise<Project> {
  if (!isValidUserId(userId)) throw new Error('المستخدم غير مسجل الدخول');

  if (!isSupabaseConfigured()) {
    const now = new Date().toISOString();
    const newProject: Project = {
      id: generateUUID(),
      user_id: userId,
      name: project.name,
      description: project.description || null,
      color: project.color || null,
      is_folder: project.is_folder || false,
      parent_id: project.parent_id || null,
      created_at: now,
      updated_at: now,
    };
    const all = getLocalData<Project>('sabeel_projects');
    all.unshift(newProject);
    setLocalData('sabeel_projects', all);
    return newProject;
  }

  const result = await withRetry(async () => {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from('projects')
      .insert({ user_id: userId, ...project })
      .select()
      .single();
    if (error) throw error;
    return data;
  });
  clearCache();
  return result;
}

export async function updateProject(id: string, userId: string, updates: Partial<Project>): Promise<Project> {
  if (!isValidUserId(userId)) throw new Error('المستخدم غير مسجل الدخول');

  if (!isSupabaseConfigured()) {
    const all = getLocalData<Project>('sabeel_projects');
    const idx = all.findIndex(p => p.id === id);
    if (idx === -1) throw new Error('لم يتم العثور على المشروع');
    all[idx] = { ...all[idx], ...updates, updated_at: new Date().toISOString() };
    setLocalData('sabeel_projects', all);
    return all[idx];
  }

  const result = await withRetry(async () => {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw error;
    if (!data) throw new Error('لم يتم العثور على المشروع أو ليس ملكك');
    return data;
  });
  clearCache();
  return result;
}

export async function deleteProject(id: string, userId: string): Promise<void> {
  if (!isValidUserId(userId)) throw new Error('المستخدم غير مسجل الدخول');

  if (!isSupabaseConfigured()) {
    const all = getLocalData<Project>('sabeel_projects');
    const filtered = all.filter(p => p.id !== id);
    setLocalData('sabeel_projects', filtered);
    return;
  }

  await withRetry(async () => {
    const supabase = await getSupabase();
    const { data, error } = await supabase.from('projects').delete().eq('id', id).eq('user_id', userId).select('id');
    if (error) throw error;
    if (!data || data.length === 0) throw new Error('لم يتم العثور على المشروع أو ليس ملكك');
  });
  clearCache();
}

// ==================== Tasks ====================
export async function fetchTasks(userId: string): Promise<Task[]> {
  if (!isValidUserId(userId)) return [];

  if (!isSupabaseConfigured()) {
    return getLocalData<Task>('sabeel_tasks');
  }

  const cacheKey = `tasks_${userId}`;
  const cached = getCached<Task[]>(cacheKey);
  if (cached) return cached;

  return withRetry(async () => {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    const result = data || [];
    setCache(cacheKey, result);
    return result;
  });
}

export async function createTask(userId: string, task: { title: string; description?: string | null; project_id?: string | null; due_date?: string | null; is_recurring?: boolean; recurring_days?: number[] | null }): Promise<Task> {
  if (!isValidUserId(userId)) throw new Error('المستخدم غير مسجل الدخول');

  if (!isSupabaseConfigured()) {
    const now = new Date().toISOString();
    const newTask: Task = {
      id: generateUUID(),
      user_id: userId,
      title: task.title,
      description: task.description || null,
      project_id: task.project_id || null,
      due_date: task.due_date || null,
      is_completed: false,
      is_recurring: task.is_recurring || false,
      recurring_days: task.recurring_days || null,
      created_at: now,
      updated_at: now,
    };
    const all = getLocalData<Task>('sabeel_tasks');
    all.unshift(newTask);
    setLocalData('sabeel_tasks', all);
    return newTask;
  }

  const result = await withRetry(async () => {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from('tasks')
      .insert({ user_id: userId, ...task })
      .select()
      .single();
    if (error) throw error;
    return data;
  });
  clearCache();
  return result;
}

export async function updateTask(id: string, userId: string, updates: Partial<Omit<Task, 'id' | 'user_id' | 'created_at'>>): Promise<Task> {
  if (!isValidUserId(userId)) throw new Error('المستخدم غير مسجل الدخول');

  if (!isSupabaseConfigured()) {
    const all = getLocalData<Task>('sabeel_tasks');
    const idx = all.findIndex(t => t.id === id);
    if (idx === -1) throw new Error('لم يتم العثور على المهمة');
    all[idx] = { ...all[idx], ...updates, updated_at: new Date().toISOString() };
    setLocalData('sabeel_tasks', all);
    return all[idx];
  }

  const result = await withRetry(async () => {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw error;
    if (!data) throw new Error('لم يتم العثور على المهمة أو ليست ملكك');
    return data;
  });
  clearCache();
  return result;
}

export async function deleteTask(id: string, userId: string): Promise<void> {
  if (!isValidUserId(userId)) throw new Error('المستخدم غير مسجل الدخول');

  if (!isSupabaseConfigured()) {
    const all = getLocalData<Task>('sabeel_tasks');
    const filtered = all.filter(t => t.id !== id);
    setLocalData('sabeel_tasks', filtered);
    return;
  }

  await withRetry(async () => {
    const supabase = await getSupabase();
    const { data, error } = await supabase.from('tasks').delete().eq('id', id).eq('user_id', userId).select('id');
    if (error) throw error;
    if (!data || data.length === 0) throw new Error('لم يتم العثور على المهمة أو ليست ملكك');
  });
  clearCache();
}

// ==================== Sessions ====================
export async function fetchSessions(userId: string): Promise<Session[]> {
  if (!isValidUserId(userId)) return [];

  if (!isSupabaseConfigured()) {
    return getLocalData<Session>('sabeel_sessions');
  }

  const cacheKey = `sessions_${userId}`;
  const cached = getCached<Session[]>(cacheKey);
  if (cached) return cached;

  return withRetry(async () => {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .order('session_date', { ascending: false });
    if (error) throw error;
    const result = data || [];
    setCache(cacheKey, result);
    return result;
  });
}

export async function createSession(userId: string, session: { project_id?: string | null; task_id?: string | null; start_time: string; end_time?: string | null; duration: number; session_date: string }): Promise<Session> {
  if (!isValidUserId(userId)) throw new Error('المستخدم غير مسجل الدخول');

  if (!isSupabaseConfigured()) {
    const now = new Date().toISOString();
    const newSession: Session = {
      id: generateUUID(),
      user_id: userId,
      project_id: session.project_id || null,
      task_id: session.task_id || null,
      start_time: session.start_time,
      end_time: session.end_time || null,
      duration: session.duration,
      session_date: session.session_date,
      created_at: now,
      updated_at: now,
    };
    const all = getLocalData<Session>('sabeel_sessions');
    all.unshift(newSession);
    setLocalData('sabeel_sessions', all);
    return newSession;
  }

  const result = await withRetry(async () => {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from('sessions')
      .insert({ user_id: userId, ...session })
      .select()
      .single();
    if (error) throw error;
    return data;
  });
  clearCache();
  return result;
}

export async function updateSession(id: string, userId: string, updates: Partial<Session>): Promise<Session> {
  if (!isValidUserId(userId)) throw new Error('المستخدم غير مسجل الدخول');

  if (!isSupabaseConfigured()) {
    const all = getLocalData<Session>('sabeel_sessions');
    const idx = all.findIndex(s => s.id === id);
    if (idx === -1) throw new Error('لم يتم العثور على الجلسة');
    all[idx] = { ...all[idx], ...updates, updated_at: new Date().toISOString() };
    setLocalData('sabeel_sessions', all);
    return all[idx];
  }

  const result = await withRetry(async () => {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from('sessions')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw error;
    if (!data) throw new Error('لم يتم العثور على الجلسة أو ليست ملكك');
    return data;
  });
  clearCache();
  return result;
}

export async function deleteSession(id: string, userId: string): Promise<void> {
  if (!isValidUserId(userId)) throw new Error('المستخدم غير مسجل الدخول');

  if (!isSupabaseConfigured()) {
    const all = getLocalData<Session>('sabeel_sessions');
    const filtered = all.filter(s => s.id !== id);
    setLocalData('sabeel_sessions', filtered);
    return;
  }

  await withRetry(async () => {
    const supabase = await getSupabase();
    const { data, error } = await supabase.from('sessions').delete().eq('id', id).eq('user_id', userId).select('id');
    if (error) throw error;
    if (!data || data.length === 0) throw new Error('لم يتم العثور على الجلسة أو ليست ملكك');
  });
  clearCache();
}

// ==================== Goals ====================
export async function fetchGoals(userId: string): Promise<Goal[]> {
  if (!isValidUserId(userId)) return [];

  if (!isSupabaseConfigured()) {
    return getLocalData<Goal>('sabeel_goals');
  }

  const cacheKey = `goals_${userId}`;
  const cached = getCached<Goal[]>(cacheKey);
  if (cached) return cached;

  return withRetry(async () => {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    const result = data || [];
    setCache(cacheKey, result);
    return result;
  });
}

export async function createGoal(userId: string, goal: { goal_type: string; target_value: number; project_id?: string | null }): Promise<Goal> {
  if (!isValidUserId(userId)) throw new Error('المستخدم غير مسجل الدخول');

  if (!isSupabaseConfigured()) {
    const now = new Date().toISOString();
    const newGoal: Goal = {
      id: generateUUID(),
      user_id: userId,
      project_id: goal.project_id || null,
      goal_type: goal.goal_type as Goal['goal_type'],
      target_value: goal.target_value,
      created_at: now,
      updated_at: now,
    };
    const all = getLocalData<Goal>('sabeel_goals');
    all.unshift(newGoal);
    setLocalData('sabeel_goals', all);
    return newGoal;
  }

  const result = await withRetry(async () => {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from('goals')
      .insert({ user_id: userId, ...goal })
      .select()
      .single();
    if (error) throw error;
    return data;
  });
  clearCache();
  return result;
}

export async function updateGoal(id: string, userId: string, updates: Partial<Goal>): Promise<Goal> {
  if (!isValidUserId(userId)) throw new Error('المستخدم غير مسجل الدخول');

  if (!isSupabaseConfigured()) {
    const all = getLocalData<Goal>('sabeel_goals');
    const idx = all.findIndex(g => g.id === id);
    if (idx === -1) throw new Error('لم يتم العثور على الهدف');
    all[idx] = { ...all[idx], ...updates, updated_at: new Date().toISOString() };
    setLocalData('sabeel_goals', all);
    return all[idx];
  }

  const result = await withRetry(async () => {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from('goals')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw error;
    if (!data) throw new Error('لم يتم العثور على الهدف أو ليس ملكك');
    return data;
  });
  clearCache();
  return result;
}

export async function deleteGoal(id: string, userId: string): Promise<void> {
  if (!isValidUserId(userId)) throw new Error('المستخدم غير مسجل الدخول');

  if (!isSupabaseConfigured()) {
    const all = getLocalData<Goal>('sabeel_goals');
    const filtered = all.filter(g => g.id !== id);
    setLocalData('sabeel_goals', filtered);
    return;
  }

  await withRetry(async () => {
    const supabase = await getSupabase();
    const { data, error } = await supabase.from('goals').delete().eq('id', id).eq('user_id', userId).select('id');
    if (error) throw error;
    if (!data || data.length === 0) throw new Error('لم يتم العثور على الهدف أو ليس ملكك');
  });
  clearCache();
}

// ==================== Settings ====================
export async function fetchSettings(userId: string): Promise<UserSettings | null> {
  if (!isValidUserId(userId)) return null;

  if (!isSupabaseConfigured()) {
    return getLocalSingle<UserSettings>('sabeel_settings');
  }

  const cacheKey = `settings_${userId}`;
  const cached = getCached<UserSettings | null>(cacheKey);
  if (cached !== null) return cached;

  return withRetry(async () => {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error && error.code !== 'PGRST116' && error.code !== 'PGRST205') throw error;
    const result = data || null;
    if (result) setCache(cacheKey, result);
    return result;
  });
}

export async function upsertSettings(userId: string, settings: Partial<UserSettings>): Promise<UserSettings> {
  if (!isValidUserId(userId)) throw new Error('المستخدم غير مسجل الدخول');

  if (!isSupabaseConfigured()) {
    const now = new Date().toISOString();
    const existing = getLocalSingle<UserSettings>('sabeel_settings');
    const newSettings: UserSettings = {
      id: existing?.id || generateUUID(),
      user_id: userId,
      enable_pomodoro: settings.enable_pomodoro ?? true,
      enable_goals: settings.enable_goals ?? true,
      enable_analytics: settings.enable_analytics ?? true,
      pomodoro_work_duration: settings.pomodoro_work_duration ?? 25,
      pomodoro_break_duration: settings.pomodoro_break_duration ?? 5,
      created_at: existing?.created_at || now,
      updated_at: now,
    };
    try {
      localStorage.setItem('sabeel_settings', JSON.stringify(newSettings));
    } catch { /* ignore */ }
    return newSettings;
  }

  const result = await withRetry(async () => {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from('user_settings')
      .upsert({ user_id: userId, ...settings }, { onConflict: 'user_id' })
      .select()
      .single();
    if (error) throw error;
    return data;
  });
  clearCache();
  return result;
}
