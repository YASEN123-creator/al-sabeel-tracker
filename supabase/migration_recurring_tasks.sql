-- ============================================
-- Sabeel - Recurring Tasks Migration
-- ============================================

-- Add is_recurring column to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE;

-- Update goals table to have project_id if not already added
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'goals' AND column_name = 'project_id'
  ) THEN
    ALTER TABLE goals ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for recurring tasks
CREATE INDEX IF NOT EXISTS idx_tasks_is_recurring ON tasks(is_recurring);
CREATE INDEX IF NOT EXISTS idx_goals_project_id ON goals(project_id);
