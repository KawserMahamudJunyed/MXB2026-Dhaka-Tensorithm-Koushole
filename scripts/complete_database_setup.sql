-- =====================================================
-- KOUSHOLE - COMPLETE DATABASE SETUP (ALL-IN-ONE)
-- =====================================================
-- 
-- HOW TO USE:
-- 1. Go to Supabase Dashboard > SQL Editor
-- 2. Create a new query
-- 3. Copy and paste this ENTIRE file
-- 4. Click "Run" to execute all commands
--
-- This includes:
-- ✅ All tables (profiles, stats, quiz, chat, books)
-- ✅ Row Level Security (RLS) policies
-- ✅ Vector embeddings for RAG (pgvector)
-- ✅ Semantic search function
-- ✅ Bangla translation support
-- ✅ Storage policies
-- =====================================================

-- =====================================================
-- PART 1: ENABLE EXTENSIONS
-- =====================================================
CREATE EXTENSION IF NOT EXISTS vector;

-- =====================================================
-- PART 2: CORE TABLES
-- =====================================================

-- PROFILES TABLE (User data - matches original schema)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    full_name_bn TEXT,
    nickname TEXT,
    nickname_bn TEXT,
    class TEXT DEFAULT '10',
    group_name TEXT, -- NULL for Class 6-8, Science/Business/Humanities for 9+
    avatar_url TEXT,
    education_level TEXT CHECK (education_level IN ('school', 'college', 'university')),
    subject_group TEXT,
    university_name TEXT,
    department TEXT,
    preferred_language TEXT DEFAULT 'en',
    streak_count INTEGER DEFAULT 0,
    last_activity_date DATE,
    total_xp INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- LEARNING STATS TABLE
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

ALTER TABLE learning_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own stats" ON learning_stats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own stats" ON learning_stats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own stats" ON learning_stats FOR UPDATE USING (auth.uid() = user_id);

-- QUIZ ATTEMPTS TABLE
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

ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own attempts" ON quiz_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own attempts" ON quiz_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);

-- CHAT HISTORY TABLE
CREATE TABLE IF NOT EXISTS chat_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own chats" ON chat_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own chats" ON chat_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own chats" ON chat_history FOR DELETE USING (auth.uid() = user_id);

-- NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT,
    type TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- PART 3: LIBRARY & OFFICIAL BOOKS
-- =====================================================

-- LIBRARY BOOKS TABLE (User uploads)
CREATE TABLE IF NOT EXISTS library_books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    title_bn TEXT, -- Bangla title
    file_url TEXT NOT NULL,
    file_type TEXT,
    file_size_bytes BIGINT,
    is_processed BOOLEAN DEFAULT FALSE,
    chapters_extracted INTEGER DEFAULT 0,
    chunks_generated BOOLEAN DEFAULT FALSE,
    total_chunks INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE library_books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own books" ON library_books FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own books" ON library_books FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own books" ON library_books FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own books" ON library_books FOR DELETE USING (auth.uid() = user_id);

-- OFFICIAL RESOURCES TABLE (Admin uploads - NCTB books)
CREATE TABLE IF NOT EXISTS official_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    title_bn TEXT, -- Bangla title (auto-generated for Bangla Medium)
    subject TEXT NOT NULL,
    class TEXT,
    class_level TEXT, -- For admin.js compatibility
    subject_group TEXT DEFAULT 'general',
    version TEXT DEFAULT 'bangla',
    part TEXT, -- 'Part 1', 'Part 2', etc.
    file_url TEXT NOT NULL,
    cover_url TEXT, -- Book cover image
    file_size_bytes BIGINT,
    is_processed BOOLEAN DEFAULT FALSE,
    chapters_extracted INTEGER DEFAULT 0,
    chunks_generated BOOLEAN DEFAULT FALSE,
    total_chunks INTEGER DEFAULT 0,
    uploaded_by TEXT, -- User email, not UUID
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE official_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view official resources" ON official_resources FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert" ON official_resources FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update" ON official_resources FOR UPDATE USING (auth.uid() IS NOT NULL);

-- BOOK CHAPTERS TABLE (For ToC extraction)
CREATE TABLE IF NOT EXISTS book_chapters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    library_book_id UUID REFERENCES library_books(id) ON DELETE CASCADE,
    resource_id UUID REFERENCES official_resources(id) ON DELETE CASCADE,
    chapter_number INTEGER DEFAULT 0,
    title VARCHAR,           -- Chapter title (extracted from ToC)
    start_page INTEGER,      -- Page where chapter starts
    end_page INTEGER,        -- Page where chapter ends (optional)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE book_chapters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View chapters" ON book_chapters FOR SELECT USING (true);
