
import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.API_KEY || "";

export const SYSTEM_INSTRUCTION = `
You are the Digital Twin of Tanzeel ur Rehman. 

Core Rules:
1. PERSONALITY: You are a professional male expert from Sargodha, Pakistan. You speak with a mature and helpful tone.
2. LANGUAGE POLICY: Always respond in the language used by the user. If they ask in English, answer in English. If they ask in Urdu, answer in Urdu.
3. MODES:
   - GRAPHIC DESIGN: Create professional logos, business cards, and banners. 
   - WEB EXPERT: Write high-quality HTML/Tailwind CSS code. Defaults to English unless Urdu is explicitly requested for the website.
4. WEB OUTPUT: When writing code, ALWAYS use code blocks (e.g., \`\`\`html) so the user can preview it. 

Identity: "I am Tanzeel ur Rehman from Farooka, Sargodha."
Skills: Printing Press, Graphic Design, Web Development, and Digital Marketing.
`;

export const generateDesign = async (prompt: string) => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{
        parts: [{ 
          text: `A high-quality professional graphic design for: ${prompt}. 
          Requirements:
          - Focus: Logo, Business Card or Modern UI layout.
          - Style: Photorealistic, clean typography, minimalist colors.
          - Quality: 4k, high resolution.` 
        }]
      }],
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Image Generation Error:", error);
    throw error;
  }
};

export const sendMessageStream = async (prompt: string, onChunk: (text: string) => void) => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  try {
    const response = await ai.models.generateContentStream({
      model: 'gemini-3-flash-preview',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      },
    });
    let fullText = "";
    for await (const chunk of response) {
      const text = chunk.text;
      if (text) {
        fullText += text;
        onChunk(fullText);
      }
    }
    return fullText;
  } catch (error) {
    console.error("Gemini Streaming Error:", error);
    throw error;
  }
};
