import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // Health check
  app.get("/api/health", (req, res) => {
    let apiKey = (process.env.GEMINI_API_KEY || process.env.API_KEY || "").trim();
    if (apiKey.startsWith('"') && apiKey.endsWith('"')) {
      apiKey = apiKey.substring(1, apiKey.length - 1).trim();
    }
    if (apiKey.startsWith("'") && apiKey.endsWith("'")) {
      apiKey = apiKey.substring(1, apiKey.length - 1).trim();
    }

    res.json({ 
      status: "ok", 
      env: {
        hasApiKey: !!apiKey,
        keyLength: apiKey.length,
        keyPrefix: apiKey.substring(0, 4),
        isPlaceholder: apiKey === "MY_GEMINI_API_KEY",
        isValidFormat: apiKey.startsWith("AIza"),
        nodeEnv: process.env.NODE_ENV
      }
    });
  });

  // API Routes
  app.post("/api/extract", async (req, res) => {
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
          error: "Gemini API Key is missing or invalid. Please ensure it is configured in the AI Studio Secrets panel. Current key length: " + (apiKey?.length || 0)
        });
      }

      if (!apiKey.startsWith("AIza")) {
        console.error("GEMINI_API_KEY does not start with AIza");
        return res.status(500).json({ 
          error: "Gemini API Key format is invalid (should start with AIza). Please check your Secrets configuration." 
        });
      }

      console.log("Extraction request received", { mimeType, keyLength: apiKey.length, keyPrefix: apiKey.substring(0, 4) });

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

      console.log("Extraction successful");
      res.json({ text: response.text });
    } catch (error) {
      console.error("AI Extraction Error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to extract content" });
    }
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const { message, history, systemInstruction } = req.body;
      
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
          error: "Gemini API Key is missing or invalid. Please ensure it is configured in the AI Studio Secrets panel. Current key length: " + (apiKey?.length || 0)
        });
      }

      if (!apiKey.startsWith("AIza")) {
        console.error("GEMINI_API_KEY does not start with AIza");
        return res.status(500).json({ 
          error: "Gemini API Key format is invalid (should start with AIza). Please check your Secrets configuration." 
        });
      }

      console.log("Chat request received", { keyLength: apiKey.length, keyPrefix: apiKey.substring(0, 4) });

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [...history, { role: 'user', parts: [{ text: message }] }],
        config: {
          systemInstruction
        }
      });

      console.log("Chat successful");
      res.json({ text: response.text });
    } catch (error) {
      console.error("AI Chat Error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to generate response" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
