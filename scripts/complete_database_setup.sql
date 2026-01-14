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

-- PROFILES TABLE (User data)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    education_level TEXT CHECK (education_level IN ('school', 'college', 'university')),
    class TEXT,
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
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

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
    title_bn TEXT, -- Bangla title
    subject TEXT NOT NULL,
    class TEXT NOT NULL,
    subject_group TEXT NOT NULL DEFAULT 'general',
    version TEXT NOT NULL DEFAULT 'english',
    part TEXT, -- 'Part 1', 'Part 2', etc.
    file_url TEXT NOT NULL,
    file_size_bytes BIGINT,
    is_processed BOOLEAN DEFAULT FALSE,
    chapters_extracted INTEGER DEFAULT 0,
    chunks_generated BOOLEAN DEFAULT FALSE,
    total_chunks INTEGER DEFAULT 0,
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE official_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view official resources" ON official_resources FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert" ON official_resources FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update" ON official_resources FOR UPDATE USING (auth.uid() IS NOT NULL);

-- BOOK CHAPTERS TABLE
CREATE TABLE IF NOT EXISTS book_chapters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    library_book_id UUID REFERENCES library_books(id) ON DELETE CASCADE,
    resource_id UUID REFERENCES official_resources(id) ON DELETE CASCADE,
    chapter_number INTEGER DEFAULT 0,
    title_en TEXT,
    title_bn TEXT,
    page_start INTEGER,
    page_end INTEGER,
    content_extracted BOOLEAN DEFAULT FALSE,
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
    ('Bangla Medium', 'বাংলা ভার্সন'),
    ('English Version', 'ইংরেজি ভার্সন'),
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
    INSERT INTO public.profiles (id, email)
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
-- PART 7: STORAGE BUCKET POLICIES
-- =====================================================
-- Note: Create buckets 'books' and 'official-books' in Supabase Dashboard > Storage first

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
-- ✅ SETUP COMPLETE! Your Supabase is ready for Koushole 🚀
-- =====================================================
-- 
-- NEXT STEPS:
-- 1. Create storage buckets: 'books' and 'official-books'
-- 2. Set environment variables in Vercel:
--    - SUPABASE_URL
--    - SUPABASE_ANON_KEY
--    - SUPABASE_SERVICE_KEY
--    - VOYAGE_API_KEY
--    - GROQ_API_KEY
-- 3. Run the Colab notebook to process books
--
-- To verify installation:
-- SELECT * FROM pg_extension WHERE extname = 'vector';
-- =====================================================
