import { NudgeEngine } from './nudgeEngine';
import { SessionContext, UserProfile } from './types';

export function createDemo(profile?: Partial<UserProfile>) {
  const engine = new NudgeEngine();
  const session: SessionContext = { basket: [], scans: [], nudgeHistory: [] };
  const user: UserProfile = {
    id: 'demo-user',
    dietTags: ['vegetarian'],
    avoidBrands: [],
    valueBias: 'balanced',
    budgetBand: 'mid',
    ...profile
  } as UserProfile;

  return { engine, session, user };
}


