import Groq from 'groq-sdk';
import { createClient } from '@supabase/supabase-js';
import { createRequire } from 'module';

// Use createRequire for CommonJS packages in ESM
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

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

    const { resourceId, fileUrl, sourceType = 'official' } = req.body;

    // resourceId can be from 'official_resources' or 'library_books' table
    if (!resourceId || !fileUrl) {
        return res.status(400).json({ error: 'resourceId and fileUrl are required' });
    }

    // Validate sourceType
    const validSources = ['official', 'library'];
    if (!validSources.includes(sourceType)) {
        return res.status(400).json({ error: 'sourceType must be "official" or "library"' });
    }

    // Initialize clients
    const groqApiKey = process.env.GROQ_API_KEY;
    const supabaseUrl = process.env.SUPABASE_URL || 'https://mocbdqgvsunbxmrnllbr.supabase.co';
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!groqApiKey) {
        return res.status(500).json({ error: 'GROQ_API_KEY not configured' });
    }

    const groq = new Groq({ apiKey: groqApiKey });
    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        console.log('📚 Processing book:', fileUrl);

        // Step 1: Fetch PDF and extract text (first few pages for TOC)
        const pdfResponse = await fetch(fileUrl);
        if (!pdfResponse.ok) {
            throw new Error('Failed to fetch PDF');
        }

        const pdfBuffer = await pdfResponse.arrayBuffer();

        // Parse PDF (first 10 pages for TOC extraction)
        const pdfData = await pdfParse(Buffer.from(pdfBuffer), {
            max: 10
        });

        const extractedText = pdfData.text;
        console.log('📄 Extracted text length:', extractedText.length);

        // Step 2: Use AI to identify chapters from the text
        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: 'system',
                    content: `You are an expert at analyzing NCTB (Bangladesh National Curriculum) textbook content.
                    Given the text from the first pages of a textbook, identify and extract the chapter list.
                    
                    Return a JSON array of chapters with this structure:
                    {
                        "chapters": [
                            {
                                "chapter_number": 1,
                                "title_en": "Chapter title in English",
                                "title_bn": "অধ্যায়ের শিরোনাম বাংলায়",
                                "page_start": 1
                            }
                        ]
                    }
                    
                    Important:
                    - Extract both Bangla and English titles if available
                    - If only Bangla is available, translate to English
                    - If only English is available, transliterate to Bangla
                    - Include page numbers if visible
                    - Focus on main chapters, not sub-sections
                    - Return ONLY valid JSON, no markdown`
                },
                {
                    role: 'user',
                    content: `Extract the chapter list from this textbook content:\n\n${extractedText.substring(0, 8000)}`
                }
            ],
            model: 'meta-llama/llama-4-scout-17b-16e-instruct',
            temperature: 0.1,
            max_tokens: 2048,
            response_format: { type: 'json_object' }
        });

        const aiResponse = completion.choices[0]?.message?.content;
        console.log('🤖 AI Response:', aiResponse);

        // Parse AI response
        let chaptersData;
        try {
            chaptersData = JSON.parse(aiResponse);
        } catch (parseError) {
            // Try to extract JSON from response
            const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                chaptersData = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('Failed to parse AI response as JSON');
            }
        }

        const chapters = chaptersData.chapters || chaptersData;

        if (!Array.isArray(chapters) || chapters.length === 0) {
            throw new Error('No chapters found in the document');
        }

        console.log('📖 Found', chapters.length, 'chapters');

        // Step 3: Store chapters in database
        // Use appropriate ID column based on source type
        const idColumn = sourceType === 'library' ? 'library_book_id' : 'resource_id';

        const chaptersToInsert = chapters.map(ch => ({
            [idColumn]: resourceId,
            chapter_number: ch.chapter_number || ch.number || 0,
            title_en: ch.title_en || ch.title || 'Unknown',
            title_bn: ch.title_bn || ch.title || 'অজানা',
            page_start: ch.page_start || ch.page || null,
            page_end: ch.page_end || null,
            content_extracted: false
        }));

        // Delete existing chapters for this resource (re-processing)
        await supabase
            .from('book_chapters')
            .delete()
            .eq(idColumn, resourceId);

        // Insert new chapters
        const { data: insertedChapters, error: insertError } = await supabase
            .from('book_chapters')
            .insert(chaptersToInsert)
            .select();

        if (insertError) {
            throw new Error(`Database insert failed: ${insertError.message}`);
        }

        console.log('✅ Stored', insertedChapters.length, 'chapters in database');

        // Step 4: Store full text content for quiz generation
        const { error: contentError } = await supabase
            .from('book_content')
            .insert({
                chapter_id: insertedChapters[0]?.id, // Link to first chapter for now
                content: extractedText.substring(0, 50000) // Store first 50k chars
            });

        if (contentError) {
            console.warn('Warning: Failed to store book content:', contentError.message);
        }

        res.status(200).json({
            success: true,
            message: `Extracted ${insertedChapters.length} chapters`,
            chapters: insertedChapters
        });

    } catch (error) {
        console.error('❌ Process book error:', error);
        res.status(500).json({
            error: error.message || 'Failed to process book',
            details: error.toString()
        });
    }
}
