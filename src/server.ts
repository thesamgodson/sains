import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import cors from 'cors';
import { NudgeCandidate, UserProfile, SessionContext } from './types';
import { buildCompliancePrompt } from './ai/prompt';

dotenv.config();

export const app = express();
const corsOptions: cors.CorsOptions = {
  origin: ['http://localhost:5173'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
};
app.use(cors(corsOptions));
app.options('/rerank', cors(corsOptions));
app.use(express.json());

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

function localScore(c: NudgeCandidate, profile: UserProfile): number {
  let score = 0;
  if (c.type === 'complement') score += 7;
  if (c.type === 'multibuy') score += 6;
  if (c.type === 'substitute') score += 3;
  if (c.type === 'mission') score += 2;
  score += Math.min(10, c.savings * 2);
  if (profile.valueBias === 'value' && (c.type === 'substitute' || c.type === 'multibuy')) score += 3;
  score -= Math.max(0, c.products.length - 2);
  return score;
}

app.post('/rerank', async (req, res) => {
  try {
    const { candidates, profile, session }: { candidates: NudgeCandidate[]; profile: UserProfile; session?: SessionContext } = req.body;
    if (!Array.isArray(candidates) || candidates.length === 0) return res.json({ candidates: [] });

    // Local fallback if no key
    if (!apiKey) {
      const ranked = [...candidates].sort((a, b) => localScore(b, profile) - localScore(a, profile));
      return res.json({ candidates: ranked });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' });
    const prompt = buildCompliancePrompt({ profile, session: session || { basket: [], scans: [], nudgeHistory: [] }, candidates });
    const resp = await model.generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }] }] });
    const text = resp.response.text();
    let order: string[] = [];
    try {
      const parsed = JSON.parse(text);
      order = Array.isArray(parsed.order) ? parsed.order : [];
    } catch {
      order = [];
    }
    const byId = new Map(candidates.map(c => [c.id, c] as const));
    const ranked = order.map(id => byId.get(id)).filter(Boolean) as NudgeCandidate[];
    // Append any not mentioned
    const remaining = candidates.filter(c => !order.includes(c.id));
    res.json({ candidates: [...ranked, ...remaining] });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Unknown error' });
  }
});

export function startServer(port = 8787) {
  return app.listen(port, () => console.log(`Gemini re-ranker listening on :${port}`));
}

// Ensure server starts when executed via tsx/npm script (not during Vitest)
if (process.env.VITEST !== 'true') {
  startServer(Number(process.env.PORT) || 8787);
}


