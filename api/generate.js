import Groq from 'groq-sdk';

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { contents } = req.body;
  const prompt = contents?.[0]?.parts?.[0]?.text;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GROQ_API_KEY not configured' });
  }

  const groq = new Groq({ apiKey });

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are a strict JSON generator for an educational quiz app. 
                    1. Return ONLY a valid JSON array of question objects.
                    2. For "fill_gap" type, use EXACTLY 5 underscores (_____) to mark the gap.
                    3. For "order" type, provide the full correct sentence in "answer".
                    4. No Markdown formatting, no code blocks, just raw JSON.
                    5. For MATH: Use Unicode symbols instead of LaTeX. Examples:
                       - Squares: x², a², r² (NOT x^2 or $x^2$)
                       - Cubes: x³, a³ (NOT x^3)
                       - Fractions: Write as a/b or use ÷
                       - Pi: Use π (NOT \\pi or $\\pi$)
                       - Square root: Use √ (NOT \\sqrt)
                       - Formulas: A = πr², P = 2(l + w), E = mc²
                       - NEVER use $ signs or LaTeX syntax like \\frac, \\times, etc.
                    
                    Required keys: "type", "question", "topic", "options", "correctIndex", "pairs", "items", "answer", "hint", "explanation".`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      temperature: 0.2, // Low temp for strict format
      max_tokens: 4096,
      response_format: { type: 'json_object' }
    });

    const rawContent = completion.choices[0]?.message?.content;

    // Robust JSON Extraction
    let cleanJSON = rawContent;
    const firstBracket = rawContent.indexOf('[');
    const lastBracket = rawContent.lastIndexOf(']');

    if (firstBracket !== -1 && lastBracket !== -1) {
      cleanJSON = rawContent.substring(firstBracket, lastBracket + 1);
    }

    // Let's stick to the existing structure the frontend expects to avoid breaking it immediately,
    // BUT the clean way is to return { text: ... }.

    // Wait, the frontend code I saw does this:
    // let text = data.candidates[0].content.parts[0].text;

    // I will return the structure it expects to "trick" it into working without changing frontend logic yet.

    // Let's stick to the existing structure the frontend expects
    res.status(200).json({
      candidates: [{
        content: {
          parts: [{
            text: cleanJSON
          }]
        }
      }]
    });

  } catch (error) {
    console.error("Groq API Error:", error);
    res.status(500).json({ error: error.message || 'Failed to generate content' });
  }
}