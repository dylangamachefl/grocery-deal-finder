import { pipeline, env } from '@xenova/transformers';
import { SUB_CATEGORIES, SubCategory } from '../services/taxonomy';

// Disable local model checks - use CDN for browser environment
env.allowLocalModels = false;

// Worker state
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

// Initialize the classifier (singleton pattern)
async function initialize() {
    if (isInitialized) {
        return { success: true, message: 'Already initialized' };
    }

    try {
        console.log('[Worker] Initializing Vector Classifier...');

        // Load the feature extraction model
        extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
            quantized: true,
        });

        console.log('[Worker] Model loaded. Embedding anchors...');

        // Embed all subcategory anchors
        const subCategories = SUB_CATEGORIES;
        const output = await extractor(
            subCategories.map(s => s.embeddingText),
            { pooling: 'mean', normalize: true }
        );

        const vectors = output.tolist();

        anchorVectors = vectors.map((vec: number[], index: number) => ({
            vector: vec,
            subCategory: subCategories[index],
        }));

        isInitialized = true;
        console.log('[Worker] Vector Classifier Initialized.');

        return { success: true, message: 'Initialization complete' };
    } catch (error) {
        console.error('[Worker] Initialization error:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

// Classify a single item
async function classifyItem(itemText: string) {
    if (!isInitialized) {
        const initResult = await initialize();
        if (!initResult.success) {
            throw new Error(`Worker not initialized: ${initResult.message}`);
        }
    }

    try {
        // Embed the item
        const output = await extractor(itemText, { pooling: 'mean', normalize: true });
        const itemVector = output.tolist()[0];

        let maxSim = -1;
        let bestMatch: SubCategory | null = null;

        // Find best matching anchor
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
                parentCategory: bestMatch.parent,
                similarity: maxSim,
            };
        }

        // Fallback
        return {
            subCategory: 'Unknown',
            parentCategory: 'Pantry & Dry Goods',
            similarity: 0,
        };
    } catch (error) {
        console.error('[Worker] Classification error:', error);
        throw error;
    }
}

// Classify multiple items in batch
async function classifyBatch(items: string[]) {
    const results = await Promise.all(items.map(item => classifyItem(item)));
    return results;
}

// Message handler
self.onmessage = async (event: MessageEvent) => {
    const { type, payload, id } = event.data;

    try {
        switch (type) {
            case 'INITIALIZE':
                const initResult = await initialize();
                self.postMessage({ type: 'INITIALIZE_RESPONSE', payload: initResult, id });
                break;

            case 'CLASSIFY':
                const result = await classifyItem(payload.text);
                self.postMessage({ type: 'CLASSIFY_RESPONSE', payload: result, id });
                break;

            case 'CLASSIFY_BATCH':
                const batchResults = await classifyBatch(payload.items);
                self.postMessage({ type: 'CLASSIFY_BATCH_RESPONSE', payload: batchResults, id });
                break;

            default:
                self.postMessage({
                    type: 'ERROR',
                    payload: { message: `Unknown message type: ${type}` },
                    id,
                });
        }
    } catch (error) {
        self.postMessage({
            type: 'ERROR',
            payload: {
                message: error instanceof Error ? error.message : 'Unknown error',
            },
            id,
        });
    }
};

// Signal that worker is ready
self.postMessage({ type: 'READY' });
