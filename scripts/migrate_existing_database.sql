-- =====================================================
-- KOUSHOLE - DATABASE MIGRATION (Run on EXISTING Supabase)
-- =====================================================
-- 
-- This script adds MISSING columns to your existing database.
-- Safe to run multiple times - uses IF NOT EXISTS.
--
-- Run this in: Supabase Dashboard > SQL Editor
-- =====================================================

-- =====================================================
-- 1. UPDATE learning_stats TABLE
-- =====================================================
ALTER TABLE learning_stats ADD COLUMN IF NOT EXISTS total_xp INTEGER DEFAULT 0;
ALTER TABLE learning_stats ADD COLUMN IF NOT EXISTS accuracy_percentage INTEGER DEFAULT 0;
ALTER TABLE learning_stats ADD COLUMN IF NOT EXISTS total_quizzes_completed INTEGER DEFAULT 0;
ALTER TABLE learning_stats ADD COLUMN IF NOT EXISTS total_questions_answered INTEGER DEFAULT 0;
ALTER TABLE learning_stats ADD COLUMN IF NOT EXISTS total_correct_answers INTEGER DEFAULT 0;
ALTER TABLE learning_stats ADD COLUMN IF NOT EXISTS day_streak INTEGER DEFAULT 0;
ALTER TABLE learning_stats ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0;
ALTER TABLE learning_stats ADD COLUMN IF NOT EXISTS last_quiz_date DATE;
ALTER TABLE learning_stats ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- =====================================================
-- 2. UPDATE quiz_attempts TABLE
-- =====================================================
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS topic TEXT;
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'Medium';

-- Create index for faster queries (if not exists)
CREATE INDEX IF NOT EXISTS quiz_attempts_user_date_idx ON quiz_attempts(user_id, created_at DESC);

-- =====================================================
-- 3. UPDATE book_chapters TABLE (if exists)
-- =====================================================
-- Make sure it has the right structure
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'book_chapters') THEN
        -- Add missing columns
        ALTER TABLE book_chapters ADD COLUMN IF NOT EXISTS title VARCHAR;
        ALTER TABLE book_chapters ADD COLUMN IF NOT EXISTS start_page INTEGER;
        ALTER TABLE book_chapters ADD COLUMN IF NOT EXISTS end_page INTEGER;
    END IF;
END $$;

-- =====================================================
-- 4. VERIFY SUCCESS
-- =====================================================
SELECT 'learning_stats columns:' as info, 
       array_agg(column_name) as columns
FROM information_schema.columns 
WHERE table_name = 'learning_stats';

SELECT 'quiz_attempts columns:' as info,
       array_agg(column_name) as columns
FROM information_schema.columns 
WHERE table_name = 'quiz_attempts';

-- =====================================================
-- ✅ MIGRATION COMPLETE!
-- =====================================================
-- 
-- If successful, you'll see the column lists above.
-- Expected columns in learning_stats:
--   - total_xp, accuracy_percentage, day_streak, longest_streak, etc.
-- Expected columns in quiz_attempts:
--   - topic, difficulty, correct_answers, etc.
-- =====================================================
