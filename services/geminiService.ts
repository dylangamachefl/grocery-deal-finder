import { GoogleGenAI, Type, Schema } from "@google/genai";
import { v4 as uuidv4 } from 'uuid';
import { AnalysisResult, GroceryMatch, DealCategory, MasterInventoryItem, RawExtractedItem } from "../types";
import { initializeVectorClassifier, classifyItem } from "./vectorClassifier";
import { PARENT_CATEGORIES } from "./taxonomy";

const MODEL_NAME = "gemma-3-27b-it";
const CATEGORIES = [...PARENT_CATEGORIES];

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

const cleanJson = (text: string) => {
  if (!text) return "[]";
  // Remove markdown code blocks if present
  let cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return cleaned;
};

// --- AGENT 1: THE EXTRACTOR (VISION) ---
const runAgentExtractor = async (ai: GoogleGenAI, adFiles: File[]): Promise<RawExtractedItem[]> => {
  const fileParts = await Promise.all(
    adFiles.map(async (file) => ({
      inlineData: {
        data: await fileToBase64(file),
        mimeType: file.type,
      },
    }))
  );

  const prompt = `
    Role: Agent 1 - The Extractor.
    Task: Visually scan the attached weekly ad files. Identify every distinct product tile.
    
    Extract the following for EACH item found:
    - rawName: The specific product name (e.g., "Lay's Potato Chips", "Ribeye Steak").
    - brand: The brand name if clearly visible (e.g., "Lay's", "Tide", "Kraft").
    - price: The price (e.g., "$2.99", "2/$5", "BOGO").
    - unit: The size/unit if visible (e.g., "12oz", "lb", "pkg").
    - dealText: Any promo text (e.g., "Save $1", "Buy 1 Get 1 Free").
    - storeName: The store name if visible on the page (otherwise "Unknown Store").
    - validity: Any date range found (e.g., "Oct 25 - Oct 31").

    Output: A JSON array of objects.
  `;

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: [{ role: "user", parts: [{ text: prompt }, ...fileParts] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            rawName: { type: Type.STRING },
            brand: { type: Type.STRING },
            price: { type: Type.STRING },
            unit: { type: Type.STRING },
            dealText: { type: Type.STRING },
            storeName: { type: Type.STRING },
            validity: { type: Type.STRING },
          },
        },
      },
    },
  });

  return JSON.parse(cleanJson(response.text || "[]"));
};

// --- AGENT 2: THE LIBRARIAN (NORMALIZATION) ---
const runAgentLibrarian = async (
  ai: GoogleGenAI,
  rawItems: RawExtractedItem[],
  onStatusUpdate?: (status: string) => void
): Promise<MasterInventoryItem[]> => {
  // Initialize the vector classifier (only runs once)
  if (onStatusUpdate) onStatusUpdate("Agent 2: Initializing Vector Classifier...");
  await initializeVectorClassifier();

  const prompt = `
    Role: Agent 2 - The Librarian.
    Task: Clean, normalize, and extract details from the raw inventory data.

    Input Data:
    ${JSON.stringify(rawItems)}

    Instructions:
    1. Normalize Units: Convert varied text ("$3.99/lb", "3.99 per pound") into a clean format (e.g. "1 lb", "12 oz").
    2. Flag High-Value: Set 'isLossLeader' to true if the deal looks exceptionally good.
    3. Construct 'normalizedName': A clean, searchable name (e.g. "Potato Chips" from "Lays Potato Chips Party Size").
    4. Identify 'brand': Extract the brand name (e.g. "Lay's", "Tide") if present in the raw data or inferable. If generic, use "Store Brand" or leave empty.

    IMPORTANT: Do NOT categorize the items. This will be done by a separate system.

    Output: A JSON array of the Master Inventory (without category).
  `;

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            storeName: { type: Type.STRING },
            rawName: { type: Type.STRING },
            normalizedName: { type: Type.STRING },
            brand: { type: Type.STRING },
            price: { type: Type.STRING },
            unit: { type: Type.STRING },
            dealDescription: { type: Type.STRING },
            isLossLeader: { type: Type.BOOLEAN },
            validDates: { type: Type.STRING },
            originalPrice: { type: Type.STRING, description: "Estimated original price if inferable, else null" },
          },
          required: ["storeName", "normalizedName", "price", "isLossLeader"]
        },
      },
    },
  });

  const items: Partial<MasterInventoryItem>[] = JSON.parse(cleanJson(response.text || "[]"));

  // Categorize items using Vector Classifier
  if (onStatusUpdate) onStatusUpdate("Agent 2: Categorizing items with Vector Embeddings...");

  const categorizedItems = await Promise.all(items.map(async (item) => {
    // Use normalizedName if available, else rawName
    const textToClassify = item.normalizedName || item.rawName || "";
    const classification = await classifyItem(textToClassify);

    return {
      ...item,
      id: uuidv4(),
      category: classification.parentCategory,
      // We could store classification.subCategory if the MasterInventoryItem type supported it
      productName: item.normalizedName, // For UI compatibility
      itemName: item.normalizedName,    // Default fallback
      isSale: item.isLossLeader || false, // For UI compatibility
    };
  }));
  
  return categorizedItems as MasterInventoryItem[];
};

