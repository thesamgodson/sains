import { NudgeCandidate, UserProfile } from './types';

export class NudgeRanker {
  rank(candidates: NudgeCandidate[], profile: UserProfile): NudgeCandidate[] {
    const scored = candidates.map(c => ({
      ...c,
      score: this.scoreCandidate(c, profile)
    }));
    return scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }

  private scoreCandidate(c: NudgeCandidate, profile: UserProfile): number {
    let score = 0;
    // Base by type relevance
    if (c.type === 'complement') score += 7;
    if (c.type === 'multibuy') score += 6;
    if (c.type === 'substitute') score += 3;
    if (c.type === 'mission') score += 2;
    if (c.type === 'tradeup') score += 2;
    if (c.type === 'stockup') score += 1;

    // Savings weight
    score += Math.min(10, c.savings * 2);

    // Value bias alignment
    if (profile.valueBias === 'value' && (c.type === 'substitute' || c.type === 'multibuy')) score += 3;

    // Diversity: fewer products preferred for simplicity
    score -= Math.max(0, c.products.length - 2);

    return score;
  }
}


