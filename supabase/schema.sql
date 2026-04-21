-- ============================================
-- Sabeel - السبيل Database Schema (Idempotent)
-- Safe to run multiple times
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Clean up existing objects (safe drops)
-- ============================================
DO $$ BEGIN
  -- Drop triggers
  DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
  DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
  DROP TRIGGER IF EXISTS update_sessions_updated_at ON sessions;
  DROP TRIGGER IF EXISTS update_goals_updated_at ON goals;
  DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  -- Drop indexes
  DROP INDEX IF EXISTS idx_projects_user_id;
  DROP INDEX IF EXISTS idx_projects_parent_id;
  DROP INDEX IF EXISTS idx_tasks_user_id;
  DROP INDEX IF EXISTS idx_tasks_project_id;
  DROP INDEX IF EXISTS idx_tasks_is_recurring;
  DROP INDEX IF EXISTS idx_sessions_user_id;
  DROP INDEX IF EXISTS idx_sessions_project_id;
  DROP INDEX IF EXISTS idx_sessions_session_date;
  DROP INDEX IF EXISTS idx_goals_user_id;
  DROP INDEX IF EXISTS idx_goals_project_id;
  DROP INDEX IF EXISTS idx_user_settings_user_id;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  -- Drop policies - projects
  DROP POLICY IF EXISTS "Users can view their own projects" ON projects;
  DROP POLICY IF EXISTS "Users can create their own projects" ON projects;
  DROP POLICY IF EXISTS "Users can update their own projects" ON projects;
  DROP POLICY IF EXISTS "Users can delete their own projects" ON projects;
  -- Drop policies - tasks
  DROP POLICY IF EXISTS "Users can view their own tasks" ON tasks;
  DROP POLICY IF EXISTS "Users can create their own tasks" ON tasks;
  DROP POLICY IF EXISTS "Users can update their own tasks" ON tasks;
  DROP POLICY IF EXISTS "Users can delete their own tasks" ON tasks;
  -- Drop policies - sessions
  DROP POLICY IF EXISTS "Users can view their own sessions" ON sessions;
  DROP POLICY IF EXISTS "Users can create their own sessions" ON sessions;
  DROP POLICY IF EXISTS "Users can update their own sessions" ON sessions;
  DROP POLICY IF EXISTS "Users can delete their own sessions" ON sessions;
  -- Drop policies - goals
  DROP POLICY IF EXISTS "Users can view their own goals" ON goals;
  DROP POLICY IF EXISTS "Users can create their own goals" ON goals;
  DROP POLICY IF EXISTS "Users can update their own goals" ON goals;
  DROP POLICY IF EXISTS "Users can delete their own goals" ON goals;
  -- Drop policies - user_settings
  DROP POLICY IF EXISTS "Users can view their own settings" ON user_settings;
  DROP POLICY IF EXISTS "Users can create their own settings" ON user_settings;
  DROP POLICY IF EXISTS "Users can update their own settings" ON user_settings;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  -- Drop function
  DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  -- Drop tables (order matters due to FK constraints)
  DROP TABLE IF EXISTS user_settings CASCADE;
  DROP TABLE IF EXISTS goals CASCADE;
  DROP TABLE IF EXISTS sessions CASCADE;
  DROP TABLE IF EXISTS tasks CASCADE;
  DROP TABLE IF EXISTS projects CASCADE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================
-- Recreate all tables
-- ============================================

-- Projects Table (with folder support)
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#1E293B',
  is_folder BOOLEAN DEFAULT FALSE,
  parent_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own projects"
  ON projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
  ON projects FOR DELETE
  USING (auth.uid() = user_id);

-- Tasks Table
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_completed BOOLEAN DEFAULT FALSE,
  is_recurring BOOLEAN DEFAULT FALSE,
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tasks"
  ON tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tasks"
  ON tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks"
  ON tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks"
  ON tasks FOR DELETE
  USING (auth.uid() = user_id);

-- Sessions Table (Pomodoro / Time Tracking)
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  start_time TIMESTAMPTZ DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  duration INTEGER DEFAULT 0,
  session_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sessions"
  ON sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sessions"
  ON sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
  ON sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions"
  ON sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Goals Table
CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('daily_hours', 'weekly_hours', 'daily_tasks', 'weekly_tasks')),
  target_value DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own goals"
  ON goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own goals"
  ON goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals"
  ON goals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals"
  ON goals FOR DELETE
  USING (auth.uid() = user_id);

-- User Settings Table
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  enable_pomodoro BOOLEAN DEFAULT TRUE,
  enable_goals BOOLEAN DEFAULT TRUE,
  enable_analytics BOOLEAN DEFAULT TRUE,
  pomodoro_work_duration INTEGER DEFAULT 25,
  pomodoro_break_duration INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own settings"
  ON user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own settings"
  ON user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON user_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- Indexes for Performance
-- ============================================
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_parent_id ON projects(parent_id);
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_is_recurring ON tasks(is_recurring);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_project_id ON sessions(project_id);
CREATE INDEX idx_sessions_session_date ON sessions(session_date);
CREATE INDEX idx_goals_user_id ON goals(user_id);
CREATE INDEX idx_goals_project_id ON goals(project_id);
CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);

-- ============================================
-- Auto-update updated_at trigger
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
