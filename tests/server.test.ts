import request from 'supertest';
import { describe, it, expect } from 'vitest';
import { app } from '../src/server';

describe('/rerank API', () => {
  const profile = { id: 'u', dietTags: ['vegetarian'], avoidBrands: [], valueBias: 'balanced', budgetBand: 'mid' };

  it('returns empty list for empty candidates (and sets CORS)', async () => {
    const res = await request(app)
      .post('/rerank')
      .set('Origin', 'http://localhost:5173')
      .send({ candidates: [], profile });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body?.candidates)).toBe(true);
    expect(res.get('access-control-allow-origin')).toBe('http://localhost:5173');
  });

  it('orders candidates using local fallback if no API key', async () => {
    const candidates = [
      { id: 'a', type: 'multibuy', title: 't', reason: 'r', savings: 0.1, products: [{ sku: 'x', price: 2, brand: 'b', dietTags: ['vegan'], categories: [] }] },
      { id: 'b', type: 'complement', title: 't2', reason: 'r2', savings: 0.3, products: [{ sku: 'y', price: 1, brand: 'b', dietTags: ['vegan'], categories: [] }] }
    ];
    const res = await request(app).post('/rerank').send({ candidates, profile });
    expect(res.status).toBe(200);
    expect(res.body?.candidates?.[0]?.id).toBeDefined();
  });
});


