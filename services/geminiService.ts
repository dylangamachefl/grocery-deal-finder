import { GoogleGenAI, Type, Schema } from "@google/genai";
import { v4 as uuidv4 } from 'uuid';
import { AnalysisResult, GroceryMatch } from "../types";

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the Data URL prefix (e.g., "data:application/pdf;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const analyzeGroceryAds = async (
  groceryList: string,
  adFiles: File[]
): Promise<AnalysisResult> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // 1. Prepare PDF Parts
  const pdfParts = await Promise.all(
    adFiles.map(async (file) => ({
      inlineData: {
        data: await fileToBase64(file),
        mimeType: file.type, // Should be 'application/pdf'
      },
    }))
  );

  // 2. Define Response Schema
  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      matches: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            itemName: { type: Type.STRING, description: "The name of the item on the user's list (generic category)" },
            productName: { type: Type.STRING, description: "The specific product name found in the ad (e.g. 'Zephyrhills Spring Water', 'Publix Whole Milk')" },
            storeName: { type: Type.STRING, description: "The store name inferred from the flyer, or 'Unknown Store'" },
            price: { type: Type.STRING, description: "The sale price found in the ad (e.g. '$2.99/lb')" },
            quantity: { type: Type.STRING, description: "The quantity, weight, or size of the item (e.g. '12 oz', '1 lb', '24 pack'), if specified." },
            originalPrice: { type: Type.STRING, description: "The original price if listed (e.g. '$4.99'), otherwise null" },
            dealDescription: { type: Type.STRING, description: "Details of the deal (e.g. 'Buy one get one free', 'Save $2.00')" },
            validDates: { type: Type.STRING, description: "Date range this deal is valid for (e.g., 'Oct 10 - Oct 16')" },
            itemLimit: { type: Type.STRING, description: "Any quantity limits (e.g. 'Limit 4', 'Must buy 2'), otherwise null" },
            isSale: { type: Type.BOOLEAN, description: "True if this appears to be a special sale price" },
            confidence: { type: Type.NUMBER, description: "Confidence level between 0 and 1" },
          },
          required: ["itemName", "productName", "storeName", "price", "dealDescription", "isSale"],
        },
      },
      summary: { type: Type.STRING, description: "A brief, encouraging summary of the savings found." },
    },
    required: ["matches", "summary"],
  };

  // 3. Construct Prompt
  const promptText = `
    You are a frugal shopping assistant.
    
    My Grocery List:
    ${groceryList}
    
    Task:
    1. Analyze the attached weekly ad PDF(s).
    2. Identify items from my grocery list that are listed in the ads.
    3. Extract the specific product name (e.g. 'Zephyrhills Spring Water') exactly as it appears in the ad, along with price, quantity/size (e.g. '12 oz', '1 lb'), deal details, original price (if shown to calculate savings), validity dates, and any purchasing limits.
    4. If the store name is visible in the header or footer of the PDF pages, use it. Otherwise, say "Unknown Store".
    5. Be strict with matching (e.g., if I list "Milk" and the ad has "Almond Milk" on sale, do not include it unless it's a generic category).
    6. Return the data in JSON format conforming to the schema.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        { role: "user", parts: [{ text: promptText }, ...pdfParts] }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.2, // Low temperature for factual extraction
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");

    const parsedData = JSON.parse(text);
    
    // Assign unique IDs to each match
    const matchesWithIds: GroceryMatch[] = parsedData.matches.map((match: any) => ({
      ...match,
      id: uuidv4()
    }));

    return {
      summary: parsedData.summary,
      matches: matchesWithIds
    };
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};