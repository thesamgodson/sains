# SmartShop Promotional Nudges Demo (Local, In-Memory)

Run locally, process scan events, and show nudges with throttling and dietary/value preferences.

## Prereqs
- Node 18+

## Install
```bash
npm install
```

## Tests (TDD)
```bash
npm test
```

## Run the demo UI
```bash
npm run dev
```
Open the URL printed by Vite (default `http://localhost:5173`). Use the Scan buttons to simulate scans.

## Agentic AI Re‑ranker (Gemini)
1) Create `.env` and set:
```
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-1.5-flash
PORT=8787
```
2) Start server (CORS enabled for `http://localhost:5173`):
```
npm run server
```
3) Start UI in another terminal:
```
npm run dev
```
4) In the header, look for “Agentic: Gemini Re‑ranker”:
   - Green dot = API reachable; nudges are re‑ranked via `/rerank`
   - Red dot = fallback to local ranking
5) Nudge Activity panel (left) shows which nudge fired and why.

## Structure
- `src/types.ts`: Types and session models
- `src/catalog.ts`: Mock catalog, complements, mission recipes
- `src/basketAnalyzer.ts`: Basket insights and multibuy helper
- `src/candidateGenerator.ts`: Generates candidates for all nudge types
- `src/nudgeRanker.ts`: Scores and ranks candidates
- `src/throttleManager.ts`: 1 nudge per 3 scans, no repeats
- `src/nudgeEngine.ts`: Orchestrates generation, ranking, and throttle checks
- `src/server.ts`: Optional Gemini re-ranker (local)
- `src/ui.ts`, `src/main.ts`: Web UI with phone simulator, AI toggle, activity log
- `tests/nudgeEngine.test.ts`: Behavior expectations

## Notes
- All data/state in-memory. No external calls (unless optional AI re-ranker enabled).
- Throttling: <=1 nudge per 3 scans and no repeated candidate IDs per session.
- Dietary/brand avoidance respected in candidate generation.

## Extended Nudge Types (Framework)
Implemented in this demo:
- Complement: suggests items that pair with the scan
- Multi-buy: nudges when one-away from a deal
- Substitute: value/nectar-priced alternative aligned with profile
- Mission: completes pre-defined missions (e.g. Sunday roast)

Optional extensions (spec included for future work):
- Trade-up (occasion/premium)
- Stock-up / holiday
- Kids / lunchbox
- Nectar points & loyalty
- Store-specific / time-based
- Allergy-safe / household

Rules and triggers (high-level):
- Respect dietary/allergy profile, stock, and user value bias
- Trigger on scan, basket milestones, mission detection, time/store rules
- Throttling: max 1 per 3 scans, no repeats, stop after mission complete

### Example AI Validation/Ranking Prompt (JSON envelope)
```
{
  "prompt": "Given a scanned product and basket context, return recommended nudges adhering to dietary restrictions, allergy profile, budget band, promotional rules, and store-specific constraints. Include type, title, reason, and candidates with price/savings/points.",
  "input": {
    "scannedProductId": "pasta-500g",
    "basket": [{"productId": "pasta-500g","qty":1}],
    "userProfile": {
      "dietTags": ["vegetarian"],
      "allergyProfile": ["nuts"],
      "valueBias": "balanced",
      "guestsToday": 2
    },
    "sessionContext": {
      "storeId": "store-001",
      "timeOfDay": "11:30"
    }
  }
}
```
