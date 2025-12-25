export default async function handler(req, res) {
  // 1. Get the API Key from Vercel Environment Variables
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API Key not configured on server' });
  }

  // 2. Prepare the request URL
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

  try {
    // 3. Forward the request to Google
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();

    // 4. Return Google's response to the frontend
    res.status(200).json(data);
  } catch (error) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: 'Failed to fetch from Gemini' });
  }
}