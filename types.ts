export interface GroceryMatch {
  id: string;
  itemName: string;
  productName?: string;
  storeName: string;
  price: string;
  quantity?: string;
  originalPrice?: string;
  dealDescription: string;
  validDates?: string;
  itemLimit?: string;
  isSale: boolean;
  confidence: number;
}

export interface AnalysisResult {
  matches: GroceryMatch[];
  summary: string;
}

export interface UploadedFile {
  id: string;
  file: File;
  preview?: string;
}