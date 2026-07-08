// This runs on the server (Vercel), never in the browser.
// Fixed response structure to match what your frontend layout expects from Claude!

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server is missing GEMINI_API_KEY. Set it in your Vercel project settings.' });
  }

  const { base64Image, prompt } = req.body || {};
  if (!base64Image || !prompt) {
    return res.status(400).json({ error: 'Missing base64Image or prompt in request body.' });
  }

  try {
    const geminiUrl = `https://googleapis.com{apiKey}`;

    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: base64Image,
                },
              },
              {
                text: prompt,
              },
            ],
          },
        ],
      }),
    });

    const data = await geminiResponse.json();

    if (!geminiResponse.ok) {
      console.error('Gemini API error:', data);
      return res.status(geminiResponse.status).json({ error: data.error?.message || 'Gemini API request failed.' });
    }

    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // CRITICAL FIX: Match the exact response layout your frontend requires
    const formattedData = {
      content: [
        {
          text: aiText,
        },
      ],
    };

    return res.status(200).json(formattedData);
  } catch (err) {
    console.error('Server error calling Gemini:', err);
    return res.status(500).json({ error: 'Server error while contacting Gemini API.' });
  }
}

