(() => {
  const body = document.body;
  body.classList.add("motion-ready");
  const selectors = [
    ".site-header", ".app-header", ".hero-copy", ".hero-visual", ".trust-strip",
    ".section-heading", ".mode-card", ".dashboard-hero", ".dashboard-section",
    ".dashboard-card", ".workspace-form-panel", ".sales-onboarding", ".sales-asset",
    ".roleplay-header", ".roleplay-settings", ".roleplay-chat", ".visit-card",
    ".pitch-card", ".insight-card", ".analysis-top", ".judge-panel", ".presentation-panel",
  ];
  const targets = document.querySelectorAll(selectors.join(","));
  targets.forEach((element, index) => {
    element.classList.add("motion-reveal");
    element.style.setProperty("--motion-delay", `${Math.min(index % 8, 7) * 55}ms`);
  });
  if (!("IntersectionObserver" in window)) {
    targets.forEach((element) => element.classList.add("is-visible"));
  } else {
    const observer = new IntersectionObserver((entries, instance) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        instance.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -30px" });
    targets.forEach((element) => observer.observe(element));
  }
  document.addEventListener("click", (event) => {
    const button = event.target.closest("button, .button, .mode-card, .mode-picker-option");
    if (!button) return;
    button.classList.remove("motion-pressed");
    requestAnimationFrame(() => button.classList.add("motion-pressed"));
    window.setTimeout(() => button.classList.remove("motion-pressed"), 260);
  });
})();
