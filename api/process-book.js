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
            console.log('⚠️ Poor text extraction (' + textLength + ' chars) - trying OCR...');

            try {
                // Try Groq vision first (using your existing API key)
                console.log('🔮 Trying Groq Llama 3.2 Vision...');

                // Groq requires images, not PDFs - try with URL first
                const groqVisionResponse = await groq.chat.completions.create({
                    messages: [
                        {
                            role: 'user',
                            content: [
                                {
                                    type: 'text',
                                    text: `Analyze this NCTB Bangladesh textbook. Find the "সূচিপত্র" (Table of Contents) and extract ALL chapter titles.

Return JSON format ONLY:
{
    "chapters": [
        {"chapter_number": 1, "title_en": "English Translation", "title_bn": "বাংলা শিরোনাম"}
    ]
}

Look for: প্রথম অধ্যায়, দ্বিতীয় অধ্যায়, etc. Translate Bangla to English.`
                                },
                                {
                                    type: 'image_url',
                                    image_url: {
                                        url: fileUrl
                                    }
                                }
                            ]
                        }
                    ],
                    model: 'llama-3.2-11b-vision-preview',
                    temperature: 0.1,
                    max_tokens: 4096
                });

                const groqVisionText = groqVisionResponse.choices?.[0]?.message?.content || '';
                console.log('🔮 Groq Vision response length:', groqVisionText.length);

                if (groqVisionText.length > 0) {
                    const jsonMatch = groqVisionText.match(/\{[\s\S]*"chapters"[\s\S]*\}/);
                    if (jsonMatch) {
                        const parsedChapters = JSON.parse(jsonMatch[0]);
                        const chapters = parsedChapters.chapters || [];

                        if (chapters.length > 0) {
                            const idColumn = sourceType === 'library' ? 'library_book_id' : 'resource_id';
                            const chaptersToInsert = chapters.map(ch => ({
                                [idColumn]: resourceId,
                                chapter_number: ch.chapter_number || 0,
                                title_en: ch.title_en || ch.title || 'Unknown',
                                title_bn: ch.title_bn || ch.title || 'অজানা',
                                content_extracted: false
                            }));

                            await supabase.from('book_chapters').delete().eq(idColumn, resourceId);
                            const { data: insertedChapters, error: insertError } = await supabase
                                .from('book_chapters')
                                .insert(chaptersToInsert)
                                .select();

                            if (insertError) throw new Error('DB insert failed: ' + insertError.message);

                            return res.status(200).json({
                                success: true,
                                message: 'Chapters extracted via Groq Vision',
                                chapters: insertedChapters,
                                usedOCR: true,
                                model: 'groq-llama-3.2-vision'
                            });
                        }
                    }
                }

            } catch (groqVisionError) {
                console.log('⚠️ Groq Vision failed, trying Gemini 1.5 Flash:', groqVisionError.message);
            }

            // Fallback to Gemini 1.5 Flash (better rate limits than 2.0)
            try {
                const geminiApiKey = process.env.GEMINI_API_KEY;
                if (!geminiApiKey) {
                    return res.status(200).json({
                        success: true,
                        message: 'No GEMINI_API_KEY for OCR fallback',
                        chapters: [],
                        isImageBased: true
                    });
                }

                const base64Pdf = Buffer.from(pdfBytesCopy).toString('base64');

                const geminiResponse = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`,
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

TASK: Find the "সূচিপত্র" (Table of Contents) page and extract ALL chapters.

Look for patterns like:
- "প্রথম অধ্যায়", "দ্বিতীয় অধ্যায়", "তৃতীয় অধ্যায়" etc.
- Chapter titles in Bangla with page numbers
- Numbered sections (১, ২, ৩ or 1, 2, 3)

Return JSON format:
{
    "chapters": [
        {"chapter_number": 1, "title_en": "English Translation", "title_bn": "বাংলা শিরোনাম", "page_start": 1}
    ]
}

RULES:
1. Extract ALL chapters from the table of contents
2. Translate Bangla titles to English for title_en
3. Keep original Bangla in title_bn
4. Include page numbers if visible
5. Return ONLY valid JSON, no markdown or explanation`
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
                console.log('🔮 Gemini raw response status:', geminiResponse.status);

                // Check for Gemini API errors
                if (geminiData.error) {
                    console.error('Gemini API error:', geminiData.error);
                    return res.status(200).json({
                        success: false,
                        message: 'Gemini API error: ' + (geminiData.error.message || JSON.stringify(geminiData.error)),
                        chapters: [],
                        debug: geminiData.error
                    });
                }

                const geminiText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
                console.log('🔮 Gemini OCR response length:', geminiText.length);
                console.log('🔮 Gemini OCR response:', geminiText.substring(0, 1000));

                // Try to parse chapters directly from Gemini response
                const jsonMatch = geminiText.match(/\{[\s\S]*"chapters"[\s\S]*\}/);
                if (jsonMatch) {
                    try {
                        const parsedChapters = JSON.parse(jsonMatch[0]);
                        const chapters = parsedChapters.chapters || [];

                        if (chapters.length > 0) {
                            // Store chapters directly
                            const idColumn = sourceType === 'library' ? 'library_book_id' : 'resource_id';
                            const chaptersToInsert = chapters.map(ch => ({
                                [idColumn]: resourceId,
                                chapter_number: ch.chapter_number || 0,
                                title_en: ch.title_en || ch.title || 'Unknown',
                                title_bn: ch.title_bn || ch.title || 'অজানা',
                                content_extracted: false
                            }));

                            await supabase.from('book_chapters').delete().eq(idColumn, resourceId);
                            const { data: insertedChapters, error: insertError } = await supabase
                                .from('book_chapters')
                                .insert(chaptersToInsert)
                                .select();

                            if (insertError) {
                                throw new Error('Database insert failed: ' + insertError.message);
                            }

                            return res.status(200).json({
                                success: true,
                                message: 'Chapters extracted via OCR',
                                chapters: insertedChapters,
                                usedOCR: true
                            });
                        }
                    } catch (parseError) {
                        console.error('JSON parse error:', parseError);
                    }
                }

                // If we get here, OCR worked but no chapters found in expected format
                // Return debug info
                return res.status(200).json({
                    success: true,
                    message: 'OCR worked but no chapters found in response',
                    chapters: [],
                    usedOCR: true,
                    debug: {
                        responseLength: geminiText.length,
                        responsePreview: geminiText.substring(0, 500)
                    }
                });

            } catch (ocrError) {
                console.error('OCR Error:', ocrError);
                return res.status(200).json({
                    success: true,
                    message: 'OCR failed: ' + ocrError.message,
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
