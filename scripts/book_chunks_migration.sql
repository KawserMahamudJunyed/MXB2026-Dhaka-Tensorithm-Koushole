-- =====================================================
-- KOUSHOLE - VECTOR EMBEDDINGS MIGRATION
-- =====================================================
-- 
-- HOW TO USE:
-- 1. Go to Supabase Dashboard > SQL Editor
-- 2. Create a new query
-- 3. Copy and paste this ENTIRE file
-- 4. Click "Run" to execute all commands
--
-- IMPORTANT: This adds pgvector extension for semantic search
-- =====================================================

-- =====================================================
-- STEP 1: ENABLE PGVECTOR EXTENSION
-- =====================================================
-- This extension allows storing and searching vector embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- =====================================================
-- STEP 2: CREATE BOOK_CHUNKS TABLE
-- =====================================================
-- Stores book content in chunks with embeddings for RAG
CREATE TABLE IF NOT EXISTS book_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Link to source book (one of these will be set)
    library_book_id UUID REFERENCES library_books(id) ON DELETE CASCADE,
    resource_id UUID REFERENCES official_resources(id) ON DELETE CASCADE,
    
    -- Chunk metadata
    chunk_index INTEGER NOT NULL DEFAULT 0,
    chunk_text TEXT NOT NULL,
    
    -- Vector embedding for semantic search (384 dimensions for MiniLM)
    embedding VECTOR(384),
    
    -- Chapter reference (optional)
    chapter_id UUID REFERENCES book_chapters(id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add constraint: at least one source must be set
ALTER TABLE book_chunks ADD CONSTRAINT book_chunks_source_check 
    CHECK (library_book_id IS NOT NULL OR resource_id IS NOT NULL);

-- =====================================================
-- STEP 3: CREATE INDEXES FOR FAST SEARCH
-- =====================================================
-- Index for vector similarity search (IVFFlat for balance of speed/accuracy)
CREATE INDEX IF NOT EXISTS book_chunks_embedding_idx 
    ON book_chunks USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- Index for filtering by book
CREATE INDEX IF NOT EXISTS book_chunks_library_book_idx ON book_chunks(library_book_id);
CREATE INDEX IF NOT EXISTS book_chunks_resource_idx ON book_chunks(resource_id);

-- =====================================================
-- STEP 4: ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE book_chunks ENABLE ROW LEVEL SECURITY;

-- Users can view chunks from their own library books
CREATE POLICY "Users can view chunks of own books" ON book_chunks
    FOR SELECT USING (
        library_book_id IN (
            SELECT id FROM library_books WHERE user_id = auth.uid()
        )
        OR resource_id IS NOT NULL -- Official resources visible to all
    );

-- Service role can manage all chunks (for API)
CREATE POLICY "Service can insert chunks" ON book_chunks
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Service can update chunks" ON book_chunks
    FOR UPDATE USING (true);

CREATE POLICY "Service can delete chunks" ON book_chunks
    FOR DELETE USING (true);

-- =====================================================
-- STEP 5: SEMANTIC SEARCH FUNCTION
-- =====================================================
-- Function to find similar chunks using vector similarity
CREATE OR REPLACE FUNCTION search_book_chunks(
    query_embedding VECTOR(384),
    match_count INT DEFAULT 5,
    book_id UUID DEFAULT NULL,
    is_library_book BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
    id UUID,
    chunk_text TEXT,
    chunk_index INTEGER,
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
        1 - (bc.embedding <=> query_embedding) AS similarity
    FROM book_chunks bc
    WHERE 
        -- Filter by book if specified
        (book_id IS NULL OR 
            (is_library_book AND bc.library_book_id = book_id) OR
            (NOT is_library_book AND bc.resource_id = book_id)
        )
        -- Only return chunks with embeddings
        AND bc.embedding IS NOT NULL
    ORDER BY bc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- =====================================================
-- STEP 6: UPDATE LIBRARY_BOOKS TABLE
-- =====================================================
-- Add column to track if chunking is complete
ALTER TABLE library_books 
    ADD COLUMN IF NOT EXISTS chunks_generated BOOLEAN DEFAULT FALSE;

ALTER TABLE library_books 
    ADD COLUMN IF NOT EXISTS total_chunks INTEGER DEFAULT 0;

-- Same for official resources
ALTER TABLE official_resources 
    ADD COLUMN IF NOT EXISTS chunks_generated BOOLEAN DEFAULT FALSE;

ALTER TABLE official_resources 
    ADD COLUMN IF NOT EXISTS total_chunks INTEGER DEFAULT 0;

-- =====================================================
-- DONE! Vector search is now enabled for Koushole 🚀
-- =====================================================
-- 
-- To verify installation, run:
-- SELECT * FROM pg_extension WHERE extname = 'vector';
-- 
-- If you see a row, pgvector is working correctly!
-- =====================================================
