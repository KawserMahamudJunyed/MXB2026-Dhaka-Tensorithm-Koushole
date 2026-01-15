-- =====================================================
-- FIX NULL PROFILES (Brute Force Method)
-- =====================================================
-- Run this in Supabase SQL Editor to guarantee names are set.
-- =====================================================

-- 1. First attempt: Try to get name from Auth Metadata
UPDATE public.profiles
SET full_name = (
    SELECT raw_user_meta_data->>'full_name' 
    FROM auth.users 
    WHERE auth.users.id = public.profiles.user_id
)
WHERE full_name IS NULL;

-- 2. Second attempt: If metadata is empty, use Email Prefix as name
-- This GUARANTEES a name will be set if the user has an email
UPDATE public.profiles
SET full_name = (
    SELECT split_part(email, '@', 1) 
    FROM auth.users 
    WHERE auth.users.id = public.profiles.user_id
)
WHERE full_name IS NULL 
   OR full_name = '';

-- 3. Update Nickname from Full Name (First Word)
UPDATE public.profiles
SET nickname = split_part(full_name, ' ', 1)
WHERE (nickname IS NULL OR nickname = '') 
  AND full_name IS NOT NULL;

-- 4. Verify results
SELECT id, email, full_name, nickname FROM public.profiles;
