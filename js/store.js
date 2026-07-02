// Central data store. Everything in the app reads from Store.state and
// writes through Store.* methods. Every write re-renders automatically
// and persists (localStorage always, plus the remote Sheet backend if
// APPS_SCRIPT_URL is configured in config.js).
//
// The trip's calendar is driven entirely by state.trip = { startDate, stops }.
// stops is an ordered list of { placeId, nights }. Bookings and activities
// are keyed by real ISO dates (not day numbers), so editing the stop order,
// nights, or start date automatically reflows which city "owns" each date --
// nothing else needs to be renumbered by hand.

const Store = (() => {
  const LOCAL_KEY = "itcroatia2026_trip_state_v3";
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

  let lastRemoteJSON = null;
  let pollHandle = null;

  async function pollRemote() {
    if (!remoteEnabled) return;
    const remote = await loadRemote();
    if (!remote) return;
    const remoteJSON = JSON.stringify(remote);
    if (remoteJSON !== lastRemoteJSON && remoteJSON !== JSON.stringify(state)) {
      state = remote;
      backfillFromSeed();
      lastRemoteJSON = remoteJSON;
      saveLocal();
      notify();
    } else {
      lastRemoteJSON = remoteJSON;
      notify();
    }
  }

  async function init() {
    const local = loadLocal();
    state = local || JSON.parse(JSON.stringify(SEED_DATA));
    backfillFromSeed();
    notify();
    if (remoteEnabled) {
      const remote = await loadRemote();
      if (remote) { state = remote; backfillFromSeed(); saveLocal(); notify(); lastRemoteJSON = JSON.stringify(remote); }
      // Poll for the other person's edits every 15s, so an already-open tab
      // picks up changes without needing a manual reload. Simple last-write-
      // wins: if you both edit inside the same ~15s window, whichever saves
      // last is what sticks.
      pollHandle = setInterval(pollRemote, 15000);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") pollRemote();
      });
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

  // ---- trip structure: ordered stops (placeId + nights) driving the whole calendar ----
  function addDays(iso, n) {
    const d = new Date(iso + "T00:00:00");
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  }

  // Returns one entry per stop: { placeId, nights, place, dayStart, dayEnd, dateStart, dateEnd }.
  // dayEnd/dateEnd is the checkout/departure day (exclusive of the next night, inclusive
  // as a calendar day since travel/transition happens on it).
  // Pure version, usable for a live "what would this look like" preview before committing
  // a change (e.g. inserting a new stop) -- takes stops/startDate explicitly instead of
  // reading current state.
  function computeRangesFor(stops, startDate) {
    let day = 1;
    let cursor = startDate || null;
    return (stops || []).map((stop) => {
      const place = PLACES.find((p) => p.id === stop.placeId);
      const dayStart = day;
      const dayEnd = day + stop.nights;
      const dateStart = cursor;
      const dateEnd = cursor ? addDays(cursor, stop.nights) : null;
      day = dayEnd;
      cursor = dateEnd;
      return { placeId: stop.placeId, nights: stop.nights, place, dayStart, dayEnd, dateStart, dateEnd };
    });
  }

  function computeStopRanges() {
    return computeRangesFor((state.trip && state.trip.stops) || [], state.trip && state.trip.startDate);
  }

  function getTotalDays() {
    const ranges = computeStopRanges();
    return ranges.length ? ranges[ranges.length - 1].dayEnd : 0;
  }

  function getTripDateRange() {
    const ranges = computeStopRanges();
    if (!ranges.length) return { start: state.trip ? state.trip.startDate : null, end: null };
    return { start: ranges[0].dateStart, end: ranges[ranges.length - 1].dateEnd };
  }

  function getStopRangeForPlace(placeId) {
    return computeStopRanges().find((r) => r.placeId === placeId) || null;
  }

  function updateTripStops(newStops) {
    state.trip.stops = newStops;
    persist();
  }
  function addTripStop(placeId, nights) {
    state.trip.stops.push({ placeId, nights: nights || 1 });
    persist();
  }
  function insertTripStop(index, placeId, nights) {
    state.trip.stops.splice(index, 0, { placeId, nights: nights || 1 });
    persist();
  }
  function removeTripStop(index) {
    state.trip.stops.splice(index, 1);
    persist();
  }
  function moveTripStop(index, delta) {
    const stops = state.trip.stops;
    const newIndex = index + delta;
    if (newIndex < 0 || newIndex >= stops.length) return;
    const [item] = stops.splice(index, 1);
    stops.splice(newIndex, 0, item);
    persist();
  }
  function setTripStopNights(index, nights) {
    state.trip.stops[index].nights = Math.max(1, nights);
    persist();
  }

  // ---- derived itinerary: computed fresh from trip.stops + bookings + activities ----
  // Adding/editing a lodging booking or an activity (or reordering/resizing stops)
  // automatically changes this output on the next render. Nothing here is stored
  // separately from those three sources.
  function buildDay(dayNum, dateStr, range) {
    const cityId = range.place ? range.place.cityIds[0] : null;
    const lodging = state.bookings.find(
      (b) => b.category === "lodging" && b.date <= dateStr && dateStr < b.endDate
    ) || state.bookings.find(
      (b) => b.category === "lodging" && b.date === dateStr && b.date === b.endDate
    ) || state.bookings.find(
      // Covers the very last day of the whole trip: the final hotel's checkout
      // date is otherwise never matched, since every other stay's checkout day
      // is claimed by the *next* stop's check-in day instead.
      (b) => b.category === "lodging" && b.endDate === dateStr
    );
    const transport = state.bookings.filter(
      (b) => b.category !== "lodging" && (dateStr === b.date || dateStr === b.endDate)
    );
    const dayActivities = state.activities
      .filter((a) => a.date === dateStr)
      .sort((a, b) => {
        // The day reads as an hourly timeline, so time-of-day is the primary
        // sort; the manual order field only breaks ties between items at the
        // same time (or both untimed).
        const t = (x) => x.time || "99:99";
        if (t(a) !== t(b)) return t(a) < t(b) ? -1 : 1;
        const ord = (x) => { const n = parseFloat(x.order); return isNaN(n) ? Infinity : n; };
        const ao = ord(a), bo = ord(b);
        return ao === bo ? 0 : ao < bo ? -1 : 1;
      });
    return { day: dayNum, date: dateStr, placeId: range.placeId, cityId, lodging, transport, activities: dayActivities };
  }

  function getItineraryDays() {
    const ranges = computeStopRanges();
    const days = [];
    ranges.forEach((r) => {
      for (let d = r.dayStart; d < r.dayEnd; d++) {
        const dateStr = r.dateStart ? addDays(r.dateStart, d - r.dayStart) : null;
        days.push(buildDay(d, dateStr, r));
      }
    });
    if (ranges.length) {
      const last = ranges[ranges.length - 1];
      days.push(buildDay(last.dayEnd, last.dateEnd, last));
    }
    return days;
  }

  return {
    init, subscribe, getState, getSyncStatus, persist,
    add, update, remove, updateMeta,
    computeStopRanges, computeRangesFor, getTotalDays, getTripDateRange, getStopRangeForPlace,
    updateTripStops, addTripStop, insertTripStop, removeTripStop, moveTripStop, setTripStopNights,
    getItineraryDays, uid
  };
})();
