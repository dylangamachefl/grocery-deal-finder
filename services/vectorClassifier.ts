import { pipeline, env } from '@xenova/transformers';
import { SUB_CATEGORIES, SubCategory } from './taxonomy';

// Skip local checks for browser environment if needed, but Xenova handles this.
// env.allowLocalModels = false; // Usually true by default, but we want it to fetch from CDN if not local.

let extractor: any = null;
let anchorVectors: { vector: number[]; subCategory: SubCategory }[] = [];
let isInitialized = false;

// Cosine similarity function
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export const initializeVectorClassifier = async () => {
  if (isInitialized) return;

  console.log("Initializing Vector Classifier...");

  // Use a small, fast model.
  // 'Xenova/all-MiniLM-L6-v2' is a standard choice for sentence embeddings.
  extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
    quantized: true, // Use quantized model for speed and size
  });

  console.log("Model loaded. Embedding anchors...");

  const subCategories = SUB_CATEGORIES;

  // Embed all anchors
  // We can batch this if needed, but for ~40 items, serial or small batch is fine.
  // The pipeline can accept an array of strings.
  const output = await extractor(subCategories.map(s => s.embeddingText), { pooling: 'mean', normalize: true });

  // output is a Tensor. We need to convert it to array of vectors.
  // The shape is [batch_size, hidden_size]
  // output.tolist() returns nested arrays.

  const vectors = output.tolist();

  anchorVectors = vectors.map((vec: number[], index: number) => ({
    vector: vec,
    subCategory: subCategories[index]
  }));

  isInitialized = true;
  console.log("Vector Classifier Initialized.");
};

export const classifyItem = async (itemText: string): Promise<{ subCategory: string; parentCategory: string }> => {
  if (!isInitialized) {
    await initializeVectorClassifier();
  }

  // Embed the item
  const output = await extractor(itemText, { pooling: 'mean', normalize: true });
  const itemVector = output.tolist()[0]; // It returns [vector]

  let maxSim = -1;
  let bestMatch: SubCategory | null = null;

  for (const anchor of anchorVectors) {
    const sim = cosineSimilarity(itemVector, anchor.vector);
    if (sim > maxSim) {
      maxSim = sim;
      bestMatch = anchor.subCategory;
    }
  }

  if (bestMatch) {
    return {
      subCategory: bestMatch.name,
      parentCategory: bestMatch.parent
    };
  }

  // Fallback (should theoretically not happen if lists are populated)
  return {
    subCategory: "Unknown",
    parentCategory: "Pantry & Dry Goods" // Default safe fallback
  };
};
