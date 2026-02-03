import { z } from 'zod';

// ===== ZOD SCHEMAS FOR AGENT RESPONSES =====

// Agent 1: Vision Extractor Response Schema
export const RawExtractedItemSchema = z.object({
    rawName: z.string().default(""),
    brand: z.string().default(""),
    price: z.string().default(""),
    unit: z.string().default(""),
    dealText: z.string().default(""),
    storeName: z.string().default("Unknown Store"),
    validity: z.string().default(""),
});

export const Agent1ResponseSchema = z.array(RawExtractedItemSchema);

// Agent 2: Librarian Response Schema
export const MasterInventoryItemPartialSchema = z.object({
    storeName: z.string(),
    rawName: z.string().optional(),
    normalizedName: z.string(),
    brand: z.string().default(""),
    price: z.string(),
    unit: z.string().default(""),
    dealDescription: z.string().default(""),
    isLossLeader: z.boolean().default(false),
    validDates: z.string().default(""),
    originalPrice: z.string().nullable().optional(),
});

export const Agent2ResponseSchema = z.array(MasterInventoryItemPartialSchema);

// Agent 3: Interpreter Response Schema
export const Agent3ResponseSchema = z.object({
    expandedKeywords: z.array(z.string()),
});

// Agent 4: Matcher Response Schema
export const MatchItemSchema = z.object({
    id: z.string(),
    itemName: z.string(),
    dealDescription: z.string().optional(),
    confidence: z.number().optional(),
});

export const Agent4ResponseSchema = z.object({
    matches: z.array(MatchItemSchema),
    summary: z.string().default("Here are the best deals found for your list."),
});
