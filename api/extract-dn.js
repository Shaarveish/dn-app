// This runs on the server (Vercel), never in the browser.
// Fixed base64 text parsing and added safe fallback formatting for Gemini 1.5 Flash.

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
    // CRITICAL FIX 1: Strip out data URI scheme if present (e.g., "data:image/jpeg;base64,")
    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");

    // Using stable v1 API endpoint
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
                  data: cleanBase64,
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
      console.error('Gemini API explicit error:', data);
      return res.status(geminiResponse.status).json({ error: data.error?.message || 'Gemini API request failed.' });
    }

    let aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Strip markdown formatting if Gemini includes it
    if (aiText.includes('```')) {
      aiText = aiText.replace(/```json/gi, '').replace(/```/g, '').trim();
    }

    // CRITICAL FIX 2: Emulate Claude's message structure exactly for your frontend layout parser
    const formattedData = {
      content: [
        {
          type: 'text',
          text: aiText,
        },
      ],
    };

    return res.status(200).json(formattedData);
  } catch (err) {
    console.error('Server error handling Gemini execution:', err);
    return res.status(500).json({ error: `Server error: ${err.message || 'Unknown processing error'}` });
  }
}
