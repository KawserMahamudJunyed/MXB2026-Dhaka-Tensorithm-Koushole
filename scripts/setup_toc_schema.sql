-- =====================================================
-- SETUP: Table of Contents (ToC) Schema & Reset
-- =====================================================

-- 1. Ensure 'book_chapters' table exists
CREATE TABLE IF NOT EXISTS public.book_chapters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    library_book_id UUID REFERENCES public.library_books(id) ON DELETE CASCADE,
    resource_id UUID REFERENCES public.official_resources(id) ON DELETE CASCADE,
    chapter_number INT,
    title VARCHAR,
    start_page INT,
    end_page INT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Ensure 'book_chunks' has a link to 'book_chapters'
ALTER TABLE public.book_chunks 
ADD COLUMN IF NOT EXISTS chapter_id UUID REFERENCES public.book_chapters(id) ON DELETE SET NULL;

-- =====================================================
-- HOW TO RESTART A BOOK (Reset Status)
-- =====================================================
-- Run the lines below (Uncomment them) to force-reprocess specific books.

-- OPTION A: Reset ALL books (Warning: Will re-do everything)
-- UPDATE library_books SET chunks_generated = FALSE, is_processed = FALSE;
-- UPDATE official_resources SET chunks_generated = FALSE, is_processed = FALSE;

-- OPTION B: Reset a specific book by Title (Recommended)
-- UPDATE library_books 
-- SET chunks_generated = FALSE, is_processed = FALSE 
-- WHERE title ILIKE '%Your Book Name Here%';
