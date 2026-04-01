import { GoogleGenAI } from "@google/genai";
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { base64Data, mimeType } = req.body;
    if (!base64Data || !mimeType) {
      return res.status(400).json({ error: "Missing base64Data or mimeType" });
    }

    let apiKey = (process.env.GEMINI_API_KEY || process.env.API_KEY || "").trim();
    if (apiKey.startsWith('"') && apiKey.endsWith('"')) {
      apiKey = apiKey.substring(1, apiKey.length - 1).trim();
    }
    if (apiKey.startsWith("'") && apiKey.endsWith("'")) {
      apiKey = apiKey.substring(1, apiKey.length - 1).trim();
    }

    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.length < 10) {
      console.error("GEMINI_API_KEY is missing, too short, or placeholder", { length: apiKey?.length });
      return res.status(500).json({ 
        error: "Gemini API Key is missing or invalid. Please ensure it is configured in the Vercel Environment Variables. Current key length: " + (apiKey?.length || 0)
      });
    }

    if (!apiKey.startsWith("AIza")) {
      console.error("GEMINI_API_KEY does not start with AIza");
      return res.status(500).json({ 
        error: "Gemini API Key format is invalid (should start with AIza). Please check your Vercel configuration." 
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType } },
          { text: "Extract all the text and key information from this file. Format it clearly as a knowledge base article. Do not include any conversational filler." }
        ]
      }
    });

    res.status(200).json({ text: response.text });
  } catch (error) {
    console.error("AI Extraction Error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to extract content" });
  }
}
