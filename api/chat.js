import Groq from 'groq-sdk';

export default async function handler(req, res) {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { message, history } = req.body;
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'Server Config Error: Missing GROQ_API_KEY' });
    }

    try {
        const groq = new Groq({ apiKey });

        // Extract weaknesses for context
        const weaknesses = history?.weaknesses ? history.weaknesses.join(', ') : 'None detected';

        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: 'system',
                    content: `You are Koushole, a Socratic AI Tutor.
Your Mission: Guide the student to understanding through questioning and "Peak-to-Bottom" reasoning.

**Guidelines:**
1. **Peak-to-Bottom Reasoning**: Start with the core concept. If the student is confused, break it down step-by-step into simpler first principles.
2. **Contextual Bilingualism**:
   - If the student speaks Bangla: Explain deep concepts in natural Bangla, but keep technical terms in English (e.g., "Integration area under the curve calculate kore").
   - If English: Use clear, professional English.
3. **Personalization**: The student has these known weaknesses: [${weaknesses}]. Be extra supportive in these areas.
4. **Tone**: Encouraging, patient, and wise. Do not lecture; help them discover the answer.`
                },
                {
                    role: 'user',
                    content: message
                }
            ],
            model: 'llama3-70b-8192',
            temperature: 0.7,
            max_tokens: 1024,
        });

        const reply = completion.choices[0]?.message?.content || "I'm having trouble thinking right now. Please try again.";
        return res.status(200).json({ reply });

    } catch (error) {
        console.error("Groq API Error:", error);
        return res.status(500).json({ error: 'Failed to generate content' });
    }
}
