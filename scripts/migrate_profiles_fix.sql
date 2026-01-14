-- =====================================================
-- MIGRATION: Fix profiles table schema
-- Run this in Supabase SQL Editor to update existing table
-- =====================================================

-- Step 1: Add missing columns
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS user_id UUID,
ADD COLUMN IF NOT EXISTS full_name_bn TEXT,
ADD COLUMN IF NOT EXISTS nickname TEXT,
ADD COLUMN IF NOT EXISTS nickname_bn TEXT,
ADD COLUMN IF NOT EXISTS group_name TEXT DEFAULT 'Science';

-- Step 2: Copy id to user_id if user_id is null
UPDATE profiles SET user_id = id WHERE user_id IS NULL;

-- Step 3: Set defaults for class if null
UPDATE profiles SET class = '10' WHERE class IS NULL;
UPDATE profiles SET group_name = 'Science' WHERE group_name IS NULL;

-- Step 4: Add constraint (if not exists - may fail if already exists, that's OK)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'profiles_user_id_key'
    ) THEN
        ALTER TABLE profiles ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL; -- Ignore if constraint already exists
END $$;

-- Step 5: Update RLS policies to use user_id
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = user_id OR auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() = id);

-- Step 6: Update the trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, email)
    VALUES (NEW.id, NEW.email)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Update streak function to use user_id
CREATE OR REPLACE FUNCTION update_streak(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    last_date DATE;
    current_streak INTEGER;
BEGIN
    SELECT last_activity_date, streak_count INTO last_date, current_streak
    FROM profiles WHERE user_id = p_user_id OR id = p_user_id;
    
    IF last_date = CURRENT_DATE - INTERVAL '1 day' THEN
        UPDATE profiles SET 
            streak_count = current_streak + 1,
            last_activity_date = CURRENT_DATE
        WHERE user_id = p_user_id OR id = p_user_id;
    ELSIF last_date != CURRENT_DATE THEN
        UPDATE profiles SET 
            streak_count = 1,
            last_activity_date = CURRENT_DATE
        WHERE user_id = p_user_id OR id = p_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ✅ MIGRATION COMPLETE!
-- =====================================================
-- Your profiles table now has:
-- - user_id column (for compatibility)
-- - full_name_bn, nickname, nickname_bn columns
-- - group_name column with 'Science' default
-- - class column with '10' default
-- =====================================================

-- =====================================================
-- BONUS: Fix official_resources table
-- =====================================================
ALTER TABLE official_resources ADD COLUMN IF NOT EXISTS class_level TEXT;
