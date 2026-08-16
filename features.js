(() => {
  const U = window.PitchPilotUtils;
  const esc = U.esc;
  const clamp = (n) => Math.max(1, Math.min(100, Math.round(n)));

  function scorePitch(project) {
    const p = project.pitch || {};
    const analysis = project.analysis || {};
    const idea = project.idea || "";
    const customer = project.customer || "";
    const problem = project.problem || "";
    const hasEvidence = /interview|pilot|user|customer|revenue|traction|survey|tested|paid/i.test(project.context || "");
    const scores = [
      { label: "Problem clarity", score: clamp(55 + Math.min(problem.length, 140) / 3 + (analysis.problem || 0) / 5), reason: problem ? `The problem is stated as: “${problem.slice(0, 105)}${problem.length > 105 ? "…" : ""}”` : "Name the painful situation in one sentence." },
      { label: "Customer specificity", score: clamp(52 + Math.min(customer.length, 90) / 2 + (customer.split(" ").length > 2 ? 10 : 0)), reason: customer ? `The pitch names ${customer}, giving the story a clear first audience.` : "Choose a specific first customer, not a broad market." },
      { label: "Differentiation", score: clamp(48 + Math.min((p.differentiator || "").length, 120) / 2 + (analysis.differentiation || 0) / 4), reason: p.differentiator ? `The sharpest edge is: “${p.differentiator.slice(0, 115)}${p.differentiator.length > 115 ? "…" : ""}”` : "State what the product does differently in practice." },
      { label: "Feasibility", score: clamp(52 + (analysis.feasibility || 50) / 2), reason: "This score reflects the advisor’s feasibility assessment and the scope implied by the idea." },
      { label: "Business model", score: clamp(42 + Math.min((project.businessModel || p.businessModel || "").length, 120) / 2 + (project.businessModel ? 12 : 0)), reason: project.businessModel ? `The proposed model is: “${project.businessModel.slice(0, 115)}${project.businessModel.length > 115 ? "…" : ""}”` : "Add a concrete first way to get paid." },
      { label: "Evidence", score: clamp(hasEvidence ? 74 : 35 + (analysis.overall || 50) / 5), reason: hasEvidence ? "Your context includes evidence language; make the proof measurable in the pitch." : "No traction or validation evidence was supplied yet. The next proof point is still a hypothesis." },
    ];
    const overall = clamp(scores.reduce((sum, item) => sum + item.score, 0) / scores.length);
    return { overall, scores, verdict: overall >= 75 ? "Strong enough to earn the next conversation." : overall >= 60 ? "Promising, but one proof point could change the room." : "Interesting direction; validate the wedge before scaling the story.", idea };
  }

  function scoreMarkup(result) {
    return `<section class="judge-panel" id="judgePanel"><div class="judge-heading"><div><span class="eyebrow">Judge mode / transparent rubric</span><h2>Would this survive<br><em>the room?</em></h2></div><div class="judge-total"><strong>${result.overall}</strong><span>/ 100</span></div></div><p class="judge-verdict">${esc(result.verdict)}</p><div class="judge-score-list">${result.scores.map((item) => `<div class="judge-score"><div class="judge-score-top"><strong>${esc(item.label)}</strong><b>${item.score}</b></div><div class="judge-bar"><i style="width:${item.score}%"></i></div><p>${esc(item.reason)}</p></div>`).join("")}</div></section>`;
  }

  function notesMarkup(project) {
    const p = project.pitch || {};
    const structure = (p.structure || []).map((item, index) => `<li><strong>${esc(item[0] || `Section ${index + 1}`)}</strong><span>${esc(item[1] || "Make this point concrete with one example.")}</span></li>`).join("");
    return `<section class="presentation-panel" id="presentationPanel"><div class="presentation-heading"><span class="eyebrow">Presentation mode / speaker notes</span><h2>Your room-ready<br><em>run of show.</em></h2><p>Use these notes to sound natural. Do not read the screen—make eye contact and tell the story.</p></div><div class="speaker-notes"><article><span class="mono">OPENING</span><h3>Earn attention with the tension.</h3><p>${esc(p.elevator || project.idea)}</p></article><article><span class="mono">3-MINUTE ARC</span><ol>${structure}</ol></article><article><span class="mono">DEMO SCRIPT</span><h3>Show the smallest magical outcome.</h3><p>${esc(p.demo || "Show the user action, then point to the measurable outcome.")}</p></article><article><span class="mono">CLOSE</span><h3>Make the ask specific.</h3><p>Ask for the next proof point: the customer, pilot, introduction, or decision that would turn this hypothesis into evidence.</p></article></div></section>`;
  }

  function enhance(project, target) {
    const result = scorePitch(project);
    target.insertAdjacentHTML("beforeend", `<div class="pitch-toolbar"><button class="button button-dark" id="judgeToggle">Judge mode</button><button class="button button-ghost" id="presentationToggle">Presentation mode</button><button class="button button-primary" id="pdfExport">Download pitch as PDF</button></div>${scoreMarkup(result)}${notesMarkup(project)}`);
    const judge = target.querySelector("#judgePanel");
    const presentation = target.querySelector("#presentationPanel");
    target.querySelector("#judgeToggle").addEventListener("click", () => {
      judge.classList.toggle("visible");
      target.querySelector("#judgeToggle").textContent = judge.classList.contains("visible") ? "Hide judge mode" : "Judge mode";
      if (judge.classList.contains("visible")) judge.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    target.querySelector("#presentationToggle").addEventListener("click", () => {
      presentation.classList.toggle("visible");
      document.body.classList.toggle("presentation-active", presentation.classList.contains("visible"));
      target.querySelector("#presentationToggle").textContent = presentation.classList.contains("visible") ? "Exit presentation mode" : "Presentation mode";
      if (presentation.classList.contains("visible")) presentation.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    target.querySelector("#pdfExport").addEventListener("click", () => window.print());
  }

  window.PitchPilotFeatures = { enhance };
})();
