export type DietTag = 'vegetarian' | 'vegan' | 'halal' | 'kosher' | 'gluten_free';

export type ValueBias = 'premium' | 'balanced' | 'value';

export interface UserProfile {
  id: string;
  dietTags: DietTag[];
  avoidBrands: string[];
  valueBias: ValueBias;
  budgetBand: 'low' | 'mid' | 'high';
}

export interface PromoMeta {
  type: 'multibuy' | 'nectar' | 'price_drop';
  value?: number; // monetary saving or percent
  threshold?: number; // quantity threshold for multibuy
  groupId?: string; // grouping for multibuy
  nectarPrice?: number; // nectar card price
  valueBand?: 'low' | 'mid' | 'high';
  isInStock?: boolean;
}

export interface Product {
  sku: string;
  name: string;
  brand: string;
  price: number;
  dietTags: DietTag[];
  categories: string[];
  promo?: PromoMeta;
  missionTags?: string[]; // e.g., 'pasta_night', 'roast_dinner'
  perishableDays?: number; // approximate days until expiry for demo
}

export type NudgeType = 'complement' | 'multibuy' | 'substitute' | 'mission' | 'tradeup' | 'stockup' | 'holdoff';

export interface BasketItem {
  sku: string;
  qty: number;
}

export interface ScanEvent {
  sku: string;
  timestamp: number;
}

export interface NudgeCandidate {
  id: string;
  type: NudgeType;
  title: string;
  reason: string;
  products: Product[];
  savings: number; // in GBP
  score?: number;
}

export interface SessionContext {
  basket: BasketItem[];
  scans: ScanEvent[];
  nudgeHistory: string[]; // candidate ids served
  lastNudgeScanIndex?: number;
}


