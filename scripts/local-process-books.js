/**
 * Local Book Processing Script for RAG
 * 
 * This script processes books LOCALLY bypassing Vercel timeout limits.
 * It uses Gemini Vision API for OCR and HuggingFace for embeddings.
 * 
 * HOW TO USE:
 * 1. Ensure .env has: SUPABASE_URL, SUPABASE_SERVICE_KEY, GEMINI_API_KEY, HF_API_KEY
 * 2. Run: node scripts/local-process-books.js
 * 
 * This will process ALL books without embeddings, one by one.
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { extractText } from 'unpdf';

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://mocbdqgvsunbxmrnllbr.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const HF_API_KEY = process.env.HF_API_KEY;

const HF_EMBEDDING_MODEL = 'sentence-transformers/all-MiniLM-L6-v2';

// Validate env vars
if (!SUPABASE_KEY) {
    console.error('❌ SUPABASE_SERVICE_KEY not set in .env');
    process.exit(1);
}
if (!GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY not set in .env');
    process.exit(1);
}
if (!HF_API_KEY) {
    console.error('❌ HF_API_KEY not set in .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Helper: Chunk text for embeddings
function chunkText(text, chunkSize = 2000, overlap = 200) {
    const chunks = [];
    let start = 0;

    while (start < text.length) {
        let end = start + chunkSize;
        if (end < text.length) {
            const breakPoints = ['. ', '। ', '\n\n', '\n', ' '];
            for (const bp of breakPoints) {
                const lastBreak = text.lastIndexOf(bp, end);
                if (lastBreak > start + chunkSize / 2) {
                    end = lastBreak + bp.length;
                    break;
                }
            }
        }
        chunks.push(text.slice(start, end).trim());
        start = end - overlap;
        if (start >= text.length - overlap) break;
    }

    return chunks.filter(c => c.length > 50);
}

// Helper: Extract text using Gemini Vision OCR
async function extractWithGemini(pdfBuffer, title) {
    const base64Pdf = Buffer.from(pdfBuffer).toString('base64');
    const fileSizeMB = pdfBuffer.length / (1024 * 1024);

    console.log(`  📄 PDF size: ${fileSizeMB.toFixed(2)} MB`);

    if (fileSizeMB > 20) {
        console.log('  ⚠️ PDF too large for Gemini (max 20MB)');
        return null;
    }

    console.log('  🔮 Using Gemini Vision OCR...');

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            {
                                inline_data: {
                                    mime_type: 'application/pdf',
                                    data: base64Pdf
                                }
                            },
                            {
                                text: `Extract ALL text content from this PDF textbook. 
                                       Include chapter titles, headings, paragraphs, and any educational content.
                                       Output as plain text, preserving structure with line breaks.
                                       For Bangla text, output in Bangla script.
                                       Extract as much content as possible for educational RAG search.`
                            }
                        ]
                    }],
                    generationConfig: {
                        maxOutputTokens: 8192,
                        temperature: 0.1
                    }
                })
            }
        );

        if (!response.ok) {
            const error = await response.text();
            console.log(`  ❌ Gemini API error: ${error.substring(0, 200)}`);
            return null;
        }

        const result = await response.json();
        const extractedText = result.candidates?.[0]?.content?.parts?.[0]?.text;

        if (extractedText && extractedText.length > 200) {
            console.log(`  ✅ Gemini extracted ${extractedText.length} characters`);
            return extractedText;
        }

        return null;
    } catch (error) {
        console.log(`  ❌ Gemini error: ${error.message}`);
        return null;
    }
}

// Helper: Generate embeddings using HuggingFace
async function generateEmbeddings(chunks) {
    console.log(`  🔢 Generating embeddings for ${chunks.length} chunks...`);

    try {
        const response = await fetch(
            `https://router.huggingface.co/hf-inference/pipeline/feature-extraction/${HF_EMBEDDING_MODEL}`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${HF_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    inputs: chunks,
                    options: { wait_for_model: true }
                })
            }
        );

        if (!response.ok) {
            const error = await response.text();
            console.log(`  ❌ HuggingFace API error: ${error.substring(0, 200)}`);
            return null;
        }

        const embeddings = await response.json();
        console.log(`  ✅ Generated ${embeddings.length} embeddings`);
        return embeddings;
    } catch (error) {
        console.log(`  ❌ Embedding error: ${error.message}`);
        return null;
    }
}

// Main processing function for a single book
async function processBook(book, sourceType) {
    console.log(`\n📚 Processing: ${book.title}`);

    try {
        // Step 1: Download PDF
        console.log('  📥 Downloading PDF...');
        const pdfResponse = await fetch(book.file_url);
        if (!pdfResponse.ok) throw new Error('Failed to download PDF');

        const pdfBuffer = await pdfResponse.arrayBuffer();
        const pdfBytes = new Uint8Array(pdfBuffer);

        // Step 2: Try text extraction first
        console.log('  📝 Trying text extraction...');
        let extractedText = '';

        try {
            const { text } = await extractText(pdfBytes, { mergePages: true });
            extractedText = text || '';
        } catch (e) {
            console.log('  ⚠️ unpdf extraction failed, trying OCR...');
        }

        // Step 3: If text extraction poor, use Gemini OCR
        if (extractedText.trim().length < 500) {
            console.log(`  ⚠️ Poor extraction (${extractedText.trim().length} chars) - using OCR`);
            const ocrText = await extractWithGemini(pdfBuffer, book.title);
            if (ocrText) {
                extractedText = ocrText;
            }
        } else {
            console.log(`  ✅ Direct extraction: ${extractedText.length} characters`);
        }

        // Check if we have enough text
        if (extractedText.trim().length < 200) {
            console.log('  ❌ Not enough text extracted, skipping embeddings');
            return false;
        }

        // Step 4: Chunk the text
        const chunks = chunkText(extractedText);
        console.log(`  📦 Created ${chunks.length} chunks`);

        if (chunks.length === 0) {
            console.log('  ❌ No valid chunks created');
            return false;
        }

        // Step 5: Generate embeddings (in batches of 20)
        const batchSize = 20;
        const allEmbeddings = [];

        for (let i = 0; i < chunks.length; i += batchSize) {
            const batch = chunks.slice(i, i + batchSize);
            const embeddings = await generateEmbeddings(batch);

            if (embeddings) {
                allEmbeddings.push(...embeddings);
            } else {
                console.log(`  ⚠️ Failed batch ${i / batchSize + 1}`);
            }

            // Rate limit
            await new Promise(r => setTimeout(r, 1000));
        }

        if (allEmbeddings.length === 0) {
            console.log('  ❌ No embeddings generated');
            return false;
        }

        // Step 6: Store chunks in database
        console.log('  💾 Storing chunks in database...');

        const idColumn = sourceType === 'library' ? 'library_book_id' : 'resource_id';

        // Delete existing chunks
        await supabase.from('book_chunks').delete().eq(idColumn, book.id);

        // Prepare chunk records
        const chunkRecords = chunks.slice(0, allEmbeddings.length).map((text, index) => ({
            [idColumn]: book.id,
            chunk_index: index,
            chunk_text: text,
            embedding: `[${allEmbeddings[index].join(',')}]`
        }));

        // Insert in batches
        const insertBatchSize = 50;
        for (let i = 0; i < chunkRecords.length; i += insertBatchSize) {
            const batch = chunkRecords.slice(i, i + insertBatchSize);
            const { error } = await supabase.from('book_chunks').insert(batch);
            if (error) {
                console.log(`  ⚠️ Insert error: ${error.message}`);
            }
        }

        // Step 7: Update book record
        const bookTable = sourceType === 'library' ? 'library_books' : 'official_resources';
        await supabase
            .from(bookTable)
            .update({
                chunks_generated: true,
                total_chunks: allEmbeddings.length
            })
            .eq('id', book.id);

        console.log(`  ✅ DONE: ${allEmbeddings.length} chunks stored`);
        return true;

    } catch (error) {
        console.error(`  ❌ Error: ${error.message}`);
        return false;
    }
}

// Main function
async function main() {
    console.log('🚀 Local RAG Processing Script');
    console.log('================================\n');

    // Fetch books without embeddings
    console.log('📖 Fetching books without embeddings...');

    const { data: libraryBooks } = await supabase
        .from('library_books')
        .select('id, title, file_url')
        .or('chunks_generated.is.null,chunks_generated.eq.false');

    const { data: officialBooks } = await supabase
        .from('official_resources')
        .select('id, title, file_url')
        .or('chunks_generated.is.null,chunks_generated.eq.false');

    console.log(`Found: ${libraryBooks?.length || 0} library + ${officialBooks?.length || 0} official = ${(libraryBooks?.length || 0) + (officialBooks?.length || 0)} total\n`);

    let successCount = 0;
    let failCount = 0;

    // Process library books
    for (const book of (libraryBooks || [])) {
        const success = await processBook(book, 'library');
        if (success) successCount++;
        else failCount++;

        // Wait 5 seconds between books to avoid rate limits
        await new Promise(r => setTimeout(r, 5000));
    }

    // Process official resources
    for (const book of (officialBooks || [])) {
        const success = await processBook(book, 'official');
        if (success) successCount++;
        else failCount++;

        // Wait 5 seconds between books
        await new Promise(r => setTimeout(r, 5000));
    }

    console.log('\n================================');
    console.log('🏁 Processing Complete!');
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
}

main().catch(console.error);
