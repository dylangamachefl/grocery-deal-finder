export interface GroceryMatch {
  id: string;
  itemName: string;
  productName?: string;
  storeName: string;
  price: string;
  quantity?: string;
  brand?: string;
  originalPrice?: string;
  dealDescription: string;
  validDates?: string;
  itemLimit?: string;
  isSale: boolean;
  confidence: number;
}

export interface DealCategory {
  category: string;
  items: GroceryMatch[];
}

export interface AnalysisResult {
  matches: GroceryMatch[];
  categorizedDeals: DealCategory[];
  summary: string;
}

export interface UploadedFile {
  id: string;
  file: File;
  preview?: string;
}

// --- Agent Types ---

export interface RawExtractedItem {
  rawName: string;
  price: string;
  unit?: string;
  brand?: string; // Added brand for better extraction
  dealText?: string;
  storeName?: string;
  validity?: string;
}

export interface MasterInventoryItem {
  id: string;
  storeName: string;
  rawName: string;
  normalizedName: string;
  brand?: string;
  price: string;
  unit: string;
  dealDescription: string;
  category: string;
  subcategory?: string;
  isLossLeader: boolean;
  validDates?: string;
  originalPrice?: string;
  productName?: string; // Alias for normalizedName for compatibility
  itemName?: string; // For compatibility
  isSale?: boolean; // For compatibility
}