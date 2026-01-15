-- =====================================================
-- MIGRATION: Voyage AI (1024) -> Gemini (768)
-- =====================================================
-- Run this in Supabase SQL Editor to migrate your database
-- for using Google Gemini Embeddings (Free Tier Friendly).
-- =====================================================

-- 1. Alter book_chunks table to use 768 dimensions
ALTER TABLE book_chunks 
ALTER COLUMN embedding TYPE VECTOR(768);

-- 2. Alter book_content table (if used) to use 768 dimensions
ALTER TABLE book_content 
ALTER COLUMN embedding TYPE VECTOR(768);

-- 3. Update the search function to accept 768 dimension query
CREATE OR REPLACE FUNCTION search_book_chunks(
    query_embedding VECTOR(768),
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

-- 4. Clear existing embeddings (since dimension mismatch makes them invalid)
--    Note: This deletes the vectors but keeps the chunk text. 
--    You will need to re-generate embeddings for processed books.
DELETE FROM book_chunks;
UPDATE library_books SET chunks_generated = FALSE, is_processed = FALSE;
UPDATE official_resources SET chunks_generated = FALSE, is_processed = FALSE;
