import { GoogleGenAI, Type, Schema } from "@google/genai";
import { v4 as uuidv4 } from 'uuid';
import { AnalysisResult, GroceryMatch, DealCategory, MasterInventoryItem, RawExtractedItem } from "@/types";
import { initializeVectorClassifier, classifyItem, classifyBatch } from "@/services/vectorClassifier";
import { PARENT_CATEGORIES, TAXONOMY_TREE } from "@/services/taxonomy";
import { createShards, createProgressTracker } from "@/utils/chunking";
import { logger } from "@/utils/logger";
import {
  Agent1ResponseSchema,
  Agent2ResponseSchema,
  Agent3ResponseSchema,
  Agent4ResponseSchema
} from "@/schemas";

const MODEL_NAME = "gemma-3-27b-it";
const CATEGORIES = [...PARENT_CATEGORIES];
const SHARD_SIZE = 20; // Items per batch for parallel processing
const SEMANTIC_THRESHOLD = 0.7; // Minimum similarity score to pass filtering

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

  // Try to find JSON in markdown code blocks first
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // Try to find JSON object or array patterns
  // Look for { ... } or [ ... ] that spans the content
  const jsonObjectMatch = text.match(/(\{[\s\S]*\})/);
  const jsonArrayMatch = text.match(/(\[[\s\S]*\])/);

  if (jsonArrayMatch) {
    return jsonArrayMatch[1].trim();
  }

  if (jsonObjectMatch) {
    return jsonObjectMatch[1].trim();
  }

  // If no patterns found, return the trimmed text as-is
  return text.trim();
};

// Helper function to parse and validate with Zod
const parseWithZod = <T>(rawText: string, schema: any, agentName: string): T => {
  console.log(`${agentName} Raw Response:`, rawText.substring(0, 200));

  try {
    const cleaned = cleanJson(rawText);
    const parsed = JSON.parse(cleaned);

    // Use Zod to validate and coerce the response
    const result = schema.safeParse(parsed);

    if (!result.success) {
      console.error(`${agentName} Zod Validation Error:`, result.error.format());
      throw new Error(`${agentName} response validation failed: ${result.error.message}`);
    }

    return result.data;
  } catch (error) {
    console.error(`${agentName} Parse Error:`, error);
    console.error("Cleaned text:", cleanJson(rawText).substring(0, 500));
    throw new Error(`Failed to parse ${agentName} response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// --- AGENT 1: THE EXTRACTOR (VISION) ---
const runAgentExtractor = async (ai: GoogleGenAI, adFiles: File[]): Promise<RawExtractedItem[]> => {
  logger.separator('AGENT 1: THE EXTRACTOR (Vision)');
  logger.log(`Processing ${adFiles.length} file(s): ${adFiles.map(f => f.name).join(', ')}`, '📄');

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

    IMPORTANT: Return ONLY a valid JSON array of objects. Do not include any markdown formatting or code blocks.
    Output format: [{"rawName": "...", "brand": "...", "price": "...", "unit": "...", "dealText": "...", "storeName": "...", "validity": "..."}]
  `;

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: [{ role: "user", parts: [{ text: prompt }, ...fileParts] }],
  });

  const extractedItems = parseWithZod<RawExtractedItem[]>(response.text || "[]", Agent1ResponseSchema, "Agent 1");
  console.log('✅ Agent 1 extracted', extractedItems.length, 'raw items');
  console.log('📦 Sample items:', extractedItems.slice(0, 3).map(i => i.rawName));
  console.log('🔄 Handoff to Agent 2: Librarian');

  return extractedItems;
};

