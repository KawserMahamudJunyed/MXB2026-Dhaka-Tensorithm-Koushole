-- =====================================================
-- REVERT: Gemini (768) -> Voyage AI (1024)
-- =====================================================
-- Run this if you migrated to Gemini but decided to 
-- switch back to Voyage AI.
-- =====================================================

-- 1. Alter book_chunks table back to 1024 dimensions
ALTER TABLE book_chunks 
ALTER COLUMN embedding TYPE VECTOR(1024);

-- 2. Alter book_content table back to 1024 dimensions
ALTER TABLE book_content 
ALTER COLUMN embedding TYPE VECTOR(1024);

-- 3. Update the search function to accept 1024 dimension query
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

-- 4. Clear existing embeddings (dimension mismatch check)
DELETE FROM book_chunks;
UPDATE library_books SET chunks_generated = FALSE, is_processed = FALSE;
UPDATE official_resources SET chunks_generated = FALSE, is_processed = FALSE;
