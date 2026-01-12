import Groq from 'groq-sdk';
import { createClient } from '@supabase/supabase-js';
import { extractText } from 'unpdf';

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

        // Step 1: Fetch PDF and extract text using unpdf
        const pdfResponse = await fetch(fileUrl);
        if (!pdfResponse.ok) {
            throw new Error('Failed to fetch PDF');
        }

        const pdfBuffer = await pdfResponse.arrayBuffer();
        // Store a copy for potential OCR use (ArrayBuffer gets detached after use)
        const pdfBytes = new Uint8Array(pdfBuffer);
        const pdfBytesCopy = new Uint8Array(pdfBytes);

        // Use unpdf to extract text (Vercel-compatible)
        const { text: extractedText, totalPages } = await extractText(pdfBytes, {
            mergePages: true
        });

        console.log('📄 Extracted text length:', extractedText?.length || 0, 'from', totalPages, 'pages');

        let textToAnalyze = extractedText || '';
        let usedOCR = false;

        // Check if text was actually extracted (use higher threshold for Bangla PDFs)
        // unpdf often fails to extract Bangla text properly
        const textLength = textToAnalyze.trim().length;
        if (textLength < 500) {
            console.log('⚠️ Poor text extraction (' + textLength + ' chars) - trying Gemini Vision...');

            // Gemini Vision API - supports PDFs up to 20MB, excellent Bangla OCR
            const geminiApiKey = process.env.GEMINI_API_KEY;
            if (!geminiApiKey) {
                return res.status(200).json({
                    success: true,
                    message: 'GEMINI_API_KEY not configured for OCR',
                    chapters: [],
                    isImageBased: true
                });
            }

            const fileSizeMB = pdfBytesCopy.length / (1024 * 1024);
            console.log('📄 PDF size:', fileSizeMB.toFixed(2), 'MB');

            if (fileSizeMB > 20) {
                return res.status(200).json({
                    success: true,
                    message: 'PDF too large for Gemini Vision (max 20MB)',
                    chapters: [],
                    isImageBased: true
                });
            }

            // Helper function to call Gemini with retry
            async function callGeminiWithRetry(base64Pdf, maxRetries = 2) {
                for (let attempt = 0; attempt <= maxRetries; attempt++) {
                    try {
                        console.log(`🔮 Gemini Vision attempt ${attempt + 1}...`);

                        const geminiResponse = await fetch(
                            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${geminiApiKey}`,
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
                                                text: `Analyze this NCTB (Bangladesh National Curriculum) textbook PDF.

TASK: Extract the Table of Contents ("সূচিপত্র") and ALL chapter information.

Look for patterns:
- "প্রথম অধ্যায়", "দ্বিতীয় অধ্যায়", "তৃতীয় অধ্যায়" etc.
- Chapter titles in Bangla with page numbers
- Unit headings, section titles

Return JSON format ONLY:
{
    "chapters": [
        {
            "chapter_number": 1,
            "title_en": "English Translation of Chapter Title",
            "title_bn": "বাংলা অধ্যায় শিরোনাম",
            "page_start": 1
        }
    ],
    "book_title": "Book name if visible",
    "subject": "Subject area"
}

RULES:
1. Extract ALL chapters from the table of contents
2. Translate Bangla titles to English for title_en
3. Keep original Bangla in title_bn
4. Include page numbers if visible
5. Return ONLY valid JSON, no markdown`
                                            }
                                        ]
                                    }],
                                    generationConfig: {
                                        temperature: 0.1,
                                        maxOutputTokens: 4096
                                    }
                                })
                            }
                        );

                        const geminiData = await geminiResponse.json();

                        // Check for rate limit error
                        if (geminiData.error?.message?.includes('quota') ||
                            geminiData.error?.message?.includes('rate') ||
                            geminiData.error?.code === 429) {

                            if (attempt < maxRetries) {
                                console.log('⏳ Rate limited, waiting 30 seconds...');
                                await new Promise(resolve => setTimeout(resolve, 30000));
                                continue;
                            }
                            throw new Error('Rate limit exceeded after retries');
                        }

                        if (geminiData.error) {
                            throw new Error(geminiData.error.message || JSON.stringify(geminiData.error));
                        }

                        return geminiData;
                    } catch (err) {
                        if (attempt === maxRetries) throw err;
                        console.log('⏳ Error, retrying in 30s:', err.message);
                        await new Promise(resolve => setTimeout(resolve, 30000));
                    }
                }
            }

            try {
                const base64Pdf = Buffer.from(pdfBytesCopy).toString('base64');
                const geminiData = await callGeminiWithRetry(base64Pdf);

                const geminiText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
                console.log('🔮 Gemini response length:', geminiText.length);
                console.log('🔮 Gemini response preview:', geminiText.substring(0, 300));

                // Try to parse chapters directly from Gemini
                const jsonMatch = geminiText.match(/\{[\s\S]*"chapters"[\s\S]*\}/);
                if (jsonMatch) {
                    const parsedData = JSON.parse(jsonMatch[0]);
                    const chapters = parsedData.chapters || [];

                    if (chapters.length > 0) {
                        // Store chapters in database
                        const idColumn = sourceType === 'library' ? 'library_book_id' : 'resource_id';
                        const chaptersToInsert = chapters.map(ch => ({
                            [idColumn]: resourceId,
                            chapter_number: ch.chapter_number || 0,
                            title_en: ch.title_en || ch.title || 'Unknown',
                            title_bn: ch.title_bn || ch.title || 'অজানা',
                            page_start: ch.page_start || null,
                            content_extracted: true // Mark as extracted via OCR
                        }));

                        await supabase.from('book_chapters').delete().eq(idColumn, resourceId);
                        const { data: insertedChapters, error: insertError } = await supabase
                            .from('book_chapters')
                            .insert(chaptersToInsert)
                            .select();

                        if (insertError) throw new Error('DB insert failed: ' + insertError.message);

                        console.log('✅ Extracted', insertedChapters.length, 'chapters via Gemini Vision');

                        // Store the Gemini response text as content (reuse existing response)
                        console.log('📖 Storing extracted text content...');
                        try {
                            const contentIdColumn = sourceType === 'library' ? 'library_book_id' : 'resource_id';

                            // Delete existing content
                            await supabase.from('book_content').delete().eq(contentIdColumn, resourceId);

                            // Store geminiText directly (no second API call)
                            if (geminiText.length > 100) {
                                const { error: contentError } = await supabase
                                    .from('book_content')
                                    .insert({
                                        [contentIdColumn]: resourceId,
                                        chapter_id: insertedChapters[0]?.id,
                                        content_text: geminiText.substring(0, 100000)
                                    });

                                if (contentError) {
                                    console.error('❌ Content storage failed:', contentError.message);
                                } else {
                                    console.log('✅ Stored', geminiText.length, 'chars of content');
                                }
                            }
                        } catch (contentErr) {
                            console.error('❌ Content error:', contentErr.message);
                        }

                        return res.status(200).json({
                            success: true,
                            message: `Extracted ${insertedChapters.length} chapters`,
                            chapters: insertedChapters,
                            contentStored: geminiText.length > 100,
                            usedOCR: true
                        });
                    }
                }

                // If no chapters found, continue to Groq analysis
                textToAnalyze = geminiText;
                usedOCR = true;

            } catch (ocrError) {
                console.error('Gemini Vision Error:', ocrError.message);
                return res.status(200).json({
                    success: true,
                    message: 'Gemini OCR failed: ' + ocrError.message,
                    chapters: [],
                    isImageBased: true
                });
            }
        }

        // Step 2: Use AI to identify chapters from the text
        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: 'system',
                    content: `You are an expert at analyzing textbook content, especially NCTB (Bangladesh National Curriculum) books.
                    Given extracted text from a textbook PDF, identify the chapter/section list.
                    
                    Look for patterns like:
                    - "Chapter 1", "অধ্যায় ১", "পাঠ ১"
                    - Numbered sections
                    - Table of Contents entries
                    - Unit headings
                    
                    Return a JSON object with this structure:
                    {
                        "chapters": [
                            {
                                "chapter_number": 1,
                                "title_en": "Chapter title in English",
                                "title_bn": "বাংলায় শিরোনাম"
                            }
                        ]
                    }
                    
                    Rules:
                    - If text is in Bangla, translate to English for title_en
                    - If text is in English, transliterate to Bangla for title_bn
                    - If you can't find chapters, return {"chapters": []}
                    - Return ONLY valid JSON, no markdown`
                },
                {
                    role: 'user',
                    content: `Find chapters in this textbook text:\n\n${textToAnalyze.substring(0, 10000)}`
                }
            ],
            model: 'meta-llama/llama-4-scout-17b-16e-instruct',
            temperature: 0.1,
            max_tokens: 2048,
            response_format: { type: 'json_object' }
        });

        const aiResponse = completion.choices[0]?.message?.content;
        console.log('🤖 AI Response:', aiResponse?.substring(0, 500));

        // Parse AI response
        let chaptersData;
        try {
            chaptersData = JSON.parse(aiResponse);
        } catch (parseError) {
            console.warn('Failed to parse AI response, trying to extract JSON');
            const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                chaptersData = JSON.parse(jsonMatch[0]);
            } else {
                chaptersData = { chapters: [] };
            }
        }

        const chapters = Array.isArray(chaptersData.chapters) ? chaptersData.chapters :
            Array.isArray(chaptersData) ? chaptersData : [];

        console.log('📖 Found', chapters.length, 'chapters');

        // If no chapters found, return success with empty array
        if (chapters.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'No chapters detected in the document',
                chapters: [],
                textLength: textToAnalyze.length,
                usedOCR: usedOCR
            });
        }

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
        const contentIdColumn = sourceType === 'library' ? 'library_book_id' : 'resource_id';

        // Delete existing content
        await supabase.from('book_content').delete().eq(contentIdColumn, resourceId);

        const { error: contentError } = await supabase
            .from('book_content')
            .insert({
                [contentIdColumn]: resourceId,
                chapter_id: insertedChapters[0]?.id,
                content_text: extractedText.substring(0, 100000) // Store up to 100k chars
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
