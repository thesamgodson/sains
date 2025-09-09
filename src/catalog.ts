import { Product } from './types';
import { RawProducts } from './data/catalogue';
import { ComplementsRaw } from './data/complements';
import { MissionsRaw } from './data/missions';

export const Catalog: Record<string, Product> = Object.fromEntries(
  RawProducts.map(p => {
    const sku = p.productId;
    const promo = p.promo
      ? (p.promo.type === 'multi-buy'
          ? { type: 'multibuy', value: p.promo.value, threshold: p.promo.threshold, groupId: p.promo.groupId }
          : p.promo.type === 'discount'
            ? { type: 'price_drop', value: p.promo.value, groupId: p.promo.groupId }
            : undefined)
      : (p.nectarPrice && p.nectarPrice < p.price ? { type: 'nectar', nectarPrice: p.nectarPrice, isInStock: p.isInStock } : undefined);
    const product: Product = {
      sku,
      name: p.name,
      brand: p.brand,
      price: p.price,
      dietTags: (p.diet || []) as any,
      categories: [p.category.toLowerCase(), p.subCategory.toLowerCase()],
      tags: (p.tags || []) as any,
      promo,
      missionTags: [],
      perishableDays: (p as any).perishableDays,
      nectarPointsBonus: (p as any).nectarPointsBonus
    };
    return [sku, product];
  })
);

// Back-compat test aliases for earlier tests
if (Catalog['pasta-500g']) Catalog['pasta-penne'] = Catalog['pasta-500g'];
if (Catalog['pasta-sauce-350g']) Catalog['pasta-sauce'] = Catalog['pasta-sauce-350g'];
if (Catalog['falafel-200g']) Catalog['falafel'] = Catalog['falafel-200g'];
if (Catalog['houmous-200g']) Catalog['houmous'] = Catalog['houmous-200g'];
if (Catalog['carrots-1kg']) Catalog['carrots'] = Catalog['carrots-1kg'];
if (Catalog['gravy-granules-200g']) Catalog['gravy'] = Catalog['gravy-granules-200g'];
if (Catalog['whole-chicken-1kg']) Catalog['chicken-breast'] = Catalog['whole-chicken-1kg'];

export const Complements: Record<string, string[]> = ComplementsRaw;
export const MissionRecipes: Record<string, string[]> = MissionsRaw;

// Back-compat complement aliases
if (Complements['pasta-500g']) Complements['pasta-penne'] = Complements['pasta-500g'];
if (Complements['houmous-200g']) Complements['houmous'] = Complements['houmous-200g'];
if (Complements['falafel-200g']) Complements['falafel'] = Complements['falafel-200g'];
if (Complements['gravy-granules-200g']) Complements['gravy'] = Complements['gravy-granules-200g'];
if (Complements['carrots-1kg']) Complements['carrots'] = Complements['carrots-1kg'];
if (Complements['whole-chicken-1kg']) Complements['chicken-breast'] = Complements['whole-chicken-1kg'];


