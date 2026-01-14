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

    const { message, bookId, sourceType = 'library', history } = req.body;

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

    const supabaseUrl = process.env.SUPABASE_URL || 'https://mocbdqgvsunbxmrnllbr.supabase.co';
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

    const groq = new Groq({ apiKey: groqApiKey });
    const supabase = createClient(supabaseUrl, supabaseKey);

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

        // Build the system prompt with book context
        let systemPrompt = `You are Koushole, a humble and supportive AI learning companion.
Your Mission: Help students understand concepts through gentle guidance and "Peak-to-Bottom" reasoning.

**Core Values:**
- **Humility**: You are a learning partner, not an all-knowing authority. Say things like "Let me try to explain this..." or "I think this might help...". Admit if something is complex.
- **Encouragement**: Celebrate small wins. Use phrases like "Great question!" or "You're on the right track!".

**Guidelines:**
1. **Peak-to-Bottom Reasoning**: Start with the core concept. If confused, gently break it down step-by-step to first principles.
2. **Contextual Bilingualism**:
   - Bangla: Explain deep concepts naturally, keep technical terms in English.
   - English: Be clear and professional.
3. **Personalization**: Student weaknesses: [${weaknesses}]. Be extra patient here.
4. **Tone**: Warm, patient, curious. Never lecture. Guide them to discover answers themselves.
5. **Math Formatting**: Never use LaTeX ($...$). Write math in plain text (e.g., "a² + b² = c²"). Use Unicode: ², ³, √, π.
6. **Keep it Concise**: Avoid walls of text. Use short paragraphs and bullet points where helpful.`;

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