CREATE POLICY "Service can manage chapters" ON book_chapters FOR ALL USING (true);

-- =====================================================
-- PART 4: VECTOR EMBEDDINGS FOR RAG (Voyage AI - 1024 dim)
-- =====================================================

-- BOOK CHUNKS TABLE (For RAG semantic search)
CREATE TABLE IF NOT EXISTS book_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    library_book_id UUID REFERENCES library_books(id) ON DELETE CASCADE,
    resource_id UUID REFERENCES official_resources(id) ON DELETE CASCADE,
    chapter_id UUID REFERENCES book_chapters(id) ON DELETE SET NULL,
    chunk_index INTEGER NOT NULL DEFAULT 0,
    chunk_text TEXT NOT NULL,
    -- 1024 dimensions for Voyage AI voyage-multilingual-2 model
    embedding VECTOR(1024),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT book_chunks_source_check CHECK (library_book_id IS NOT NULL OR resource_id IS NOT NULL)
);

-- Indexes for fast vector search
CREATE INDEX IF NOT EXISTS book_chunks_embedding_idx 
    ON book_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS book_chunks_library_book_idx ON book_chunks(library_book_id);
CREATE INDEX IF NOT EXISTS book_chunks_resource_idx ON book_chunks(resource_id);

ALTER TABLE book_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View chunks" ON book_chunks FOR SELECT USING (true);
CREATE POLICY "Service can manage chunks" ON book_chunks FOR ALL USING (true);

