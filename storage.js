(() => {
  const DB_NAME = "pitchpilot_db";
  const DB_VERSION = 1;
  const STORE = "collections";
  const KEYS = {
    projects: "pitchpilot_projects",
    salesSessions: "pitchpilot_sales_sessions",
    salesVisits: "pitchpilot_sales_visits",
    settings: "pitchpilot_workspace_preferences",
  };

  const fallbackRead = (key, defaultValue) => {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "null");
      return value === null ? defaultValue : value;
    } catch {
      return defaultValue;
    }
  };
  const fallbackWrite = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* IDB remains primary. */ }
  };
  const cache = {
    projects: fallbackRead(KEYS.projects, []),
    salesSessions: fallbackRead(KEYS.salesSessions, []),
    salesVisits: fallbackRead(KEYS.salesVisits, []),
    settings: fallbackRead(KEYS.settings, {}),
  };

  let db = null;
  let usingIndexedDB = false;
  let resolveReady;
  const ready = new Promise((resolve) => { resolveReady = resolve; });

  function openDatabase() {
    if (!window.indexedDB) return Promise.reject(new Error("IndexedDB is unavailable."));
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: "key" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  function idbRead(key) {
    return new Promise((resolve, reject) => {
      const request = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
      request.onsuccess = () => resolve(request.result?.value);
      request.onerror = () => reject(request.error);
    });
  }
  function idbWrite(key, value) {
    return new Promise((resolve, reject) => {
      const request = db.transaction(STORE, "readwrite").objectStore(STORE).put({ key, value });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
  async function hydrate() {
    try {
      db = await openDatabase();
      usingIndexedDB = true;
      for (const [name, key] of Object.entries(KEYS)) {
        const stored = await idbRead(key);
        if (stored === undefined) await idbWrite(key, cache[name]);
        else { cache[name] = stored; fallbackWrite(key, stored); }
      }
    } catch { usingIndexedDB = false; }
    finally {
      resolveReady();
      window.dispatchEvent(new CustomEvent("pitchpilot-storage-ready", { detail: { usingIndexedDB } }));
    }
  }
  function persist(name) {
    fallbackWrite(KEYS[name], cache[name]);
    if (usingIndexedDB) idbWrite(KEYS[name], cache[name]).catch(() => {});
  }
  const sortByDate = (items, field = "updatedAt") => [...items].sort((a, b) => new Date(b[field]) - new Date(a[field]));

  window.PitchPilotStorage = {
    ready: () => ready,
    isUsingIndexedDB: () => usingIndexedDB,
    getProjects() { return sortByDate(cache.projects); },
    getProject(id) { return cache.projects.find((project) => project.id === id); },
    saveProject(project) { cache.projects.push(project); persist("projects"); return project; },
    updateProject(id, updates) {
      const index = cache.projects.findIndex((project) => project.id === id);
      if (index < 0) return null;
      cache.projects[index] = { ...cache.projects[index], ...updates, updatedAt: new Date().toISOString() };
      persist("projects");
      return cache.projects[index];
    },
    deleteProject(id) { cache.projects = cache.projects.filter((project) => project.id !== id); persist("projects"); },
    clearProjects() { cache.projects = []; persist("projects"); },
    saveSalesSession(session) { cache.salesSessions.unshift(session); persist("salesSessions"); return session; },
    getSalesSessions() { return sortByDate(cache.salesSessions, "createdAt"); },
    updateSalesSession(id, updates) {
      const index = cache.salesSessions.findIndex((item) => item.id === id);
      if (index < 0) return null;
      cache.salesSessions[index] = { ...cache.salesSessions[index], ...updates };
      persist("salesSessions");
      return cache.salesSessions[index];
    },
    saveSalesVisit(visit) { cache.salesVisits.unshift(visit); persist("salesVisits"); return visit; },
    getSalesVisits() { return sortByDate(cache.salesVisits, "updatedAt"); },
    updateSalesVisit(id, updates) {
      const index = cache.salesVisits.findIndex((visit) => visit.id === id);
      if (index < 0) return null;
      cache.salesVisits[index] = { ...cache.salesVisits[index], ...updates, updatedAt: new Date().toISOString() };
      persist("salesVisits");
      return cache.salesVisits[index];
    },
    deleteSalesVisit(id) { cache.salesVisits = cache.salesVisits.filter((visit) => visit.id !== id); persist("salesVisits"); },
    getSettings() { return { ...cache.settings }; },
    saveSettings(settings) { cache.settings = { ...cache.settings, ...settings }; persist("settings"); return { ...cache.settings }; },
  };
  hydrate();
})();
