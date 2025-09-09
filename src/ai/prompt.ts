import { NudgeCandidate, SessionContext, UserProfile } from '../types';

export function buildCompliancePrompt(params: {
  profile: UserProfile;
  session: SessionContext;
  candidates: NudgeCandidate[];
}) {
  const { profile, session, candidates } = params;
  return `You are a SmartShop AI assistant.\n\nRules context:\n- Follow dietary preferences in the user profile\n- Respect multi-buy, discount, and promo thresholds\n- Avoid out-of-stock items\n- Max 1 nudge per 3 scans; no repeat offers in session\n- Mission nudges only for partially completed baskets\n- Comply with internal pricing & promotion rules\n\nUser profile: ${JSON.stringify(profile)}\nBasket contents: ${JSON.stringify(session.basket)}\nCandidates: ${JSON.stringify(candidates.map(c => ({ id: c.id, type: c.type, title: c.title, savings: c.savings, products: c.products.map(p => ({ sku: p.sku, price: p.price })) })))}\n\nTask: Rank the candidates best-first and remove any that violate rules. Return strictly JSON as {"order":["candidateId", ...]}.`;
}


