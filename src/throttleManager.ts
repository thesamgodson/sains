import { SessionContext } from './types';

export class ThrottleManager {
  private scansBetweenNudges: number;
  constructor(scansBetweenNudges = 3) {
    this.scansBetweenNudges = scansBetweenNudges;
  }

  canServeNudge(session: SessionContext): boolean {
    const totalScans = session.scans.length;
    if (session.lastNudgeScanIndex === undefined) return true;
    return totalScans - session.lastNudgeScanIndex >= this.scansBetweenNudges;
  }

  hasSeenCandidate(session: SessionContext, candidateId: string): boolean {
    return session.nudgeHistory.includes(candidateId);
  }
}