-- SEMANTIC SEARCH FUNCTION (for RAG queries)
CREATE OR REPLACE FUNCTION search_book_chunks(
    query_embedding VECTOR(1024),
    match_count INT DEFAULT 5,
    book_id UUID DEFAULT NULL,
    is_library_book BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
    id UUID,
    chunk_text TEXT,
    chunk_index INTEGER,
    resource_id UUID,
    library_book_id UUID,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bc.id,
        bc.chunk_text,
        bc.chunk_index,
        bc.resource_id,
        bc.library_book_id,
        1 - (bc.embedding <=> query_embedding) AS similarity
    FROM book_chunks bc
    WHERE 
        bc.embedding IS NOT NULL
        AND (
            book_id IS NULL 
            OR (is_library_book AND bc.library_book_id = book_id)
            OR (NOT is_library_book AND bc.resource_id = book_id)
        )
    ORDER BY bc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION search_book_chunks TO authenticated;
GRANT EXECUTE ON FUNCTION search_book_chunks TO anon;

-- =====================================================
-- PART 5: BANGLA TRANSLATION SUPPORT
-- =====================================================

-- Translation mapping table
CREATE TABLE IF NOT EXISTS bn_translations (
    id SERIAL PRIMARY KEY,
    key_en TEXT UNIQUE NOT NULL,
    value_bn TEXT NOT NULL
);

-- Insert common translations
INSERT INTO bn_translations (key_en, value_bn) VALUES
    ('Mathematics', 'গণিত'),
    ('Physics', 'পদার্থবিজ্ঞান'),
    ('Chemistry', 'রসায়ন'),
    ('Biology', 'জীববিজ্ঞান'),
    ('Science', 'বিজ্ঞান'),
    ('English 1st Paper', 'ইংরেজি ১ম পত্র'),
    ('English 2nd Paper', 'ইংরেজি ২য় পত্র'),
    ('Bangla 1st Paper', 'বাংলা ১ম পত্র'),
    ('Bangla 2nd Paper', 'বাংলা ২য় পত্র'),
    ('ICT', 'তথ্য ও যোগাযোগ প্রযুক্তি'),
    ('Bangladesh & Global Studies', 'বাংলাদেশ ও বিশ্বপরিচয়'),
    ('Economics', 'অর্থনীতি'),
    ('Finance & Banking', 'ফিন্যান্স ও ব্যাংকিং'),
    ('History', 'ইতিহাস'),
    ('Geography', 'ভূগোল'),
    ('Higher Mathematics', 'উচ্চতর গণিত'),
    ('Class 6', 'ষষ্ঠ শ্রেণি'),
    ('Class 7', 'সপ্তম শ্রেণি'),
    ('Class 8', 'অষ্টম শ্রেণি'),
    ('Class 9-10', 'নবম-দশম শ্রেণি'),
    ('Class 11-12', 'একাদশ-দ্বাদশ শ্রেণি'),
    ('Part 1', 'প্রথম খণ্ড'),
    ('Part 2', 'দ্বিতীয় খণ্ড'),
    ('Part 3', 'তৃতীয় খণ্ড'),
    ('Bangla Medium', 'বাংলা মাধ্যম'),
    ('English Medium', 'ইংরেজি মাধ্যম'),
    ('Full Book', 'সম্পূর্ণ বই'),
    ('Science', 'বিজ্ঞান বিভাগ'),
    ('Business Studies', 'ব্যবসায় শিক্ষা বিভাগ'),
    ('Humanities', 'মানবিক বিভাগ')
ON CONFLICT (key_en) DO NOTHING;

-- Function to auto-translate
CREATE OR REPLACE FUNCTION translate_to_bangla(english_text TEXT)
RETURNS TEXT AS $$
DECLARE
    bangla_text TEXT;
BEGIN
    SELECT value_bn INTO bangla_text FROM bn_translations WHERE key_en = english_text;
    RETURN COALESCE(bangla_text, english_text);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PART 6: HELPER FUNCTIONS & TRIGGERS
-- =====================================================

-- Auto-create profile on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Streak update function
CREATE OR REPLACE FUNCTION update_streak(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    last_date DATE;
    current_streak INTEGER;
BEGIN
    SELECT last_activity_date, streak_count INTO last_date, current_streak
    FROM profiles WHERE user_id = p_user_id;
    
    IF last_date = CURRENT_DATE - INTERVAL '1 day' THEN
        UPDATE profiles SET 
            streak_count = current_streak + 1,
            last_activity_date = CURRENT_DATE
        WHERE user_id = p_user_id;
    ELSIF last_date != CURRENT_DATE THEN
        UPDATE profiles SET 
            streak_count = 1,
            last_activity_date = CURRENT_DATE
        WHERE user_id = p_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PART 8: GAMIFICATION & BADGES
-- =====================================================

-- BADGE DEFINITIONS TABLE (matches original schema)
CREATE TABLE IF NOT EXISTS badge_definitions (
    id TEXT PRIMARY KEY,
    name_en TEXT NOT NULL,
    name_bn TEXT,
    description_en TEXT,
    description_bn TEXT,
    icon TEXT, -- FontAwesome icon class
    xp_reward INTEGER DEFAULT 0,
    condition_type TEXT, -- 'streak', 'quiz_count', 'xp_total', 'subject_mastery'
    condition_value INTEGER -- e.g., 7 for 7-day streak
);

-- Insert default badges (matches original database + new additions)
INSERT INTO badge_definitions (id, name_en, name_bn, description_en, description_bn, icon, xp_reward, condition_type, condition_value) VALUES
    -- Original badges
    ('first_quiz', 'First Step', 'প্রথম পদক্ষেপ', NULL, NULL, '🎯', 50, 'quiz_count', 1),
    ('perfect_quiz', 'Perfect Score', 'নিখুঁত স্কোর', NULL, NULL, '💯', 200, 'perfect_score', 1),
    ('streak_3', '3 Day Streak', '৩ দিনের স্ট্রিক', NULL, NULL, '🔥', 100, 'streak', 3),
    ('streak_7', 'Week Warrior', 'সাপ্তাহিক যোদ্ধা', NULL, NULL, '⚔️', 250, 'streak', 7),
    ('streak_30', 'Monthly Master', 'মাসিক মাস্টার', NULL, NULL, '👑', 1000, 'streak', 30),
    ('topic_master', 'Topic Master', 'টপিক মাস্টার', NULL, NULL, '🏆', 500, 'mastery', 90),
    -- New badges with emoji icons
    ('quiz_10', '10 Quizzes', '১০ কুইজ', NULL, NULL, '📚', 75, 'quiz_count', 10),
    ('quiz_50', 'Quiz Expert', 'কুইজ বিশেষজ্ঞ', NULL, NULL, '🧠', 300, 'quiz_count', 50),
    ('quiz_100', 'Quiz Legend', 'কুইজ কিংবদন্তি', NULL, NULL, '⭐', 500, 'quiz_count', 100),
    ('xp_500', 'XP Hunter', 'এক্সপি শিকারী', NULL, NULL, '💎', 50, 'xp_total', 500),
    ('xp_2000', 'XP Master', 'এক্সপি মাস্টার', NULL, NULL, '💰', 150, 'xp_total', 2000),
    ('xp_5000', 'XP Legend', 'এক্সপি কিংবদন্তি', NULL, NULL, '🌟', 400, 'xp_total', 5000)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE badge_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view badges" ON badge_definitions FOR SELECT USING (true);

-- USER BADGES TABLE (earned badges)
CREATE TABLE IF NOT EXISTS user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    badge_id TEXT REFERENCES badge_definitions(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, badge_id)
);

ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own badges" ON user_badges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service can manage badges" ON user_badges FOR ALL USING (true);

-- TOPIC MASTERY TABLE
CREATE TABLE IF NOT EXISTS topic_mastery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    chapter TEXT,
    mastery_level INTEGER DEFAULT 0, -- 0-100
    questions_attempted INTEGER DEFAULT 0,
    correct_answers INTEGER DEFAULT 0,
    last_practiced TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, subject, chapter)
);

