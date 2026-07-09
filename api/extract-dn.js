// This runs on the server (Vercel), never in the browser.
// It keeps your GEMINI_API_KEY secret while letting the app
// send it a photo and get back the extracted DN fields.
// Uses Google's Gemini API (free tier: gemini-2.5-flash-lite).

module.exports = async function handler(req, res) {
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
    const geminiResponse = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [
              { text: prompt },
              { inline_data: { mime_type: 'image/jpeg', data: base64Image } }
            ]
          }]
        })
      }
    );

    const data = await geminiResponse.json();

    if (!geminiResponse.ok) {
      console.error('Gemini API error:', data);
      return res.status(geminiResponse.status).json({ error: data.error?.message || 'Gemini API request failed.' });
    }

    const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('\n') || '';

    // Normalize to the same shape the app expects: { content: [{ text }] }
    return res.status(200).json({ content: [{ text }] });
  } catch (err) {
    console.error('Server error calling Gemini:', err);
    return res.status(500).json({ error: 'Server error while contacting Gemini API.' });
  }
}
