// This runs on the server (Vercel), never in the browser.
// It keeps your ANTHROPIC_API_KEY secret while letting the app
// send it a photo and get back the extracted DN fields.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server is missing ANTHROPIC_API_KEY. Set it in your Vercel project settings.' });
  }

  const { base64Image, prompt } = req.body || {};
  if (!base64Image || !prompt) {
    return res.status(400).json({ error: 'Missing base64Image or prompt in request body.' });
  }

  try {
    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64Image } },
            { type: 'text', text: prompt }
          ]
        }]
      })
    });

    const data = await anthropicResponse.json();

    if (!anthropicResponse.ok) {
      console.error('Anthropic API error:', data);
      return res.status(anthropicResponse.status).json({ error: data.error?.message || 'Anthropic API request failed.' });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error('Server error calling Anthropic:', err);
    return res.status(500).json({ error: 'Server error while contacting Anthropic API.' });
  }
}
