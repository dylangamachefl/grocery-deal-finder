/**
 * Utility functions for array sharding and batch processing
 */

export interface ProgressTracker {
    current: number;
    total: number;
    percentage: number;
    increment: () => void;
    getStatus: (prefix: string) => string;
}

/**
 * Split an array into chunks of specified size
 * @param items - Array to split
 * @param shardSize - Size of each chunk
 * @returns Array of chunks
 */
export function createShards<T>(items: T[], shardSize: number): T[][] {
    const shards: T[][] = [];

    for (let i = 0; i < items.length; i += shardSize) {
        shards.push(items.slice(i, i + shardSize));
    }

    return shards;
}

/**
 * Create a progress tracker for batch processing
 * @param totalShards - Total number of shards to process
 * @returns Progress tracker object
 */
export function createProgressTracker(totalShards: number): ProgressTracker {
    let current = 0;

    return {
        get current() {
            return current;
        },
        total: totalShards,
        get percentage() {
            return totalShards > 0 ? Math.round((current / totalShards) * 100) : 0;
        },
        increment() {
            current++;
        },
        getStatus(prefix: string) {
            return `${prefix} Batch ${current} of ${totalShards}...`;
        },
    };
}

/**
 * Cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
        throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
}

/**
 * Calculate average similarity score for an item against a list of keywords
 * @param itemEmbedding - Vector embedding of the item
 * @param keywordEmbeddings - Array of keyword embeddings
 * @returns Average similarity score
 */
export function calculateAverageSimilarity(
    itemEmbedding: number[],
    keywordEmbeddings: number[][]
): number {
    if (keywordEmbeddings.length === 0) return 0;

    const similarities = keywordEmbeddings.map(keywordEmb =>
        cosineSimilarity(itemEmbedding, keywordEmb)
    );

    const sum = similarities.reduce((acc, sim) => acc + sim, 0);
    return sum / similarities.length;
}

/**
 * Get the maximum similarity score for an item against a list of keywords
 * @param itemEmbedding - Vector embedding of the item
 * @param keywordEmbeddings - Array of keyword embeddings
 * @returns Maximum similarity score
 */
export function calculateMaxSimilarity(
    itemEmbedding: number[],
    keywordEmbeddings: number[][]
): number {
    if (keywordEmbeddings.length === 0) return 0;

    return Math.max(...keywordEmbeddings.map(keywordEmb =>
        cosineSimilarity(itemEmbedding, keywordEmb)
    ));
}
