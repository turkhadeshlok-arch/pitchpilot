window.PitchPilotUtils = {
  id() {
    return `pp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  },
  esc(value = "") {
    return String(value).replace(
      /[&<>'"]/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          "'": "&#39;",
          '"': "&quot;",
        })[c],
    );
  },
  formatDate(value) {
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(value));
  },
  validateIdea(data) {
    const missing = [];
    if (!data.idea.trim()) missing.push("what you are building");
    if (!data.customer.trim()) missing.push("who it is for");
    if (!data.problem.trim()) missing.push("the problem it solves");
    return missing;
  },
  copy(text) {
    if (navigator.clipboard) return navigator.clipboard.writeText(text);
    const el = document.createElement("textarea");
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    el.remove();
    return Promise.resolve();
  },
};
