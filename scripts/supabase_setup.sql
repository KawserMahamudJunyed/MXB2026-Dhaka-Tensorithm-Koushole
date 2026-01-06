-- =====================================================
-- KOUSHOLE - COMPLETE SUPABASE SETUP
-- Run this in Supabase SQL Editor (in order)
-- =====================================================

-- =====================================================
-- STEP 1: PROFILES TABLE (User data)
-- =====================================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    education_level TEXT CHECK (education_level IN ('school', 'college', 'university')),
    class TEXT, -- '6', '7', '8', '9', '10', '11', '12'
    subject_group TEXT, -- 'science', 'business', 'humanities', 'general'
    university_name TEXT,
    department TEXT,
    preferred_language TEXT DEFAULT 'en',
    streak_count INTEGER DEFAULT 0,
    last_activity_date DATE,
    total_xp INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- =====================================================
-- STEP 2: LEARNING STATS TABLE (Progress tracking)
-- =====================================================
CREATE TABLE IF NOT EXISTS learning_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    chapter TEXT,
    total_questions INTEGER DEFAULT 0,
    correct_answers INTEGER DEFAULT 0,
    xp_earned INTEGER DEFAULT 0,
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE learning_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own stats" ON learning_stats
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stats" ON learning_stats
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stats" ON learning_stats
    FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- STEP 3: QUIZ ATTEMPTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    chapter TEXT,
    total_questions INTEGER NOT NULL,
    correct_answers INTEGER NOT NULL,
    score_percentage DECIMAL(5,2),
    xp_earned INTEGER DEFAULT 0,
    time_taken_seconds INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own attempts" ON quiz_attempts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own attempts" ON quiz_attempts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- STEP 4: CHAT HISTORY TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own chats" ON chat_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chats" ON chat_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own chats" ON chat_history
    FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- STEP 5: LIBRARY BOOKS TABLE (User uploads)
-- =====================================================
CREATE TABLE IF NOT EXISTS library_books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT, -- 'pdf', 'epub', 'txt', 'image'
    file_size_bytes BIGINT,
    is_processed BOOLEAN DEFAULT FALSE,
    chapters_extracted INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE library_books ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own books" ON library_books
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own books" ON library_books
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own books" ON library_books
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own books" ON library_books
    FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- STEP 6: BOOK CHAPTERS TABLE (Extracted chapters)
-- =====================================================
CREATE TABLE IF NOT EXISTS book_chapters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    library_book_id UUID REFERENCES library_books(id) ON DELETE CASCADE,
    resource_id UUID, -- For official resources
    chapter_number INTEGER DEFAULT 0,
    title_en TEXT,
    title_bn TEXT,
    page_start INTEGER,
    page_end INTEGER,
    content_extracted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE book_chapters ENABLE ROW LEVEL SECURITY;

-- RLS Policy for library book chapters (user's books)
CREATE POLICY "Users can view chapters of own books" ON book_chapters
    FOR SELECT USING (
        library_book_id IN (
            SELECT id FROM library_books WHERE user_id = auth.uid()
        )
        OR resource_id IS NOT NULL -- Official resources visible to all
    );

-- Allow service role to insert chapters (from API)
CREATE POLICY "Service can insert chapters" ON book_chapters
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Service can update chapters" ON book_chapters
    FOR UPDATE USING (true);

CREATE POLICY "Service can delete chapters" ON book_chapters
    FOR DELETE USING (true);

-- =====================================================
-- STEP 7: BOOK CONTENT TABLE (For RAG/Quiz generation)
-- =====================================================
CREATE TABLE IF NOT EXISTS book_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    library_book_id UUID REFERENCES library_books(id) ON DELETE CASCADE,
    resource_id UUID,
    chapter_id UUID REFERENCES book_chapters(id) ON DELETE CASCADE,
    content_text TEXT,
    embedding VECTOR(1536), -- For semantic search (optional)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE book_content ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view content of own books" ON book_content
    FOR SELECT USING (
        library_book_id IN (
            SELECT id FROM library_books WHERE user_id = auth.uid()
        )
        OR resource_id IS NOT NULL
    );

CREATE POLICY "Service can manage content" ON book_content
    FOR ALL USING (true);

-- =====================================================
-- STEP 8: OFFICIAL RESOURCES TABLE (Admin uploads)
-- =====================================================
CREATE TABLE IF NOT EXISTS official_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    class TEXT NOT NULL, -- '6', '7', '8', '9', '10', '9-10', '11', '12', '11-12'
    subject_group TEXT NOT NULL, -- 'science', 'business', 'humanities', 'general'
    version TEXT NOT NULL, -- 'bangla', 'english'
    file_url TEXT NOT NULL,
    file_size_bytes BIGINT,
    is_processed BOOLEAN DEFAULT FALSE,
    chapters_extracted INTEGER DEFAULT 0,
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE official_resources ENABLE ROW LEVEL SECURITY;

-- Everyone can read official resources
CREATE POLICY "Anyone can view official resources" ON official_resources
    FOR SELECT USING (true);

-- Only admins can insert (check in application code)
CREATE POLICY "Authenticated users can insert" ON official_resources
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- =====================================================
-- STEP 9: NOTIFICATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT,
    type TEXT, -- 'achievement', 'reminder', 'update'
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notifications" ON notifications
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- STEP 10: STORAGE BUCKETS
-- Run these in Storage settings or SQL
-- =====================================================

-- Create storage buckets (run in Supabase Dashboard > Storage)
-- Bucket 1: 'books' - For user uploads
-- Bucket 2: 'official-books' - For NCTB books

-- Storage policies (run after creating buckets):
-- For 'books' bucket:
CREATE POLICY "Users can upload own books" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'books' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view own books" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'books' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- For 'official-books' bucket:
CREATE POLICY "Anyone can view official books" ON storage.objects
    FOR SELECT USING (bucket_id = 'official-books');

CREATE POLICY "Authenticated can upload official books" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'official-books' AND 
        auth.uid() IS NOT NULL
    );

-- =====================================================
-- STEP 11: HELPER FUNCTIONS
-- =====================================================

-- Function to update profile on auth.users change
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update streak
CREATE OR REPLACE FUNCTION update_streak(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    last_date DATE;
    current_streak INTEGER;
BEGIN
    SELECT last_activity_date, streak_count INTO last_date, current_streak
    FROM profiles WHERE id = p_user_id;
    
    IF last_date = CURRENT_DATE - INTERVAL '1 day' THEN
        UPDATE profiles SET 
            streak_count = current_streak + 1,
            last_activity_date = CURRENT_DATE
        WHERE id = p_user_id;
    ELSIF last_date != CURRENT_DATE THEN
        UPDATE profiles SET 
            streak_count = 1,
            last_activity_date = CURRENT_DATE
        WHERE id = p_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- DONE! Your Supabase is ready for Koushole 🚀
-- =====================================================
