-- =====================================================
-- FIX: Library Books Visibility - Only Uploader Can See
-- =====================================================
-- Run this in Supabase SQL Editor to fix library visibility

-- 1. Make sure RLS is enabled
ALTER TABLE library_books ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies and recreate
DROP POLICY IF EXISTS "Users can view own books" ON library_books;
DROP POLICY IF EXISTS "Users can insert own books" ON library_books;
DROP POLICY IF EXISTS "Users can update own books" ON library_books;
DROP POLICY IF EXISTS "Users can delete own books" ON library_books;
DROP POLICY IF EXISTS "Anyone can view library books" ON library_books;
DROP POLICY IF EXISTS "Public can view library books" ON library_books;

-- 3. Create strict user-only policies
CREATE POLICY "Users can view own books" ON library_books
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own books" ON library_books
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own books" ON library_books
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own books" ON library_books
    FOR DELETE USING (auth.uid() = user_id);

-- 4. Verify - this should show only your books
SELECT COUNT(*) as my_books_count FROM library_books;
