(() => {
  const page = location.pathname.split("/").pop() || "index.html";
  if (page !== "workspace.html") return;

  const storage = window.PitchPilotStorage;
  const defaults = {
    theme: "light",
    accent: "orange",
    textColor: "ink",
    fontSize: "medium",
    compact: false,
  };

  let preferences = { ...defaults };
  preferences = { ...defaults, ...(storage?.getSettings?.() || {}) };

  const root = document.documentElement;
  const panel = document.querySelector("#settingsPanel");
  const scrim = document.querySelector("#settingsScrim");
  const button = document.querySelector("#settingsButton");
  if (!panel || !button) return;

  function save() {
    storage?.saveSettings?.(preferences);
  }

  function apply() {
    root.dataset.theme = preferences.theme;
    root.dataset.accent = preferences.accent;
    root.dataset.textColor = preferences.textColor;
    root.dataset.fontSize = preferences.fontSize;
    root.dataset.compact = preferences.compact ? "true" : "false";
    const font = document.querySelector("#fontSizeSetting");
    const text = document.querySelector("#textColorSetting");
    const compact = document.querySelector("#compactSetting");
    if (font) font.value = preferences.fontSize;
    if (text) text.value = preferences.textColor;
    if (compact) compact.checked = preferences.compact;
    document.querySelectorAll("[data-theme-choice]").forEach((item) => {
      item.classList.toggle("selected", item.dataset.themeChoice === preferences.theme);
    });
    document.querySelectorAll("[data-accent-choice]").forEach((item) => {
      item.classList.toggle("selected", item.dataset.accentChoice === preferences.accent);
    });
  }

  function toggle(open) {
    panel.classList.toggle("open", open);
    scrim?.classList.toggle("visible", open);
    panel.setAttribute("aria-hidden", String(!open));
    button.setAttribute("aria-expanded", String(open));
  }

  button.addEventListener("click", () => toggle(!panel.classList.contains("open")));
  document.querySelector("#closeSettings")?.addEventListener("click", () => toggle(false));
  scrim?.addEventListener("click", () => toggle(false));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") toggle(false);
  });
  document.querySelector("#fontSizeSetting")?.addEventListener("change", (event) => {
    preferences.fontSize = event.target.value;
    apply();
    save();
  });
  document.querySelector("#textColorSetting")?.addEventListener("change", (event) => {
    preferences.textColor = event.target.value;
    apply();
    save();
  });
  document.querySelectorAll("[data-theme-choice]").forEach((item) => item.addEventListener("click", () => {
    preferences.theme = item.dataset.themeChoice;
    apply();
    save();
  }));
  document.querySelectorAll("[data-accent-choice]").forEach((item) => item.addEventListener("click", () => {
    preferences.accent = item.dataset.accentChoice;
    apply();
    save();
  }));
  document.querySelector("#compactSetting")?.addEventListener("change", (event) => {
    preferences.compact = event.target.checked;
    apply();
    save();
  });
  document.querySelector("#resetSettings")?.addEventListener("click", () => {
    preferences = { ...defaults };
    apply();
    save();
  });

  apply();
  window.addEventListener("pitchpilot-storage-ready", () => {
    preferences = { ...defaults, ...(storage?.getSettings?.() || {}) };
    apply();
  });
})();