// --- AGENT 3: THE INTERPRETER (LIST PREP) ---
const runAgentInterpreter = async (ai: GoogleGenAI, userList: string): Promise<string[]> => {
  const prompt = `
    Role: Agent 3 - The Interpreter.
    Task: NLP processing of the user's grocery list.

    User's Raw List:
    "${userList}"

    Instructions:
    1. Spell Check: Fix any obvious typos.
    2. Expansion: Convert vague terms (e.g., "sandwich stuff") into specific search queries (e.g., "Bread", "Deli Meat", "Cheese").
    3. Formatting: Return a clean list of specific keywords/items.

    Output: A JSON object containing an array of strings.
  `;

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          expandedKeywords: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      },
    },
  });

  const result = JSON.parse(cleanJson(response.text || "{}"));
  return result.expandedKeywords || [];
};

// --- AGENT 4: THE MATCHER (SEARCH & RETRIEVAL) ---
const runAgentMatcher = async (
  ai: GoogleGenAI, 
  keywords: string[], 
  inventory: MasterInventoryItem[]
): Promise<{ matches: GroceryMatch[], summary: string }> => {
  
  const prompt = `
    Role: Agent 4 - The Matcher.
    Task: Match the User's Clean Keywords against the Master Store Inventory.

    User's Keywords:
    ${JSON.stringify(keywords)}

    Master Store Inventory:
    ${JSON.stringify(inventory)}

    Instructions:
    1. Semantic Search: Compare the meaning of the user's keyword against the inventory. 
       - "Soda" matches "Coke", "Pepsi".
       - "Dog Food" matches "Purina".
       - DO NOT match unrelated items.
    2. Select the Best Deals: If multiple matches exist, prioritize lowest price or loss leaders.
    3. Generate a Summary: Write a brief summary of the savings.

    Output Schema:
    - matches: Array of match objects. MUST include 'id' (from Inventory) and 'itemName' (user's keyword).
    - summary: String.
  `;

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          matches: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING, description: "The ID of the matched item from the inventory" },
                itemName: { type: Type.STRING, description: "The specific keyword from the User's list that triggered this match" },
                dealDescription: { type: Type.STRING, description: "Refined description of why this is a deal" },
                confidence: { type: Type.NUMBER },
              },
              required: ["id", "itemName"]
            },
          },
          summary: { type: Type.STRING },
        },
      },
    },
  });

  const parsed = JSON.parse(cleanJson(response.text || "{}"));
  const rawMatches = parsed.matches || [];
  
  // Hydrate matches with full inventory data
  const hydratedMatches: GroceryMatch[] = rawMatches.map((m: any) => {
    const originalItem = inventory.find(i => i.id === m.id);
    if (!originalItem) return null;
    return {
      ...originalItem, // raw inventory data
      ...m, // matcher overrides (itemName, etc)
      productName: originalItem.normalizedName,
      quantity: originalItem.unit, // Map unit to quantity for display
      brand: originalItem.brand,   // Ensure brand is passed
      isSale: originalItem.isLossLeader,
    };
  }).filter((m: any) => m !== null);

  return {
    matches: hydratedMatches,
    summary: parsed.summary || "Here are the best deals found for your list.",
  };
};

export const analyzeGroceryAds = async (
  groceryList: string,
  adFiles: File[],
  onStatusUpdate?: (status: string) => void
): Promise<AnalysisResult> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    // --- Phase 1: Ingestion ---
    if (onStatusUpdate) onStatusUpdate("Agent 1 (Vision): Scanning weekly ads for products...");
    const rawItems = await runAgentExtractor(ai, adFiles);
    
    if (rawItems.length === 0) {
      throw new Error("Could not identify any products in the uploaded files. Please ensure they are clear images or PDFs.");
    }

    if (onStatusUpdate) onStatusUpdate(`Agent 2 (Librarian): Organizing ${rawItems.length} found items into aisles...`);
    const masterInventory = await runAgentLibrarian(ai, rawItems, onStatusUpdate);

    // --- Phase 2: List Prep ---
    if (onStatusUpdate) onStatusUpdate("Agent 3 (Interpreter): Refining and expanding your shopping list...");
    const cleanKeywords = await runAgentInterpreter(ai, groceryList);

    // --- Phase 3: Matching ---
    if (onStatusUpdate) onStatusUpdate("Agent 4 (Matcher): Comparing your list against local prices...");
    const matchResult = await runAgentMatcher(ai, cleanKeywords, masterInventory);

    // --- Final Assembly ---
    // Group ALL inventory items by category for the "Deal Explorer"
    const categorizedDeals: DealCategory[] = CATEGORIES.map(cat => ({
      category: cat,
      items: masterInventory
        .filter(item => item.category === cat)
        .map(item => ({
          ...item,
          productName: item.normalizedName,
          itemName: item.normalizedName,
          quantity: item.unit, // Map unit to quantity
          brand: item.brand,
          isSale: item.isLossLeader,
          confidence: 1
        } as GroceryMatch))
    })).filter(cat => cat.items.length > 0);

    return {
      summary: matchResult.summary,
      matches: matchResult.matches,
      categorizedDeals: categorizedDeals
    };

  } catch (error) {
    console.error("Gemini Pipeline Error:", error);
    throw error;
  }
};