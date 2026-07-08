// This runs on the server (Vercel), never in the browser.
// Uses native Node.js HTTPS module to guarantee connection without fetch failures!
import https from 'https';

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
    // Strip out data URI scheme if present
    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");

    const postData = JSON.stringify({
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
    });

    // Native HTTPS request configuration to prevent environment fetch errors
    const options = {
      hostname: '://googleapis.com',
      path: `/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    // Wrap the native request execution in a promise structure
    const geminiBody = await new Promise((resolve, reject) => {
      const request = https.request(options, (response) => {
        let incomingChunks = '';
        response.on('data', (chunk) => { incomingChunks += chunk; });
        response.on('end', () => {
          if (response.statusCode >= 400) {
            reject(new Error(`API responded with code ${response.statusCode}: ${incomingChunks}`));
          } else {
            resolve(JSON.parse(incomingChunks));
          }
        });
      });

      request.on('error', (err) => { reject(err); });
      request.write(postData);
      request.end();
    });

    let aiText = geminiBody.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Strip markdown formatting if Gemini includes it
    if (aiText.includes('```')) {
      aiText = aiText.replace(/```json/gi, '').replace(/```/g, '').trim();
    }

    // Emulate Claude's message structure exactly for your frontend layout parser
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
    console.error('Server execution fallback failure:', err);
    return res.status(500).json({ error: `Server error: ${err.message || 'Processing failure'}` });
  }
}
