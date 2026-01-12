/**
 * Batch Process All Official Resources
 * 
 * This script processes all books in the official_resources table
 * to extract content and populate the book_content table.
 * 
 * Usage:
 *   1. Make sure your .env has SUPABASE_URL, SUPABASE_SERVICE_KEY, and GEMINI_API_KEY
 *   2. Run: node scripts/batch-process-books.js
 *   3. Wait for processing (may take 30-60 seconds per book due to OCR)
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://mocbdqgvsunbxmrnllbr.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const API_BASE = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';

// Delay between API calls to avoid rate limits (in ms)
const DELAY_BETWEEN_BOOKS = 35000; // 35 seconds (Gemini rate limit)

if (!SUPABASE_KEY) {
    console.error('❌ Missing SUPABASE_SERVICE_KEY or SUPABASE_ANON_KEY in .env');
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
        // Call the process-book API
        const response = await fetch(`${API_BASE}/api/process-book`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                resourceId: book.id,
                fileUrl: book.file_url,
                sourceType: 'official'
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
    console.log('🚀 Batch Book Processing Script');
    console.log('================================\n');

    // Fetch all official resources
    console.log('📋 Fetching books from official_resources...');
    const { data: books, error } = await supabase
        .from('official_resources')
        .select('id, title, file_url, is_processed')
        .order('created_at', { ascending: true });

    if (error) {
        console.error('❌ Failed to fetch books:', error.message);
        process.exit(1);
    }

    console.log(`📚 Found ${books.length} books to process\n`);

    // Filter only unprocessed or reprocess all
    const unprocessedBooks = books.filter(b => !b.is_processed);
    const booksToProcess = unprocessedBooks.length > 0 ? unprocessedBooks : books;

    console.log(`🔄 Will process ${booksToProcess.length} books`);
    console.log(`⏱️  Estimated time: ${Math.ceil(booksToProcess.length * DELAY_BETWEEN_BOOKS / 60000)} minutes\n`);

    const results = { success: 0, failed: 0, errors: [] };

    for (let i = 0; i < booksToProcess.length; i++) {
        const book = booksToProcess[i];
        const result = await processBook(book, i, booksToProcess.length);

        if (result.success) {
            results.success++;
        } else {
            results.failed++;
            results.errors.push({ title: result.book, error: result.error });
        }

        // Wait between books to avoid Gemini rate limits
        if (i < booksToProcess.length - 1) {
            console.log(`   ⏳ Waiting ${DELAY_BETWEEN_BOOKS / 1000}s before next book...`);
            await sleep(DELAY_BETWEEN_BOOKS);
        }
    }

    // Summary
    console.log('\n================================');
    console.log('📊 Processing Complete!');
    console.log(`   ✅ Success: ${results.success}`);
    console.log(`   ❌ Failed: ${results.failed}`);

    if (results.errors.length > 0) {
        console.log('\n⚠️ Failed Books:');
        results.errors.forEach(e => console.log(`   - ${e.title}: ${e.error}`));
    }

    console.log('\n✨ Done! Check your book_content table in Supabase.');
}

main().catch(console.error);
