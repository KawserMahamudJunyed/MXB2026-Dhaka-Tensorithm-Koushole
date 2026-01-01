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
                    You must only return a valid JSON array of question objects. 
                    Do not include Markdown formatting (no \`\`\`json). 
                    Ensure keys: "type", "question", "topic", "options", "correctIndex", "pairs", "items", "answer", "hint", "explanation".`
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

    // Ensure the response is wrapped in the expected structure for the frontend
    // The frontend expects { candidates: [ { content: { parts: [ { text: "JSON STRING" } ] } } ] }
    // or we can adapt the frontend. Let's adapt the API response to match what the frontend parses,
    // OR simply return clean JSON and update the frontend.
    // CURRENT FRONTEND LOGIC: data.candidates[0].content.parts[0].text

    // We will mimic the Google Vertex AI structure to minimize frontend changes for now,
    // OR better yet, let's keep it simple and update frontend to read data.quiz

    // Let's stick to the existing structure the frontend expects to avoid breaking it immediately,
    // BUT the clean way is to return { text: ... }.

    // Wait, the frontend code I saw does this:
    // let text = data.candidates[0].content.parts[0].text;

    // I will return the structure it expects to "trick" it into working without changing frontend logic yet.

    res.status(200).json({
      candidates: [{
        content: {
          parts: [{
            text: rawContent
          }]
        }
      }]
    });

  } catch (error) {
    console.error("Groq API Error:", error);
    res.status(500).json({ error: error.message || 'Failed to generate content' });
  }
}