// --- AGENT 2: THE LIBRARIAN (NORMALIZATION) ---
// Helper function to process a single shard
const processLibrarianShard = async (
  ai: GoogleGenAI,
  shard: RawExtractedItem[],
  shardIndex: number,
  totalShards: number,
  onStatusUpdate?: (status: string) => void
): Promise<MasterInventoryItem[]> => {
  if (onStatusUpdate) {
    onStatusUpdate(`Agent 2: Normalizing Batch ${shardIndex + 1} of ${totalShards}...`);
  }

  const prompt = `
    Role: Agent 2 - The Librarian.
    Task: Clean, normalize, and extract details from the raw inventory data.

    Input Data:
    ${JSON.stringify(shard)}

    Instructions:
    1. Normalize Units: Convert varied text ("$3.99/lb", "3.99 per pound") into a clean format (e.g. "1 lb", "12 oz").
    2. Flag High-Value: Set 'isLossLeader' to true if the deal looks exceptionally good.
    3. Construct 'normalizedName': A clean, searchable name (e.g. "Potato Chips" from "Lays Potato Chips Party Size").
    4. Identify 'brand': Extract the brand name (e.g. "Lay's", "Tide") if present in the raw data or inferable. If generic, use "Store Brand" or leave empty.

    IMPORTANT: Do NOT categorize the items. This will be done by a separate system.

    IMPORTANT: Return ONLY a valid JSON array of objects. Do not include any markdown formatting or code blocks.
    Output format: [{"storeName": "...", "rawName": "...", "normalizedName": "...", "brand": "...", "price": "...", "unit": "...", "dealDescription": "...", "isLossLeader": true/false, "validDates": "...", "originalPrice": "..."}]
  `;

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  const items = parseWithZod<any[]>(response.text || "[]", Agent2ResponseSchema, "Agent 2");

  // Categorize items using Vector Classifier (batch processing)
  const textsToClassify = items.map(item => item.normalizedName || item.rawName || "");
  logger.log(`Classifying ${textsToClassify.length} items using vector embeddings...`, '🧠');
  const classifications = await classifyBatch(textsToClassify);
  logger.log(`Batch ${shardIndex + 1}: Classified items into categories`, '✅');

  const categorizedItems = items.map((item, index) => ({
    ...item,
    id: uuidv4(),
    category: classifications[index].parentCategory,
    productName: item.normalizedName,
    itemName: item.normalizedName,
    isSale: item.isLossLeader || false,
  }));

  return categorizedItems as MasterInventoryItem[];
};

const runAgentLibrarian = async (
  ai: GoogleGenAI,
  rawItems: RawExtractedItem[],
  onStatusUpdate?: (status: string) => void
): Promise<MasterInventoryItem[]> => {
  logger.separator('AGENT 2: THE LIBRARIAN (Normalization & Categorization)');
  logger.log(`Received ${rawItems.length} raw items from Agent 1`, '📥');

  // Initialize the vector classifier (only runs once)
  if (onStatusUpdate) onStatusUpdate("Agent 2: Initializing Vector Classifier...");
  await initializeVectorClassifier();

  // Split items into shards for parallel processing
  const shards = createShards(rawItems, SHARD_SIZE);
  const totalShards = shards.length;
  logger.log(`Split into ${totalShards} shards of ${SHARD_SIZE} items each`, '📊');
  logger.log('Processing shards in parallel (MAP stage)...', '⚡');

  if (onStatusUpdate) {
    onStatusUpdate(`Agent 2: Processing ${rawItems.length} items in ${totalShards} batches...`);
  }

  // Process all shards in parallel (MAP stage)
  const shardResults = await Promise.all(
    shards.map((shard, index) =>
      processLibrarianShard(ai, shard, index, totalShards, onStatusUpdate)
    )
  );

  // Flatten results
  const allItems = shardResults.flat();

  // Log category distribution
  const categoryCount: Record<string, number> = {};
  allItems.forEach(item => {
    categoryCount[item.category] = (categoryCount[item.category] || 0) + 1;
  });

  console.log('✅ Agent 2 processed', allItems.length, 'items successfully');
  console.log('📊 Category distribution:', categoryCount);
  console.log('🔄 Handoff to Agent 3: Interpreter');

  if (onStatusUpdate) {
    onStatusUpdate(`Agent 2: Processed ${allItems.length} items successfully.`);
  }

  return allItems;
};

