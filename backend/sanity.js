// backend/sanity.js
import 'dotenv/config';
import { GoogleGenAI } from "@google/genai";

if (!process.env.GEMINI_API_KEY) {
  console.error("❌ No GEMINI_API_KEY found in .env");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function main() {
  try {
    const result = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [
        { role: "user", parts: [{ text: "Hello Gemini! Say hi in one short sentence." }] }
      ]
    });

    console.log("🔎 Full response:", JSON.stringify(result, null, 2));

    // ✅ Correct extraction
    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (text) {
      console.log("✅ Gemini replied:", text.trim());
    } else {
      console.log("⚠️ No text found, check response format");
    }
  } catch (err) {
    console.error("❌ Gemini sanity check failed:", err);
  }
}

main();
