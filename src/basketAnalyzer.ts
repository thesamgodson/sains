import { BasketItem, Product } from './types';
import { Catalog } from './catalog';

export class BasketAnalyzer {
  getBasketProducts(basket: BasketItem[]): Product[] {
    return basket.flatMap(item => Array.from({ length: item.qty }, () => Catalog[item.sku])).filter(Boolean);
  }

  countByGroup(basket: BasketItem[], groupId: string): number {
    const products = this.getBasketProducts(basket);
    return products.filter(p => p.promo?.groupId === groupId).length;
  }

  computeMultibuySavingsIfOneAway(basket: BasketItem[]): { groupId: string; needed: number; potentialSaving: number }[] {
    const products = this.getBasketProducts(basket);
    const groups = new Map<string, { count: number; threshold: number; groupPriceSample: number[]; dealPrice: number }>();
    for (const p of products) {
      if (p.promo?.type === 'multibuy' && p.promo.groupId) {
        const threshold = p.promo.threshold || 2;
        const g = groups.get(p.promo.groupId) || { count: 0, threshold, groupPriceSample: [], dealPrice: p.promo.value || 0 };
        g.count += 1;
        g.groupPriceSample.push(p.price);
        // prefer smallest deal price across items if varies
        if (p.promo.value && (g.dealPrice === 0 || (p.promo.value < g.dealPrice))) g.dealPrice = p.promo.value;
        groups.set(p.promo.groupId, g);
      }
    }
    const results: { groupId: string; needed: number; potentialSaving: number }[] = [];
    for (const [groupId, g] of groups) {
      const remainder = g.count % g.threshold;
      const needed = remainder === 0 ? 0 : g.threshold - remainder;
      if (needed === 1) {
        const sample = g.groupPriceSample.length > 0 ? g.groupPriceSample : [0];
        const avgPrice = sample.reduce((a, b) => a + b, 0) / sample.length;
        const regularTotal = g.threshold * avgPrice;
        const dealTotal = g.dealPrice > 0 && g.dealPrice < regularTotal ? g.dealPrice : regularTotal;
        const saving = Math.max(0, regularTotal - dealTotal);
        results.push({ groupId, needed, potentialSaving: Number(saving.toFixed(2)) });
      }
    }
    return results;
  }
}


