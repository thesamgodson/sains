import { createDemo } from './demo';
import { Catalog } from './catalog';

export function mountUI(root: HTMLElement) {
  const { engine, session, user } = createDemo();
  const useAI = true;

  root.innerHTML = `
    <div class="container">
      <div class="header">
        <div class="logo"><span class="dot"></span> SmartShop Nudges</div>
        <div style="display:flex; align-items:center; gap:10px;">
          <span class="badge-agentic"><span id="aiStatusDot" class="status-dot status-offline"></span>Agentic: Gemini Re-ranker</span>
          <label style="font-size:12px; color:var(--muted)">Enable
            <input id="aiToggle" type="checkbox" ${true ? 'checked' : ''} />
          </label>
          <div class="scan-meta">Throttling: 1 per 3 scans</div>
        </div>
      </div>
      <div class="layout">
        <div>
          <div class="nudge-activity">
            <div style="font-weight:700; margin-bottom:8px;">Nudge Activity</div>
            <div id="nudge-activity-log" style="font-size:12px; color:var(--muted)">No nudges yet</div>
          </div>
          <div class="scan-panel">
            <div style="font-weight:700; margin-bottom:8px;">Scan Simulation</div>
            <div class="scan-grid" id="scan-grid"></div>
          </div>
          <div class="basket" id="basket">
            <div style="font-weight:700; margin-bottom:8px;">Basket</div>
            <div id="basket-items" style="font-size:14px; color:var(--muted)">No items yet</div>
          </div>
        </div>
        <div class="phone">
          <div class="phone-notch"></div>
          <div class="phone-screen">
            <div class="phone-content" id="phone-content">
              <div style="font-weight:700; margin-bottom:8px;">SmartShop</div>
              <div style="font-size:12px; color:var(--muted);">Nudges appear here after a scan.</div>
              <div class="phone-card">
                <h3>Basket</h3>
                <div id="phone-basket"></div>
                <div class="basket-total"><span>Total</span><span id="phone-total">£0.00</span></div>
              </div>
            </div>
            <div id="nudge" class="nudge-sheet" aria-live="polite"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  const grid = document.getElementById('scan-grid')!;
  const nudgeContainer = document.getElementById('nudge')!;
  const basketEl = document.getElementById('basket-items')!;
  const aiToggle = document.getElementById('aiToggle') as HTMLInputElement;
  let useAiState = true;
  const phoneBasket = document.getElementById('phone-basket')!;
  const phoneTotal = document.getElementById('phone-total')!;
  const activityLog = document.getElementById('nudge-activity-log')!;
  const aiStatusDot = document.getElementById('aiStatusDot') as HTMLSpanElement;
  aiToggle?.addEventListener('change', () => { useAiState = !!aiToggle.checked; });

  // Ping agentic server to set status indicator
  fetch('http://localhost:8787/rerank', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ candidates: [], profile: user }) })
    .then(() => aiStatusDot?.classList.replace('status-offline','status-online'))
    .catch(() => aiStatusDot?.classList.replace('status-online','status-offline'));

  function renderBasket() {
    if (session.basket.length === 0) { basketEl.textContent = 'No items yet'; return; }
    basketEl.innerHTML = '';
    phoneBasket.innerHTML = '';
    let total = 0;
    for (const item of session.basket) {
      const p = Catalog[item.sku];
      if (!p) continue;
      const row = document.createElement('div');
      row.textContent = `${p.name} × ${item.qty}`;
      basketEl.appendChild(row);

      const prow = document.createElement('div');
      prow.className = 'basket-row';
      prow.innerHTML = `<span>${p.name}</span><span class="qty-badge">× ${item.qty}</span>`;
      phoneBasket.appendChild(prow);
      total += p.price * item.qty;
    }
    phoneTotal.textContent = `£${total.toFixed(2)}`;
  }

  for (const p of Object.values(Catalog).slice(0, 24)) {
    const btn = document.createElement('button');
    btn.className = 'scan-btn';
    btn.innerHTML = `<span>${p.name}</span><span class="scan-meta">£${p.price.toFixed(2)}</span>`;
    btn.onclick = () => {
      const existing = session.basket.find(b => b.sku === p.sku);
      if (existing) existing.qty += 1; else session.basket.push({ sku: p.sku, qty: 1 });
      renderBasket();
      if (useAiState) {
        engine.processScanAI(session, user, { sku: p.sku, timestamp: Date.now() }).then(nudge => { if (nudge) showNudge(nudge); });
      } else {
        const nudge = engine.processScan(session, user, { sku: p.sku, timestamp: Date.now() });
        if (nudge) showNudge(nudge);
      }
    };
    grid.appendChild(btn);
  }

  renderBasket();

  function showNudge(nudge: any) {
    // Update activity log
    if (activityLog) {
      const typeToClass: Record<string, string> = {
        complement: 'pill-complement',
        multibuy: 'pill-multibuy',
        substitute: 'pill-substitute',
        mission: 'pill-mission',
        tradeup: 'pill-tradeup',
        stockup: 'pill-stockup',
        holdoff: 'pill-holdoff'
      };
      const pillClass = typeToClass[nudge.type] || 'pill-complement';
      const row = document.createElement('div');
      row.style.marginBottom = '6px';
      row.innerHTML = `<span class="pill ${pillClass}">${nudge.type}</span> <span style="color:var(--brand-navy); font-weight:600;">${nudge.title}</span> <span style="color:var(--muted)">— ${nudge.reason}</span>`;
      if (activityLog.textContent === 'No nudges yet') activityLog.textContent = '';
      activityLog.prepend(row);
    }

    const savingsText = `Save £${nudge.savings.toFixed(2)}`;
    nudgeContainer.setAttribute('role', 'dialog');
    nudgeContainer.setAttribute('aria-label', `${nudge.title}. ${nudge.reason}. ${savingsText}`);
    nudgeContainer.innerHTML = `
      <div class="nudge-title">${nudge.title}</div>
      <div class="nudge-reason">${nudge.reason}</div>
      <div class="nudge-products">
        ${nudge.products.map((p: any) => `<span class="tag">${p.name}</span>`).join('')}
      </div>
      <div class="cta-row">
        <span class="badge-save">${savingsText}</span>
        <button id="addBtn" class="btn-primary">Add</button>
        <button id="dismissBtn" class="btn-secondary">Dismiss</button>
      </div>
    `;
    nudgeContainer.classList.add('open');
    const addBtn = document.getElementById('addBtn')!;
    const dismissBtn = document.getElementById('dismissBtn')!;
    addBtn.onclick = () => {
      for (const p of nudge.products) {
        const existing = session.basket.find(b => b.sku === p.sku);
        if (existing) existing.qty += 1; else session.basket.push({ sku: p.sku, qty: 1 });
      }
      renderBasket();
      nudgeContainer.classList.remove('open');
      nudgeContainer.innerHTML = '';
    };
    dismissBtn.onclick = () => {
      nudgeContainer.classList.remove('open');
      nudgeContainer.innerHTML = '';
    };
  }
}


