// Central data store. Everything in the app reads from Store.state and
// writes through Store.* methods. Every write re-renders automatically
// and persists (localStorage always, plus the remote Sheet backend if
// APPS_SCRIPT_URL is configured in config.js).

const Store = (() => {
  const LOCAL_KEY = "itcroatia2026_trip_state_v2";
  let state = null;
  let listeners = [];
  let remoteEnabled = typeof APPS_SCRIPT_URL === "string" && APPS_SCRIPT_URL.length > 0;
  let syncStatus = remoteEnabled ? "connecting" : "local-only";

  function uid(prefix) {
    return prefix + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function loadLocal() {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { console.warn("local load failed", e); }
    return null;
  }

  function saveLocal() {
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(state)); }
    catch (e) { console.warn("local save failed", e); }
  }

  async function loadRemote() {
    try {
      const res = await fetch(APPS_SCRIPT_URL + "?action=getAll", { method: "GET" });
      if (!res.ok) throw new Error("bad response " + res.status);
      const remote = await res.json();
      syncStatus = "synced";
      return remote;
    } catch (e) {
      console.warn("remote load failed, falling back to local", e);
      syncStatus = "offline";
      return null;
    }
  }

  async function pushRemote() {
    if (!remoteEnabled) return;
    try {
      await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ action: "saveAll", data: state })
      });
      syncStatus = "synced";
    } catch (e) {
      console.warn("remote push failed", e);
      syncStatus = "offline";
    }
    notify();
  }

  function notify() {
    listeners.forEach((fn) => fn(state, syncStatus));
  }

  function backfillFromSeed() {
    // Defensive: if a schema addition (new collection) lands after someone
    // already has a saved local state, make sure it does not silently
    // disappear. Existing collections are left untouched.
    Object.keys(SEED_DATA).forEach((key) => {
      if (state[key] === undefined) state[key] = JSON.parse(JSON.stringify(SEED_DATA[key]));
    });
  }

  async function init() {
    const local = loadLocal();
    state = local || JSON.parse(JSON.stringify(SEED_DATA));
    backfillFromSeed();
    notify();
    if (remoteEnabled) {
      const remote = await loadRemote();
      if (remote) { state = remote; backfillFromSeed(); saveLocal(); notify(); }
    }
  }

  function persist() {
    saveLocal();
    notify();
    if (remoteEnabled) pushRemote();
  }

  function subscribe(fn) { listeners.push(fn); }

  function getState() { return state; }
  function getSyncStatus() { return syncStatus; }

  // ---- generic CRUD helpers over a named collection ----
  function add(collection, item, prefix) {
    item.id = item.id || uid(prefix);
    state[collection].push(item);
    persist();
    return item;
  }
  function update(collection, id, patch) {
    const idx = state[collection].findIndex((x) => x.id === id);
    if (idx === -1) return null;
    state[collection][idx] = Object.assign({}, state[collection][idx], patch);
    persist();
    return state[collection][idx];
  }
  function remove(collection, id) {
    state[collection] = state[collection].filter((x) => x.id !== id);
    persist();
  }

  function updateMeta(patch) {
    state.meta = Object.assign({}, state.meta, patch);
    persist();
  }

  // ---- derived itinerary: computed fresh from bookings + activities ----
  // Adding/editing a lodging booking or an activity automatically changes
  // this output on the next render. Nothing here is stored separately.
  function getItineraryDays() {
    const numDays = state.meta.numDays || 12;
    const days = [];
    for (let d = 1; d <= numDays; d++) {
      const lodging = state.bookings.find(
        (b) => b.category === "lodging" && d >= b.day && d < b.endDay
      ) || state.bookings.find(
        (b) => b.category === "lodging" && d === b.day && b.day === b.endDay
      );
      const transport = state.bookings.filter(
        (b) => b.category !== "lodging" && (d === b.day || d === b.endDay)
      );
      const dayActivities = state.activities
        .filter((a) => a.day === d)
        .sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"));
      const cityId = lodging ? lodging.city : (transport[0] ? transport[0].toCity || transport[0].fromCity : null);
      let calDate = null;
      if (state.meta.startDate) {
        const dt = new Date(state.meta.startDate + "T00:00:00");
        dt.setDate(dt.getDate() + (d - 1));
        calDate = dt.toISOString().slice(0, 10);
      }
      days.push({ day: d, date: calDate, cityId, lodging, transport, activities: dayActivities });
    }
    return days;
  }

  return {
    init, subscribe, getState, getSyncStatus, persist,
    add, update, remove, updateMeta,
    getItineraryDays, uid
  };
})();
