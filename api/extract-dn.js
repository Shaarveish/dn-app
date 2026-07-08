// This runs on the server (Vercel), never in the browser.
// Forces Gemini to output pure JSON fields that perfectly fill your frontend boxes!
import https from 'https';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server is missing GEMINI_API_KEY. Set it in your Vercel project settings.' });
  }

  const { base64Image } = req.body || {};
  if (!base64Image) {
    return res.status(400).json({ error: 'Missing base64Image in request body.' });
  }

  try {
    // Clean data prefix out of the base64 string
    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");

    // STRICT INSTRUCTION PROMPT: Forces Gemini to match your specific frontend JSON state keys
    const strictGeminiPrompt = `You are a professional OCR assistant. Extract fields from this driver note (Nota Pemandu) image.
    Return ONLY a raw valid JSON object. Do not include markdown formatting or backticks.
    Use exactly these lowercase keys for the values:
    {
      "dn_no": "string here",
      "lorry_no": "string here",
      "date": "string here",
      "driver": "string here",
      "ic_no": "string here",
      "loading_place": "string here",
      "unloading_place": "string here",
      "load_bersih": "string here",
      "unload_bersih": "string here",
      "remarks": "string here"
    }`;

    const postData = JSON.stringify({
      contents: [
        {
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
            { text: strictGeminiPrompt }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json" // Forces Gemini to speak native JSON language
      }
    });

    const options = {
      hostname: '://googleapis.com',
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

    let aiText = geminiBody.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    
    // Safety clean up of code markers
    aiText = aiText.replace(/```json/gi, '').replace(/```/g, '').trim();

    // Package the JSON string to perfectly look like a standard Claude text message frame
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
    console.error('Gemini extraction processing layout crash:', err);
    return res.status(500).json({ error: `Server error: ${err.message || 'Failure'}` });
  }
}

