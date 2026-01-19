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

    const { message, history, userClass, userGroup } = req.body;
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'Server Config Error: Missing GROQ_API_KEY' });
    }

    try {
        const groq = new Groq({ apiKey });

        // Extract weaknesses for context
        const weaknesses = history?.weaknesses ? history.weaknesses.join(', ') : 'None detected';

        // Determine student level for age-appropriate responses
        const studentClass = userClass || 'Unknown';
        const isJunior = ['6', '7', '8'].includes(String(studentClass));
        const isSeniorSecondary = ['9', '10', '11', '12'].includes(String(studentClass));
        const isUniversity = String(studentClass).toLowerCase().includes('university');

        // Build age-appropriate complexity guidance
        let ageGuidance = '';
        if (isJunior) {
            ageGuidance = `\n**Student Level:** Junior (Class 6-8). Use VERY simple language. Explain like talking to a 12-year-old. Use fun analogies and keep answers SHORT.`;
        } else if (isSeniorSecondary) {
            ageGuidance = `\n**Student Level:** Secondary (Class 9-12). Use clear academic language. Include formulas and definitions as needed.`;
        } else if (isUniversity) {
            ageGuidance = `\n**Student Level:** University. Use technical/professional language. Include detailed explanations.`;
        }

        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: 'system',
                    content: `You are Koushole, a humble and supportive AI learning companion for Bangladeshi students.
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
2. **Contextual Bilingualism**: Bangla for deep concepts naturally, English technical terms.
3. **Personalization**: Student weaknesses: [${weaknesses}]. Be extra patient here.
4. **Tone**: Warm, patient, curious. Never lecture. Guide discovery.
5. **Math Formatting**: Never use LaTeX. Write math in plain text (e.g., "a² + b² = c²"). Use Unicode.
6. **Keep it Concise**: Short paragraphs and bullet points.
7. **Diagram Requests**: When someone asks for a diagram, explain briefly then provide a PRECISE prompt for the wand button.`
                },
                {
                    role: 'user',
                    content: message
                }
            ],
            model: 'meta-llama/llama-4-scout-17b-16e-instruct',
            temperature: 0.7,
            max_tokens: 1024,
        });

        const reply = completion.choices[0]?.message?.content || "I'm having trouble thinking right now. Please try again.";
        return res.status(200).json({ reply });

    } catch (error) {
        console.error("Groq API Error:", error);
        return res.status(500).json({ error: error.message || 'Failed to generate content' });
    }
}
