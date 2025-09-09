import { describe, it, expect, beforeEach } from 'vitest';
import { NudgeEngine } from '../src/nudgeEngine';
import { SessionContext, UserProfile } from '../src/types';
import { Catalog } from '../src/catalog';

describe('NudgeEngine', () => {
  let engine: NudgeEngine;
  let session: SessionContext;
  let user: UserProfile;

  beforeEach(() => {
    engine = new NudgeEngine();
    session = { basket: [], scans: [], nudgeHistory: [] };
    user = { id: 'u1', dietTags: ['vegetarian'], avoidBrands: [], valueBias: 'balanced', budgetBand: 'mid' };
  });

  it('generates complement nudge after scanning pasta', () => {
    session.basket.push({ sku: 'pasta-penne', qty: 1 });
    const nudge = engine.processScan(session, user, { sku: 'pasta-penne', timestamp: Date.now() });
    expect(nudge?.type).toBe('complement');
  });

  it('enforces throttling of 1 per 3 scans', () => {
    session.basket.push({ sku: 'pasta-penne', qty: 1 });
    const n1 = engine.processScan(session, user, { sku: 'pasta-penne', timestamp: Date.now() });
    const n2 = engine.processScan(session, user, { sku: 'bread-400g', timestamp: Date.now() });
    const n3 = engine.processScan(session, user, { sku: 'houmous', timestamp: Date.now() });
    const n4 = engine.processScan(session, user, { sku: 'falafel', timestamp: Date.now() });
    expect(!!n1).toBe(true);
    expect(n2).toBeNull();
    expect(n3).toBeNull();
    expect(!!n4).toBe(true);
  });

  it('respects dietary constraints (vegan should not get non-vegan gravy)', () => {
    user.dietTags = ['vegan'];
    session.basket.push({ sku: 'chicken-breast', qty: 1 });
    const nudge = engine.processScan(session, user, { sku: 'chicken-breast', timestamp: Date.now() });
    // complement list includes gravy and carrots; gravy is vegetarian only, carrots vegan
    expect(nudge?.products.every(p => p.dietTags.includes('vegan'))).toBe(true);
  });

  it('suggests multibuy when one away', () => {
    session.basket.push({ sku: 'falafel', qty: 1 });
    const n1 = engine.processScan(session, user, { sku: 'falafel', timestamp: Date.now() });
    // clear throttling effect by simulating two more scans without nudges
    engine.processScan(session, user, { sku: 'bread', timestamp: Date.now() });
    engine.processScan(session, user, { sku: 'bread', timestamp: Date.now() });
    session.basket.push({ sku: 'houmous', qty: 1 });
    const n2 = engine.processScan(session, user, { sku: 'houmous', timestamp: Date.now() });
    // When adding houmous, should be one away or completing multibuy
    expect(n2?.type === 'multibuy' || n1?.type === 'multibuy').toBe(true);
  });
});


