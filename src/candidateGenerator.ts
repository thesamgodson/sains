import { nanoid } from 'nanoid';
import { BasketItem, NudgeCandidate, Product, SessionContext, UserProfile } from './types';
import { Catalog, Complements, MissionRecipes } from './catalog';
import { BasketAnalyzer } from './basketAnalyzer';

export class CandidateGenerator {
  private basketAnalyzer = new BasketAnalyzer();

  generateCandidates(session: SessionContext, profile: UserProfile): NudgeCandidate[] {
    const lastScan = session.scans[session.scans.length - 1];
    const candidates: NudgeCandidate[] = [];
    const basketSkus = new Set(session.basket.map(b => b.sku));
    if (lastScan) {
      candidates.push(...this.generateComplement(lastScan.sku, profile, basketSkus));
      candidates.push(...this.generateSubstitute(lastScan.sku, profile, basketSkus));
      candidates.push(...this.generateTradeUp(lastScan.sku, profile, basketSkus));
    }
    candidates.push(...this.generateMultibuy(session.basket, lastScan?.sku));
    candidates.push(...this.generateMission(session.basket, profile));
    candidates.push(...this.generateHoldOff(session.basket, profile));
    candidates.push(...this.generateStockUp(session.basket, profile));
    candidates.push(...this.generateStoreSpecific(session, profile));
    candidates.push(...this.generateNectarPoints(session, profile));
    return candidates;
  }

  private dietaryOk(product: Product, profile: UserProfile): boolean {
    const dietOk = profile.dietTags.every(tag => product.dietTags.includes(tag));
    const brandOk = !profile.avoidBrands.includes(product.brand);
    const allergyOk = (profile.allergyProfile || []).every(a => !(product.tags || []).includes(a));
    return dietOk && brandOk && allergyOk;
  }

  private generateComplement(sku: string, profile: UserProfile, basketSkus: Set<string>): NudgeCandidate[] {
    const complementSkus = Complements[sku] || [];
    const products = complementSkus
      .map(s => Catalog[s])
      .filter(Boolean)
      .filter(p => !basketSkus.has(p.sku))
      .filter(p => this.dietaryOk(p, profile));
    if (products.length === 0) return [];
    const title = 'Perfect pairing 🍝';
    const reason = 'Add the missing piece to complete your meal.';
    const savings = products.reduce((acc, p) => acc + (p.promo?.type === 'nectar' && p.promo.nectarPrice ? p.price - p.promo.nectarPrice : 0), 0);
    return [{ id: nanoid(), type: 'complement', title, reason, products, savings }];
  }

  private generateMultibuy(basket: BasketItem[], lastScanSku?: string): NudgeCandidate[] {
    const oneAway = this.basketAnalyzer.computeMultibuySavingsIfOneAway(basket);
    const candidates: NudgeCandidate[] = [];
    for (const g of oneAway) {
      // Prefer last scanned if in group, else the cheapest in the group
      const groupProducts = Object.values(Catalog).filter(p => p.promo?.groupId === g.groupId);
      let product: Product | undefined = groupProducts.find(p => p.sku === lastScanSku);
      if (!product) product = groupProducts.sort((a, b) => a.price - b.price)[0];
      if (!product) continue;
      candidates.push({
        id: nanoid(),
        type: 'multibuy',
        title: 'Almost there 🎯',
        reason: `Add 1 more to unlock £${g.potentialSaving.toFixed(2)} savings.`,
        products: [product],
        savings: g.potentialSaving
      });
    }
    return candidates;
  }

  private generateSubstitute(sku: string, profile: UserProfile, basketSkus: Set<string>): NudgeCandidate[] {
    const product = Catalog[sku];
    if (!product) return [];
    // Substitute only within the same sub-category (avoid broad 'food' overlap)
    const baseSubcategory = product.categories[1];
    const substitutes = Object.values(Catalog).filter(p => p.sku !== product.sku && p.categories[1] === baseSubcategory && !basketSkus.has(p.sku));
    const options: Product[] = [];
    for (const s of substitutes) {
      if (!this.dietaryOk(s, profile)) continue;
      if (profile.valueBias === 'value') {
        if (s.promo?.type === 'nectar' && s.promo.nectarPrice && s.promo.nectarPrice < product.price) options.push(s);
        else if ((s.promo?.valueBand === 'low' || s.price < product.price) && s.price <= product.price * 0.9) options.push(s);
      } else if (profile.valueBias === 'premium') {
        if (s.price > product.price && s.brand !== 'Sainsbury\'s Basics') options.push(s);
      } else {
        if (s.price <= product.price || (s.promo?.type === 'nectar' && s.promo.nectarPrice && s.promo.nectarPrice < product.price)) options.push(s);
      }
    }
    if (options.length === 0) return [];
    const best = options.sort((a, b) => (a.promo?.nectarPrice ?? a.price) - (b.promo?.nectarPrice ?? b.price))[0];
    const saving = Math.max(0, product.price - (best.promo?.nectarPrice ?? best.price));
    return [{ id: nanoid(), type: 'substitute', title: 'Smart swap 💡', reason: 'Switch to save without compromise.', products: [best], savings: saving }];
  }

