
import { GoogleGenAI, Type } from "@google/genai";
import { Stop } from "../types";

export const optimizeRoute = async (prompt: string): Promise<Partial<Stop>[]> => {
  // Always instantiate inside the call to ensure up-to-date API key usage
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Génère une liste de 4 arrêts de bus logiques basés sur cette demande : "${prompt}". 
    La réponse doit être un tableau JSON d'objets avec les propriétés : "name" (chaîne de caractères en français), "time" (format HH:mm), "lat" (nombre proche de Paris 48.85), et "lng" (nombre proche de Paris 2.35).`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            time: { type: Type.STRING },
            lat: { type: Type.NUMBER },
            lng: { type: Type.NUMBER }
          },
          required: ["name", "time", "lat", "lng"]
        }
      }
    }
  });

  try {
    return JSON.parse(response.text || "[]");
  } catch (e) {
    console.error("Échec de l'analyse de la réponse IA", e);
    return [];
  }
};
