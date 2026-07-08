// This runs on the server (Vercel), never in the browser.
// Uses native Node.js HTTPS to run fully inside Google's free tier.
// Emulates Claude's layout structure to automatically fill out input boxes.
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
    // Strip data URI scheme prefix out of base64 data string
    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");

    // Inject strict instruction into the existing frontend Claude prompt to guarantee valid json output
    const combinedPrompt = `${prompt}\n\nIMPORTANT: Return your response strictly as a raw JSON block object matching the requested fields. Do not warp your response inside markdown backticks or triple tick blocks.`;

    const postData = JSON.stringify({
      contents: [
        {
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
            { text: combinedPrompt }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json" // Hard-forces Gemini to reply in native JSON data structures
      }
    });

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const geminiBody = await new Promise((resolve, reject) => {
      const request = https.request(options, (response) => {
        let incomingChunks = '';
        response.on('data', (chunk) => { incomingChunks += chunk; });
        response.on('end', () => {
          if (response.statusCode >= 400) {
            reject(new Error(`API Error ${response.statusCode}: ${incomingChunks}`));
          } else {
            resolve(JSON.parse(incomingChunks));
          }
        });
      });
      request.on('error', (err) => { reject(err); });
      request.write(postData);
      request.end();
    });

    let aiText = geminiBody.candidates?.?.content?.parts?.?.text || '{}';
    
    // Clean up residual backticks or markdown strings if any are present
    if (aiText.includes('```')) {
      aiText = aiText.replace(/```json/gi, '').replace(/```/g, '').trim();
    }

    // CRITICAL: Format the content field to mirror Claude's message shape structure exactly
    const formattedData = {
      content: [
        {
          type: 'text',
          text: aiText
        }
      ]
    };

    return res.status(200).json(formattedData);
  } catch (err) {
    console.error('Gemini extraction processing layout crash:', err);
    return res.status(500).json({ error: `Server error: ${err.message || 'Failure'}` });
  }
}

