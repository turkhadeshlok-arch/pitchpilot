(() => {
  const U = window.PitchPilotUtils;
  const S = window.PitchPilotStorage;
  const A = window.PitchPilotAI;
  const UI = window.PitchPilotUI;
  const esc = U.esc;
  let session = null;
  let rounds = [];
  let recognition = null;

  const situations = [
    "I’m not interested.",
    "It’s too expensive.",
    "I already use something else.",
    "Send me the details.",
    "I need to ask my husband or boss.",
    "Why should I trust you?",
  ];
  const personas = [
    { id: "busy", label: "Busy customer", description: "Short on time, interrupts, and only gives you a few seconds." },
    { id: "price", label: "Price-sensitive customer", description: "Worried about cost and wants a clear reason to spend." },
    { id: "switcher", label: "Existing-solution customer", description: "Already has a workaround and sees switching as risky." },
    { id: "skeptic", label: "Skeptical customer", description: "Questions your credibility and wants proof before engaging." },
    { id: "curious", label: "Curious customer", description: "Open-minded but expects you to ask good questions first." },
    { id: "angry", label: "Frustrated customer", description: "Impatient and direct because previous sales conversations wasted time." },
  ];
  const templates = {
    "real-estate": { product: "A residential property service that helps families find and compare homes.", customers: "First-time home buyers", channel: "phone", goal: "Book a property viewing", objections: "It is too expensive; I need to think about it", accountType: "Household" },
    saas: { product: "A workflow tool that helps small teams reduce repetitive admin work.", customers: "Small business owners and operations managers", channel: "phone", goal: "Book a product demo", objections: "We already use something; switching is difficult", accountType: "Business" },
    education: { product: "A practical learning program that helps students build job-ready skills.", customers: "Students and working professionals", channel: "online", goal: "Book an introductory session", objections: "It is too expensive; I need to ask my parents", accountType: "Household" },
    solar: { product: "A solar backup system that keeps essential equipment running during power cuts.", customers: "Small shop owners and neighborhood pharmacies", channel: "door-to-door", goal: "Book a ten-minute demo", objections: "Too expensive; I already use a generator", accountType: "Retail shop" },
    insurance: { product: "A simple protection plan that helps families handle unexpected medical costs.", customers: "Young families and salaried professionals", channel: "phone", goal: "Schedule a needs assessment", objections: "I already have insurance; send me the details", accountType: "Household" },
    local: { product: "A reliable local service that saves customers time on a recurring household task.", customers: "Busy households in the local area", channel: "door-to-door", goal: "Get a first appointment", objections: "I am not interested; I already have someone", accountType: "Household" },
  };

  const assetCard = (label, title, content) => `<article class="sales-asset"><span class="mono">${label}</span><h3>${title}</h3><button class="copy-button" data-copy="${esc(content)}">Copy</button><p>${esc(content)}</p></article>`;
  const listAsset = (label, title, items) => `<article class="sales-asset"><span class="mono">${label}</span><h3>${title}</h3><ul>${items.map((item) => `<li>${esc(Array.isArray(item) ? `${item[0]}: ${item[1]}` : item)}</li>`).join("")}</ul></article>`;

  function renderKit(kit) {
    return `<div class="kit-header"><div><div class="eyebrow">Your sales kit / Ready to practice</div><h2>Say it like<br /><em>you mean it.</em></h2></div><button class="button button-ghost" id="resetSales">Start over</button></div><div class="sales-asset-grid">${assetCard("01 / Opening line", "Earn the first ten seconds.", kit.opening)}${assetCard("02 / 30-second explanation", "Make the value easy to repeat.", kit.explanation)}${listAsset("03 / Customer types", "Make it personal.", kit.customerPitches)}${listAsset("04 / Discovery", "Ask before you answer.", kit.discoveryQuestions)}${listAsset("05 / Objection responses", "Stay in the conversation.", kit.objectionResponses)}${listAsset("06 / Closing lines", "Make the next step easy.", kit.closingLines)}${assetCard("07 / Door-to-door", "At the doorstep.", kit.doorToDoor)}${assetCard("08 / Phone", "On the call.", kit.phone)}${assetCard("09 / WhatsApp", "In the follow-up.", kit.whatsapp)}</div><div class="kit-actions"><button class="button button-primary" id="startRoleplay">Practice a conversation <span>→</span></button><button class="button button-ghost" id="openVisits">Start a field visit</button></div>`;
  }

  function scoreAverage(score) {
    const values = [score.clarity, score.confidence, score.relevance, score.listening, score.objectionHandling, score.closingStrength];
    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  }

  function scoreDashboard() {
    if (!rounds.length) return `<div class="score-dashboard score-dashboard-empty"><span class="mono">COACHING SCORE</span><p>Reply once to see your six-dimension scorecard.</p></div>`;
    const latest = rounds[rounds.length - 1].score;
    const average = scoreAverage(latest);
    const first = scoreAverage(rounds[0].score);
    const delta = average - first;
    const metric = (label, value) => `<div class="score-metric"><div><span>${label}</span><b>${value}</b></div><i><u style="width:${value}%"></u></i></div>`;
    return `<div class="score-dashboard"><div class="score-dashboard-top"><div><span class="mono">COACHING SCORE / ROUND ${rounds.length}</span><h3>${average}<small>/100</small></h3></div><div class="score-delta ${delta >= 0 ? "positive" : "negative"}">${delta >= 0 ? "+" : ""}${delta} vs first attempt</div></div><div class="score-metrics">${metric("Clarity", latest.clarity)}${metric("Confidence", latest.confidence)}${metric("Relevance", latest.relevance)}${metric("Listening", latest.listening)}${metric("Objection handling", latest.objectionHandling)}${metric("Closing strength", latest.closingStrength)}</div></div>`;
  }

  function renderNextResponse(score) {
    const replies = (score.suggestedReplies || []).filter(Boolean).slice(0, 3);
    if (!replies.length) return "";
    return `<div class="next-response-inner"><div><span class="mono">STUCK? TRY THIS NEXT</span><p>${esc(score.nextMove)}</p></div><div class="suggested-replies">${replies.map((reply) => `<button type="button" class="suggested-reply" data-suggestion="${esc(reply)}">${esc(reply)}</button>`).join("")}</div></div>`;
  }

  function renderReplay() {
    if (!rounds.length) return `<div class="replay-empty"><span class="mono">CONVERSATION REPLAY</span><p>Complete one round to review your language and missed opportunities.</p></div>`;
    return `<div class="replay-heading"><div><span class="mono">CONVERSATION REPLAY</span><h3>See where the conversation changed.</h3></div><button class="icon-button" type="button" id="closeReplay" aria-label="Close replay">×</button></div><div class="replay-list">${rounds.map((round, index) => { const question = /\?|how|what|why|which/i.test(round.reply); const label = question ? "Good discovery" : "Opportunity to listen"; return `<article class="replay-round"><div class="replay-round-top"><span class="mono">ROUND ${index + 1}</span><span class="replay-tag ${question ? "replay-good" : "replay-miss"}">${label}</span></div><div class="replay-line customer-line"><span>CUSTOMER</span><p>${esc(index === 0 ? situations[0] : rounds[index - 1].customer.customerReply)}</p></div><div class="replay-line salesperson-line"><span>YOU</span><p>${esc(round.reply)}</p></div><div class="replay-note"><strong>${esc(round.score.feedback)}</strong><small>Next: ${esc(round.score.nextMove)}</small></div></article>`; }).join("")}</div>`;
  }

  function renderPipeline(visits) {
    const statuses = ["New", "Interested", "Follow-up", "Won", "Lost"];
    return statuses.map((status) => `<section class="pipeline-column"><div class="pipeline-column-heading"><span>${status}</span><b>${visits.filter((visit) => visit.status === status).length}</b></div><div class="pipeline-cards">${visits.filter((visit) => visit.status === status).map((visit) => `<article class="pipeline-card"><strong>${esc(visit.name)}</strong><small>${esc(visit.location)}</small><p>${esc(visit.notes || "No notes yet")}</p></article>`).join("") || `<span class="pipeline-empty">No leads</span>`}</div></section>`).join("");
  }

  function renderRoleplay() {
    const persona = personas[0];
    return `<div class="roleplay-header"><div><div class="eyebrow">Roleplay mode / Customer simulator</div><h2>Practice until<br /><em>pressure feels normal.</em></h2><p>You type or speak. The customer reacts in character. Your score shows whether you are improving.</p></div><div class="roleplay-header-actions"><button class="button button-ghost" id="reviewReplay">Review replay</button><button class="button button-ghost" id="closeRoleplay">Back to sales kit</button></div></div><div class="roleplay-goal"><span class="mono">PRACTICE GOAL</span><strong>${esc(session.goal || "Move the conversation forward")}</strong></div><div class="roleplay-settings"><div><label for="customerPersona">Customer persona</label><select id="customerPersona">${personas.map((item) => `<option value="${item.id}">${item.label}</option>`).join("")}</select><small id="personaDescription">${persona.description}</small></div><div><label for="customerType">Customer type</label><input id="customerType" value="${esc(session.customers)}" /></div><div><label for="difficulty">Difficulty</label><select id="difficulty"><option value="easy">Warm-up</option><option value="realistic" selected>Realistic</option><option value="hard">Hard</option><option value="pressure">Pressure test</option></select></div><div><label for="situation">Start with</label><select id="situation">${situations.map((item) => `<option>${esc(item)}</option>`).join("")}</select></div></div><div id="scoreDashboardMount">${scoreDashboard()}</div><div class="roleplay-chat" id="roleplayChat"><div class="chat-bubble customer-bubble"><span class="mono">CUSTOMER</span><p id="customerMessage">${esc(situations[0])}</p></div></div><div class="coach-feedback hidden" id="coachFeedback"></div><div class="next-response-panel hidden" id="nextResponsePanel"></div><div class="replay-panel hidden" id="replayPanel"></div><form class="reply-form" id="replyForm"><textarea id="salesReply" rows="3" placeholder="Type what you would say..." required></textarea><div class="reply-actions"><button class="voice-button" type="button" id="voiceInput" title="Use voice input">🎙 Speak</button><button class="voice-button" type="button" id="speakCustomer" title="Read the latest customer message aloud">🔊 Listen</button><button class="button button-primary" type="submit">Reply <span>→</span></button></div></form>`;
  }

  function renderVisits() {
    const visits = S.getSalesVisits();
    const followUps = visits.filter((visit) => visit.status === "Follow-up").length;
    return `<div class="visit-header"><div><div class="eyebrow">Door-to-door / Visit tracker</div><h2>Keep the next<br /><em>door in sight.</em></h2><p>${followUps} follow-up${followUps === 1 ? "" : "s"} ready for action.</p></div><div class="visit-header-actions"><button class="button button-ghost" id="togglePipeline">Pipeline view</button><button class="button button-ghost" id="closeVisits">Back to kit</button></div></div><form class="visit-form" id="visitForm"><input name="name" placeholder="Person / business name" required /><input name="location" placeholder="Location or address" required /><input name="accountType" placeholder="Household or business type" /><select name="status"><option>New</option><option>Interested</option><option>Follow-up</option><option>Won</option><option>Lost</option></select><input name="revisit" placeholder="Best time to revisit" /><textarea name="notes" class="full" rows="2" placeholder="Quick notes after the visit"></textarea><button class="button button-primary" type="submit">Save visit <span>+</span></button></form><div class="pipeline-board hidden" id="pipelineBoard">${renderPipeline(visits)}</div><div class="visit-list">${visits.length ? visits.map((visit) => `<article class="visit-card"><div><div class="visit-card-top"><div><strong>${esc(visit.name)}</strong><span>${esc(visit.location)}</span></div><span class="status-chip status-${visit.status.toLowerCase().replace(/\s+/g, "-")}">${esc(visit.status)}</span></div><p>${esc(visit.accountType || "")} ${visit.accountType && visit.notes ? "·" : ""} ${esc(visit.notes || "No notes yet")}</p><small>Revisit: ${esc(visit.revisit || "Not scheduled")}</small></div></article>`).join("") : `<div class="empty-state"><div class="empty-icon">✦</div><h2>No visits yet.</h2><p>Capture the useful detail while it is still fresh.</p></div>`}</div>`;
  }

  function speak(text) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  }

  function startVoice() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) { UI.toast("Voice input is not supported in this browser.", "error"); return; }
    recognition = new Recognition();
    recognition.lang = "en-IN";
    recognition.interimResults = true;
    const button = document.querySelector("#voiceInput");
    button?.classList.add("listening");
    button?.replaceChildren(document.createTextNode("● Listening"));
    recognition.onresult = (event) => { document.querySelector("#salesReply").value = Array.from(event.results).map((result) => result[0].transcript).join(""); };
    recognition.onerror = () => UI.toast("Voice input stopped. Try again.", "error");
    recognition.onend = () => { button?.classList.remove("listening"); if (button) button.textContent = "🎙 Speak"; };
    recognition.start();
  }

  function demoCustomer(data) {
    const text = (data.reply || "").toLowerCase();
    if (text.includes("how") || text.includes("what") || text.includes("question")) return { customerReply: "I am busy right now. What exactly would change for me if I gave you ten minutes?", mood: "busy", coachingHint: "Good discovery instinct. Keep the question focused on the customer's current situation.", shouldContinue: true };
    if (text.includes("price") || text.includes("cost")) return { customerReply: "The price is still my concern. I would need to see why this is worth changing my current setup.", mood: "price-sensitive", coachingHint: "Acknowledge the cost concern before defending the price.", shouldContinue: true };
    return { customerReply: "I already have a way of handling this, so I am not convinced I need to switch.", mood: "skeptical", coachingHint: "Ask what is working and what is not before positioning the product.", shouldContinue: true };
  }

  function demoScore(reply, round = 1) {
    const hasQuestion = /\?|how|what|why|which/i.test(reply);
    const improvement = Math.min(14, Math.max(0, round - 1) * 6);
    return { clarity: Math.min(100, 72 + improvement), confidence: Math.min(100, 70 + improvement), relevance: Math.min(100, (hasQuestion ? 78 : 58) + improvement), listening: Math.min(100, (hasQuestion ? 76 : 45) + improvement), objectionHandling: Math.min(100, (hasQuestion ? 68 : 50) + improvement), closingStrength: Math.min(100, 48 + improvement), feedback: round > 1 ? "Clear improvement. You acknowledged the concern and moved toward a specific next step." : hasQuestion ? "Good response. You made space for the customer instead of rushing into a pitch." : "You answered too early. Acknowledge the concern, then ask one discovery question first.", nextMove: round > 1 ? "Keep the close specific, then confirm the customer's preferred next step." : "Ask what makes the customer hesitant before offering more detail.", suggestedReplies: ["I understand. What matters most to you before you decide?", "Compared with what you use today, what feels hardest to justify?", "Would it help to look at one small next step together?"] };
  }

  function bindRoleplay() {
    document.querySelector("#closeRoleplay")?.addEventListener("click", () => { document.querySelector("#roleplayShell").classList.add("hidden"); document.querySelector("#salesKit").classList.remove("hidden"); });
    document.querySelector("#customerPersona")?.addEventListener("change", (event) => { const persona = personas.find((item) => item.id === event.target.value) || personas[0]; document.querySelector("#personaDescription").textContent = persona.description; });
    document.querySelector("#reviewReplay")?.addEventListener("click", () => { const panel = document.querySelector("#replayPanel"); panel.innerHTML = renderReplay(); panel.classList.remove("hidden"); document.querySelector("#closeReplay")?.addEventListener("click", () => panel.classList.add("hidden")); });
    document.querySelector("#situation")?.addEventListener("change", (event) => { document.querySelector("#customerMessage").textContent = event.target.value; speak(event.target.value); });
    document.querySelector("#voiceInput")?.addEventListener("click", startVoice);
    document.querySelector("#speakCustomer")?.addEventListener("click", () => speak(document.querySelector("#customerMessage")?.textContent || ""));
    document.querySelector("#replyForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const reply = document.querySelector("#salesReply").value.trim();
      if (!reply) return;
      const customerSaid = document.querySelector("#customerMessage").textContent;
      const persona = personas.find((item) => item.id === document.querySelector("#customerPersona").value) || personas[0];
      const chat = document.querySelector("#roleplayChat");
      chat.insertAdjacentHTML("beforeend", `<div class="chat-bubble salesperson-bubble"><span class="mono">YOU</span><p>${esc(reply)}</p></div>`);
      document.querySelector("#salesReply").value = "";
      UI.loading(true);
      try {
        let customer;
        let score;
        if (session.demo) {
          customer = demoCustomer({ reply });
          score = demoScore(reply, rounds.length + 1);
        } else {
          const difficulty = document.querySelector("#difficulty").value;
          const history = rounds.map((round) => `Customer: ${round.customer.customerReply}\nSalesperson: ${round.reply}`).join("\n");
          [customer, score] = await Promise.all([A.roleplaySales({ ...session, customerType: document.querySelector("#customerType").value, persona: persona.description, difficulty, history, situation: customerSaid, reply }), A.scoreSalesResponse({ ...session, customerSaid, reply, difficulty, goal: session.goal })]);
        }
        rounds.push({ reply, customer, score, createdAt: new Date().toISOString() });
        const difficultySelect = document.querySelector("#difficulty");
        if (difficultySelect && rounds.length === 2 && difficultySelect.value === "realistic") difficultySelect.value = "hard";
        session.rounds = rounds;
        session.latestScore = scoreAverage(score);
        S.updateSalesSession?.(session.id, { rounds: session.rounds, latestScore: session.latestScore });
        chat.insertAdjacentHTML("beforeend", `<div class="chat-bubble customer-bubble"><span class="mono">CUSTOMER · ${esc(persona.label)}</span><p>${esc(customer.customerReply)}</p></div>`);
        const feedback = document.querySelector("#coachFeedback");
        feedback.innerHTML = `<strong>${esc(score.feedback)}</strong><span>Next move: ${esc(score.nextMove)}</span><small>Round ${rounds.length} · ${esc(customer.coachingHint || "Stay curious and specific.")}</small>`;
        feedback.classList.remove("hidden");
        feedback.classList.add("visible");
        const nextPanel = document.querySelector("#nextResponsePanel");
        nextPanel.innerHTML = renderNextResponse(score);
        nextPanel.classList.remove("hidden");
        nextPanel.querySelectorAll("[data-suggestion]").forEach((suggestion) => suggestion.addEventListener("click", () => { document.querySelector("#salesReply").value = suggestion.dataset.suggestion; document.querySelector("#salesReply").focus(); }));
        document.querySelector("#scoreDashboardMount").innerHTML = scoreDashboard();
        speak(customer.customerReply);
      } catch (error) { UI.toast(error.message || "Roleplay failed.", "error"); }
      finally { UI.loading(false); }
    });
  }

  function bindVisits() {
    document.querySelector("#closeVisits")?.addEventListener("click", () => { document.querySelector("#visitShell").classList.add("hidden"); document.querySelector("#salesKit").classList.remove("hidden"); });
    document.querySelector("#togglePipeline")?.addEventListener("click", () => { document.querySelector("#pipelineBoard").classList.toggle("hidden"); document.querySelector("#togglePipeline").textContent = document.querySelector("#pipelineBoard").classList.contains("hidden") ? "Pipeline view" : "List view"; });
    document.querySelector("#visitForm")?.addEventListener("submit", (event) => { event.preventDefault(); const visit = Object.fromEntries(new FormData(event.currentTarget)); const now = new Date().toISOString(); S.saveSalesVisit({ ...visit, id: U.id(), createdAt: now, updatedAt: now }); document.querySelector("#visitShell").innerHTML = renderVisits(); bindVisits(); UI.toast("Visit saved."); });
  }

  function demoKit(data) {
    return { opening: "Hi — can I ask one quick question about how you handle this today?", explanation: "We help this customer handle the problem with a simpler, more repeatable process.", customerPitches: [[data.customers, "Start with the customer's current workaround, then connect the product to one practical outcome."]], discoveryQuestions: ["How are you handling this today?", "What is hardest about that process?", "What would make changing worthwhile?"], objectionResponses: [["It is too expensive.", "That makes sense. What part would you need to understand before deciding?"], ["I am not interested.", "Understood. Is the problem not urgent, or do you already have another way to solve it?"]], closingLines: ["Would a ten-minute demonstration be useful?", "Should we schedule a short follow-up?"], doorToDoor: "Hi — I am in the area helping local businesses with this problem. Could I ask one quick question?", phone: "Hi — is now a bad time for one quick question about how you handle this today?", whatsapp: "Hi — I thought this might be relevant. Would you like a short explanation?" };
  }

  async function build(data, options = {}) {
    UI.loading(true);
    try {
      session = { ...data, id: U.id(), createdAt: new Date().toISOString(), demo: Boolean(options.demo) };
      let kit;
      if (options.demo) {
        kit = demoKit(data);
      } else {
        try { kit = await A.generateSalesCoach(data); } catch (error) { throw error; }
      }
      session.kit = kit;
      S.saveSalesSession(session);
      document.querySelector("#salesOnboarding").classList.add("hidden");
      const kitEl = document.querySelector("#salesKit");
      kitEl.innerHTML = renderKit(kit);
      kitEl.classList.remove("hidden");
      bindCopy();
      document.querySelector("#resetSales").addEventListener("click", () => location.reload());
      document.querySelector("#startRoleplay").addEventListener("click", () => { rounds = []; kitEl.classList.add("hidden"); const roleplay = document.querySelector("#roleplayShell"); roleplay.innerHTML = renderRoleplay(); roleplay.classList.remove("hidden"); bindRoleplay(); });
      document.querySelector("#openVisits").addEventListener("click", () => { kitEl.classList.add("hidden"); const visits = document.querySelector("#visitShell"); visits.innerHTML = renderVisits(); visits.classList.remove("hidden"); bindVisits(); });
    } catch (error) { UI.toast(error.message || "Sales kit generation failed.", "error"); }
    finally { UI.loading(false); }
  }

  function bindCopy() { document.querySelectorAll("[data-copy]").forEach((button) => button.addEventListener("click", () => U.copy(button.dataset.copy).then(() => UI.toast("Copied to clipboard.")))); }
  const form = document.querySelector("#salesForm");
  document.querySelector("#industryTemplate")?.addEventListener("change", (event) => {
    const template = templates[event.target.value];
    if (!template) return;
    Object.entries(template).forEach(([key, value]) => { if (form?.elements[key]) form.elements[key].value = value; });
    UI.toast(`${event.target.options[event.target.selectedIndex].text} template loaded.`);
  });
  form?.addEventListener("submit", (event) => { if (new URLSearchParams(location.search).get("demo") === "1") return; event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget)); if (!data.product.trim() || !data.customers.trim() || !data.goal.trim()) { UI.toast("Add the product, customer, and conversation goal first.", "error"); return; } build(data); });

  const demoData = { product: "A solar backup system for small shops that keeps essential equipment running during power cuts.", price: "₹35,000 installed", customers: "Small shop owners", channel: "door-to-door", objections: "Too expensive; already use a generator", goal: "Book a ten-minute demo", location: "Koramangala, weekday afternoon", accountType: "Retail shop" };
  if (new URLSearchParams(location.search).get("demo") === "1" && form) {
    Object.entries(demoData).forEach(([key, value]) => { if (form.elements[key]) form.elements[key].value = value; });
    const submit = form.querySelector('button[type="submit"]');
    submit.innerHTML = "Start the 2-minute demo <span>→</span>";
    form.addEventListener("submit", (event) => { event.preventDefault(); build(demoData, { demo: true }); }, { once: true });
  }
})();
