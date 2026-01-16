-- =====================================================
-- KOUSHOLE - COMPLETE PROFILE ECOSYSTEM REBUILD
-- =====================================================
-- Run this script to completely fix the Profile system.
-- It recreates the table and sets up AUTO-SYNC triggers.
-- =====================================================

-- 1. DROP EXISTING TABLES (Clean Slate)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TABLE IF EXISTS public.profiles CASCADE;
-- Note: We keep learning_stats to preserve progress, or drop if you want full reset:
-- DROP TABLE IF EXISTS public.learning_stats CASCADE;

-- 2. CREATE PROFILES TABLE
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    email TEXT,
    
    -- Core Identity
    full_name TEXT,
    full_name_bn TEXT,
    nickname TEXT,
    nickname_bn TEXT,
    avatar_url TEXT,
    
    -- Education Details
    class TEXT DEFAULT '10',
    group_name TEXT, -- Valid for 9-10, 11-12, Uni. Null for 6-8.
    -- "group" TEXT, -- Removed to avoid ambiguity. App uses group_name.
    education_level TEXT,
    subject_group TEXT,
    university_name TEXT,
    department TEXT,
    
    -- Preferences
    preferred_language TEXT DEFAULT 'en',
    
    -- Legacy Stats (Optional, but kept for schema match if needed)
    -- We primarily use 'learning_stats' table for these, but adding here just in case.
    streak_count INTEGER DEFAULT 0,
    total_xp INTEGER DEFAULT 0,
    last_activity_date TIMESTAMPTZ,
    
    -- Metadata
    bio TEXT,
    phone TEXT,
    institution TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ENABLE RLS (Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" 
    ON public.profiles FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- 4. CREATE SYNC TRIGGER (The Magic Part 🪄)
-- This function automatically runs when a user Signs Up or Signs In (if we hook it right)
-- For Supabase Auth, we hook into INSERT on auth.users for Sign Ups.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (
        user_id, 
        email, 
        full_name, 
        avatar_url, 
        nickname
    )
    VALUES (
        new.id,
        new.email,
        -- Get Name from Metadata (Google/FB/Form)
        COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
        -- Get Avatar
        new.raw_user_meta_data->>'avatar_url',
        -- Generate Nickname from First Name
        split_part(COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), ' ', 1)
    )
    ON CONFLICT (user_id) DO UPDATE SET
        -- If user exists, sync latest metadata (Optional, useful for re-logins)
        full_name = EXCLUDED.full_name,
        avatar_url = EXCLUDED.avatar_url,
        email = EXCLUDED.email,
        updated_at = NOW();

    -- Also ensure Stats row exists
    INSERT INTO public.learning_stats (user_id, total_xp, created_at)
    VALUES (new.id, 0, NOW())
    ON CONFLICT (user_id) DO NOTHING;

    -- Send Welcome Notification 🚀
    INSERT INTO public.notifications (user_id, type, title, message)
    VALUES (
        new.id, 
        'system', 
        'Welcome to Koushole! 🎓', 
        'We are excited to have you here! Start by setting up your profile or taking your first quiz to earn a badge.'
    );

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. APPLY TRIGGER
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. BACKFILL EXISTING USERS (Fix current broken profiles)
-- This manually runs the logic for everyone currently in auth.users
INSERT INTO public.profiles (user_id, email, full_name, avatar_url, nickname)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(email, '@', 1)),
    raw_user_meta_data->>'avatar_url',
    split_part(COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(email, '@', 1)), ' ', 1)
FROM auth.users
ON CONFLICT (user_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url,
    email = EXCLUDED.email;

-- 7. BACKFILL STATS (Just in case)
INSERT INTO public.learning_stats (user_id, total_xp)
SELECT id, 0 FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- =====================================================
-- ✅ DONE! Profiles are fixed and auto-sync is active.
-- =====================================================
