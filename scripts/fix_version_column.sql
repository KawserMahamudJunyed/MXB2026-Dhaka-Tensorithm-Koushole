-- Run this in Supabase SQL Editor to fix the error
ALTER TABLE official_resources 
ADD COLUMN IF NOT EXISTS version TEXT DEFAULT 'english';

-- Update existing records if needed (optional)
UPDATE official_resources SET version = 'english' WHERE version IS NULL;
