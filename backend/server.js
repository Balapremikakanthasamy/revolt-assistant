// backend/server.js
import 'dotenv/config';
import express from 'express';
import http from 'node:http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';

const PORT = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (!process.env.GEMINI_API_KEY) {
  console.error("❌ Missing GEMINI_API_KEY in .env");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const MODEL = "gemini-1.5-flash";

// --- Revolt persona prompt ---
const SYSTEM_PROMPT = `
You are Rev, the official AI assistant for Revolt Motors.
You must ONLY talk about Revolt Motors, its electric motorcycles, services, test rides, charging, battery swaps, and related topics.
If asked about anything unrelated (e.g., politics, sports, general knowledge), politely redirect back to Revolt Motors.
Keep answers clear, professional, and helpful.
`;

const app = express();
app.use(express.static(path.join(__dirname, "../frontend")));
app.get("/", (_, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/stream" });

wss.on("connection", (ws) => {
  console.log("✅ WS client connected");

  ws.on("message", async (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      console.log("📩 Incoming:", msg);

      if (msg.type === "text") {
        const model = genAI.getGenerativeModel({ model: MODEL });
        const prompt = `${SYSTEM_PROMPT}\n\nUser: ${msg.text}`;

        const result = await model.generateContent(prompt);
        const text =
          result?.response?.candidates?.[0]?.content?.parts?.[0]?.text ||
          "(no reply)";

        console.log("💬 Gemini:", text);

        // ✅ include the same mode (text/voice) back to client
        ws.send(JSON.stringify({ type: "transcript", text, mode: msg.mode || "text" }));
      }
    } catch (err) {
      console.error("❌ WS error:", err);
      if (ws.readyState === 1) {
        ws.send(JSON.stringify({ type: "error", error: String(err) }));
      }
    }
  });

  ws.on("close", () => console.log("❎ WS client disconnected"));
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