ALTER TABLE topic_mastery ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own mastery" ON topic_mastery FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own mastery" ON topic_mastery FOR ALL USING (auth.uid() = user_id);

-- BOOK CONTENT TABLE (legacy, for full text storage)
CREATE TABLE IF NOT EXISTS book_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    library_book_id UUID REFERENCES library_books(id) ON DELETE CASCADE,
    resource_id UUID REFERENCES official_resources(id) ON DELETE CASCADE,
    chapter_id UUID REFERENCES book_chapters(id) ON DELETE CASCADE,
    content_text TEXT,
    embedding VECTOR(1024),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE book_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View book content" ON book_content FOR SELECT USING (true);
CREATE POLICY "Service can manage content" ON book_content FOR ALL USING (true);

-- REVIEW QUEUE TABLE (spaced repetition)
CREATE TABLE IF NOT EXISTS review_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    chapter TEXT,
    question_type TEXT, -- 'mcq', 'matching', 'ordering'
    question_data JSONB, -- The actual question
    next_review TIMESTAMPTZ DEFAULT NOW(),
    interval_days INTEGER DEFAULT 1,
    ease_factor DECIMAL(4,2) DEFAULT 2.5,
    repetitions INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE review_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own queue" ON review_queue FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own queue" ON review_queue FOR ALL USING (auth.uid() = user_id);

-- SUBJECT TRANSLATIONS TABLE
CREATE TABLE IF NOT EXISTS subject_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_en TEXT NOT NULL,
    subject_bn TEXT NOT NULL,
    category TEXT, -- 'general', 'science', 'humanities', 'business_studies'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(subject_en)
);

INSERT INTO subject_translations (subject_en, subject_bn, category) VALUES
    ('Physics', 'পদার্থবিজ্ঞান', 'science'),
    ('Chemistry', 'রসায়ন', 'science'),
    ('Biology', 'জীববিজ্ঞান', 'science'),
    ('Mathematics', 'গণিত', 'general'),
    ('Higher Mathematics', 'উচ্চতর গণিত', 'science'),
    ('English', 'ইংরেজি', 'general'),
    ('Bangla', 'বাংলা', 'general'),
    ('History', 'ইতিহাস', 'humanities'),
    ('Geography', 'ভূগোল', 'humanities'),
    ('Economics', 'অর্থনীতি', 'business_studies'),
    ('Accounting', 'হিসাববিজ্ঞান', 'business_studies'),
    ('ICT', 'তথ্য ও যোগাযোগ প্রযুক্তি', 'general'),
    ('Science', 'বিজ্ঞান', 'general'),
    ('Bangladesh & Global Studies', 'বাংলাদেশ ও বিশ্বপরিচয়', 'general'),
    ('Religion', 'ধর্ম ও নৈতিক শিক্ষা', 'general')
ON CONFLICT (subject_en) DO NOTHING;

ALTER TABLE subject_translations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view translations" ON subject_translations FOR SELECT USING (true);

-- =====================================================
-- PART 9: STORAGE BUCKETS (IMPORTANT!)
-- =====================================================
-- You MUST create these manually in Supabase Dashboard > Storage:
-- 
-- 1. Click "New Bucket"
-- 2. Name: "books" (for user uploads)
--    - Make it PUBLIC: Yes
-- 3. Name: "official-books" (for NCTB books)
--    - Make it PUBLIC: Yes
--
-- After creating buckets, the policies below will work:

