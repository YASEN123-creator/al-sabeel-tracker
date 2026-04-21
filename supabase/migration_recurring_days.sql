-- ============================================
-- Sabeel - Recurring Days Migration
-- ============================================

-- Add recurring_days column to tasks table
-- Uses integer array: [0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday]
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurring_days INTEGER[] DEFAULT NULL;

-- Create index for recurring_days queries
CREATE INDEX IF NOT EXISTS idx_tasks_recurring_days ON tasks USING GIN (recurring_days);
