-- Update book_chunks embedding column to support Voyage AI's 1024 dimensions
-- Run this in Supabase SQL Editor BEFORE running the Colab notebook

-- Step 1: Drop the existing embedding column
ALTER TABLE book_chunks DROP COLUMN IF EXISTS embedding;

-- Step 2: Add new embedding column with 1024 dimensions (Voyage AI)
ALTER TABLE book_chunks ADD COLUMN embedding vector(1024);

-- Step 3: Update the search function to work with 1024 dimensions
CREATE OR REPLACE FUNCTION search_book_chunks(
    query_embedding vector(1024),
    match_count int DEFAULT 5,
    book_id uuid DEFAULT NULL,
    is_library_book boolean DEFAULT true
)
RETURNS TABLE (
    id uuid,
    chunk_text text,
    chunk_index int,
    resource_id uuid,
    library_book_id uuid,
    similarity float
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
        1 - (bc.embedding <=> query_embedding) as similarity
    FROM book_chunks bc
    WHERE 
        bc.embedding IS NOT NULL
        AND (
            (is_library_book = true AND bc.library_book_id = book_id)
            OR (is_library_book = false AND bc.resource_id = book_id)
            OR book_id IS NULL
        )
    ORDER BY bc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Step 4: Recreate index for the new dimension (IVFFlat for faster search)
DROP INDEX IF EXISTS book_chunks_embedding_idx;
CREATE INDEX book_chunks_embedding_idx ON book_chunks 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Step 5: Grant permissions
GRANT EXECUTE ON FUNCTION search_book_chunks TO authenticated;
GRANT EXECUTE ON FUNCTION search_book_chunks TO anon;
