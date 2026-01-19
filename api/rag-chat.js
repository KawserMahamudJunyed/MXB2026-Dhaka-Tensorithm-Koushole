import Groq from 'groq-sdk';
import { createClient } from '@supabase/supabase-js';

// Voyage AI for embeddings (matches book processing)
const VOYAGE_EMBEDDING_MODEL = 'voyage-multilingual-2';

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

    const { message, bookId, sourceType = 'library', history, userClass, userGroup } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'message is required' });
    }

    const groqApiKey = process.env.GROQ_API_KEY;
    const voyageApiKey = process.env.VOYAGE_API_KEY;

    if (!groqApiKey) {
        return res.status(500).json({ error: 'GROQ_API_KEY not configured' });
    }

    if (!voyageApiKey) {
        return res.status(500).json({ error: 'VOYAGE_API_KEY not configured' });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl) {
        return res.status(500).json({ error: 'SUPABASE_URL not configured' });
    }

    const groq = new Groq({ apiKey: groqApiKey });
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Determine student level for age-appropriate responses
    const studentClass = userClass || 'Unknown';
    const isJunior = ['6', '7', '8'].includes(String(studentClass));
    const isSeniorSecondary = ['9', '10', '11', '12'].includes(String(studentClass));
    const isUniversity = String(studentClass).toLowerCase().includes('university');

    try {
        let context = '';
        let sources = [];

        // If bookId provided, do RAG - retrieve relevant chunks
        if (bookId) {
            console.log(`📚 RAG mode: searching book ${bookId} for: "${message.substring(0, 50)}..."`);

            // Step 1: Generate embedding for the query
            const queryEmbedding = await generateQueryEmbedding(message, voyageApiKey);

            // Step 2: Search for similar chunks using Supabase RPC
            const { data: chunks, error: searchError } = await supabase.rpc(
                'search_book_chunks',
                {
                    query_embedding: `[${queryEmbedding.join(',')}]`,
                    match_count: 5,
                    book_id: bookId,
                    is_library_book: sourceType === 'library'
                }
            );

            if (searchError) {
                console.error('❌ Vector search error:', searchError.message);
                // Fall back to regular chat if search fails
            } else if (chunks && chunks.length > 0) {
                console.log(`✅ Found ${chunks.length} relevant chunks`);

                // Build context from chunks
                context = chunks.map((chunk, idx) =>
                    `[Source ${idx + 1}] ${chunk.chunk_text}`
                ).join('\n\n');

                sources = chunks.map((chunk, idx) => ({
                    index: idx + 1,
                    text: chunk.chunk_text.substring(0, 200) + '...',
                    similarity: Math.round(chunk.similarity * 100)
                }));
            } else {
                console.log('⚠️ No relevant chunks found, using general knowledge');
            }
        }

        // Extract weaknesses for context
        const weaknesses = history?.weaknesses ? history.weaknesses.join(', ') : 'None detected';

        // Build age-appropriate complexity guidance
        let ageGuidance = '';
        if (isJunior) {
            ageGuidance = `
**Student Level:** Junior (Class 6-8). Use VERY simple language. Explain like talking to a 12-year-old. Use fun analogies, everyday examples, and avoid jargon. Keep answers SHORT.`;
        } else if (isSeniorSecondary) {
            ageGuidance = `
**Student Level:** Secondary (Class 9-12). Use clear academic language. Explain concepts thoroughly but accessibly. Include relevant formulas and definitions as needed.`;
        } else if (isUniversity) {
            ageGuidance = `
**Student Level:** University. Use technical/professional language. Include detailed explanations, research context, and advanced concepts as appropriate.`;
        }

        // Build the system prompt with enhanced safety and age-appropriateness
        let systemPrompt = `You are Koushole, a humble and supportive AI learning companion for Bangladeshi students.
Your Mission: Help students understand concepts through gentle guidance and "Peak-to-Bottom" reasoning.

**🚨 CRITICAL SAFETY RULES (ABSOLUTE - NEVER BREAK):**
1. **NO Adult/Inappropriate Content:** NEVER discuss sexual content, explicit material, violence, drugs, or any NSFW topics. If asked, politely decline: "আমি এই বিষয়ে সাহায্য করতে পারব না। চলো পড়াশোনার বিষয়ে কথা বলি! 📚"
2. **NO Harmful Information:** Never provide instructions for weapons, hacking, self-harm, or illegal activities.
3. **Age-Appropriate Only:** Always keep responses suitable for school students.
4. **Redirect Gently:** If asked inappropriate questions, redirect to educational topics without judgment.
${ageGuidance}

**Core Values:**
- **Humility**: You are a learning partner, not an authority. Say "Let me try to explain..." or "I think this might help...".
- **Encouragement**: Celebrate small wins. "Great question!" or "You're on the right track!".

**Guidelines:**
1. **Peak-to-Bottom Reasoning**: Start with the core concept. Break down step-by-step if confused.
2. **Contextual Bilingualism**:
   - Bangla: Explain naturally, keep technical terms in English.
   - English: Clear and professional.
3. **Personalization**: Student weaknesses: [${weaknesses}]. Be extra patient here.
4. **Tone**: Warm, patient, curious. Never lecture. Guide discovery.
5. **Math Formatting**: Never use LaTeX. Write math in plain text (e.g., "a² + b² = c²"). Use Unicode: ², ³, √, π.
6. **Keep it Concise**: Short paragraphs and bullet points.`;

        // Add book context if available
        if (context) {
            systemPrompt += `

**IMPORTANT - Book Context Mode:**
You have been provided with relevant excerpts from a book. Use this context to answer the student's question.
- If the answer is in the context, use it and cite which source you're using.
- If the answer is NOT in the context, say "I couldn't find this specific information in the book, but based on my general knowledge..."
- Always prioritize the book content over your general knowledge.

**Book Excerpts:**
${context}`;
        }

        // Make the chat completion request
        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: 'system',
                    content: systemPrompt
                },
                {
                    role: 'user',
                    content: message
                }
            ],
            model: 'meta-llama/llama-4-scout-17b-16e-instruct',
            temperature: 0.7,
            max_tokens: 2048, // Increased for detailed answers
        });

        const reply = completion.choices[0]?.message?.content || "I'm having trouble thinking right now. Please try again.";

        // Return response with sources if RAG was used
        return res.status(200).json({
            reply,
            usedBookContext: context.length > 0,
            sources: sources.length > 0 ? sources : undefined
        });

    } catch (error) {
        console.error("RAG Chat API Error:", error);
        return res.status(500).json({ error: error.message || 'Failed to generate content' });
    }
}

// Helper: Generate embedding for a query using Voyage AI
async function generateQueryEmbedding(text, voyageApiKey) {
    const response = await fetch(
        'https://api.voyageai.com/v1/embeddings',
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${voyageApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                input: [text.substring(0, 8000)], // Voyage limit
                model: VOYAGE_EMBEDDING_MODEL,
                input_type: 'query'
            })
        }
    );

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to generate query embedding: ${error}`);
    }

    const result = await response.json();
    return result.data[0].embedding;
}
