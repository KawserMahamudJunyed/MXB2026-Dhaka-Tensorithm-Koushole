/**
 * Batch Process Library Books Only
 * 
 * This script processes user-uploaded books from library_books table
 * to extract content and populate the book_content table.
 * 
 * Usage:
 *   node scripts/batch-process-library.js
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://mocbdqgvsunbxmrnllbr.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const API_BASE = process.env.API_BASE || 'https://koushole.vercel.app';

// Delay between API calls to avoid rate limits (in ms)
const DELAY_BETWEEN_BOOKS = 35000; // 35 seconds

if (!SUPABASE_KEY) {
    console.error('❌ Missing SUPABASE_SERVICE_KEY in .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function processBook(book, index, total) {
    console.log(`\n📚 [${index + 1}/${total}] Processing: ${book.title}`);
    console.log(`   ID: ${book.id}`);
    console.log(`   URL: ${book.file_url?.substring(0, 60)}...`);

    try {
        const response = await fetch(`${API_BASE}/api/process-book`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                resourceId: book.id,
                fileUrl: book.file_url,
                sourceType: 'library'
            })
        });

        const result = await response.json();

        if (result.success) {
            console.log(`   ✅ Success: ${result.message}`);
            if (result.chapters?.length) {
                console.log(`   📖 Chapters: ${result.chapters.length}`);
            }
            return { success: true, book: book.title };
        } else {
            console.log(`   ⚠️ Warning: ${result.message || result.error}`);
            return { success: false, book: book.title, error: result.error };
        }
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        return { success: false, book: book.title, error: error.message };
    }
}

async function main() {
    console.log('🚀 Library Books Processing Script');
    console.log('===================================\n');

    console.log('📋 Fetching books from library_books...');
    const { data: books, error } = await supabase
        .from('library_books')
        .select('id, title, file_url, user_id')
        .order('created_at', { ascending: true });

    if (error) {
        console.error('❌ Failed to fetch library books:', error.message);
        process.exit(1);
    }

    if (books.length === 0) {
        console.log('📚 No library books found. Users haven\'t uploaded any books yet.\n');
        process.exit(0);
    }

    console.log(`📚 Found ${books.length} library books to process\n`);

    const results = { success: 0, failed: 0, errors: [] };

    for (let i = 0; i < books.length; i++) {
        const book = books[i];
        const result = await processBook(book, i, books.length);

        if (result.success) {
            results.success++;
        } else {
            results.failed++;
            results.errors.push({ title: result.book, error: result.error });
        }

        if (i < books.length - 1) {
            console.log(`   ⏳ Waiting ${DELAY_BETWEEN_BOOKS / 1000}s before next book...`);
            await sleep(DELAY_BETWEEN_BOOKS);
        }
    }

    console.log('\n===================================');
    console.log('📊 Processing Complete!');
    console.log(`   ✅ Success: ${results.success}`);
    console.log(`   ❌ Failed: ${results.failed}`);

    if (results.errors.length > 0) {
        console.log('\n⚠️ Failed Books:');
        results.errors.forEach(e => console.log(`   - ${e.title}: ${e.error}`));
    }

    console.log('\n✨ Done!');
}

main().catch(console.error);
