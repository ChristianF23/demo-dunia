export default async function handler(req, res) {
  // Configuración de CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { chatHistory, systemPrompt } = req.body;

    // Captura la API Key desde las variables de entorno de Vercel
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Falta la configuración de GEMINI_API_KEY en el servidor.' });
    }

    // Mapeo del historial al formato oficial de Google Gemini (user / model)
    const contents = chatHistory.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    // URL oficial para gemini-3.1-flash-lite usando la API v1beta
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`;

    const googleResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: contents,
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        generationConfig: {
          maxOutputTokens: 1000,
          temperature: 0.7
        }
      })
    });

    const data = await googleResponse.json();

    let reply = 'Lo siento, hubo un problema con el modelo.';
    if (data.candidates && data.candidates[0]?.content?.parts[0]) {
      reply = data.candidates[0].content.parts[0].text;
    }

    return res.status(200).json({ reply });

  } catch (error) {
    console.error('Error en servidor:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}