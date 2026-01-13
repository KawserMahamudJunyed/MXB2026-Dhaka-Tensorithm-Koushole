/**
 * Batch Reprocess Library Books for RAG Embeddings
 * 
 * HOW TO USE:
 * 1. Run: node scripts/batch-process-library.js
 * 2. This will re-process all library books that don't have embeddings yet
 * 
 * REQUIREMENTS:
 * - Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env
 * - Database migration must be applied (book_chunks table)
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://mocbdqgvsunbxmrnllbr.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const API_BASE = process.env.VERCEL_URL || 'https://koushole.vercel.app';

if (!SUPABASE_KEY) {
    console.error('❌ SUPABASE_SERVICE_KEY not set in .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function reprocessBook(book, sourceType) {
    console.log(`📚 Processing: ${book.title} (${sourceType})`);

    try {
        const response = await fetch(`${API_BASE}/api/process-book`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                resourceId: book.id,
                fileUrl: book.file_url,
                sourceType: sourceType
            })
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || `HTTP ${response.status}`);
        }

        const result = await response.json();
        console.log(`✅ Done: ${book.title} - ${result.chapters?.length || 0} chapters`);
        return true;
    } catch (err) {
        console.error(`❌ Failed: ${book.title} - ${err.message}`);
        return false;
    }
}

async function main() {
    console.log('🚀 Starting batch reprocess for RAG embeddings...\n');

    // 1. Get library books without chunks
    console.log('📖 Fetching library books without embeddings...');
    const { data: libraryBooks, error: libErr } = await supabase
        .from('library_books')
        .select('id, title, file_url')
        .or('chunks_generated.is.null,chunks_generated.eq.false')
        .order('created_at', { ascending: false });

    if (libErr) {
        console.error('Library fetch error:', libErr);
    } else {
        console.log(`Found ${libraryBooks?.length || 0} library books to process`);
    }

    // 2. Get official resources without chunks
    console.log('📚 Fetching official resources without embeddings...');
    const { data: officialBooks, error: offErr } = await supabase
        .from('official_resources')
        .select('id, title, file_url')
        .or('chunks_generated.is.null,chunks_generated.eq.false')
        .order('created_at', { ascending: false });

    if (offErr) {
        console.error('Official resources fetch error:', offErr);
    } else {
        console.log(`Found ${officialBooks?.length || 0} official books to process`);
    }

    console.log('\n--- Starting Processing ---\n');

    let successCount = 0;
    let failCount = 0;

    // Process library books
    for (const book of (libraryBooks || [])) {
        const success = await reprocessBook(book, 'library');
        if (success) successCount++;
        else failCount++;

        // Rate limit - wait 2 seconds between requests
        await new Promise(r => setTimeout(r, 2000));
    }

    // Process official resources
    for (const book of (officialBooks || [])) {
        const success = await reprocessBook(book, 'official');
        if (success) successCount++;
        else failCount++;

        // Rate limit - wait 2 seconds between requests
        await new Promise(r => setTimeout(r, 2000));
    }

    console.log('\n--- Batch Processing Complete ---');
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
}

main().catch(console.error);
