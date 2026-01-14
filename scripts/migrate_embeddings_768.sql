-- Update book_chunks embedding column to support Gemini's 768 dimensions
-- Run this in Supabase SQL Editor

-- Step 1: Drop the existing embedding column
ALTER TABLE book_chunks DROP COLUMN IF EXISTS embedding;

-- Step 2: Add new embedding column with 768 dimensions
ALTER TABLE book_chunks ADD COLUMN embedding vector(768);

-- Step 3: Update the search function to work with 768 dimensions
CREATE OR REPLACE FUNCTION search_book_chunks(
    query_embedding vector(768),
    match_count int DEFAULT 5,
    filter_resource_id uuid DEFAULT NULL,
    filter_library_book_id uuid DEFAULT NULL
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
        AND (filter_resource_id IS NULL OR bc.resource_id = filter_resource_id)
        AND (filter_library_book_id IS NULL OR bc.library_book_id = filter_library_book_id)
    ORDER BY bc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Step 4: Recreate index for the new dimension
DROP INDEX IF EXISTS book_chunks_embedding_idx;
CREATE INDEX book_chunks_embedding_idx ON book_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