  private generateMission(basket: BasketItem[], profile: UserProfile): NudgeCandidate[] {
    const basketSkus = new Set(basket.map(b => b.sku));
    const candidates: NudgeCandidate[] = [];
    for (const [mission, skus] of Object.entries(MissionRecipes)) {
      const missing = skus.filter(s => !basketSkus.has(s))
        .map(s => Catalog[s])
        .filter(Boolean)
        .filter(p => this.dietaryOk(p, profile));
      if (missing.length > 0 && missing.length < skus.length) {
        const savings = missing.reduce((acc, p) => acc + (p.promo?.type === 'nectar' && p.promo.nectarPrice ? p.price - p.promo.nectarPrice : 0), 0);
        candidates.push({ id: nanoid(), type: 'mission', title: 'Finish your recipe 🍽️', reason: `Complete ${mission.replace('_', ' ')} with these picks.` , products: missing.slice(0, 3), savings });
      }
    }
    return candidates;
  }

  // Store/time-based suggestions (simple demo rule)
  private generateStoreSpecific(session: SessionContext, profile: UserProfile): NudgeCandidate[] {
    if (!session.timeOfDay) return [];
    const hour = Number(session.timeOfDay.split(':')[0] || 0);
    // morning: breakfast complements
    if (hour >= 7 && hour <= 10) {
      const items: Product[] = [];
      ['cereal-500g','milk-1l','orange-juice-1l'].forEach(s => { if (Catalog[s]) items.push(Catalog[s]); });
      if (items.length) return [{ id: nanoid(), type: 'store', title: 'Morning picks ☕', reason: 'Fuel up with these breakfast favorites.', products: items.slice(0, 3), savings: 0 }];
    }
    return [];
  }

  private generateTradeUp(sku: string, profile: UserProfile, basketSkus: Set<string>): NudgeCandidate[] {
    const base = Catalog[sku];
    if (!base) return [];
    // premium alternative in same category
    const premium = Object.values(Catalog).filter(p => p.categories.some(c => base.categories.includes(c)) && p.price > base.price && p.brand.includes('Taste the Difference') && !basketSkus.has(p.sku));
    if (premium.length === 0) return [];
    const best = premium.sort((a, b) => b.price - a.price)[0];
    if (!this.dietaryOk(best, profile)) return [];
    const title = 'Treat yourself ✨';
    const reason = `Upgrade to ${best.name} for a little extra delight.`;
    return [{ id: nanoid(), type: 'tradeup', title, reason, products: [best], savings: 0 }];
  }

  private generateStockUp(basket: BasketItem[], profile: UserProfile): NudgeCandidate[] {
    const items = new Map<string, number>();
    for (const it of basket) items.set(it.sku, (items.get(it.sku) || 0) + it.qty);
    const candidates: NudgeCandidate[] = [];
    // Simple rule: if tissue 9-roll in basket, suggest 12-roll bulk
    if (items.has('toilet-tissue-9-roll') && Catalog['toilet-tissue-12-roll']) {
      const bulk = Catalog['toilet-tissue-12-roll'];
      candidates.push({ id: nanoid(), type: 'stockup', title: 'Stock up 📦', reason: 'Bigger pack, fewer trips.', products: [bulk], savings: 0 });
    }
    return candidates;
  }

  private generateNectarPoints(session: SessionContext, profile: UserProfile): NudgeCandidate[] {
    if (!(profile.valueBias === 'value' || profile.valueBias === 'balanced')) return [];
    const basketSkus = new Set(session.basket.map(b => b.sku));
    const options = Object.values(Catalog).filter(p => (p.nectarPointsBonus || 0) > 0 && !basketSkus.has(p.sku));
    if (options.length === 0) return [];
    // choose highest points
    const best = options.sort((a, b) => (b.nectarPointsBonus || 0) - (a.nectarPointsBonus || 0))[0];
    if (!this.dietaryOk(best, profile)) return [];
    return [{ id: nanoid(), type: 'nectar_points', title: `${best.nectarPointsBonus} Nectar points await! 🟣`, reason: `Add ${best.name} to your basket.`, products: [best], savings: 0 }];
  }

  // Hold-off nudge: if user is adding more short-shelf-life items and basket already has enough
  private generateHoldOff(basket: BasketItem[], profile: UserProfile): NudgeCandidate[] {
    const products = basket.map(b => ({ item: b, product: Catalog[b.sku] })).filter(p => p.product);
    const perishables = products.filter(p => (p.product.perishableDays || 0) > 0);
    if (perishables.length === 0) return [];
    // Simple heuristic: if total perishable qty >= 3 and adding another perishable with <=3 days
    const totalPerishables = perishables.reduce((acc, p) => acc + p.item.qty, 0);
    const soonExpiring = perishables.some(p => (p.product.perishableDays || 99) <= 3);
    if (totalPerishables >= 3 && soonExpiring) {
      const prods = perishables.slice(0, 2).map(p => p.product);
      return [{ id: nanoid(), type: 'holdoff', title: 'Quick heads up ⚠️', reason: 'You have items expiring soon—avoid overbuying.', products: prods, savings: 0 }];
    }
    return [];
  }
}


