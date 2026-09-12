import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Lazy initialization for Gemini client
let genAIClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  if (!genAIClient && process.env.GEMINI_API_KEY) {
    genAIClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAIClient;
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Gemini AI World Director & Cutscene Scripting API
app.post('/api/gemini/biome-direct', async (req, res) => {
  try {
    const { prompt, currentParams } = req.body;
    const ai = getGenAI();

    if (!ai) {
      // Return a balanced programmatic fallback if API key is not configured yet
      return res.json({
        success: true,
        fallback: true,
        directorMessage: 'Generated procedural environmental parameters.',
        params: {
          timeOfDay: 17.5,
          weather: 'sunset',
          fogDensity: 0.0035,
          bloomIntensity: 1.2,
          exposure: 1.15,
          motionBlur: 0.5,
          colorGrading: 'cinematic-warm',
          cameraTourPreset: 'golden_hour_ridge',
          loreNarrative: 'The golden hour casts long amber volumetric shadows across the ancient granite spires.',
        },
      });
    }

    // Use fast gemini-3.1-flash-lite for instant low-latency world director response
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: `You are a master cinematic cutscene director and 3D environment architect for high-end mobile graphics engines running at 100 FPS.
The user wants to stage a 3D landscape environment or cutscene based on this prompt: "${prompt}".
Current environment state: ${JSON.stringify(currentParams || {})}.

Direct the environment parameters realistically. Return a strict JSON object with:
- "directorMessage": A concise, evocative cutscene director cue or camera staging instruction (1-2 sentences).
- "timeOfDay": Float 0 to 24 (e.g. 6.5 = sunrise, 12.0 = noon, 18.0 = sunset, 21.0 = dusk, 1.0 = midnight aurora).
- "weather": One of "clear", "sunset", "storm", "fog", "aurora", "sandstorm".
- "fogDensity": Float between 0.001 (clear) and 0.009 (dense).
- "bloomIntensity": Float between 0.2 and 2.5.
- "exposure": Float between 0.7 and 1.6.
- "motionBlur": Float between 0.0 and 1.0.
- "colorGrading": One of "vibrant", "cinematic-warm", "nordic-cool", "moody-noir", "cyber-neon", "natural".
- "cameraTourPreset": One of "mountain_crest", "golden_hour_ridge", "storm_descent", "aurora_nocturne", "orbit_panorama".
- "loreNarrative": Short immersive world lore description (1-2 sentences).`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            directorMessage: { type: Type.STRING },
            timeOfDay: { type: Type.NUMBER },
            weather: { type: Type.STRING },
            fogDensity: { type: Type.NUMBER },
            bloomIntensity: { type: Type.NUMBER },
            exposure: { type: Type.NUMBER },
            motionBlur: { type: Type.NUMBER },
            colorGrading: { type: Type.STRING },
            cameraTourPreset: { type: Type.STRING },
            loreNarrative: { type: Type.STRING },
          },
          required: [
            'directorMessage',
            'timeOfDay',
            'weather',
            'fogDensity',
            'bloomIntensity',
            'exposure',
            'motionBlur',
            'colorGrading',
            'cameraTourPreset',
            'loreNarrative',
          ],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({
      success: true,
      params: parsed,
    });
  } catch (error: any) {
    console.error('Error in /api/gemini/biome-direct:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to direct environment',
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`World Engine Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
