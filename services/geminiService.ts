import { GoogleGenAI, Type } from "@google/genai";

// Initialize the client
// Note: In a real app, ensure the key is valid.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const analyzePDFPage = async (imageBase64: string): Promise<{ summary: string; keyPoints: string[] }> => {
  try {
    // Strip the data:image/png;base64, prefix if present
    const base64Data = imageBase64.split(',')[1] || imageBase64;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
            {
                inlineData: {
                    mimeType: 'image/png',
                    data: base64Data
                }
            },
            {
                text: "Analyze this document page image. Provide a concise summary of the main content (max 3 sentences) and a list of up to 5 key points or important features found on the page (e.g. dates, names, figures, contractual obligations)."
            }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                summary: { type: Type.STRING },
                keyPoints: { 
                    type: Type.ARRAY, 
                    items: { type: Type.STRING } 
                }
            }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    
    return JSON.parse(text);

  } catch (error) {
    console.error("Gemini analysis failed:", error);
    return {
        summary: "Failed to analyze the document using AI.",
        keyPoints: []
    };
  }
};

export const suggestEdits = async (textContext: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Rewrite the following text to be more professional and concise: "${textContext}"`
        });
        return response.text || textContext;
    } catch (e) {
        console.error(e);
        return textContext;
    }
}
