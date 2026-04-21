-- ============================================
-- Sabeel v2 Migration: Add project_id to goals
-- Run this in Supabase SQL Editor
-- ============================================

-- Add project_id column to goals
ALTER TABLE goals ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_goals_project_id ON goals(project_id);

-- Check constraints for data integrity
ALTER TABLE goals ADD CONSTRAINT IF NOT EXISTS chk_duration_positive CHECK (duration > 0);
ALTER TABLE goals ADD CONSTRAINT IF NOT EXISTS chk_goal_target_positive CHECK (target_value >= 0);
