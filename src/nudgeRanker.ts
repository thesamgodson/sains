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
    if (c.type === 'nectar_points') score += 1; // keep modest so it doesn't dominate

    // Savings and points weight
    score += Math.min(10, c.savings * 2);
    const points = c.type === 'nectar_points' ? (c.products[0]?.nectarPointsBonus || 0) : 0;
    if (points) {
      // cap the points influence so it can't outweigh core relevance types
      const scaler = profile.valueBias === 'value' ? 0.6 : 0.4;
      score += Math.min(4, (points / 50) * 2 * scaler);
    }

    // Value bias alignment
    if (profile.valueBias === 'value' && (c.type === 'substitute' || c.type === 'multibuy')) score += 3;

    // Diversity: fewer products preferred for simplicity
    score -= Math.max(0, c.products.length - 2);

    return score;
  }
}


