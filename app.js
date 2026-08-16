(() => {
  const U = window.PitchPilotUtils,
    S = window.PitchPilotStorage,
    A = window.PitchPilotAI,
    UI = window.PitchPilotUI;
  const page = location.pathname.split("/").pop() || "index.html";
  const modeBadge = document.querySelector(".mode-badge");
  if (modeBadge)
    modeBadge.innerHTML = `<i></i> ${A.getMode() === "live" ? "Live intelligence" : "Development mock"}`;
  function showWorkspaceEditor() {
    document.querySelector("#workspaceDashboard")?.classList.add("hidden");
    document.querySelector("#workspaceEditor")?.classList.remove("hidden");
  }
  function projectCard(project) {
    const title = project.idea || "Untitled project";
    return `<article class="dashboard-card project-dashboard-card"><div class="dashboard-card-top"><span class="pill pill-orange">${project.analysis ? "ANALYZED" : "DRAFT"}</span><span class="mono">${U.formatDate(project.updatedAt)}</span></div><h3>${U.esc(title.slice(0, 72))}${title.length > 72 ? "…" : ""}</h3><p>${U.esc(project.customer || "Customer not defined")}</p><a class="text-link" href="workspace.html?id=${encodeURIComponent(project.id)}">Open project <span>→</span></a></article>`;
  }
  function practiceCard(session) {
    const title = session.product || "Sales practice";
    return `<article class="dashboard-card practice-dashboard-card"><div class="dashboard-card-top"><span class="pill pill-green">PRACTICE</span><span class="mono">${U.formatDate(session.createdAt)}</span></div><h3>${U.esc(title.slice(0, 72))}${title.length > 72 ? "…" : ""}</h3><p>${U.esc(session.customers || "Customer not defined")} · ${U.esc(session.channel || "Conversation")}${session.latestScore ? ` · Score ${session.latestScore}` : ""}</p><a class="text-link" href="sales.html">Practice again <span>→</span></a></article>`;
  }
  function renderWorkspaceDashboard() {
    const projects = S.getProjects();
    const sessions = S.getSalesSessions ? S.getSalesSessions() : [];
    const projectRail = document.querySelector("#projectHistoryRail");
    const practiceRail = document.querySelector("#practiceHistoryRail");
    if (!projectRail || !practiceRail) return;
    projectRail.innerHTML = projects.length ? projects.map(projectCard).join("") : `<div class="dashboard-empty"><span>✦</span><p>Your founder projects will appear here.</p></div>`;
    practiceRail.innerHTML = sessions.length ? sessions.map(practiceCard).join("") : `<div class="dashboard-empty"><span>◌</span><p>Your sales practice sessions will appear here.</p><a class="text-link" href="sales.html">Start practicing <span>→</span></a></div>`;
    const count = document.querySelector("#projectCount");
    if (count) count.textContent = `${projects.length} project${projects.length === 1 ? "" : "s"}`;
  }
  function bindWorkspaceDashboard() {
    const picker = document.querySelector("#modePicker");
    document.querySelector("#newProjectButton")?.addEventListener("click", () => picker?.classList.remove("hidden"));
    document.querySelector("#closeModePicker")?.addEventListener("click", () => picker?.classList.add("hidden"));
    picker?.addEventListener("click", (event) => {
      if (event.target === picker) picker.classList.add("hidden");
    });
  }
  document.querySelector(".menu-toggle")?.addEventListener("click", (e) => {
    e.currentTarget.classList.toggle("open");
    e.currentTarget.setAttribute(
      "aria-expanded",
      e.currentTarget.classList.contains("open"),
    );
    document
      .querySelector(".main-nav,.app-nav,.header-actions")
      ?.classList.toggle("mobile-open");
  });
  document.querySelector("#ideaForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.currentTarget,
      button = form.querySelector('button[type="submit"]');
    const data = Object.fromEntries(new FormData(form));
    const missing = U.validateIdea(data);
    if (missing.length) {
      UI.toast(`Add ${missing.join(", ")} first.`, "error");
      return;
    }
    const id = new URLSearchParams(location.search).get("id");
    const existing = id && S.getProject(id);
    let project;
    try {
      project = existing
        ? S.updateProject(id, { ...data, analysis: null, pitch: null })
        : S.saveProject({
            id: U.id(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            ...data,
            analysis: null,
            pitch: null,
          });
    } catch (error) {
      UI.toast(error.message || "Project could not be saved.", "error");
      return;
    }
    button.disabled = true;
    UI.loading(true);
    try {
      const analysis = await A.analyzeIdea(data);
      const saved = S.updateProject(project.id, { analysis });
      renderWorkspace(saved);
      UI.toast("Your signal report is ready.");
    } catch (err) {
      UI.toast(err.message || "Analysis failed.", "error");
    } finally {
      button.disabled = false;
      UI.loading(false);
    }
  });
  function renderWorkspace(project) {
    if (!project) return;
    const form = document.querySelector("#ideaForm");
    if (!form) return;
    Object.entries(project).forEach(([key, value]) => {
      if (form.elements[key]) form.elements[key].value = value || "";
    });
    const ideaCount = document.querySelector("#ideaCount");
    if (ideaCount)
      ideaCount.textContent = `${(project.idea || "").length} / 600`;
    document.querySelector("#workspaceStatus").textContent = project.analysis
      ? "Analysis ready"
      : "Draft loaded";
    if (project.analysis) {
      const panel = document.querySelector("#analysisPanel");
      panel.innerHTML = UI.renderAnalysis(project.analysis, project);
      panel.classList.remove("hidden");
      panel
        .querySelector('a[href="#ideaForm"]')
        ?.addEventListener("click", (event) => {
          event.preventDefault();
          document
            .querySelector("#ideaForm")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
          window.setTimeout(() => document.querySelector("#idea")?.focus(), 250);
        });
    }
  }
  if (page === "workspace.html") {
    const id = new URLSearchParams(location.search).get("id");
    const newMode = new URLSearchParams(location.search).get("new");
    if (id || newMode === "founder") {
      showWorkspaceEditor();
      if (id) renderWorkspace(S.getProject(id));
    } else {
      renderWorkspaceDashboard();
      bindWorkspaceDashboard();
    }
    document
      .querySelector("#idea")
      ?.addEventListener(
        "input",
        (e) =>
          (document.querySelector("#ideaCount").textContent =
            `${e.target.value.length} / 600`),
      );
    S.ready?.().then(() => {
      if (!id && !newMode) renderWorkspaceDashboard();
      if (id) renderWorkspace(S.getProject(id));
    });
  }
  if (page === "history.html") {
    const render = () => {
      document.querySelector("#historyList").innerHTML = UI.renderHistory(
        S.getProjects(),
      );
      document.querySelectorAll(".delete-project").forEach((btn) =>
        btn.addEventListener("click", () => {
          if (confirm("Delete this project?")) {
            S.deleteProject(btn.dataset.id);
            render();
            UI.toast("Project deleted.");
          }
        }),
      );
    };
    render();
  }
  if (page === "pitch.html") {
    const id = new URLSearchParams(location.search).get("id"),
      project = S.getProject(id),
      target = document.querySelector("#pitchContent");
    if (!project)
      target.innerHTML =
        '<div class="empty-state"><h2>Pitch not found.</h2><a class="button button-primary" href="workspace.html">Back to workspace</a></div>';
    else
      (async () => {
        try {
          if (!project.pitch) {
            UI.loading(true);
            project.pitch = await A.generatePitch(
              project,
              project.analysis || {},
            );
            S.updateProject(id, { pitch: project.pitch });
          }
          target.innerHTML = renderPitch(project);
          window.PitchPilotFeatures?.enhance(project, target);
        } catch (error) {
          target.innerHTML = `<div class="empty-state"><div class="empty-icon">!</div><h2>Pitch generation paused.</h2><p>${U.esc(error.message || "The AI service is unavailable right now.")}</p><a class="button button-primary" href="workspace.html?id=${project.id}">Back to workspace</a></div>`;
          UI.toast(error.message || "Pitch generation failed.", "error");
        } finally {
          UI.loading(false);
        }
      })();
  }
  function renderPitch(project) {
    const p = project.pitch;
    const block = (label, title, content, wide = "") =>
      `<article class="pitch-card ${wide}"><span class="mono">${label}</span><h2>${title}</h2><button class="copy-button" data-copy="${U.esc(content)}">Copy</button><p>${U.esc(content)}</p></article>`;
    setTimeout(
      () =>
        document
          .querySelectorAll("[data-copy]")
          .forEach((b) =>
            b.addEventListener("click", () =>
              U.copy(b.dataset.copy).then(() =>
                UI.toast("Copied to clipboard."),
              ),
            ),
          ),
      0,
    );
    return `<section class="pitch-hero"><div class="eyebrow">Pitch lab / ${U.formatDate(project.updatedAt)}</div><h1>Make the room<br><em>lean in.</em></h1><p>Your pitch is built around the signal you earned — not the story you wish were true.</p></section><div class="pitch-grid">${block("01 / Elevator pitch", "The one-liner", p.elevator, "pitch-card-wide")}${block("02 / Value proposition", "Why it matters", p.value)}${block("03 / Business model", "How it works", p.businessModel)}${block("04 / Differentiator", "Your sharpest edge", p.differentiator)}<article class="pitch-card pitch-card-wide"><span class="mono">05 / 3-minute structure</span><h2>Keep the arc tight.</h2><div class="pitch-structure">${p.structure.map((x) => `<div><strong>${U.esc(x[0])}</strong><span>${U.esc(x[1])}</span></div>`).join("")}</div></article>${block("06 / Demo script", "Show, don’t tell", p.demo, "pitch-card-wide")}</div>`;
  }
  window.PitchPilotApp = { renderWorkspace };
})();
