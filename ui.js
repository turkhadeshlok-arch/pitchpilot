(() => {
  const U = window.PitchPilotUtils;
  const toast = (message, type = "") => {
    const region = document.querySelector("#toastRegion");
    if (!region) return;
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.textContent = message;
    region.appendChild(el);
    setTimeout(() => el.remove(), 3600);
  };
  const loading = (show) =>
    document
      .querySelector("#loadingOverlay")
      ?.classList.toggle("hidden", !show);
  const metric = (label, value) =>
    `<div class="metric-card"><small>${label}</small><strong>${value}</strong><i><u style="width:${value}%"></u></i></div>`;
  function renderAnalysis(analysis, project) {
    return `<div class="analysis-top"><div><div class="eyebrow">Signal report / ${U.formatDate(project.updatedAt)}</div><h2>${U.esc(analysis.summary)}</h2><p>Here’s the honest read on <strong>${U.esc(project.idea.slice(0, 100))}</strong></p></div><div class="score-display"><div class="score-ring" style="--score:${analysis.overall}%"><strong>${analysis.overall}</strong><span>/ 100</span></div></div></div><div class="analysis-grid">${metric("Problem strength", analysis.problem)}${metric("Market potential", analysis.market)}${metric("Differentiation", analysis.differentiation)}${metric("Feasibility", analysis.feasibility)}</div><div class="insight-columns"><article class="insight-card"><h3>Biggest risks</h3><ul>${analysis.risks.map((x) => `<li>${U.esc(x)}</li>`).join("")}</ul></article><article class="insight-card"><h3>Weak assumptions</h3><ul>${analysis.assumptions.map((x) => `<li>${U.esc(x)}</li>`).join("")}</ul></article><article class="insight-card"><h3>Opportunity signals</h3><ul>${analysis.opportunities.map((x) => `<li>${U.esc(x)}</li>`).join("")}</ul></article><article class="insight-card brutal-card"><h3>Brutal feedback</h3><p>${U.esc(analysis.brutal)}</p></article><article class="insight-card next-steps"><h3>Recommended next steps</h3><ol>${analysis.nextSteps.map((x) => `<li>${U.esc(x)}</li>`).join("")}</ol></article></div><div class="analysis-footer"><p><span class="sparkle">✦</span> Next: strengthen the idea, then turn the signal into your pitch.</p><div><a class="button button-dark" href="#ideaForm">Improve idea</a> <a class="button button-primary" href="pitch.html?id=${project.id}">Generate pitch <span>→</span></a></div></div>`;
  }
  function renderHistory(items) {
    if (!items.length)
      return `<div class="empty-state"><div class="empty-icon">✦</div><h2>Your runway is clear.</h2><p>Challenge your first idea and your signal reports will live here.</p><a class="button button-primary" href="workspace.html">Start a challenge <span>→</span></a></div>`;
    return items
      .map(
        (p) =>
          `<article class="history-item"><div><div class="history-meta">${U.formatDate(p.updatedAt)} <span class="pill pill-orange">${p.analysis ? "ANALYZED" : "DRAFT"}</span></div><h3>${U.esc(p.idea.slice(0, 90))}${p.idea.length > 90 ? "…" : ""}</h3><p>${U.esc(p.customer)} · ${p.analysis ? `Conviction score ${p.analysis.overall}/100` : "Not challenged yet"}</p></div><div class="history-item-actions"><a class="button button-ghost" href="workspace.html?id=${p.id}">Open <span>→</span></a><button class="icon-button delete-project" data-id="${p.id}" aria-label="Delete project">×</button></div></article>`,
      )
      .join("");
  }
  window.PitchPilotUI = { toast, loading, renderAnalysis, renderHistory };
})();