-- For 'books' bucket (user uploads)
CREATE POLICY "Users can upload own books" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'books' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view own books storage" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'books' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- For 'official-books' bucket (admin uploads)
CREATE POLICY "Anyone can view official books storage" ON storage.objects
    FOR SELECT USING (bucket_id = 'official-books');

CREATE POLICY "Authenticated can upload official books" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'official-books' AND 
        auth.uid() IS NOT NULL
    );

-- =====================================================
-- PART 10: AUTO-GENERATE BANGLA TITLES TRIGGER
-- =====================================================

-- Function to generate title_bn from bn_translations
CREATE OR REPLACE FUNCTION generate_title_bn()
RETURNS TRIGGER AS $$
DECLARE
    subject_bn TEXT;
    class_bn TEXT;
    part_bn TEXT;
BEGIN
    -- Skip Bangla title for English Medium books
    IF NEW.version = 'english' OR NEW.title LIKE '%English%' THEN
        NEW.title_bn = NULL;
        RETURN NEW;
    END IF;
    
    -- Get Bangla subject name from bn_translations
    SELECT value_bn INTO subject_bn 
    FROM bn_translations WHERE key_en = NEW.subject;
    
    -- Get Bangla class name (e.g., "Class 9-10" -> "নবম-দশম শ্রেণি")
    SELECT value_bn INTO class_bn 
    FROM bn_translations WHERE key_en = 'Class ' || COALESCE(NEW.class, NEW.class_level);
    
    -- Get Bangla part name (e.g., "Part 1" -> "প্রথম খণ্ড")
    IF NEW.part IS NOT NULL THEN
        SELECT value_bn INTO part_bn 
        FROM bn_translations WHERE key_en = NEW.part;
    END IF;
    
    -- Build full Bangla title
    IF subject_bn IS NOT NULL THEN
        NEW.title_bn = subject_bn;
        IF class_bn IS NOT NULL THEN
            NEW.title_bn = NEW.title_bn || ' - ' || class_bn;
        END IF;
        IF part_bn IS NOT NULL THEN
            NEW.title_bn = NEW.title_bn || ' - ' || part_bn;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on official_resources
DROP TRIGGER IF EXISTS set_title_bn ON official_resources;
CREATE TRIGGER set_title_bn
    BEFORE INSERT OR UPDATE ON official_resources
    FOR EACH ROW EXECUTE FUNCTION generate_title_bn();

-- =====================================================
-- ✅ SETUP COMPLETE! Your Supabase is ready for Koushole 🚀
-- =====================================================
-- 
-- CHECKLIST:
-- ☐ 1. Create storage bucket: 'books' (public)
-- ☐ 2. Create storage bucket: 'official-books' (public)
-- ☐ 3. Set environment variables in Vercel:
--    - SUPABASE_URL
--    - SUPABASE_ANON_KEY
--    - SUPABASE_SERVICE_KEY
--    - VOYAGE_API_KEY
--    - GROQ_API_KEY
-- ☐ 4. Update public/js/supabase-config.js with URL and Anon Key
-- ☐ 5. Run the Colab notebook to process books
--
-- To verify installation:
-- SELECT * FROM pg_extension WHERE extname = 'vector';
-- SELECT COUNT(*) FROM badge_definitions; -- Should be 12
-- =====================================================

-- =====================================================
-- OPTIONAL: RESET COMMANDS (For Re-Processing Books)
-- =====================================================
-- Uncomment and run these if you need to re-process books

-- Reset ALL official books (Warning: Deletes all chunks!)
-- DELETE FROM book_chunks WHERE resource_id IS NOT NULL;
-- DELETE FROM book_chapters WHERE resource_id IS NOT NULL;
-- UPDATE official_resources SET chunks_generated = FALSE, is_processed = FALSE;

-- Reset ALL library books (Warning: Deletes all chunks!)
-- DELETE FROM book_chunks WHERE library_book_id IS NOT NULL;
-- DELETE FROM book_chapters WHERE library_book_id IS NOT NULL;
-- UPDATE library_books SET chunks_generated = FALSE, is_processed = FALSE;

-- Reset a specific book by title (Recommended):
-- UPDATE official_resources 
-- SET chunks_generated = FALSE, is_processed = FALSE 
-- WHERE title ILIKE '%Physics%';
