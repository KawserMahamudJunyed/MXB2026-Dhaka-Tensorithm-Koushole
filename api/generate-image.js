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

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { prompt } = req.body;
    const apiKey = process.env.HF_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'Server Config Error: Missing HF_API_KEY' });
    }

    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
    }

    const MAX_RETRIES = 3;
    let attempt = 0;

    while (attempt < MAX_RETRIES) {
        try {
            // Use FLUX.1-dev - higher quality model for better diagrams
            const response = await fetch(
                "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-dev",
                {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${apiKey}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        inputs: `Educational diagram: ${prompt}. 
Style: Professional textbook illustration, clean white background, precise geometric shapes, clearly labeled parts, mathematical accuracy, technical drawing, simple colors, high contrast, no decorative elements, scientific accuracy.`,
                        parameters: {
                            num_inference_steps: 30,
                            guidance_scale: 7.5
                        }
                    }),
                }
            );

            if (response.status === 503) {
                const errorText = await response.text();
                // Check if there is an estimated wait time
                let waitTime = 2000 * Math.pow(2, attempt); // Default exponential backoff: 2s, 4s, 8s
                try {
                    const jsonError = JSON.parse(errorText);
                    if (jsonError.estimated_time) {
                        waitTime = Math.max(waitTime, jsonError.estimated_time * 1000);
                    }
                } catch (e) { }

                console.warn(`Attempt ${attempt + 1} failed with 503. Retrying in ${waitTime}ms...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                attempt++;
                continue;
            }

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HuggingFace API Error: ${response.status} - ${errorText}`);
            }

            // Response is a binary image
            const imageBuffer = await response.arrayBuffer();
            const base64 = Buffer.from(imageBuffer).toString('base64');

            return res.status(200).json({
                image: `data:image/png;base64,${base64}`,
                success: true
            });

        } catch (error) {
            console.error(`Image Generation Error (Attempt ${attempt + 1}):`, error);
            if (attempt === MAX_RETRIES - 1) {
                return res.status(500).json({ error: error.message || 'Failed to generate image' });
            }
            attempt++;
            // If it's a network error (not 503 which is handled above), wait a bit and retry
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
}