// --- AGENT 3: THE INTERPRETER (LIST PREP) ---
const runAgentInterpreter = async (ai: GoogleGenAI, userList: string): Promise<string[]> => {
  logger.separator('AGENT 3: THE INTERPRETER (List Preparation)');
  logger.log(`User's raw list: ${userList}`, '📝');

  const prompt = `
    Role: Agent 3 - The Interpreter.
    Task: NLP processing of the user's grocery list.

    User's Raw List:
    "${userList}"

    Instructions:
    1. Spell Check: Fix any obvious typos.
    2. Expansion: Convert vague terms (e.g., "sandwich stuff") into specific search queries (e.g., "Bread", "Deli Meat", "Cheese").
    3. Formatting: Return a clean list of specific keywords/items.

    CRITICAL: You MUST return a JSON object with an "expandedKeywords" array property.
    IMPORTANT: Return ONLY a valid JSON object in this exact format. Do not return a plain array.
    
    Correct format: {"expandedKeywords": ["keyword1", "keyword2", "keyword3"]}
    Wrong format: ["keyword1", "keyword2"] (this is NOT acceptable)
  `;

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  const rawText = response.text || "{}";

  // Handle case where LLM returns array instead of object
  try {
    const cleaned = cleanJson(rawText);
    const parsed = JSON.parse(cleaned);

    // If it's an array, wrap it in the expected object format
    if (Array.isArray(parsed)) {
      logger.warn("Agent 3 returned array instead of object, wrapping it");
      logger.log(`Expanded keywords: ${parsed.join(', ')}`, '✅');
      logger.log('Handoff to Agent 4: Matcher', '🔄');
      return parsed;
    }

    const result = Agent3ResponseSchema.safeParse(parsed);

    if (!result.success) {
      console.error("Agent 3 Zod Validation Error:", result.error.format());
      throw new Error(`Agent 3 response validation failed: ${result.error.message}`);
    }

    return result.data.expandedKeywords;
  } catch (error) {
    console.error("Agent 3 Parse Error:", error);
    console.error("Cleaned text:", cleanJson(rawText).substring(0, 500));
    throw new Error(`Failed to parse Agent 3 response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// --- AGENT 4: THE MATCHER (SEARCH & RETRIEVAL) ---
// Helper: Group items by category
const groupByCategory = (items: MasterInventoryItem[]): Record<string, MasterInventoryItem[]> => {
  const grouped: Record<string, MasterInventoryItem[]> = {};

  items.forEach(item => {
    if (!grouped[item.category]) {
      grouped[item.category] = [];
    }
    grouped[item.category].push(item);
  });

  return grouped;
};

const runAgentMatcher = async (
  ai: GoogleGenAI,
  keywords: string[],
  inventory: MasterInventoryItem[]
): Promise<{ matches: GroceryMatch[], summary: string }> => {
  logger.separator('AGENT 4: THE MATCHER (Search & Retrieval)');
  logger.log(`Matching ${keywords.length} keywords against ${inventory.length} inventory items`, '🔍');
  logger.log(`Keywords: ${keywords.join(', ')}`, '🎯');

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

    IMPORTANT: Return ONLY a valid JSON object. Do not include any markdown formatting or code blocks.
    Output format: {"matches": [{"id": "...", "itemName": "...", "dealDescription": "...", "confidence": 0.95}], "summary": "..."}
  `;

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  const parsed = parseWithZod<{ matches: any[], summary: string }>(response.text || "{}", Agent4ResponseSchema, "Agent 4");
  const rawMatches = parsed.matches;

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

  console.log('✅ Agent 4 found', hydratedMatches.length, 'matches');
  console.log('📦 Matched items:', hydratedMatches.map(m => m.itemName));
  console.log('💰 Summary:', parsed.summary);

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
  // Reset logger for new run
  logger.reset();
  logger.log('GROCERY DEAL HUNTER PIPELINE START', '🚀');
  logger.log(`User List: ${groceryList}`, '📋');
  logger.log(`Files: ${adFiles.map(f => f.name).join(', ')}`, '📁');

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

    const result = {
      summary: matchResult.summary,
      matches: matchResult.matches,
      categorizedDeals: categorizedDeals
    };

    console.log('\n✅ ========== PIPELINE COMPLETE ==========');
    console.log('📊 Final Results:');
    console.log('  - Matches:', result.matches.length);
    console.log('  - Categories:', result.categorizedDeals.length);
    console.log('  - Total items in explorer:', result.categorizedDeals.reduce((sum, cat) => sum + cat.items.length, 0));
    console.log('==========================================\n');

    return result;

  } catch (error) {
    console.error("Gemini Pipeline Error:", error);
    throw error;
  }
};