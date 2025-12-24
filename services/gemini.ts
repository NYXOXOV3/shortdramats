
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY });

export const geminiService = {
  generateDramaDescription: async (title: string, genre: string): Promise<string> => {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Create a captivating, high-stakes 2-sentence synopsis for a short drama titled "${title}" in the ${genre} genre. Make it sound like a viral TikTok drama advertisement.`,
      });
      return response.text || "No description generated.";
    } catch (error) {
      console.error("Gemini Error:", error);
      return "An exciting new drama you won't want to miss!";
    }
  },

  smartSearch: async (query: string, dramas: any[]): Promise<string[]> => {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Based on this list of dramas: ${JSON.stringify(dramas.map(d => ({id: d.id, title: d.title, description: d.description})))}, find the IDs of dramas that best match the search query: "${query}". Return ONLY a JSON array of strings (the IDs).`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      });
      return JSON.parse(response.text?.trim() || "[]");
    } catch (error) {
      return [];
    }
  }
};
