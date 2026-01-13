
import { GoogleGenAI, Type } from "@google/genai";
import { LogEntry } from "../types";

/**
 * Extracts handwritten log data from images using Gemini 3 Flash.
 * Optimized for high-speed industrial OCR of structured paper forms.
 */
export const extractLogData = async (base64Images: string[]): Promise<LogEntry[]> => {
  const model = 'gemini-3-flash-preview';
  
  const systemInstruction = `
    You are an expert Industrial Data Extraction Engine. 
    Analyze images of handwritten paper logs and extract rows into structured data.
    
    Data Schema:
    - scNo: Service Connection Number. A strict 13-digit sequence (e.g., 2612345678901).
    - dtrCode: Transformer identifier. Often alphanumeric (e.g., DTR-102, T-500).
    - feederName: Electrical feeder description.
    - location: Physical site or address details.
    
    Critical Processing Rules:
    1. PRECISION: SC NO must be 13 digits. If digits are missing or unclear, use '?' at the specific position (e.g., '261234?678901').
    2. STRUCTURE: Detect the rows in the paper table. Each row on paper corresponds to one JSON object.
    3. CLEANING: Remove any leading/trailing whitespace or extra symbols from the handwriting.
    4. HANDWRITING: Use visual context to distinguish between '5' and 'S', '0' and 'O', '1' and 'I' or 'l'.
    5. MULTI-IMAGE: Treat all provided images as a single continuous log.
    6. OUTPUT: Provide only a JSON array. No explanations or conversational text.
  `;

  try {
    const apiKey = import.meta.env.VITE_API_KEY;
    if (!apiKey) {
      throw new Error("VITE_API_KEY is not configured. Please add it to your .env.local file.");
    }
    const ai = new GoogleGenAI({ apiKey });
    
    const imageParts = base64Images.map(base64 => {
      // Clean base64 strings if they contain data:image/...;base64,
      const data = base64.includes(',') ? base64.split(',')[1] : base64;
      return {
        inlineData: {
          mimeType: 'image/jpeg',
          data,
        },
      };
    });

    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          ...imageParts,
          {
            text: "Extract all rows from these log sheets into the specified JSON format."
          }
        ],
      },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              scNo: { type: Type.STRING, description: '13-digit SC number' },
              dtrCode: { type: Type.STRING, description: 'DTR ID' },
              feederName: { type: Type.STRING, description: 'Feeder' },
              location: { type: Type.STRING, description: 'Site location' },
            },
            required: ["scNo", "dtrCode", "feederName", "location"],
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Vision AI returned no data.");
    
    const parsedData = JSON.parse(text);
    return parsedData.map((item: any, index: number) => ({
      ...item,
      id: `ext-${Date.now()}-${index}`,
      confidence: (item.scNo.includes('?') || item.dtrCode.includes('?')) ? 'low' : 'high'
    }));
  } catch (error) {
    console.error("Gemini Extraction Error:", error);
    throw new Error("Unable to parse handwritten data. Check image quality and try again.");
  }
};
