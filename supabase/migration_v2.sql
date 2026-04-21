-- ============================================
-- Sabeel v2 - Complete Migration
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Add is_recurring column to tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE;

-- 2. Add project_id column to goals
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'goals' AND column_name = 'project_id'
  ) THEN
    ALTER TABLE goals ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_is_recurring ON tasks(is_recurring);
CREATE INDEX IF NOT EXISTS idx_goals_project_id ON goals(project_id);
