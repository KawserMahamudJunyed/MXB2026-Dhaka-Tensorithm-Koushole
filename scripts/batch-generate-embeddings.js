/**
 * Batch Generate Embeddings for Library Books
 * 
 * This script generates embeddings for books that have content but no chunks.
 * 
 * Usage:
 *   node scripts/batch-generate-embeddings.js
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://mocbdqgvsunbxmrnllbr.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const API_BASE = process.env.API_BASE || 'https://koushole.vercel.app';

// Delay between books to avoid rate limits
const DELAY_BETWEEN_BOOKS = 10000; // 10 seconds

if (!SUPABASE_KEY) {
    console.error('❌ Missing SUPABASE_SERVICE_KEY in .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Split text into chunks of ~500 characters
function chunkText(text, chunkSize = 500) {
    if (!text) return [];

    const chunks = [];
    const sentences = text.split(/(?<=[.!?।])\s+/); // Split by sentence endings
    let currentChunk = '';

    for (const sentence of sentences) {
        if ((currentChunk + sentence).length <= chunkSize) {
            currentChunk += (currentChunk ? ' ' : '') + sentence;
        } else {
            if (currentChunk) chunks.push(currentChunk.trim());
            currentChunk = sentence;
        }
    }
    if (currentChunk) chunks.push(currentChunk.trim());

    // Filter out very short chunks
    return chunks.filter(c => c.length > 50);
}

async function generateEmbeddingsForBook(book, content) {
    console.log(`\n📚 Processing: ${book.title}`);
    console.log(`   Content length: ${content.length} chars`);

    // Split content into chunks
    const chunks = chunkText(content);
    console.log(`   Chunks: ${chunks.length}`);

    if (chunks.length === 0) {
        console.log('   ⚠️ No valid chunks generated');
        return { success: false, error: 'No valid chunks' };
    }

    try {
        // Call the generate-embeddings API
        const response = await fetch(`${API_BASE}/api/generate-embeddings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                texts: chunks,
                bookId: book.id,
                sourceType: 'library'
            })
        });

        const result = await response.json();

        if (result.success) {
            console.log(`   ✅ Generated ${result.totalChunks} embeddings`);
            return { success: true };
        } else {
            console.log(`   ❌ Failed: ${result.error}`);
            return { success: false, error: result.error };
        }
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        return { success: false, error: error.message };
    }
}

async function main() {
    console.log('🚀 Batch Embedding Generation Script');
    console.log('=====================================\n');

    // Get library books without chunks
    console.log('📋 Fetching library books without embeddings...');
    const { data: books, error: booksError } = await supabase
        .from('library_books')
        .select('id, title, chunks_generated')
        .eq('chunks_generated', false)
        .order('created_at', { ascending: true });

    if (booksError) {
        console.error('❌ Failed to fetch books:', booksError.message);
        process.exit(1);
    }

    if (books.length === 0) {
        console.log('✅ All books already have embeddings!');
        process.exit(0);
    }

    console.log(`📚 Found ${books.length} books without embeddings\n`);

    const results = { success: 0, failed: 0, noContent: 0 };

    for (let i = 0; i < books.length; i++) {
        const book = books[i];
        console.log(`\n[${i + 1}/${books.length}] ${book.title}`);

        // Get content from book_content table (via chapter)
        const { data: chapters } = await supabase
            .from('book_chapters')
            .select('id')
            .eq('library_book_id', book.id)
            .limit(1);

        if (!chapters || chapters.length === 0) {
            console.log('   ⚠️ No chapters found - need to process book first');
            results.noContent++;
            continue;
        }

        const { data: contentRows } = await supabase
            .from('book_content')
            .select('content')
            .eq('chapter_id', chapters[0].id)
            .limit(1);

        if (!contentRows || contentRows.length === 0 || !contentRows[0].content) {
            console.log('   ⚠️ No content found - need to run batch-process-library first');
            results.noContent++;
            continue;
        }

        const result = await generateEmbeddingsForBook(book, contentRows[0].content);

        if (result.success) {
            results.success++;
        } else {
            results.failed++;
        }

        // Wait between books
        if (i < books.length - 1) {
            console.log(`   ⏳ Waiting ${DELAY_BETWEEN_BOOKS / 1000}s...`);
            await sleep(DELAY_BETWEEN_BOOKS);
        }
    }

    console.log('\n=====================================');
    console.log('📊 Results:');
    console.log(`   ✅ Success: ${results.success}`);
    console.log(`   ❌ Failed: ${results.failed}`);
    console.log(`   ⚠️ No Content: ${results.noContent}`);
    console.log('\n✨ Done!');
}

main().catch(console.error);
