import { CandidateGenerator } from './candidateGenerator';
import { NudgeRanker } from './nudgeRanker';
import { SessionContext, UserProfile, ScanEvent, NudgeCandidate } from './types';
import { ThrottleManager } from './throttleManager';

export class NudgeEngine {
  private generator = new CandidateGenerator();
  private ranker = new NudgeRanker();
  private throttle = new ThrottleManager(3);

  processScan(session: SessionContext, profile: UserProfile, event: ScanEvent): NudgeCandidate | null {
    session.scans.push(event);
    const candidates = this.generator.generateCandidates(session, profile);
    const ranked = this.ranker.rank(candidates, profile);
    if (!this.throttle.canServeNudge(session)) return null;
    for (const c of ranked) {
      if (!this.throttle.hasSeenCandidate(session, c.id)) {
        session.nudgeHistory.push(c.id);
        session.lastNudgeScanIndex = session.scans.length;
        return c;
      }
    }
    return null;
  }

  async processScanAI(session: SessionContext, profile: UserProfile, event: ScanEvent): Promise<NudgeCandidate | null> {
    session.scans.push(event);
    const candidates = this.generator.generateCandidates(session, profile);
    let ranked = this.ranker.rank(candidates, profile);
    if (ranked.length > 0) {
      try {
        const resp = await fetch('http://localhost:8787/rerank', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ candidates: ranked, profile, session })
        });
        if (resp.ok) {
          const data = await resp.json();
          if (Array.isArray(data?.candidates) && data.candidates.length > 0) ranked = data.candidates;
        }
      } catch {
        // fall back silently
      }
    }
    if (!this.throttle.canServeNudge(session)) return null;
    for (const c of ranked) {
      if (!this.throttle.hasSeenCandidate(session, c.id)) {
        session.nudgeHistory.push(c.id);
        session.lastNudgeScanIndex = session.scans.length;
        return c;
      }
    }
    return null;
  }
}


