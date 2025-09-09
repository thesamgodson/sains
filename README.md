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

## How to Test Each Nudge (UI)
- Complement (pairs well)
  - Scan: "Sainsbury’s Penne Pasta 500g" (`pasta-500g`)
  - Expect: Tomato & Basil Sauce complement
- Multi-buy (one-away)
  - Scan: `falafel-200g`
  - Scan two other items to clear throttle; then scan: `houmous-200g`
  - Expect: deli-pair multibuy nudge
- Substitute (value swap)
  - Profile value/balanced (default balanced)
  - Scan: `premium-pasta-400g`
  - Expect: cheaper swap (e.g., `pasta-500g`)
- Mission (complete)
  - Scan: `whole-chicken-1kg`, then `potatoes-2kg`
  - Expect: `carrots-1kg` or `gravy-granules-200g`
- Trade-up (occasion)
  - Scan a standard pasta; throttle-aware, trade-up may appear to Taste the Difference
- Stock-up (bulk)
  - Scan: `toilet-tissue-9-roll`
  - Expect: suggest `toilet-tissue-12-roll`
- Hold-off (perishables)
  - Add ≥3 perishables: `milk-1l`, `strawberries-400g`, `yogurt-500g`
  - Expect: "Heads up: perishables may expire"
- Store/Time-based (morning picks)
  - Set session time: in `src/demo.ts`, set `session.timeOfDay = '08:30'`
  - Expect: "Morning specials" (cereal/milk/juice)
- Nectar Points (value-oriented)
  - Value/balanced profile
  - Expect: "Cornflakes 500g" with 50 bonus points

The left "Nudge Activity" panel shows the type, title, and reason for each nudge.

## API Checks (Agentic Re‑ranker)
Start the server (CORS enabled for `http://localhost:5173`):
```bash
npm run server
```
Start the UI in another terminal:
```bash
npm run dev
```
Header badge should show "Agentic: Gemini Re‑ranker" with a green dot when reachable.

Quick POST test (PowerShell):
```powershell
Invoke-RestMethod -Uri http://localhost:8787/rerank -Method Post -Body (@{ candidates = @(); profile = @{ id='u'; dietTags=@('vegetarian'); avoidBrands=@(); valueBias='balanced'; budgetBand='mid' } } | ConvertTo-Json -Depth 6) -ContentType 'application/json'
```

Troubleshooting:
- Dot is red: ensure server is running; hard-refresh UI.
- CORS blocked: server already whitelists `http://localhost:5173`; restart server.
- No nudge after scan: throttling allows max 1 per 3 scans; vary items.

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
