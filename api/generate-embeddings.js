import { createClient } from '@supabase/supabase-js';

// Hugging Face Inference API for embeddings
const HF_EMBEDDING_MODEL = 'sentence-transformers/all-MiniLM-L6-v2';

export default async function handler(req, res) {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { texts, bookId, sourceType = 'library' } = req.body;

    if (!texts || !Array.isArray(texts) || texts.length === 0) {
        return res.status(400).json({ error: 'texts array is required' });
    }

    if (!bookId) {
        return res.status(400).json({ error: 'bookId is required' });
    }

    const hfApiKey = process.env.HF_API_KEY;
    if (!hfApiKey) {
        return res.status(500).json({ error: 'HF_API_KEY not configured' });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl) {
        return res.status(500).json({ error: 'SUPABASE_URL not configured' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        console.log(`📊 Generating embeddings for ${texts.length} chunks...`);

        // Generate embeddings using Hugging Face Inference API
        const embeddingsResponse = await fetch(
            `https://router.huggingface.co/hf-inference/pipeline/feature-extraction/${HF_EMBEDDING_MODEL}`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${hfApiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    inputs: texts,
                    options: { wait_for_model: true }
                })
            }
        );

        if (!embeddingsResponse.ok) {
            const error = await embeddingsResponse.text();
            throw new Error(`HuggingFace API error: ${error}`);
        }

        const embeddings = await embeddingsResponse.json();
        console.log(`✅ Generated ${embeddings.length} embeddings`);

        // Prepare chunks for database insertion
        const idColumn = sourceType === 'library' ? 'library_book_id' : 'resource_id';
        const chunks = texts.map((text, index) => ({
            [idColumn]: bookId,
            chunk_index: index,
            chunk_text: text,
            embedding: `[${embeddings[index].join(',')}]` // Format for pgvector
        }));

        // Delete existing chunks for this book (re-processing)
        await supabase.from('book_chunks').delete().eq(idColumn, bookId);

        // Insert chunks in batches of 50
        const batchSize = 50;
        let insertedCount = 0;

        for (let i = 0; i < chunks.length; i += batchSize) {
            const batch = chunks.slice(i, i + batchSize);
            const { error: insertError } = await supabase
                .from('book_chunks')
                .insert(batch);

            if (insertError) {
                console.error(`❌ Batch insert failed:`, insertError.message);
                throw new Error(`Database insert failed: ${insertError.message}`);
            }
            insertedCount += batch.length;
            console.log(`📦 Inserted batch ${Math.floor(i / batchSize) + 1}, total: ${insertedCount}`);
        }

        // Update book record
        const bookTable = sourceType === 'library' ? 'library_books' : 'official_resources';
        await supabase
            .from(bookTable)
            .update({
                chunks_generated: true,
                total_chunks: chunks.length
            })
            .eq('id', bookId);

        console.log(`✅ Stored ${chunks.length} chunks for book ${bookId}`);

        return res.status(200).json({
            success: true,
            message: `Generated and stored ${chunks.length} embeddings`,
            totalChunks: chunks.length
        });

    } catch (error) {
        console.error('❌ Embedding generation error:', error);
        return res.status(500).json({
            error: error.message || 'Failed to generate embeddings',
            details: error.toString()
        });
    }
}

// Helper: Generate embedding for a single query (used by rag-chat)
export async function generateQueryEmbedding(text, hfApiKey) {
    const response = await fetch(
        `https://router.huggingface.co/hf-inference/pipeline/feature-extraction/${HF_EMBEDDING_MODEL}`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${hfApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                inputs: text,
                options: { wait_for_model: true }
            })
        }
    );

    if (!response.ok) {
        throw new Error('Failed to generate query embedding');
    }

    return await response.json();
}
