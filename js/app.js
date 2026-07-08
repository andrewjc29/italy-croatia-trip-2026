// App shell: scrollspy nav, per-place rendering, shared helpers, modal system.

// In-memory (not persisted) collapse-open state. Every collapsible section
// (planning sections, bookings, hero overview) starts CLOSED on every page
// load; toggling one open is remembered only for the rest of this visit, via
// this plain object rather than localStorage.
const SESSION_COLLAPSE_STATE = {};
// Two-tier expand for the Bookings dashboard: null/unset means "show every
// city's block" (the chevron/header always resets to this). A placeId
// means "show only that one city's block, hide the rest entirely" (set by
// tapping a specific summary row). Keyed by "bs-hotels" / "bs-transport".
const SESSION_BS_FILTER = {};

// Same idea, scoped to Prep: each timeframe card has its own "Hide
// completed" checkbox, keyed by phase name. In-memory only, so every card
// shows everything again on a fresh page load.
// phase -> true once its "Show completed" box is checked. Absent/false is
// the default on every page load, meaning completed to-dos start hidden.
const PREP_SHOW_DONE = {};
const PREP_OPEN_PHASES = {};

// ---- destination catalog accessor ----
// The effective catalog is the built-in library (PLACES, authored in code)
// merged with any user-created destinations in state.places. Built-ins stay
// in code so catalog fixes and new cities always show; state only carries
// user additions. Everything in the app reads places through these three
// helpers instead of the raw PLACES constant, so a place added from the
// site behaves exactly like a built-in one.
function getPlaces() {
  const st = (typeof Store !== "undefined" && Store.getState) ? Store.getState() : null;
  const userPlaces = (st && Array.isArray(st.places)) ? st.places : [];
  if (!userPlaces.length) return PLACES;
  const extra = userPlaces.filter((up) => up && up.id && !PLACES.some((p) => p.id === up.id));
  return PLACES.concat(extra);
}
function getPlace(id) { return getPlaces().find((p) => p.id === id); }
// The distinct place ids in the current itinerary, in stop order. City
// sections are built from THIS (not the whole catalog), so a library city
// that isn't in the trip doesn't render an empty section.
function itineraryPlaceIds() {
  const st = (typeof Store !== "undefined" && Store.getState) ? Store.getState() : null;
  const stops = (st && st.trip && Array.isArray(st.trip.stops)) ? st.trip.stops : [];
  const seen = [];
  stops.forEach((s) => { if (s.placeId && seen.indexOf(s.placeId) === -1) seen.push(s.placeId); });
  return seen;
}
function getAccent(id) {
  if (PLACE_ACCENT[id]) return PLACE_ACCENT[id];
  const p = getPlace(id);
  return (p && p.accent) || "#1d6a8c";
}
// Deeper shade of a place's accent, for section theming. Built-ins read the
// value baked into css (#rome{--accent-deep:...}); user places carry their
// own accentDeep, falling back to a darkened accent.
function getAccentDeep(id) {
  const p = getPlace(id);
  if (p && p.accentDeep) return p.accentDeep;
  return getAccent(id);
}

function cityName(id) {
  const c = CITIES.find((x) => x.id === id);
  return c ? c.name : (id || "");
}
function fmtMoney(n, cur) { if (n === undefined || n === null || n === "") return ""; return (cur === "EUR" ? "€" : "$") + n; }
function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}
// Compact "Sep 3" form (no weekday) -- used where space is tight, like the
// hero's date range chip.
function fmtDateShort(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
function fmtTime12(hhmm) {
  if (!hhmm) return "";
  const parts = hhmm.split(":");
  const d = new Date();
  d.setHours(parseInt(parts[0], 10) || 0, parseInt(parts[1], 10) || 0, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}
function esc(s) { return (s === undefined || s === null) ? "" : String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
// "Today" needs to be the device's local calendar date, not UTC --
// Date#toISOString() is always UTC, so anyone west of Greenwich in the
// evening/night gets tomorrow's date instead of today's. Reads the date
// straight off the local Date getters instead.
function localTodayISO() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function el(html) { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstChild; }

// Shared line renderers -- used by both each place's day-by-day timeline and
// the "Today" view, so confirmation numbers and provider links are visible
// right on the itinerary instead of only inside the edit modal.
// These lines are click targets for the read-only detail card (see
// openItemDetailCard) -- tapping anywhere on one pulls up its map link,
// notes, and Edit/Remove actions instead of jumping straight to the edit
// form. Only the status pill still needs to be visible inline.
function renderLodgingLine(b) {
  if (!b) return "";
  const bits = [];
  if (b.provider) bits.push(esc(b.provider));
  if (b.confirmation) bits.push("Conf# " + esc(b.confirmation));
  return '<div class="item-line lodging-line item-line-clickable" data-view-booking="' + b.id + '"><span><strong>Staying:</strong> ' + esc(b.title) +
    (bits.length ? ' <span class="muted">(' + bits.join(" · ") + ')</span>' : "") + '</span>' +
    '<span class="il-actions"><span class="status-pill ' + b.status + '">' + b.status + '</span></span></div>';
}
// Maps a booking's category to the short label shown in front of it in the
// Today view Bookings card and the itinerary (e.g. "Flight", "Train") --
// so it's clear what kind of transportation it is at a glance, the same
// way Check-in/Staying at/Check-out labels work for hotels. Unrecognized
// or "other" categories fall back to the generic "Transport".
const TRANSPORT_CATEGORY_LABELS = { flight: "Flight", train: "Train", ferry: "Ferry", catamaran: "Catamaran", bus: "Bus" };
function transportCategoryLabel(category) {
  return TRANSPORT_CATEGORY_LABELS[category] || "Transport";
}
function renderTransportLine(t) {
  const bits = [];
  if (t.provider) bits.push(esc(t.provider));
  if (t.confirmation) bits.push("Conf# " + esc(t.confirmation));
  if (t.time) bits.push(esc(t.time));
  return '<div class="item-line item-line-clickable" data-view-booking="' + t.id + '"><span><span class="cat-label">' + esc(transportCategoryLabel(t.category)) + '</span> ' + esc(t.title) +
    (bits.length ? ' <span class="muted">(' + bits.join(" · ") + ')</span>' : "") + '</span>' +
    '<span class="il-actions"><span class="status-pill ' + t.status + '">' + t.status + '</span></span></div>';
}
// No inline time chip: timed activities render inside an hour-slot whose
// own label (e.g. "3 PM") already says the time, so repeating it per-row
// was redundant. Untimed ("anytime") activities never had a time to show
// anyway, so this is a no-op for them.
function renderActivityLine(a) {
  return '<div class="item-line item-line-clickable act-draggable" draggable="true" data-view-activity="' + a.id + '"><span class="drag-grip" aria-hidden="true">&#8942;&#8942;</span><span>' + esc(a.title) + '</span></div>';
}

// Calendar-style drag-to-time. Every day box is an hour rail; dropping an
// activity on an hour slot sets its time to that hour (and its date to that
// day, so items can also be dragged between days). Dropping on the "anytime"
// tray clears the time. Manual time edits in the form move the block the
// same way, since the rail is rebuilt from activity times on every render.
function wireActivityDrag(container) {
  let dragged = null;
  container.querySelectorAll(".act-draggable, .ev-draggable").forEach((row) => {
    row.addEventListener("dragstart", (e) => {
      dragged = row;
      row.classList.add("dragging");
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = "move";
        try { e.dataTransfer.setData("text/plain", row.dataset.viewActivity || row.dataset.evBooking || ""); } catch (err) { /* IE quirk */ }
      }
    });
    row.addEventListener("dragend", () => {
      row.classList.remove("dragging");
      dragged = null;
      container.querySelectorAll(".drag-over").forEach((s) => s.classList.remove("drag-over"));
    });
  });
  container.querySelectorAll(".hour-slot, .day-anytime").forEach((slot) => {
    slot.addEventListener("dragover", (e) => {
      if (!dragged) return;
      // Booking events stay on their own day; don't offer other days' slots.
      if (dragged.dataset.evBooking && slot.dataset.date !== dragged.dataset.evDate) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
      slot.classList.add("drag-over");
    });
    slot.addEventListener("dragleave", (e) => {
      if (!slot.contains(e.relatedTarget)) slot.classList.remove("drag-over");
    });
    slot.addEventListener("drop", (e) => {
      if (!dragged) return;
      e.preventDefault();
      slot.classList.remove("drag-over");
      const newTime = slot.dataset.hour !== undefined ? String(slot.dataset.hour).padStart(2, "0") + ":00" : "";
      if (dragged.dataset.evBooking) {
        // Booking event: write the new hour back to the booking itself so
        // everything that shows this time (rail, Today view, detail card,
        // edit form) updates together.
        if (slot.dataset.date !== dragged.dataset.evDate) return;
        const patch = {};
        patch[dragged.dataset.evField] = newTime;
        Store.update("bookings", dragged.dataset.evBooking, patch);
        return;
      }
      const patch = { time: newTime };
      if (slot.dataset.date) patch.date = slot.dataset.date;
      Store.update("activities", dragged.dataset.viewActivity, patch);
    });
  });
}

function hourLabel(h) {
  return h === 0 ? "12 AM" : h < 12 ? h + " AM" : h === 12 ? "12 PM" : (h - 12) + " PM";
}

// Timed booking moments for a given date: hotel check-in/check-out (when a
// time is set) and any transport with a departure time. These render as
// fixed blocks on the hour rail alongside the draggable activities.
function bookingEventsForDate(state, dateStr) {
  if (!dateStr) return [];
  const evs = [];
  (state.bookings || []).forEach((b) => {
    if (b.category === "lodging") {
      if (b.date === dateStr && b.checkinTime) evs.push({ time: b.checkinTime, label: "Check-in", booking: b, field: "checkinTime", date: dateStr });
      if (b.endDate === dateStr && b.checkoutTime) evs.push({ time: b.checkoutTime, label: "Check-out", booking: b, field: "checkoutTime", date: dateStr });
    } else if (b.time && (b.date === dateStr || b.endDate === dateStr)) {
      evs.push({ time: b.time, label: transportCategoryLabel(b.category), booking: b, field: "time", date: dateStr });
    }
  });
  return evs.sort((a, b2) => a.time.localeCompare(b2.time));
}

// Booking events are draggable like activities, but the drop writes back to
// the booking's own time field (checkinTime / checkoutTime / time), so the
// schedule and the booking stay in sync. They can only move within their
// own day -- moving a checkout to a different date is a booking-dates edit.
// Same reasoning as renderActivityLine: the hour-slot this sits in already
// shows the time, so the inline chip repeated it for no reason.
function renderRailEvent(ev) {
  return '<div class="item-line item-line-clickable rail-event ev-draggable" draggable="true" data-view-booking="' + ev.booking.id + '"' +
    ' data-ev-booking="' + ev.booking.id + '" data-ev-field="' + ev.field + '" data-ev-date="' + esc(ev.date) + '">' +
    '<span class="drag-grip" aria-hidden="true">&#8942;&#8942;</span>' +
    '<span><span class="rail-event-label">' + esc(ev.label) + '</span> ' + esc(ev.booking.title) + '</span>' +
    '<span class="il-actions"><span class="status-pill ' + esc(ev.booking.status || "idea") + '">' + esc(ev.booking.status || "idea") + '</span></span></div>';
}

// One day rendered as an hour rail (8 AM - 10 PM by default, stretched to
// fit any earlier/later items) plus an "anytime" tray for untimed items.
// events are fixed booking moments (check-in/out, timed transport) that
// occupy their hour slot but can't be dragged.
function renderDayTimeline(d, events) {
  events = events || [];
  const timed = d.activities.filter((a) => a.time);
  const untimed = d.activities.filter((a) => !a.time);
  let minH = 8, maxH = 22;
  timed.concat(events).forEach((x) => {
    const h = parseInt(x.time.slice(0, 2), 10);
    if (h < minH) minH = h;
    if (h > maxH) maxH = h;
  });
  const dateAttr = esc(d.date || "");
  const anytime = untimed.length
    ? '<div class="day-anytime" data-date="' + dateAttr + '"><span class="anytime-label">Anytime</span><div class="hour-items">' + untimed.map(renderActivityLine).join("") + '</div></div>'
    : '<div class="day-anytime day-anytime-empty" data-date="' + dateAttr + '"><span class="anytime-label">Anytime · drop here to unschedule a time</span></div>';
  const slots = [];
  for (let h = minH; h <= maxH; h++) {
    const hourOf = (t) => parseInt(t.slice(0, 2), 10);
    const rows = [
      ...events.filter((ev) => hourOf(ev.time) === h).map((ev) => ({ time: ev.time, html: renderRailEvent(ev) })),
      ...timed.filter((a) => hourOf(a.time) === h).map((a) => ({ time: a.time, html: renderActivityLine(a) }))
    ].sort((x, y) => x.time.localeCompare(y.time));
    slots.push('<div class="hour-slot' + (rows.length ? " has-items" : "") + '" data-hour="' + h + '" data-date="' + dateAttr + '">' +
      '<span class="hour-label">' + hourLabel(h) + '</span>' +
      '<div class="hour-items">' + rows.map((r) => r.html).join("") + '</div></div>');
  }
  return anytime + '<div class="hour-rail">' + slots.join("") + '</div>';
}

// Timezone-safe date shift (noon anchor avoids DST/UTC off-by-one).
function isoAddDays(iso, n) {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  const p = (x) => String(x).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}
// Signed day count from a to b (noon-anchored, same DST-safe parsing as
// isoAddDays) -- used to turn a date picked from the calendar into a
// todayViewOffset relative to the Today view's base date.
function isoDiffDays(a, b) {
  const da = new Date(a + "T12:00:00");
  const db = new Date(b + "T12:00:00");
  return Math.round((db - da) / 86400000);
}

// Activity row variant for the Today view: optional Now/Next pill.
function renderTodayActivityLine(a, nn) {
  const pill = nn ? '<span class="nn-pill nn-' + nn + '">' + nn + '</span>' : "";
  return '<div class="item-line item-line-clickable' + (nn === "now" ? " is-now" : "") + '" data-view-activity="' + a.id + '">' +
    '<span><span class="time">' + esc(a.time ? fmtTime12(a.time) : "") + '</span>' + esc(a.title) + pill + '</span></div>';
}

// "#rrggbb" -> "rgba(r,g,b,alpha)", for tinting a row's whole background
// with a soft wash of its own city accent color (not just the border).
function accentTint(hex, alpha) {
  const h = (hex || "#1d6a8c").replace("#", "");
  const r = parseInt(h.substring(0, 2), 16); const g = parseInt(h.substring(2, 4), 16); const b = parseInt(h.substring(4, 6), 16);
  return "rgba(" + (isNaN(r) ? 29 : r) + "," + (isNaN(g) ? 106 : g) + "," + (isNaN(b) ? 140 : b) + "," + (alpha == null ? 0.08 : alpha) + ")";
}

// Today view "Bookings" card: every lodging booking active on this day
// (Check-in / Staying at / Check-out) plus transport for the day, as
// bordered rows tinted with that row's own city accent -- distinct from
// renderDayHotelBar's solid-fill treatment used in the main hourly-rail
// day boxes elsewhere. The whole row is highlighted (border + background
// wash), not just the left edge.
function renderTvBookingRow(bookingId, label, title, status, accentColor) {
  return '<div class="tv-bk-row" style="--accent:' + accentColor + ';background:' + accentTint(accentColor, 0.08) + '" data-view-booking="' + bookingId + '">' +
    (label ? '<span class="tv-bk-label">' + esc(label) + '</span>' : "") +
    '<span class="tv-bk-title">' + esc(title) + '</span>' +
    '<span class="status-pill ' + esc(status || "idea") + '">' + esc(status || "idea") + '</span></div>';
}

// A timed booking moment (check-in/out, timed transport) inside the Today
// view's merged chronological itinerary -- reuses the hourly rail's
// .rail-event treatment (colored left border, not a solid-fill block),
// accented to whichever city that specific moment belongs to.
function renderTvBookingEventLine(ev, accentColor) {
  return '<div class="item-line item-line-clickable rail-event" style="--accent:' + accentColor + '" data-view-booking="' + ev.booking.id + '">' +
    '<span><span class="time">' + esc(fmtTime12(ev.time)) + '</span><span class="rail-event-label">' + esc(ev.label) + '</span> ' + esc(ev.booking.title) + '</span>' +
    '<span class="il-actions"><span class="status-pill ' + esc(ev.booking.status || "idea") + '">' + esc(ev.booking.status || "idea") + '</span></span></div>';
}

// An untimed ("anytime") activity in the Today view -- listed separately
// at the bottom of the Itinerary rather than mixed into the chronological
// list. No time chip (there's no time to show) and no move-to-tomorrow
// button (there's no specific time slot being freed up).
function renderTvAnytimeLine(a) {
  return '<div class="item-line item-line-clickable" data-view-activity="' + a.id + '"><span>' + esc(a.title) + '</span></div>';
}

let foodFilter = {}; // placeId -> "all" | "veg" | "nonveg"
let hotelFilter = {}; // placeId -> "all" | "budget" | "splurge"
let todayViewOffset = 0; // Today view day-paging offset (0 = actual today)
let lastSkeletonSig = null; // last-built itinerary place-id signature (rebuild trigger)
let itineraryEditMode = false; // itinerary editor: view (false) vs edit controls (true)
let budgetCurrency = "USD"; // display-only toggle for the budget panel, not persisted

// A day's lodging, rendered as a bar along the bottom of that day's box --
// labeled Check-in / Check-out / Staying at, depending on where this date
// falls relative to the booking's date/endDate. Colored to match that city's
// accent (same palette as the itinerary editor's timeline dots/thumbnails),
// so the bar visually ties back to which place you're in.
function renderDayHotelBar(lodging, dateStr, placeId, atTop) {
  if (!lodging) return "";
  const isCheckin = lodging.date === dateStr;
  const isCheckout = lodging.endDate === dateStr;
  let label, timeVal;
  if (isCheckin && isCheckout) { label = "Check-in & check-out"; timeVal = lodging.checkinTime || lodging.checkoutTime; }
  else if (isCheckin) { label = "Check-in"; timeVal = lodging.checkinTime; }
  else if (isCheckout) { label = "Check-out"; timeVal = lodging.checkoutTime; }
  else { label = "Staying at"; timeVal = ""; }
  const timeHtml = timeVal ? " · " + esc(fmtTime12(timeVal)) : "";
  const accent = getAccent(placeId) || "#1d6a8c";
  return '<div class="day-hotel-bar' + (atTop ? " at-top" : "") + ' item-line-clickable" data-view-booking="' + lodging.id + '" style="background:' + accent + '"><span class="dhb-label">' + esc(label) + timeHtml + '</span>' +
    '<span class="dhb-hotel">' + esc(lodging.title) + '</span></div>';
}

// ---- modal helper ----
function openModal(title, bodyHtml, onSubmit, submitLabel) {
  const root = document.getElementById("modalRoot");
  root.innerHTML = "";
  const overlay = el('<div class="modal-overlay"><div class="modal">' +
    "<h3>" + esc(title) + "</h3><div class=\"modal-body\">" + bodyHtml + "</div>" +
    '<div class="modal-actions"><button class="btn secondary" id="modalCancel">Cancel</button>' +
    '<button class="btn" id="modalSubmit">' + esc(submitLabel || "Save") + "</button></div></div></div>");
  root.appendChild(overlay);
  // step="900" asks pickers for 15-min increments, but not every browser's
  // picker honors it -- snap whatever comes in to the nearest quarter hour.
  overlay.querySelectorAll('input[type="time"]').forEach((inp) => inp.addEventListener("change", () => {
    if (!inp.value) return;
    const parts = inp.value.split(":").map(Number);
    const total = (parts[0] * 60 + Math.round(parts[1] / 15) * 15) % 1440;
    inp.value = String(Math.floor(total / 60)).padStart(2, "0") + ":" + String(total % 60).padStart(2, "0");
  }));
  overlay.addEventListener("click", (e) => { if (e.target === overlay) root.innerHTML = ""; });
  document.getElementById("modalCancel").addEventListener("click", () => { root.innerHTML = ""; });
  document.getElementById("modalSubmit").addEventListener("click", () => {
    const data = {};
    overlay.querySelectorAll("[data-field]").forEach((f) => { data[f.dataset.field] = f.value; });
    onSubmit(data);
    root.innerHTML = "";
  });
}
function closeModal() { document.getElementById("modalRoot").innerHTML = ""; }

// Copies text to the clipboard and gives the clicked button a brief
// "Copied" confirmation state. Falls back to a hidden-textarea copy for
// browsers/contexts without navigator.clipboard (e.g. non-HTTPS local use).
function copyToClipboard(text, btnEl) {
  const flash = () => {
    if (!btnEl) return;
    if (!btnEl.dataset.origLabel) btnEl.dataset.origLabel = btnEl.textContent;
    btnEl.textContent = "Copied";
    btnEl.classList.add("copied");
    clearTimeout(btnEl._copyTimer);
    btnEl._copyTimer = setTimeout(() => {
      btnEl.textContent = btnEl.dataset.origLabel;
      btnEl.classList.remove("copied");
    }, 1400);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(flash).catch(flash);
  } else {
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); } catch (e) { /* no-op */ }
    document.body.removeChild(ta);
    flash();
  }
}

// Wires every [data-copy] button found under root (defaults to the whole
// document) to copy its decoded text via copyToClipboard. Call this once
// after appending any markup that used mapActionsRow() or a copy button.
function wireCopyButtons(root) {
  (root || document).querySelectorAll("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", () => copyToClipboard(decodeURIComponent(btn.dataset.copy), btn));
  });
}

// Shared "Google Maps / Apple Maps / Copy address" action row -- used
// everywhere a Map link already exists (restaurant + thing-to-do detail
// cards, day-by-day activity/booking detail cards, hotel table) so those
// surfaces gain the same set of travel-utility actions instead of each
// growing its own one-off link. Any argument can be falsy/empty to omit it.
function mapActionsRow(googleUrl, appleUrl, copyText, copyLabel) {
  if (!googleUrl && !appleUrl && !copyText) return "";
  const parts = [];
  if (googleUrl) parts.push('<a class="btn-outline" href="' + esc(googleUrl) + '" target="_blank" rel="noopener">Google Maps</a>');
  if (appleUrl) parts.push('<a class="btn-outline" href="' + esc(appleUrl) + '" target="_blank" rel="noopener">Apple Maps</a>');
  if (copyText) parts.push('<button type="button" class="btn-outline" data-copy="' + encodeURIComponent(copyText) + '">' + esc(copyLabel || "Copy address") + '</button>');
  return '<div class="map-actions-row">' + parts.join("") + '</div>';
}

// Wires the "Auto-fill from Google" button used by the restaurant and
// thing-to-do forms: reads the Name + City fields, looks up the place via
// PlacesLookup (js/places.js), and fills in Kind / Notes / a precise map
// link so entering something new is mostly just "type a name, hit auto-fill".
// A no-op if the form doesn't have the button (e.g. this function got called
// on some other modal), or if no API key is configured.
function wireAutoFillButton(root) {
  if (!root) return;
  const btn = root.querySelector("#autoFillBtn");
  const statusEl = root.querySelector("#autoFillStatus");
  if (!btn || !statusEl || typeof PlacesLookup === "undefined") return;
  btn.addEventListener("click", async () => {
    const nameInput = root.querySelector('[data-field="name"]');
    const citySelect = root.querySelector('[data-field="city"]');
    const name = (nameInput && nameInput.value || "").trim();
    if (!name) { statusEl.textContent = "Type a name first."; return; }
    if (!PlacesLookup.isConfigured()) {
      statusEl.textContent = "Not set up yet — add a Google Maps API key in js/config.js to enable this.";
      return;
    }
    btn.disabled = true;
    statusEl.textContent = "Looking up “" + name + "”…";
    try {
      const cityLabel = (typeof CITY_LABEL_MAP !== "undefined" && citySelect) ? CITY_LABEL_MAP[citySelect.value] || "" : "";
      const result = await PlacesLookup.lookup(name, cityLabel);
      const kindInput = root.querySelector('[data-field="kind"]');
      const descInput = root.querySelector('[data-field="description"]');
      const urlInput = root.querySelector('[data-field="placeUrl"]');
      if (kindInput && result.kind) kindInput.value = result.kind;
      if (descInput && result.description) descInput.value = result.description;
      if (urlInput && result.url) urlInput.value = result.url;
      statusEl.textContent = result.description ? "Filled in from Google." : "Filled in kind + map link (no short description available for this place).";
    } catch (err) {
      statusEl.textContent = err.message === "no-key" ? "Not set up yet — add a Google Maps API key in js/config.js." : "Couldn't look that up: " + err.message;
    } finally {
      btn.disabled = false;
    }
  });
}

// A lighter modal for read-only content -- just a Close button, no Save flow.
// Used by the day-by-day detail card below.
function openViewModal(title, bodyHtml) {
  const root = document.getElementById("modalRoot");
  root.innerHTML = "";
  const overlay = el('<div class="modal-overlay"><div class="modal">' +
    '<button class="pm-x dark" id="modalCancel" aria-label="Close">&times;</button>' +
    "<h3>" + esc(title) + "</h3><div class=\"modal-body\">" + bodyHtml + "</div>" +
    '</div></div>');
  root.appendChild(overlay);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) root.innerHTML = ""; });
  document.getElementById("modalCancel").addEventListener("click", () => { root.innerHTML = ""; });
}

// Tapping an item in the day-by-day itinerary (activity, meal, transport, or
// lodging) opens this instead of jumping straight into the edit form -- a
// quick-reference card with the map link, notes, and status up front, and
// Edit/Remove/Open Maps actions at the bottom for when you do need to change
// something. kind is "activity" or "booking".
function openItemDetailCard(kind, item, place) {
  const isBooking = kind === "booking";
  const googleUrl = mapsUrlForCity(item.title, item.city);
  const appleUrl = appleMapsUrlForCity(item.title, item.city);
  const copyText = locationLabel(item.title, item.city);
  // A booking's own "Link" field is free text (an airline/booking-site URL,
  // not necessarily a map link) -- only surface it separately when it's not
  // just the same Google Maps link we're already showing below.
  const providerLink = isBooking && item.link && item.link !== googleUrl ? item.link : "";
  const rows = [];
  if (isBooking) {
    if (item.provider) rows.push(["Provider", item.provider]);
    if (item.confirmation) rows.push(["Confirmation #", item.confirmation]);
    const dateLabel = item.date ? fmtDate(item.date) + (item.endDate && item.endDate !== item.date ? " – " + fmtDate(item.endDate) : "") : "";
    if (dateLabel) rows.push(["Date", dateLabel]);
    if (item.time) rows.push(["Time", item.time]);
    if (item.checkinTime) rows.push(["Check-in time", fmtTime12(item.checkinTime)]);
    if (item.checkoutTime) rows.push(["Check-out time", fmtTime12(item.checkoutTime)]);
  } else {
    if (item.type) rows.push(["Type", item.type]);
    if (item.time) rows.push(["Time", item.time]);
  }
  if (item.cost) rows.push(["Cost", fmtMoney(item.cost, item.currency)]);
  if (item.notes) rows.push(["Notes", item.notes]);
  const accent = getAccent(place && place.id) || "#1d6a8c";
  const kindLabel = isBooking ? (item.type || "Booking") : (item.type || "Activity");
  const statusHtml = item.status ? ' <span class="pm-veg">' + esc(item.status) + '</span>' : "";
  const root = document.getElementById("modalRoot");
  root.innerHTML = "";
  const overlay = el('<div class="modal-overlay"><div class="modal place-modal">' +
    '<div class="pm-head" style="background:' + accent + '">' +
    '<button class="pm-x" id="pmClose" aria-label="Close">&times;</button>' +
    '<div class="pm-kind">' + esc(kindLabel) + statusHtml + '</div>' +
    '<h3>' + esc(item.title) + '</h3>' +
    (place ? '<div class="pm-city">' + esc(place.label) + '</div>' : "") +
    '</div>' +
    '<div class="pm-body">' +
    '<div class="idc-rows">' + rows.map((r) => {
      const val = r[0] === "Confirmation #"
        ? esc(r[1]) + ' <button type="button" class="link-copy" data-copy="' + encodeURIComponent(r[1]) + '" title="Copy confirmation number" aria-label="Copy confirmation number">copy</button>'
        : esc(r[1]);
      return '<div class="idc-row"><span class="idc-label">' + esc(r[0]) + '</span><span class="idc-val">' + val + '</span></div>';
    }).join("") + '</div>' +
    (rows.length === 0 ? '<p class="muted">No extra details yet -- add some from Edit below.</p>' : "") +
    (providerLink ? '<div class="pm-actions"><span></span><a class="site" href="' + esc(providerLink) + '" target="_blank" rel="noopener">Provider link</a></div>' : "") +
    mapActionsRow(googleUrl, appleUrl, copyText) +
    '</div>' +
    '<div class="pm-footer">' +
    '<button class="link" id="idcEditBtn">Edit details</button>' +
    '<button class="link danger" id="idcRemoveBtn">Remove</button>' +
    '</div></div></div>');
  root.appendChild(overlay);
  wireCopyButtons(overlay);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) root.innerHTML = ""; });
  document.getElementById("pmClose").addEventListener("click", () => { root.innerHTML = ""; });
  document.getElementById("idcEditBtn").addEventListener("click", () => {
    if (isBooking) openBookingForm(Store.getState(), item, place);
    else openActivityForm(Store.getState(), item.date, item, place);
  });
  document.getElementById("idcRemoveBtn").addEventListener("click", () => {
    if (confirm('Remove "' + item.title + '"?')) {
      Store.remove(isBooking ? "bookings" : "activities", item.id);
      closeModal();
    }
  });
}

// Tapping anywhere on a restaurant/thing-to-do card opens this -- a bigger,
// more visual view with a city-accent header, the full description, and a
// clear action hierarchy: primary "+ Add to a day", secondary "Open in Maps",
// then quiet Edit / Remove links along the bottom. Close is the X in the
// corner (or a tap on the backdrop). type is "restaurant" or "seedo".
function openPlaceDetailCard(type, item, place) {
  const isRest = type === "restaurant";
  const accent = getAccent(place.id) || "#1d6a8c";
  const vegHtml = isRest ? ' <span class="pm-veg">' + (item.vegetarian ? "vegetarian" : "omnivore") + '</span>' : "";
  const root = document.getElementById("modalRoot");
  root.innerHTML = "";
  const overlay = el('<div class="modal-overlay"><div class="modal place-modal">' +
    '<div class="pm-head" style="background:' + accent + '">' +
    '<button class="pm-x" id="pmClose" aria-label="Close">&times;</button>' +
    '<div class="pm-kind">' + esc(item.kind || (isRest ? "Restaurant" : "Thing to do")) + vegHtml + '</div>' +
    '<h3>' + esc(item.name) + '</h3>' +
    '<div class="pm-city">' + esc(cityName(item.city)) + '</div>' +
    '</div>' +
    '<div class="pm-body">' +
    (item.description ? '<p class="pm-desc">' + esc(item.description) + '</p>' : '<p class="muted">No notes yet -- add some from Edit below.</p>') +
    '<div class="pm-actions">' +
    '<button class="btn" id="pmAdd">+ Add to a day</button>' +
    '</div>' +
    mapActionsRow(item.url, appleMapsUrlForCity(item.name, item.city), locationLabel(item.name, item.city)) +
    '</div>' +
    '<div class="pm-footer">' +
    '<button class="link" id="pmEdit">Edit details</button>' +
    '<button class="link danger" id="pmRemove">Remove</button>' +
    '</div></div></div>');
  root.appendChild(overlay);
  wireCopyButtons(overlay);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) root.innerHTML = ""; });
  document.getElementById("pmClose").addEventListener("click", () => { root.innerHTML = ""; });
  document.getElementById("pmAdd").addEventListener("click", () => {
    closeModal();
    if (isRest) openAddToDayModal(item.name + " (" + item.kind + ")", item.city, item.description, "meal", place);
    else openAddToDayModal(item.name, item.city, item.description, "sight", place);
  });
  document.getElementById("pmEdit").addEventListener("click", () => {
    if (isRest) openRestForm(Store.getState(), item, place);
    else openSeeForm(Store.getState(), item, place);
  });
  document.getElementById("pmRemove").addEventListener("click", () => {
    if (confirm('Remove "' + item.name + '"?')) {
      Store.remove(isRest ? "restaurants" : "thingsToDo", item.id);
      closeModal();
    }
  });
}

// ---- build the static per-place shells once, then re-render their dynamic parts ----
function buildPlacesSkeleton() {
  const container = document.getElementById("places");
  if (!container) return;
  // Sections are the itinerary's cities, in stop order -- not the whole
  // catalog. Adding a city to the trip adds its section; removing it drops it.
  const places = itineraryPlaceIds().map((id) => getPlace(id)).filter(Boolean);
  container.innerHTML = places.map((p, i) => {
    const num = String(i + 1).padStart(2, "0");
    // Typical September climate goes at the top of "Good to know" (one
    // line per city for a place that bundles several, e.g. Puglia) --
    // replaces the standalone Toolkit weather grid, which only ever showed
    // the same static normals anyway until the trip got close. A live
    // forecast still shows up separately in the Today view near trip time
    // (see maybeRenderTodayForecast), so day-of you're not just seeing
    // averages.
    const climateLis = (p.cityIds || []).map((cid) => {
      const norm = SEPT_CLIMATE_NORMALS[cid];
      if (!norm) return "";
      const label = p.cityIds.length > 1 ? esc(cityName(cid)) + ": " : "";
      return '<li class="tips-climate">' + label + "Typical high " + norm.high + "F / low " + norm.low + "F" +
        (norm.sea ? ", sea ~" + norm.sea + "F" : "") + ". " + esc(norm.note) + "</li>";
    }).join("");
    const tips = climateLis + (PLACE_TIPS[p.id] || p.tips || []).map((t) => "<li>" + esc(t) + "</li>").join("");
    // Built-in cities are themed by their #id css rule; user-created places
    // have no such rule, so theme them inline from their record's accent.
    const builtin = PLACES.some((x) => x.id === p.id);
    const themeStyle = builtin ? "" : ' style="--accent:' + getAccent(p.id) + ';--accent-deep:' + getAccentDeep(p.id) + '"';
    return '<section id="' + p.id + '"' + themeStyle + '>' +
      '<div class="place-head"><div class="bg" style="background-image:url(\'' + p.image + '\')"></div>' +
      '<div class="ph-inner"><div class="place-num">' + num + " / " + places.length + '</div>' +
      "<h2>" + esc(p.title) + " <em>" + esc(p.titleEm) + "</em></h2>" +
      '<div class="nights" id="nights-' + p.id + '"></div></div></div>' +
      '<div class="wrap">' +
      '<div class="sub-h"><h3>Day by day</h3><span class="rule"></span></div>' +
      '<div class="wishlist" id="wishlist-' + p.id + '" style="display:none"></div>' +
      '<div id="days-' + p.id + '"></div>' +

      '<details class="plan-collapse" data-collapse-key="stay-' + p.id + '">' +
      '<summary><div class="sub-h"><h3>Where to stay</h3><span class="rule"></span><button class="sec-add" data-sec-add="stay:' + p.id + '" title="Add a hotel option" aria-label="Add a hotel option">+</button><span class="arw">&rsaquo;</span></div></summary>' +
      '<div class="plan-collapse-body">' +
      '<p class="sub-sub">Choose one to book</p>' +
      '<div class="filters" id="hotelfilters-' + p.id + '">' +
      '<button class="chip on" data-filter="all">All</button>' +
      '<button class="chip" data-filter="budget">Within budget</button>' +
      '<button class="chip" data-filter="splurge">Splurge picks</button>' +
      '</div>' +
      '<div id="hotels-' + p.id + '"></div>' +
      '</div></details>' +

      '<details class="plan-collapse" data-collapse-key="seedo-' + p.id + '">' +
      '<summary><div class="sub-h"><h3>See &amp; do</h3><span class="rule"></span><button class="sec-add" data-sec-add="see:' + p.id + '" title="Add a thing to do" aria-label="Add a thing to do">+</button><span class="arw">&rsaquo;</span></div></summary>' +
      '<div class="plan-collapse-body">' +
      '<div id="seedo-' + p.id + '" class="cards"></div>' +
      '</div></details>' +

      '<details class="plan-collapse" data-collapse-key="food-' + p.id + '">' +
      '<summary><div class="sub-h"><h3>Where to eat</h3><span class="rule"></span><button class="sec-add" data-sec-add="food:' + p.id + '" title="Add a restaurant" aria-label="Add a restaurant">+</button><span class="arw">&rsaquo;</span></div></summary>' +
      '<div class="plan-collapse-body">' +
      '<p class="sub-sub">Vegetarian friendly noted</p>' +
      '<div class="filters" id="filters-' + p.id + '">' +
      '<button class="chip on" data-filter="all">All</button>' +
      '<button class="chip" data-filter="veg">Vegetarian</button>' +
      '<button class="chip" data-filter="nonveg">Omnivore</button>' +
      '</div>' +
      '<div id="foodcards-' + p.id + '" class="cards"></div>' +
      '</div></details>' +

      (tips ? '<details class="tips"><summary>Good to know<span class="arw">+</span></summary><ul>' + tips + "</ul></details>" : "") +
      "</div></section>" + (i < places.length - 1 ? '<div class="divider"></div>' : "");
  }).join("");

  // Planning sections (stay / see&do / eat) collapse per city, and start
  // CLOSED on every page load -- they're planning-phase tools; the
  // day-by-day is the main view. A section you open stays open only for
  // the rest of this visit (in-memory state, not persisted).
  container.querySelectorAll(".plan-collapse").forEach((det) => {
    if (SESSION_COLLAPSE_STATE[det.dataset.collapseKey]) det.setAttribute("open", "");
    else det.removeAttribute("open");
    det.addEventListener("toggle", () => {
      SESSION_COLLAPSE_STATE[det.dataset.collapseKey] = det.open;
    });
  });

  // The + in each planning-section header adds an item without needing to
  // expand the section first.
  container.querySelectorAll("[data-sec-add]").forEach((btn) => btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const parts = btn.dataset.secAdd.split(":");
    const place = getPlace(parts[1]);
    if (!place) return;
    if (parts[0] === "see") openSeeForm(Store.getState(), null, place);
    else if (parts[0] === "food") openRestForm(Store.getState(), null, place);
    else if (parts[0] === "stay") openHotelForm(Store.getState(), null, place);
  }));

  document.getElementById("places").querySelectorAll('.filters[id^="filters-"]').forEach((box) => {
    box.addEventListener("click", (e) => {
      const btn = e.target.closest(".chip");
      if (!btn) return;
      const placeId = box.id.replace("filters-", "");
      foodFilter[placeId] = btn.dataset.filter;
      box.querySelectorAll(".chip").forEach((c) => c.classList.toggle("on", c === btn));
      renderPlaceFood(placeId, Store.getState());
    });
  });
  document.getElementById("places").querySelectorAll('.filters[id^="hotelfilters-"]').forEach((box) => {
    box.addEventListener("click", (e) => {
      const btn = e.target.closest(".chip");
      if (!btn) return;
      const placeId = box.id.replace("hotelfilters-", "");
      hotelFilter[placeId] = btn.dataset.filter;
      box.querySelectorAll(".chip").forEach((c) => c.classList.toggle("on", c === btn));
      renderPlaceHotels(placeId, Store.getState());
    });
  });
  document.getElementById("places").querySelectorAll("[data-add-hotel]").forEach((btn) =>
    btn.addEventListener("click", () => openHotelForm(Store.getState(), null, getPlace(btn.dataset.addHotel))));
}

function placeForCity(cityId) { return getPlaces().find((p) => p.cityIds.indexOf(cityId) !== -1); }

// A place can have more than one lodging booking -- e.g. 2 nights at one
// hotel then 3 at another within the same stop. Anything that needs "the"
// hotel for a place should go through lodgingBookingsForPlace and match by
// hotel name, not assume there's only ever one.
function lodgingBookingsForPlace(state, place) {
  return state.bookings.filter((b) => b.category === "lodging" && place.cityIds.indexOf(b.city) !== -1);
}
function currentLodgingBooking(state, place) {
  return lodgingBookingsForPlace(state, place)[0] || null;
}

// The nights/date-range line under each place's title -- always reflects
// the live trip itinerary (edited at the top of the page), not a fixed value.
function renderPlaceNights(placeId, state) {
  const range = Store.getStopRangeForPlace(placeId);
  const el2 = document.getElementById("nights-" + placeId);
  if (!el2) return;
  if (!range) { el2.textContent = "Not currently in your itinerary"; return; }
  const nightsLabel = range.nights + (range.nights === 1 ? " night" : " nights");
  const dateLabel = range.dateStart && range.dateEnd ? " · " + fmtDate(range.dateStart) + " – " + fmtDate(range.dateEnd) : "";
  el2.textContent = nightsLabel + dateLabel;
}

function renderPlaceDays(placeId, state) {
  const place = getPlace(placeId);
  const allDays = Store.getItineraryDays();
  const ranges = Store.computeStopRanges();
  const myIdx = ranges.findIndex((r) => r.placeId === placeId);
  const days = allDays.filter((d) => d.placeId === placeId).map((d) => ({ d, transition: null }));
  const el2 = document.getElementById("days-" + placeId);
  if (!days.length) { el2.innerHTML = '<div class="day-rows"><div class="day-row"><div class="day-body muted">Not currently in your itinerary. Add it back in the itinerary editor above.</div></div></div>'; return; }

  // Transition days live in BOTH city sections. The checkout/travel day
  // technically belongs to the next stop, so append a synced copy of it here
  // with a travel banner; the arriving city's own copy gets the matching
  // banner. Same date, same data, edits show up in both.
  if (myIdx >= 0 && myIdx < ranges.length - 1 && ranges[myIdx].dateEnd) {
    const outDay = allDays.find((d) => d.date === ranges[myIdx].dateEnd);
    const nextPlace = getPlace(ranges[myIdx + 1].placeId);
    if (outDay && nextPlace) days.push({ d: outDay, transition: { dir: "out", other: nextPlace, from: place } });
  }
  if (myIdx > 0 && ranges[myIdx].dateStart && ranges[myIdx].dateStart === ranges[myIdx - 1].dateEnd) {
    const prevPlace = getPlace(ranges[myIdx - 1].placeId);
    if (prevPlace && days.length) days[0].transition = { dir: "in", other: prevPlace, from: prevPlace };
  }

  el2.innerHTML = '<div class="day-rows">' + days.map((entry) => {
    const d = entry.d;
    const events = bookingEventsForDate(state, d.date);
    const lines = renderDayTimeline(d, events);
    const transportLines = d.transport.filter((t) => !t.time).map(renderTransportLine).join("");
    // Transition days read top-to-bottom like the day itself: wake up +
    // check out of the old hotel (top bar, departing city's color), travel,
    // then the travel banner + check-in at the new hotel (bottom, arriving
    // city's color). Normal days just keep the "staying at" bar on the bottom.
    let topBar = "", bottomBar = "", bannerTop = "", bannerBottom = "";
    const hotelOut = (state.bookings || []).find((b) => b.category === "lodging" && b.endDate === d.date);
    const hotelIn = (state.bookings || []).find((b) => b.category === "lodging" && b.date === d.date);
    const twoHotels = hotelOut && hotelIn && hotelOut.id !== hotelIn.id;
    if (entry.transition) {
      const t = entry.transition;
      const departId = t.dir === "out" ? placeId : t.other.id;
      const arriveId = t.dir === "out" ? t.other.id : placeId;
      topBar = renderDayHotelBar(hotelOut, d.date, departId, true);
      bottomBar = renderDayHotelBar(hotelIn, d.date, arriveId);
      const accent = getAccent(t.other.id) || "#1d6a8c";
      const banner = '<div class="travel-banner" style="border-color:' + accent + ';color:' + accent + '">' +
        '<span class="tb-label" style="background:' + accent + '">Travel day</span>' +
        (t.dir === "out"
          ? esc(t.from.label) + ' &rarr; ' + esc(t.other.label) + '<a class="tb-jump" href="#' + t.other.id + '">Continue in ' + esc(t.other.label) + ' &darr;</a>'
          : 'Arriving from ' + esc(t.other.label) + '<a class="tb-jump" href="#' + t.other.id + '">&uarr; Back to ' + esc(t.other.label) + '</a>') +
        '</div>';
      // Leaving: the banner points forward, so it sits at the bottom of the
      // day. Arriving: it points back to the previous city, so it sits at
      // the top, right under the date.
      if (t.dir === "out") bannerBottom = banner;
      else bannerTop = banner;
    } else if (twoHotels) {
      // Hotel hop within the same stop (e.g. two different Puglia hotels):
      // wake-up/checkout hotel on top, the night's check-in hotel on the
      // bottom -- same reading order as a travel day, no toggle needed.
      topBar = renderDayHotelBar(hotelOut, d.date, d.placeId, true);
      bottomBar = renderDayHotelBar(hotelIn, d.date, d.placeId);
    } else {
      bottomBar = renderDayHotelBar(d.lodging, d.date, d.placeId);
    }
    return '<div class="day-row' + (entry.transition ? " day-row-transition" : "") + '"><div class="day-dot"></div><div class="day-body">' +
      '<div class="day-date">' + (d.date ? fmtDate(d.date) : "Day " + d.day) + '</div>' +
      bannerTop + topBar + transportLines + lines +
      '<div class="day-add-row">' +
      '<button class="add-line" data-add-act="' + esc(d.date || "") + '">+ add to this day</button>' +
      '<button class="add-line" data-add-booking="' + esc(d.date || "") + '">+ add a booking</button>' +
      '</div>' + bannerBottom + bottomBar + '</div></div>';
  }).join("") + "</div>";
  wireActivityDrag(el2);
  el2.querySelectorAll("[data-add-act]").forEach((btn) => btn.addEventListener("click", () => openActivityForm(state, btn.dataset.addAct, null, place)));
  el2.querySelectorAll("[data-add-booking]").forEach((btn) => btn.addEventListener("click", () => openBookingForm(state, null, place, btn.dataset.addBooking)));
  el2.querySelectorAll("[data-view-activity]").forEach((row) => row.addEventListener("click", () => {
    const a = state.activities.find((x) => x.id === row.dataset.viewActivity);
    if (a) openItemDetailCard("activity", a, place);
  }));
  el2.querySelectorAll("[data-view-booking]").forEach((row) => row.addEventListener("click", () => {
    const b = state.bookings.find((x) => x.id === row.dataset.viewBooking);
    if (b) openItemDetailCard("booking", b, place);
  }));
}

// ---- Where to stay (hotels shortlist -> "Choose this" writes/updates the lodging booking) ----
function renderPlaceHotels(placeId, state) {
  const place = getPlace(placeId);
  const placeLodgings = lodgingBookingsForPlace(state, place);
  let list = (state.hotels || []).filter((h) => h.placeId === placeId);
  const filter = hotelFilter[placeId] || "all";
  if (filter === "budget") list = list.filter((h) => !h.splurge);
  if (filter === "splurge") list = list.filter((h) => h.splurge);
  const el2 = document.getElementById("hotels-" + placeId);
  const splitNoteHtml = placeLodgings.length > 1 ? '<div class="muted" style="font-size:.82rem;margin-top:.4rem">Split stay: ' +
    placeLodgings.map((b) => esc(b.title) + " (" + esc(fmtDate(b.date)) + "–" + esc(fmtDate(b.endDate)) + ")").join(", ") + '</div>' : "";
  // Desktop keeps the side-by-side comparison table (pros/cons visible
  // without tapping); mobile gets a card per hotel instead -- the table's
  // forced min-width made it require horizontal scrolling below ~640px,
  // which is what wasn't working. CSS toggles which one is visible.
  el2.innerHTML =
    '<div class="table-scroll hotel-table-wrap"><table><thead><tr><th>Hotel</th><th>Nightly</th><th>Pros</th><th>Cons</th><th></th></tr></thead><tbody>' +
    list.map((h) => {
      // Match per-hotel, not "does this place have any lodging booking at
      // all" -- that's what lets two different hotels both show as chosen
      // when a stay is split between them.
      const existingForHotel = placeLodgings.find((b) => b.title === h.name);
      return '<tr><td class="hotel">' + esc(h.name) + '<span class="area">' + esc(h.area) + '</span>' +
        (h.splurge ? '<span class="pill">splurge</span>' : "") + '</td>' +
        '<td class="cost">' + esc(h.costLabel || fmtMoney(h.cost, "USD")) + '</td>' +
        '<td>' + esc(h.pros || "") + '</td><td>' + esc(h.cons || "") + '</td>' +
        '<td class="actions">' +
        (h.url ? '<a href="' + esc(h.url) + '" target="_blank" rel="noopener">Google Maps</a> &middot; <a href="' + esc(appleMapsUrlForPlace(h.name, h.area, h.placeId)) + '" target="_blank" rel="noopener">Apple</a><br>' : "") +
        '<button type="button" class="link" data-copy="' + encodeURIComponent(locationLabelForPlace(h.name, h.area, h.placeId)) + '">copy address</button><br>' +
        '<a href="' + esc(bookingComUrlForPlace(h.name, h.placeId)) + '" target="_blank" rel="noopener">Book here</a><br>' +
        '<button class="site-link" data-choose-hotel="' + h.id + '">' + (existingForHotel ? "Chosen -- edit dates" : "Choose this") + '</button><br>' +
        '<button class="link" data-edit-hotel="' + h.id + '">edit</button></td></tr>';
    }).join("") + "</tbody></table></div>" +
    splitNoteHtml +
    '<div class="hotel-cards">' +
    list.map((h) => {
      const existingForHotel = placeLodgings.find((b) => b.title === h.name);
      return '<div class="card card-clickable hotel-card" data-view-hotel="' + h.id + '"><div class="pic"></div><div class="body">' +
        '<h4>' + esc(h.name) + (h.splurge ? '<span class="pill">splurge</span>' : "") + '</h4>' +
        '<div class="kind">' + esc(h.area) + '</div>' +
        '<div class="hotel-card-cost">' + esc(h.costLabel || fmtMoney(h.cost, "USD")) + (h.costLabel ? "" : "/night") + '</div>' +
        (existingForHotel ? '<div class="status-pill ' + esc(existingForHotel.status || "idea") + '" style="margin-top:.4rem">' + esc(existingForHotel.status || "idea") + '</div>' : "") +
        '<div class="foot">' +
        '<button class="site" data-choose-hotel="' + h.id + '" onclick="event.stopPropagation()">' + (existingForHotel ? "Chosen -- edit dates" : "Choose this") + '</button>' +
        (h.url ? '<a class="site" href="' + esc(h.url) + '" target="_blank" rel="noopener" onclick="event.stopPropagation()">Map</a>' : "") +
        '</div></div></div>';
    }).join("") + "</div>" +
    (list.length ? "" : '<div class="muted" style="padding:.5rem 0">Nothing saved yet -- use the + next to the section title.</div>');
  wireCopyButtons(el2);
  el2.querySelectorAll("[data-choose-hotel]").forEach((btn) => btn.addEventListener("click", () => {
    const h = state.hotels.find((x) => x.id === btn.dataset.chooseHotel);
    const existingForHotel = placeLodgings.find((b) => b.title === h.name);
    openHotelChooseConfirm(state, h, place, existingForHotel, placeLodgings);
  }));
  el2.querySelectorAll("[data-edit-hotel]").forEach((btn) => btn.addEventListener("click", () => openHotelForm(state, state.hotels.find((x) => x.id === btn.dataset.editHotel), place)));
  el2.querySelectorAll(".hotel-card[data-view-hotel]").forEach((card) => card.addEventListener("click", (e) => {
    if (e.target.closest(".foot")) return;
    const h = state.hotels.find((x) => x.id === card.dataset.viewHotel);
    if (h) openHotelDetailCard(state, h, place);
  }));
}

// Tapping a hotel card (mobile) opens this -- pros/cons, every link
// (Google/Apple Maps, copy address, Book here to booking.com), the same
// Choose this / Chosen -- edit dates action as the desktop table, and
// Edit/Remove. Mirrors openPlaceDetailCard's layout for restaurants/things
// to do so hotels feel like the same kind of card, just with a booking
// action instead of "+ Add to a day".
function openHotelDetailCard(state, h, place) {
  const placeLodgings = lodgingBookingsForPlace(state, place);
  const existingForHotel = placeLodgings.find((b) => b.title === h.name);
  const accent = getAccent(place.id) || "#1d6a8c";
  const rows = [];
  if (h.pros) rows.push(["Why it works", h.pros]);
  if (h.cons) rows.push(["Trade-offs", h.cons]);
  const root = document.getElementById("modalRoot");
  root.innerHTML = "";
  const overlay = el('<div class="modal-overlay"><div class="modal place-modal">' +
    '<div class="pm-head" style="background:' + accent + '">' +
    '<button class="pm-x" id="pmClose" aria-label="Close">&times;</button>' +
    '<div class="pm-kind">Hotel' + (h.splurge ? ' <span class="pm-veg">splurge</span>' : "") +
    (existingForHotel ? ' <span class="pm-veg">' + esc(existingForHotel.status || "idea") + '</span>' : "") + '</div>' +
    '<h3>' + esc(h.name) + '</h3>' +
    '<div class="pm-city">' + esc(h.area) + " &middot; " + esc(h.costLabel || fmtMoney(h.cost, "USD")) + '</div>' +
    '</div>' +
    '<div class="pm-body">' +
    '<div class="idc-rows">' + rows.map((r) => '<div class="idc-row"><span class="idc-label">' + esc(r[0]) + '</span><span class="idc-val">' + esc(r[1]) + '</span></div>').join("") + '</div>' +
    (rows.length === 0 ? '<p class="muted">No extra details yet -- add some from Edit below.</p>' : "") +
    '<div class="pm-actions">' +
    '<button class="btn" id="pmChooseHotel">' + (existingForHotel ? "Chosen -- edit dates" : "Choose this") + '</button>' +
    '<a class="site" href="' + esc(bookingComUrlForPlace(h.name, h.placeId)) + '" target="_blank" rel="noopener">Book here</a>' +
    '</div>' +
    (existingForHotel && placeLodgings.length > 1 ? '<div class="muted" style="font-size:.82rem">Split stay: ' +
      placeLodgings.map((b) => esc(b.title) + " (" + esc(fmtDate(b.date)) + "–" + esc(fmtDate(b.endDate)) + ")").join(", ") + '</div>' : "") +
    mapActionsRow(h.url, appleMapsUrlForPlace(h.name, h.area, h.placeId), locationLabelForPlace(h.name, h.area, h.placeId)) +
    '</div>' +
    '<div class="pm-footer">' +
    '<button class="link" id="pmEditHotel">Edit details</button>' +
    '<button class="link danger" id="pmRemoveHotel">Remove</button>' +
    '</div></div></div>');
  root.appendChild(overlay);
  wireCopyButtons(overlay);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) root.innerHTML = ""; });
  document.getElementById("pmClose").addEventListener("click", () => { root.innerHTML = ""; });
  document.getElementById("pmChooseHotel").addEventListener("click", () => {
    closeModal();
    openHotelChooseConfirm(state, h, place, existingForHotel, placeLodgings);
  });
  document.getElementById("pmEditHotel").addEventListener("click", () => openHotelForm(state, h, place));
  document.getElementById("pmRemoveHotel").addEventListener("click", () => {
    if (confirm('Remove "' + h.name + '"?')) {
      Store.remove("hotels", h.id);
      closeModal();
    }
  });
}

// Choosing a hotel always confirms the exact check-in/check-out dates before
// writing (or updating) the lodging booking -- this is what makes it show up
// correctly in the day-by-day itinerary.
function openHotelChooseConfirm(state, h, place, current, placeLodgings) {
  const range = Store.getStopRangeForPlace(place.id);
  const tripRange = Store.getTripDateRange();
  const others = (placeLodgings || []).filter((b) => !current || b.id !== current.id);
  // If this exact hotel already has a booking, edit its existing dates. If
  // it's a brand new hotel for a place that has NO lodging yet, default to
  // the full stop range like before. But if other hotels are already booked
  // for this place (a split stay), don't default to the full range too --
  // that would just create an overlapping duplicate. Leave it blank instead
  // so the dates get set deliberately to whichever nights are this hotel's.
  const defaultCheckin = current ? current.date : (others.length ? "" : (range ? range.dateStart : (tripRange.start || "")));
  const defaultCheckout = current ? current.endDate : (others.length ? "" : (range ? range.dateEnd : (tripRange.end || "")));
  const splitNote = others.length
    ? '<p class="muted" style="font-size:.84rem">This place already has ' + others.map((b) => esc(b.title) + " (" + esc(fmtDate(b.date)) + "–" + esc(fmtDate(b.endDate)) + ")").join(", ") +
      ' booked. Set the check-in/check-out for just the nights at ' + esc(h.name) + ' -- this adds a separate stay rather than replacing it.</p>'
    : "";
  const body =
    '<p>Confirm your stay at <strong>' + esc(h.name) + '</strong>. This sets the dates shown in the day-by-day itinerary.</p>' +
    splitNote +
    '<label class="field">Check-in</label><input type="date" data-field="date" value="' + esc(defaultCheckin) + '" min="' + esc(tripRange.start || "") + '" max="' + esc(tripRange.end || "") + '">' +
    '<label class="field">Check-out</label><input type="date" data-field="endDate" value="' + esc(defaultCheckout) + '" min="' + esc(tripRange.start || "") + '" max="' + esc(tripRange.end || "") + '">' +
    '<div class="grid2" style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><div><label class="field">Check-in time (optional)</label><input type="time" step="900" data-field="checkinTime" value="' + esc(current ? current.checkinTime : "") + '"></div>' +
    '<div><label class="field">Check-out time (optional)</label><input type="time" step="900" data-field="checkoutTime" value="' + esc(current ? current.checkoutTime : "") + '"></div></div>';
  openModal("Confirm your stay", body, (data) => {
    const payload = {
      category: "lodging", title: h.name, city: h.placeId === "puglia" ? "bari" : place.cityIds[0],
      provider: h.area, cost: h.cost, currency: "USD", link: h.url, notes: h.pros,
      date: data.date, endDate: data.endDate || data.date,
      checkinTime: data.checkinTime || "", checkoutTime: data.checkoutTime || ""
    };
    if (current) Store.update("bookings", current.id, payload);
    else Store.add("bookings", Object.assign({ status: "idea", confirmation: "" }, payload), "bk");
  }, "Confirm stay");
}

function openHotelForm(state, existing, place) {
  const body =
    '<label class="field">Hotel name</label><input data-field="name" value="' + esc(existing ? existing.name : "") + '">' +
    '<label class="field">Area / neighborhood</label><input data-field="area" value="' + esc(existing ? existing.area : "") + '">' +
    '<label class="field">Nightly cost (label, e.g. "~$180-260")</label><input data-field="costLabel" value="' + esc(existing ? existing.costLabel : "") + '">' +
    '<label class="field">Why it works</label><textarea data-field="pros">' + esc(existing ? existing.pros : "") + '</textarea>' +
    '<label class="field">Trade-offs</label><textarea data-field="cons">' + esc(existing ? existing.cons : "") + '</textarea>' +
    (existing ? '<div style="margin-top:8px"><button class="link danger" id="deleteHotelBtn">Remove</button></div>' : "");
  openModal(existing ? "Edit hotel option" : "Add a hotel option", body, (data) => {
    const placeId = existing ? existing.placeId : place.id;
    const payload = { name: data.name, area: data.area, costLabel: data.costLabel, cost: parseInt((data.costLabel.match(/\d+/g) || [0]).reduce((a, b) => +a + +b, 0) / Math.max(1, (data.costLabel.match(/\d+/g) || [1]).length), 10) || 0, pros: data.pros, cons: data.cons, url: mapsUrlForPlace(data.name, data.area, placeId), placeId: placeId, splurge: existing ? existing.splurge : false };
    if (existing) Store.update("hotels", existing.id, payload);
    else Store.add("hotels", payload, "ht");
  });
  if (existing) setTimeout(() => {
    const d = document.getElementById("deleteHotelBtn");
    if (d) d.addEventListener("click", () => { Store.remove("hotels", existing.id); closeModal(); });
  }, 0);
}

// ---- See & do ----
function renderPlaceSee(placeId, state) {
  const place = getPlace(placeId);
  const list = (state.thingsToDo || []).filter((s) => s.placeId === placeId);
  const el2 = document.getElementById("seedo-" + placeId);
  el2.innerHTML = list.map((s) =>
    '<div class="card card-clickable" data-view-see="' + s.id + '"><div class="pic"></div><div class="body"><div class="kind">' + esc(s.kind) + '</div>' +
    '<h4>' + esc(s.name) + '</h4>' +
    '<div class="foot">' +
    '<button class="site" data-add-day-see="' + s.id + '">+ Add to a day</button>' +
    (s.url ? '<a class="site" href="' + esc(s.url) + '" target="_blank" rel="noopener">Map</a>' : "") +
    '</div></div></div>').join("") ||
    '<div class="muted" style="padding:.5rem 0">Nothing saved yet -- use the + next to the section title.</div>';
  el2.querySelectorAll("[data-add-day-see]").forEach((btn) => btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const s = state.thingsToDo.find((x) => x.id === btn.dataset.addDaySee);
    openAddToDayModal(s.name, s.city, s.description, "sight", place);
  }));
  el2.querySelectorAll(".card[data-view-see]").forEach((card) => card.addEventListener("click", (e) => {
    if (e.target.closest(".foot")) return;
    const s = state.thingsToDo.find((x) => x.id === card.dataset.viewSee);
    if (s) openPlaceDetailCard("seedo", s, place);
  }));
}

function openSeeForm(state, existing, place) {
  const cityOpts = place.cityIds.map((id) => '<option value="' + id + '"' + ((existing ? existing.city : place.cityIds[0]) === id ? " selected" : "") + ">" + cityName(id) + "</option>").join("");
  const body =
    '<label class="field">Name</label><input data-field="name" value="' + esc(existing ? existing.name : "") + '">' +
    '<div class="autofill-row"><button type="button" class="link" id="autoFillBtn">✨ Auto-fill from Google</button><span id="autoFillStatus" class="autofill-status"></span></div>' +
    '<input type="hidden" data-field="placeUrl" value="' + esc(existing ? existing.url || "" : "") + '">' +
    '<label class="field">Kind / category</label><input data-field="kind" value="' + esc(existing ? existing.kind : "") + '">' +
    '<label class="field">City</label><select data-field="city">' + cityOpts + '</select>' +
    '<label class="field">Notes (optional, brief)</label><textarea data-field="description" placeholder="Keep it brief, not shown on the card">' + esc(existing ? existing.description : "") + '</textarea>' +
    (existing ? '<div style="margin-top:8px"><button class="link danger" id="deleteSeeBtn">Remove</button></div>' : "");
  openModal(existing ? "Edit" : "Add a thing to do", body, (data) => {
    const payload = { name: data.name, kind: data.kind, city: data.city, description: data.description, url: data.placeUrl || mapsUrlForCity(data.name, data.city), placeId: place.id };
    if (existing) Store.update("thingsToDo", existing.id, payload);
    else Store.add("thingsToDo", payload, "td");
  });
  setTimeout(() => {
    wireAutoFillButton(document.querySelector(".modal-body"));
    if (existing) {
      const d = document.getElementById("deleteSeeBtn");
      if (d) d.addEventListener("click", () => { Store.remove("thingsToDo", existing.id); closeModal(); });
    }
  }, 0);
}

// ---- Where to eat ----
function renderPlaceFood(placeId, state) {
  const place = getPlace(placeId);
  let list = state.restaurants.filter((r) => r.placeId === placeId);
  const filter = foodFilter[placeId] || "all";
  if (filter === "veg") list = list.filter((r) => r.vegetarian);
  if (filter === "nonveg") list = list.filter((r) => !r.vegetarian);
  const el2 = document.getElementById("foodcards-" + placeId);
  el2.innerHTML = list.map((r) =>
    '<div class="card card-clickable" data-view-rest="' + r.id + '"><div class="pic"></div><div class="body">' +
    '<h4>' + esc(r.name) + '</h4>' +
    '<div class="kind">' + esc(r.kind) + ' <span class="veg ' + (r.vegetarian ? "yes" : "no") + '">' + (r.vegetarian ? "vegetarian" : "omnivore") + '</span></div>' +
    '<div class="foot">' +
    '<button class="site" data-add-day="' + r.id + '">+ Add to a day</button>' +
    (r.url ? '<a class="site" href="' + esc(r.url) + '" target="_blank" rel="noopener">Map</a>' : "") +
    '</div></div></div>').join("") ||
    '<div class="muted" style="padding:.5rem 0">Nothing saved yet -- use the + next to the section title.</div>';
  el2.querySelectorAll("[data-add-day]").forEach((btn) => btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const r = state.restaurants.find((x) => x.id === btn.dataset.addDay);
    openAddToDayModal(r.name + " (" + r.kind + ")", r.city, r.description, "meal", place);
  }));
  el2.querySelectorAll(".card[data-view-rest]").forEach((card) => card.addEventListener("click", (e) => {
    if (e.target.closest(".foot")) return;
    const r = state.restaurants.find((x) => x.id === card.dataset.viewRest);
    if (r) openPlaceDetailCard("restaurant", r, place);
  }));
}

// Shared "add to a day" modal used by both See & Do and Where to Eat cards --
// a real calendar date (bounded to the trip's date range) plus an optional
// time, so a dinner reservation can carry its time. Feeds straight into the
// day-by-day itinerary via a new activity.
function openAddToDayModal(title, cityId, notes, type, place) {
  const range = place ? Store.getStopRangeForPlace(place.id) : null;
  const tripRange = Store.getTripDateRange();
  const defaultDate = (range && range.dateStart) || tripRange.start || "";
  const body =
    '<label class="field">Date</label><input type="date" data-field="date" value="' + esc(defaultDate) +
    '" min="' + esc(tripRange.start || "") + '" max="' + esc(tripRange.end || "") + '">' +
    '<p class="wl-hint">Not sure which day? Clear the date to park it on the <strong>wishlist</strong> and pick a day later.</p>' +
    '<label class="field">Time (optional)</label><input type="time" step="900" data-field="time">' +
    '<div class="grid2" style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><div><label class="field">Cost per person (optional)</label><input data-field="cost" type="number"></div>' +
    '<div><label class="field">Currency</label><select data-field="currency"><option value="USD">USD</option><option value="EUR">EUR</option></select></div></div>';
  openModal('Add "' + title + '" to your itinerary', body, (data) => {
    Store.add("activities", { date: data.date || "", time: data.time || "", city: cityId, title: title, type: type, notes: notes, status: "idea", cost: parseFloat(data.cost) || 0, currency: data.currency || "USD", placeId: place ? place.id : "" }, "a");
  }, "Add to itinerary");
}

// Wishlist: activities saved without a date. Grouped under the place whose
// cities they belong to (falls back to the stored placeId for cities shared
// across stops).
function getWishlist(state, place) {
  return (state.activities || []).filter((a) => !a.date &&
    (a.placeId === place.id || place.cityIds.includes(a.city)));
}

function renderPlaceWishlist(placeId, state) {
  const place = getPlace(placeId);
  const host = document.getElementById("wishlist-" + placeId);
  if (!host) return;
  const items = getWishlist(state, place);
  if (!items.length) { host.innerHTML = ""; host.style.display = "none"; return; }
  host.style.display = "";
  host.innerHTML =
    '<div class="wl-title">Wishlist <span class="wl-count">' + items.length + ' unscheduled</span></div>' +
    items.map((a) =>
      '<div class="wl-item"><span>' + esc(a.title) + '</span>' +
      '<span class="wl-actions"><button class="move-tomorrow" data-wl-schedule="' + a.id + '">pick a day</button>' +
      '<button class="link danger" data-wl-remove="' + a.id + '">&times;</button></span></div>').join("");
  host.querySelectorAll("[data-wl-schedule]").forEach((btn) => btn.addEventListener("click", () => {
    const a = state.activities.find((x) => x.id === btn.dataset.wlSchedule);
    if (!a) return;
    const range = Store.getStopRangeForPlace(placeId);
    const tripRange = Store.getTripDateRange();
    const body = '<label class="field">Date</label><input type="date" data-field="date" value="' +
      esc((range && range.dateStart) || tripRange.start || "") + '" min="' + esc(tripRange.start || "") + '" max="' + esc(tripRange.end || "") + '">' +
      '<label class="field">Time (optional)</label><input type="time" step="900" data-field="time" value="' + esc(a.time || "") + '">';
    openModal('Schedule "' + a.title + '"', body, (data) => {
      if (data.date) Store.update("activities", a.id, { date: data.date, time: data.time || "" });
    }, "Schedule");
  }));
  host.querySelectorAll("[data-wl-remove]").forEach((btn) => btn.addEventListener("click", () => {
    const a = state.activities.find((x) => x.id === btn.dataset.wlRemove);
    if (a && confirm('Remove "' + a.title + '" from the wishlist?')) Store.remove("activities", a.id);
  }));
}

function renderPlaces(state) {
  getPlaces().forEach((p) => {
    // Skip places whose section skeleton isn't in the DOM yet (e.g. a place
    // just added to the catalog before buildPlacesSkeleton has rebuilt).
    // The add flow rebuilds the skeleton, then this renders the dynamic parts.
    if (!document.getElementById("days-" + p.id)) return;
    renderPlaceNights(p.id, state); renderPlaceWishlist(p.id, state); renderPlaceDays(p.id, state); renderPlaceHotels(p.id, state); renderPlaceSee(p.id, state); renderPlaceFood(p.id, state);
  });
}

// ---- forms ----
function openActivityForm(state, date, existing, place) {
  const cityOpts = CITIES.map((c) => '<option value="' + c.id + '"' + (existing && existing.city === c.id ? " selected" : "") + ">" + c.name + "</option>").join("");
  const typeOpts = ["sight", "meal", "experience", "free"].map((t) => '<option value="' + t + '"' + (existing && existing.type === t ? " selected" : "") + ">" + t + "</option>").join("");
  const statusOpts = ["idea", "booked", "confirmed"].map((s) => '<option value="' + s + '"' + ((existing ? existing.status : "idea") === s ? " selected" : "") + ">" + s + "</option>").join("");
  const currencyOpts = ["USD", "EUR"].map((c) => '<option value="' + c + '"' + ((existing ? existing.currency : "USD") === c ? " selected" : "") + ">" + c + "</option>").join("");
  const tripRange = Store.getTripDateRange();
  const dateVal = existing ? existing.date : date;
  const body =
    '<label class="field">Title (a dinner spot, a sight, a tour)</label><input data-field="title" value="' + esc(existing ? existing.title : "") + '">' +
    '<label class="field">Date</label><input type="date" data-field="date" value="' + esc(dateVal || "") + '" min="' + esc(tripRange.start || "") + '" max="' + esc(tripRange.end || "") + '">' +
    '<label class="field">Time (optional)</label><input type="time" step="900" data-field="time" value="' + esc(existing ? existing.time : "") + '">' +
    '<label class="field">City</label><select data-field="city">' + cityOpts + '</select>' +
    '<label class="field">Type</label><select data-field="type">' + typeOpts + '</select>' +
    '<div class="grid2" style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><div><label class="field">Cost per person (optional)</label><input data-field="cost" type="number" value="' + (existing && existing.cost ? existing.cost : "") + '"></div>' +
    '<div><label class="field">Currency</label><select data-field="currency">' + currencyOpts + '</select></div></div>' +
    '<label class="field">Status</label><select data-field="status">' + statusOpts + '</select>' +
    '<label class="field">Notes</label><textarea data-field="notes">' + esc(existing ? existing.notes : "") + '</textarea>' +
    (existing ? '<div style="margin-top:8px"><button class="link danger" id="deleteActBtn">Remove this item</button></div>' : "");
  openModal(existing ? "Edit itinerary item" : "Add to " + (dateVal ? fmtDate(dateVal) : "your itinerary"), body, (data) => {
    const payload = { date: data.date, title: data.title, time: data.time, city: data.city, type: data.type, notes: data.notes, status: data.status || (existing ? existing.status : "idea"), cost: parseFloat(data.cost) || 0, currency: data.currency || "USD" };
    if (existing) Store.update("activities", existing.id, payload);
    else Store.add("activities", payload, "a");
  }, "Save");
  if (existing) setTimeout(() => {
    const d = document.getElementById("deleteActBtn");
    if (d) d.addEventListener("click", () => { Store.remove("activities", existing.id); closeModal(); });
  }, 0);
}

function openBookingForm(state, existing, place, defaultDate) {
  const cats = ["lodging", "flight", "train", "ferry", "catamaran", "bus", "other"];
  const catOpts = cats.map((c) => '<option value="' + c + '"' + (existing && existing.category === c ? " selected" : "") + ">" + c + "</option>").join("");
  const statusOpts = ["idea", "booked", "confirmed"].map((s) => '<option value="' + s + '"' + (existing && existing.status === s ? " selected" : "") + ">" + s + "</option>").join("");
  const currencyOpts = ["USD", "EUR"].map((c) => '<option value="' + c + '"' + ((existing ? existing.currency : "USD") === c ? " selected" : "") + ">" + c + "</option>").join("");
  const defaultCity = existing ? existing.city : (place ? place.cityIds[0] : CITIES[0].id);
  const cityOpts = CITIES.map((c) => '<option value="' + c.id + '"' + (defaultCity === c.id ? " selected" : "") + ">" + c.name + "</option>").join("");
  const tripRange = Store.getTripDateRange();
  const startVal = existing ? existing.date : (defaultDate || tripRange.start || "");
  const body =
    '<label class="field">What is this? (e.g. "Hotel Ravello" or "Rome -> Bari train")</label><input data-field="title" value="' + esc(existing ? existing.title : "") + '">' +
    '<label class="field">Category</label><select data-field="category">' + catOpts + '</select>' +
    '<label class="field">City (for a stay)</label><select data-field="city">' + cityOpts + '</select>' +
    '<div class="grid2" style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><div><label class="field">Date (check-in / travel day)</label><input type="date" data-field="date" value="' + esc(startVal) + '" min="' + esc(tripRange.start || "") + '" max="' + esc(tripRange.end || "") + '"></div>' +
    '<div><label class="field">End date (checkout day, if a stay)</label><input type="date" data-field="endDate" value="' + esc(existing ? existing.endDate : "") + '" min="' + esc(tripRange.start || "") + '" max="' + esc(tripRange.end || "") + '"></div></div>' +
    '<label class="field">Time (optional)</label><input type="time" step="900" data-field="time" value="' + esc(existing ? existing.time : "") + '">' +
    '<div class="grid2" style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><div><label class="field">Check-in time (for a stay)</label><input type="time" step="900" data-field="checkinTime" value="' + esc(existing ? existing.checkinTime : "") + '"></div>' +
    '<div><label class="field">Check-out time (for a stay)</label><input type="time" step="900" data-field="checkoutTime" value="' + esc(existing ? existing.checkoutTime : "") + '"></div></div>' +
    '<label class="field">Provider</label><input data-field="provider" value="' + esc(existing ? existing.provider : "") + '">' +
    '<label class="field">Confirmation #</label><input data-field="confirmation" value="' + esc(existing ? existing.confirmation : "") + '">' +
    '<div class="grid2" style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><div><label class="field">Cost per person</label><input data-field="cost" type="number" value="' + (existing ? existing.cost : "") + '"></div>' +
    '<div><label class="field">Currency</label><select data-field="currency">' + currencyOpts + '</select></div></div>' +
    '<label class="field">Status</label><select data-field="status">' + statusOpts + '</select>' +
    '<label class="field">Link</label><input data-field="link" value="' + esc(existing ? existing.link : "") + '">' +
    '<label class="field">Notes</label><textarea data-field="notes">' + esc(existing ? existing.notes : "") + '</textarea>' +
    (existing ? '<div style="margin-top:8px"><button class="link danger" id="deleteBkBtn">Remove this booking</button></div>' : "");
  openModal(existing ? "Edit booking" : "Add booking", body, (data) => {
    const payload = Object.assign({}, data, {
      date: data.date,
      endDate: data.endDate || data.date,
      cost: parseFloat(data.cost) || 0
    });
    if (existing) Store.update("bookings", existing.id, payload);
    else Store.add("bookings", payload, "bk");
  }, "Save");
  if (existing) setTimeout(() => {
    const d = document.getElementById("deleteBkBtn");
    if (d) d.addEventListener("click", () => { Store.remove("bookings", existing.id); closeModal(); });
  }, 0);
}

function openRestForm(state, existing, place) {
  const cityOpts = place.cityIds.map((id) => '<option value="' + id + '"' + ((existing ? existing.city : place.cityIds[0]) === id ? " selected" : "") + ">" + cityName(id) + "</option>").join("");
  const body = '<label class="field">Name</label><input data-field="name" value="' + esc(existing ? existing.name : "") + '">' +
    '<div class="autofill-row"><button type="button" class="link" id="autoFillBtn">✨ Auto-fill from Google</button><span id="autoFillStatus" class="autofill-status"></span></div>' +
    '<input type="hidden" data-field="placeUrl" value="' + esc(existing ? existing.url || "" : "") + '">' +
    '<label class="field">Kind / specialty</label><input data-field="kind" value="' + esc(existing ? existing.kind : "") + '">' +
    '<label class="field">City</label><select data-field="city">' + cityOpts + '</select>' +
    '<label class="field">Notes (optional -- reservation info, tips)</label><textarea data-field="description" placeholder="Keep it brief, not shown on the card">' + esc(existing ? existing.description : "") + '</textarea>' +
    '<label class="field">Vegetarian friendly?</label><select data-field="vegetarian"><option value="true"' + (existing && existing.vegetarian ? " selected" : "") + '>Yes</option><option value="false"' + (existing && !existing.vegetarian ? " selected" : "") + '>No</option></select>' +
    (existing ? '<div style="margin-top:8px"><button class="link danger" id="deleteRestBtn">Remove</button></div>' : "");
  openModal(existing ? "Edit" : "Add restaurant", body, (data) => {
    const payload = { name: data.name, kind: data.kind, city: data.city, description: data.description, url: data.placeUrl || mapsUrlForCity(data.name, data.city), vegetarian: data.vegetarian === "true", placeId: place.id };
    if (existing) Store.update("restaurants", existing.id, payload);
    else Store.add("restaurants", payload, "r");
  });
  setTimeout(() => {
    wireAutoFillButton(document.querySelector(".modal-body"));
    if (existing) {
      const d = document.getElementById("deleteRestBtn");
      if (d) d.addEventListener("click", () => { Store.remove("restaurants", existing.id); closeModal(); });
    }
  }, 0);
}

// ---- today view: collapses straight to the current day while traveling ----
function renderTodayView(state) {
  const section = document.getElementById("todayView");
  if (!section) return;
  // ?today=YYYY-MM-DD lets you preview any trip day before the trip starts
  // (e.g. index.html?today=2026-09-18). During the trip it works off the
  // real date automatically. The ‹ › arrows page through nearby days.
  const previewDate = new URLSearchParams(location.search).get("today");
  const baseISO = previewDate || localTodayISO();
  const days = Store.getItineraryDays();
  const viewISO = isoAddDays(baseISO, todayViewOffset);
  const today = days.find((d) => d.date === viewISO);
  // The widget itself always shows -- even long before the trip starts, long
  // after it ends, or before any itinerary exists at all -- so the ‹ › page
  // controls are always there to browse forward into the real trip days.
  // Only the content underneath changes based on whether this particular
  // date has an itinerary day.
  section.style.display = "";
  const rel = todayViewOffset;
  const badge = document.getElementById("tvBackToday");
  if (badge) {
    // Default state is today, so no reset control at all there -- nothing
    // to reset. The moment you're on any other date (via the arrows or
    // the calendar picker), this becomes a compact "‹ Today" button.
    if (rel === 0) {
      badge.classList.add("hidden");
      badge.onclick = null;
    } else {
      badge.classList.remove("hidden");
      badge.onclick = () => { todayViewOffset = 0; renderTodayView(Store.getState()); };
    }
  }
  const dateBtn = document.getElementById("todayDate");
  const dateInput = document.getElementById("tvDateInput");
  const dayCounterEl = document.getElementById("tvDayCounter");
  if (dateBtn) {
    dateBtn.textContent = fmtDate(viewISO);
  }
  if (dateInput) {
    // The real <input type="date"> sits invisibly right on top of the
    // calendar icon button (see CSS, .tv-cal-btn), which now lives next to
    // the ‹ › arrows instead of inline with the date text -- tapping the
    // icon taps the input directly, which is what actually opens the
    // native picker reliably, and its screen position no longer shifts
    // as the date text next to it changes width.
    // Keeping its value synced every render means whenever it's tapped,
    // the picker already opens on the date currently being viewed.
    dateInput.value = viewISO;
    dateInput.onchange = () => {
      if (!dateInput.value) return;
      todayViewOffset = isoDiffDays(baseISO, dateInput.value);
      renderTodayView(Store.getState());
      // Some browsers leave the native picker UI open until the input
      // actually loses focus -- blur it once a date's picked so it
      // collapses right away instead of lingering over the sheet.
      dateInput.blur();
    };
  }
  const prevBtn = document.getElementById("tvPrev");
  const nextBtn = document.getElementById("tvNext");
  if (prevBtn && nextBtn) {
    prevBtn.disabled = false;
    nextBtn.disabled = false;
    prevBtn.onclick = () => { todayViewOffset--; renderTodayView(Store.getState()); };
    nextBtn.onclick = () => { todayViewOffset++; renderTodayView(Store.getState()); };
  }
  const contentEl = document.getElementById("todayContent");
  if (!today) {
    // No itinerary day for this date -- show the countdown card (days to
    // go / which day of the trip / wrap-up message) so it's still obvious
    // how far off the trip is without a separate banner section above.
    const range = Store.getTripDateRange();
    const cd = buildCountdownCardHtml();
    let msg = "";
    // Header day-counter (top-right of row 1) otherwise sits empty on any
    // date outside the itinerary -- fill it with the same days-to-go /
    // wrapped-up framing as the countdown card below, so there's always
    // something there instead of a blank corner.
    let counterText = "";
    if (!range.start) {
      msg = "Add stops to your itinerary to see day-by-day plans here.";
    } else {
      const viewD = new Date(viewISO + "T00:00:00");
      const startD = new Date(range.start + "T00:00:00");
      const endD = range.end ? new Date(range.end + "T00:00:00") : null;
      // The countdown card already covers the "before trip" and "after
      // trip" cases relative to *actual* today; only add text here for
      // dates being browsed via the ‹ › controls that fall outside both
      // the countdown's message and the real schedule.
      if (!(viewD < startD) && !(endD && viewD >= endD)) {
        msg = "No itinerary set for " + fmtDate(viewISO) + " yet.";
      }
      if (viewD < startD) {
        const daysToGo = Math.round((startD - viewD) / 86400000);
        counterText = daysToGo === 1 ? "1 day to go" : daysToGo + " days to go";
      } else if (endD && viewD >= endD) {
        counterText = "Trip complete";
      }
    }
    contentEl.innerHTML = cd + (msg ? '<div class="muted" style="padding:.6rem 0">' + esc(msg) + '</div>' : "");
    if (dayCounterEl) dayCounterEl.textContent = counterText;
    return;
  }
  const place = getPlace(today.placeId);
  const dayNum = days.indexOf(today) + 1;
  if (dayCounterEl) dayCounterEl.textContent = "Day " + dayNum + " of " + days.length;
  const accent = getAccent(today.placeId) || "#1d6a8c";
  // Now/Next markers only make sense on the actual current day.
  let nowId = null, nextId = null;
  if (rel === 0 && !previewDate) {
    const nowHM = new Date().toTimeString().slice(0, 5);
    const timed = today.activities.filter((a) => a.time);
    const past = timed.filter((a) => a.time <= nowHM);
    if (past.length) nowId = past[past.length - 1].id;
    const upcoming = timed.find((a) => a.time > nowHM);
    if (upcoming) nextId = upcoming.id;
  }
  // A live forecast is only meaningful once you're close to (or on) the
  // trip -- otherwise it's just today's weather at home. Gated on the
  // trip's real dates (not whatever day is being browsed via ‹ ›), so
  // paging around doesn't spuriously trigger fetches; the fetched day is
  // whichever one is actually being viewed.
  const tripRangeNow = Store.getTripDateRange();
  const realTodayISO = localTodayISO();
  const daysToTripFromNow = tripRangeNow.start ? Math.ceil((new Date(tripRangeNow.start) - new Date(realTodayISO)) / 86400000) : null;
  const tripUnderwayNow = tripRangeNow.start && tripRangeNow.end && realTodayISO >= tripRangeNow.start && realTodayISO <= tripRangeNow.end;
  const showLiveForecast = today.cityId && (tripUnderwayNow || (daysToTripFromNow !== null && daysToTripFromNow <= 10 && daysToTripFromNow >= 0));
  // Jump-to-city: right-justified next to the day count, scrolls to this
  // day's city section in the itinerary below (reuses the same
  // scrollIntoView pattern as the itinerary editor's .ie-jump rows).
  const jumpBtnHtml = place
    ? '<button class="tv-jump-btn" data-jump="' + esc(today.placeId) + '" title="Jump to ' + esc(place.label) + ' in the itinerary">Jump to ' + esc(place.label) +
      '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></button>'
    : "";
  const cityHtml = place
    ? '<div class="tv-city" style="color:' + accent + '">' + esc(place.label) +
      '<span class="tv-daynum">Day ' + dayNum + " of " + days.length + '</span>' +
      '<span class="tv-city-right">' +
      (showLiveForecast ? '<span class="tv-forecast muted" id="todayForecastStrip">Loading forecast&hellip;</span>' : "") +
      jumpBtnHtml + '</span></div>'
    : "";
  // ---- Bookings: every lodging booking active on this day -- shows on
  // EVERY day it spans (Check-in on day one, Staying at on the nights in
  // between, Check-out on the last day), not just the two boundary days --
  // plus transport for the day. A quick "what's booked today" reference,
  // separate from the chronological plan below. Each row's accent (border
  // + background tint) matches that booking's OWN city, found by locating
  // which stop range its check-in date falls in.
  const ranges = Store.computeStopRanges();
  const placeIdForDate = (d) => {
    const r = ranges.find((rr) => d >= rr.dateStart && d < rr.dateEnd);
    return (r && r.placeId) || today.placeId;
  };
  const activeLodging = (state.bookings || []).filter((b) => b.category === "lodging" && b.date <= today.date && today.date <= b.endDate);
  const bkRows = activeLodging.map((b) => {
    const acc = getAccent(placeIdForDate(b.date)) || "#1d6a8c";
    const label = b.date === today.date && b.endDate === today.date ? "Check-in & check-out"
      : b.date === today.date ? "Check-in"
      : b.endDate === today.date ? "Check-out"
      : "Staying at";
    return renderTvBookingRow(b.id, label, b.title, b.status, acc);
  });
  today.transport.forEach((t) => bkRows.push(renderTvBookingRow(t.id, transportCategoryLabel(t.category), t.title, t.status, accent)));
  const bookingsHtml = bkRows.length
    ? '<div class="tv-bookings"><span class="tv-bookings-label">Bookings</span><div class="tv-bk-list">' + bkRows.join("") + '</div></div>'
    : "";
  // ---- Itinerary: timed activities plus any timed booking moment
  // (check-in/out with a time set, timed transport) merged into one
  // chronological list. Booking-linked rows get the .rail-event
  // colored-border treatment instead of a solid fill -- see
  // renderTvBookingEventLine. Untimed activities are split out into a
  // separate Anytime list below -- see renderTvAnytimeLine.
  const bkEvents = bookingEventsForDate(state, today.date);
  const eventAccent = (ev) => (ev.label === "Check-in" || ev.label === "Check-out") ? (getAccent(placeIdForDate(ev.booking.date)) || "#1d6a8c") : accent;
  const timedActivities = today.activities.filter((a) => a.time);
  const anytimeActivities = today.activities.filter((a) => !a.time);
  const merged = timedActivities.map((a) => ({
    time: a.time,
    html: renderTodayActivityLine(a, a.id === nowId ? "now" : a.id === nextId ? "next" : null)
  })).concat(bkEvents.map((ev) => ({ time: ev.time, html: renderTvBookingEventLine(ev, eventAccent(ev)) })))
    .sort((x, y) => x.time.localeCompare(y.time)).map((x) => x.html).join("");
  const itinHtml = '<span class="tv-itin-label">Itinerary</span><div class="tv-itin">' +
    (merged || '<div class="muted" style="padding:.4rem 0">Nothing scheduled yet for this day.</div>') + '</div>';
  const anytimeHtml = anytimeActivities.length
    ? '<span class="tv-itin-label tv-anytime-label">Anytime</span><div class="tv-itin">' + anytimeActivities.map(renderTvAnytimeLine).join("") + '</div>'
    : "";
  contentEl.innerHTML = cityHtml + bookingsHtml + itinHtml + anytimeHtml;
  if (showLiveForecast) renderTodayForecastStrip(today.cityId, today.date);
  contentEl.querySelectorAll("[data-jump]").forEach((btn) => btn.addEventListener("click", () => {
    const target = document.getElementById(btn.dataset.jump);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  }));
  contentEl.querySelectorAll("[data-view-booking]").forEach((row) => row.addEventListener("click", () => {
    const b = Store.getState().bookings.find((x) => x.id === row.dataset.viewBooking);
    if (b) openItemDetailCard("booking", b, place);
  }));
  contentEl.querySelectorAll("[data-view-activity]").forEach((row) => row.addEventListener("click", () => {
    const a = Store.getState().activities.find((x) => x.id === row.dataset.viewActivity);
    if (a) openItemDetailCard("activity", a, place);
  }));
}

// Fills in the "Loading forecast..." placeholder in the Today view's city
// line with a real high/low for the specific day being viewed, once it's
// close enough to matter (see showLiveForecast above). Silently removes
// the placeholder on any failure or if the date falls outside the
// forecast API's window -- no error state needed for a nice-to-have strip.
async function renderTodayForecastStrip(cityId, dateISO) {
  const stripEl = document.getElementById("todayForecastStrip");
  if (!stripEl) return;
  const c = CITIES.find((x) => x.id === cityId);
  if (!c) { stripEl.remove(); return; }
  try {
    const res = await fetch("https://api.open-meteo.com/v1/forecast?latitude=" + c.lat + "&longitude=" + c.lng +
      "&daily=temperature_2m_max,temperature_2m_min&forecast_days=10&temperature_unit=fahrenheit&timezone=auto");
    const j = await res.json();
    const idx = j.daily && j.daily.time ? j.daily.time.indexOf(dateISO) : -1;
    const stillThere = document.getElementById("todayForecastStrip");
    if (!stillThere) return; // view re-rendered while the fetch was in flight
    if (idx === -1) { stillThere.remove(); return; }
    const hi = Math.round(j.daily.temperature_2m_max[idx]);
    const lo = Math.round(j.daily.temperature_2m_min[idx]);
    stillThere.textContent = "Forecast " + hi + "F / " + lo + "F";
  } catch (e) {
    const stillThere = document.getElementById("todayForecastStrip");
    if (stillThere) stillThere.remove();
  }
}

// ---- hero + intro ----
// Hero leads with the concrete facts (trip name, dates, day/destination
// counts) so those are visible without reading the narrative -- the
// narrative itself lives behind the "Trip overview" toggle just below, and
// the full city-by-city route is intentionally NOT repeated here since the
// itinerary editor's own summary line (just below the hero) already shows
// it -- no need to maintain the same route text in two places.
function renderHero(state) {
  const totalDays = Store.getTotalDays();
  const range = Store.getTripDateRange();
  const dateLabel = range.start
    ? fmtDateShort(range.start) + (range.end && range.end !== range.start ? " – " + fmtDateShort(range.end) : "")
    : "Dates not set";
  document.title = state.meta.tripName + " · " + totalDays + " days";
  // Trip name only here -- the dates already appear once, in the stat
  // line just below (dateLabel was previously duplicated in both places).
  const eyebrowEl = document.getElementById("heroEyebrow");
  if (eyebrowEl) eyebrowEl.textContent = state.meta.tripName;
  document.getElementById("heroMeta").innerHTML =
    '<span>' + esc(dateLabel) + '</span><span>' + totalDays + ' days</span>';
}

// Hero intro: loads full-bleed (100dvh, set as the default in CSS so
// there's no flash of the small version before this runs), holds for a
// beat, then morphs down to a compact top-of-page banner. There's no
// client-side routing on this site, so every page load already is a
// "fresh load" -- no session tracking needed to make this a one-time-per-
// visit flourish. Skips straight to the collapsed state for
// prefers-reduced-motion (matches the site's existing reduced-motion
// policy, which already turns off the CSS transition itself via the
// global `*{transition:none!important}` rule -- this additionally skips
// the ~2s full-bleed hold, so those users don't have to wait through a
// full-screen takeover just to land on an instant jump-cut).
const HERO_TITLE_COMPACT = 'Italy <span class="hero-plus">&amp;</span> Croatia <em>2026</em>';
function initHeroIntro() {
  const hero = document.getElementById("hero");
  const heroTitle = document.getElementById("heroTitle");
  if (!hero) return;
  // The bottom tab bar has nothing to do while the hero is still the
  // full-bleed splash (logo only, no nav-worthy content on screen yet) --
  // hide it for that brief hold, same as the collapse itself skips
  // straight through under reduced motion.
  document.body.classList.add("hero-full-hold");
  const collapse = () => {
    hero.classList.add("hero-collapsed");
    document.body.classList.remove("hero-full-hold");
    if (heroTitle) heroTitle.innerHTML = HERO_TITLE_COMPACT;
  };
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) { collapse(); return; }
  setTimeout(collapse, 2000);
}

// Countdown card markup -- days-to-go before the trip, which day you're on
// while traveling, or a wrap-up message afterward. Rendered inside the
// Today box (see renderTodayView) in place of its old plain-text
// "no itinerary yet" message. Was previously its own standalone banner
// section between the hero and Today; folding it in here reclaims a full
// section of mobile scroll with no data lost. Returns "" if no trip start
// date is set yet.
// Days/hours/minutes segments for the pre-trip countdown, computed off the
// real precise instant (not date-only) so it's a genuine live timer, not
// just a day count. Shared by the initial render and by tickCountdowns(),
// which recomputes this every 30s to keep it moving without a full re-render.
function countdownParts(startD) {
  const diff = Math.max(0, startD.getTime() - Date.now());
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000)
  };
}
function countdownTimerHtml(startD) {
  const p = countdownParts(startD);
  return '<div class="cd-timer">' +
    '<div class="cd-seg"><span class="cd-num">' + p.days + '</span><span class="cd-unit">' + (p.days === 1 ? "day" : "days") + '</span></div>' +
    '<div class="cd-seg"><span class="cd-num">' + String(p.hours).padStart(2, "0") + '</span><span class="cd-unit">hrs</span></div>' +
    '<div class="cd-seg"><span class="cd-num">' + String(p.minutes).padStart(2, "0") + '</span><span class="cd-unit">min</span></div>' +
    "</div>";
}
// Ticks every live countdown card on the page in place -- no re-render, so
// it doesn't disturb scroll position or any other Today-view state. No-op
// if there's no upcoming-trip countdown card currently in the DOM.
function tickCountdowns() {
  document.querySelectorAll(".cd-card.cd-upcoming[data-countdown-start]").forEach((card) => {
    const startD = new Date(card.dataset.countdownStart + "T00:00:00");
    const p = countdownParts(startD);
    const segs = card.querySelectorAll(".cd-seg");
    if (segs.length !== 3) return;
    segs[0].querySelector(".cd-num").textContent = p.days;
    segs[0].querySelector(".cd-unit").textContent = p.days === 1 ? "day" : "days";
    segs[1].querySelector(".cd-num").textContent = String(p.hours).padStart(2, "0");
    segs[2].querySelector(".cd-num").textContent = String(p.minutes).padStart(2, "0");
  });
}
function buildCountdownCardHtml() {
  const range = Store.getTripDateRange();
  if (!range.start) return "";
  const msPerDay = 86400000;
  const todayISO = localTodayISO();
  const todayD = new Date(todayISO + "T00:00:00");
  const startD = new Date(range.start + "T00:00:00");
  const endD = range.end ? new Date(range.end + "T00:00:00") : null;
  if (todayD < startD) {
    return '<div class="cd-card cd-upcoming" data-countdown-start="' + esc(range.start) + '">' + countdownTimerHtml(startD) +
      '<div class="cd-label">until departure<span class="cd-sub">' + esc(fmtDate(range.start)) + '</span></div></div>';
  }
  if (endD && todayD >= endD) {
    return '<div class="cd-card cd-done"><div class="cd-num">&#10003;</div><div class="cd-label">Trip complete<span class="cd-sub">Hope it was unforgettable</span></div></div>';
  }
  const dayNum = Math.round((todayD - startD) / msPerDay) + 1;
  const totalDays = Store.getTotalDays();
  return '<div class="cd-card cd-live"><div class="cd-num">' + dayNum + '</div><div class="cd-label">of ' + totalDays +
    " -- you're on the trip<span class=\"cd-sub\">Enjoy today</span></div></div>";
}

// ---- booking status at a glance: hotels + inter-city transport only, the
// two categories that actually need to get locked in before the trip ----
function renderBookingStatus(state) {
  const el2 = document.getElementById("bookingStatusPanel");
  if (!el2) return;
  const ranges = Store.computeStopRanges();
  // Small at-a-glance icon next to each status pill on the booking dashboard
  // (missing/idea/booked/confirmed) -- same info as the pill's color, but
  // scannable from a quick glance down the column, not just by reading text.
  const statusIcon = (status) => {
    const attrs = 'viewBox="0 0 24 24" width="14" height="14" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"';
    const icons = {
      confirmed: '<svg ' + attrs + ' stroke="var(--good)"><circle cx="12" cy="12" r="9"/><path d="M8.3 12.3l2.6 2.6 4.8-5.8"/></svg>',
      booked: '<svg ' + attrs + ' stroke="#7a5c00"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v4.8l3.2 1.8"/></svg>',
      idea: '<svg ' + attrs + ' stroke="#8a4a1c"><circle cx="12" cy="12" r="9" stroke-dasharray="2.4 3"/></svg>',
      missing: '<svg ' + attrs + ' stroke="var(--danger)"><path d="M12 3.5l9.5 16.5h-19z"/><line x1="12" y1="9.5" x2="12" y2="14"/><circle cx="12" cy="17" r=".35" fill="var(--danger)" stroke="none"/></svg>'
    };
    return icons[status] || icons.idea;
  };
  const statusCell = (status) => '<span class="bs-status">' + statusIcon(status) + '<span class="status-pill ' + esc(status) + '">' + esc(status) + '</span></span>';
  // Grouped by place instead of one flat row-per-booking list -- a stop can
  // legitimately have more than one lodging booking (hotel-hopping within a
  // city), but the far more common reason you see 2+ rows under the same
  // city is that an earlier hotel pick was never removed after choosing a
  // different one. The two look identical unless you check the dates, so
  // this flags it explicitly: overlapping date ranges under one place get a
  // conflict warning + are visually marked, and every row gets a one-click
  // remove so cleaning up a stray old pick doesn't require opening the full
  // edit form just to find the delete link at the bottom.
  // Walked night-by-night instead of booking-by-booking: for every calendar
  // night of a stay, find whichever lodging booking(s) actually cover it,
  // then collapse consecutive nights with identical coverage into one row.
  // A single hotel booked for the whole stay still reads as one clean row
  // (same as before), but a gap in coverage now shows its own "no hotel"
  // row instead of silently vanishing, and this is driven entirely by the
  // stop's own date range, so a differently-tagged booking (e.g. a
  // Bari-tagged hotel with drifted Rome-window dates) can never bleed in --
  // it's excluded by the city-membership filter before dates even matter.
  // Cards instead of table rows -- grouped by city (hotels) / by leg
  // (transport), each night-run or booking as its own clickable card that
  // opens the actual booking (tapping a table "edit" link used to be the
  // only way in; now the whole card is the click target, same convention
  // as every other list in this app). A missing night/leg still gets its
  // own card with a status pill + CTA, so a gap can't silently disappear.
  const hotelGroups = ranges.map((r) => {
    const place = getPlace(r.placeId);
    const placeLabel = esc(place ? place.label : r.placeId);
    const placeDateLabel = r.dateStart ? esc(fmtDate(r.dateStart)) + " &ndash; " + esc(fmtDate(r.dateEnd)) : "dates not set";
    const headHtml = '<div class="bs-city-head" data-bs-city="' + esc(r.placeId) + '">' + placeLabel + '<span class="bs-place-nights muted">' + placeDateLabel + '</span></div>';
    if (!r.dateStart || !r.nights) {
      return '<div class="bs-block" data-bs-hotel-block="' + esc(r.placeId) + '">' + headHtml + '<div class="bs-cards"><div class="muted">Set trip dates to track by night.</div></div></div>';
    }
    const lodgings = state.bookings.filter((b) => b.category === "lodging" && (!place || place.cityIds.includes(b.city)));
    const nightList = [];
    for (let i = 0; i < r.nights; i++) {
      const date = isoAddDays(r.dateStart, i);
      nightList.push({ date, covering: lodgings.filter((b) => b.date <= date && b.endDate > date) });
    }
    const runs = [];
    nightList.forEach((n) => {
      const key = n.covering.map((b) => b.id).sort().join(",");
      const last = runs[runs.length - 1];
      if (last && last.key === key) last.endDate = isoAddDays(n.date, 1);
      else runs.push({ key, startDate: n.date, endDate: isoAddDays(n.date, 1), covering: n.covering });
    });
    const cards = runs.map((run) => {
      const nRun = nightsBetween(run.startDate, run.endDate);
      const dateLabel = esc(fmtDate(run.startDate)) + " &ndash; " + esc(fmtDate(run.endDate));
      const nightsLabel = '<span class="bs-sub muted">' + nRun + (nRun === 1 ? " night" : " nights") + '</span>';
      if (!run.covering.length) {
        return '<div class="bs-card bs-card-missing" data-bs-hotel="' + r.placeId + '">' +
          '<div class="bs-card-main"><span class="bs-date">' + dateLabel + nightsLabel + '</span>' +
          '<span class="muted">No hotel chosen yet</span></div>' + statusCell("missing") + '</div>';
      }
      if (run.covering.length > 1) {
        const conflictNote = '<div class="bs-conflict-note">Overlapping dates below for ' + dateLabel +
          ' -- looks like an earlier hotel pick was never removed. Keep the one you want, remove the rest.</div>';
        const subCards = run.covering.map((b) =>
          '<div class="bs-card bs-card-clickable bs-conflict" data-bs-view-booking="' + b.id + '">' +
          '<div class="bs-card-main"><span class="bs-date">' + esc(fmtDate(b.date)) + " &ndash; " + esc(fmtDate(b.endDate)) + '</span>' +
          '<span>' + esc(b.title) + '</span></div>' + statusCell(b.status) +
          '<button class="link danger bs-card-remove" data-bs-remove="' + b.id + '" onclick="event.stopPropagation()">remove</button></div>'
        ).join("");
        return conflictNote + subCards;
      }
      const b = run.covering[0];
      return '<div class="bs-card bs-card-clickable" data-bs-view-booking="' + b.id + '">' +
        '<div class="bs-card-main"><span class="bs-date">' + dateLabel + nightsLabel + '</span>' +
        '<span>' + esc(b.title) + '</span></div>' + statusCell(b.status) +
        '<button class="link danger bs-card-remove" data-bs-remove="' + b.id + '" onclick="event.stopPropagation()">remove</button></div>';
    }).join("");
    return '<div class="bs-block" data-bs-hotel-block="' + esc(r.placeId) + '">' + headHtml + '<div class="bs-cards">' + cards + '</div></div>';
  }).join("");
  // ---- hotel status rollup, one chip per city (missing / partially
  // booked / idea / booked-or-confirmed), for the at-a-glance summary
  // above the Hotels collapsible (which itself defaults to closed) --
  // walks the same per-night coverage a city's card list is built from,
  // just condensed to a single status instead of a run-by-run list.
  const statusWord = (status) => status.charAt(0).toUpperCase() + status.slice(1);
  const summaryIcon = (status) => {
    const a = 'viewBox="0 0 24 24" width="13" height="13" fill="none" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"';
    const icons = {
      confirmed: '<svg ' + a + ' stroke="#276149"><circle cx="12" cy="12" r="9"/><path d="M8.3 12.3l2.6 2.6 4.8-5.8"/></svg>',
      booked: '<svg ' + a + ' stroke="#7a5c00"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v4.8l3.2 1.8"/></svg>',
      idea: '<svg ' + a + ' stroke="#8a4a1c"><circle cx="12" cy="12" r="9" stroke-dasharray="2.4 3"/></svg>',
      partial: '<svg ' + a + ' stroke="#8a3d09"><circle cx="12" cy="12" r="9"/><path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="#8a3d09" stroke="none"/></svg>',
      missing: '<svg ' + a + ' stroke="#9c2b2b"><path d="M12 3.5l9.5 16.5h-19z"/><line x1="12" y1="9.5" x2="12" y2="14"/><circle cx="12" cy="17" r=".9" fill="#9c2b2b" stroke="none"/></svg>'
    };
    return icons[status] || icons.idea;
  };
  // One cohesive tile per summary (row per city / per leg) instead of
  // floating chips -- tapping a row still jumps + auto-expands the
  // matching collapsible below, it just no longer expands inline itself,
  // so there's one source of truth for the actual booking detail. A
  // conflict (stale duplicate booking) highlights the whole row the same
  // red tint as a duplicate hotel card uses (.bs-conflict), plus a small
  // dot pinned to the row's far edge as its own separate signal.
  const chipHtml = (status, label, conflict, jumpAttr) =>
    '<div class="bs-summary-row status-' + status + (conflict ? " bs-conflict" : "") + '" ' + jumpAttr + '>' +
    '<span class="bs-summary-label">' + label + '</span>' +
    '<span class="bs-summary-status status-' + status + '">' + summaryIcon(status) + statusWord(status) + '</span>' +
    (conflict ? '<span class="bs-summary-dot" title="Possible duplicate booking, check for a stray pick"></span>' : "") +
    '</div>';
  const hotelRollups = ranges.map((r) => {
    const place = getPlace(r.placeId);
    const label = place ? place.label : r.placeId;
    if (!r.dateStart || !r.nights) return { placeId: r.placeId, label, status: "missing", conflict: false };
    const lodgings = state.bookings.filter((b) => b.category === "lodging" && (!place || place.cityIds.includes(b.city)));
    let anyMissing = false, anyCovered = false, conflict = false;
    const statuses = new Set();
    for (let i = 0; i < r.nights; i++) {
      const date = isoAddDays(r.dateStart, i);
      const covering = lodgings.filter((b) => b.date <= date && b.endDate > date);
      if (!covering.length) anyMissing = true; else anyCovered = true;
      if (covering.length > 1) conflict = true;
      covering.forEach((b) => statuses.add(b.status));
    }
    let status;
    if (!anyCovered) status = "missing";
    else if (anyMissing) status = "partial";
    else if (statuses.has("idea") && (statuses.has("booked") || statuses.has("confirmed"))) status = "partial";
    else if (statuses.has("confirmed") && !statuses.has("booked")) status = "confirmed";
    else if (statuses.has("booked")) status = "booked";
    else status = "idea";
    return { placeId: r.placeId, label, status, conflict };
  });
  const hotelSummaryHtml = hotelRollups.length
    ? '<div class="bs-summary-list">' + hotelRollups.map((h) => chipHtml(h.status, esc(h.label), h.conflict, 'data-bs-jump-hotel-city="' + esc(h.placeId) + '"')).join("") + '</div>'
    : "";
  const transportBookings = state.bookings.filter((b) => b.category !== "lodging").sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  const transportCardHtml = (t, routeLabel, legKey) => {
    const dateLabel = t.date ? (t.endDate && t.endDate !== t.date ? esc(fmtDate(t.date)) + " &ndash; " + esc(fmtDate(t.endDate)) : esc(fmtDate(t.date))) : '<span class="muted">no date set</span>';
    const subLabel = (routeLabel ? routeLabel + " &middot; " : "") + esc(t.category);
    return '<div class="bs-card bs-card-clickable" data-bs-view-booking="' + t.id + '"' + (legKey ? ' data-bs-leg-key="' + esc(legKey) + '"' : "") + '>' +
      '<div class="bs-card-main"><span class="bs-date">' + dateLabel + '<span class="bs-sub muted">' + subLabel + '</span></span>' +
      '<span>' + esc(t.title) + '</span></div>' + statusCell(t.status) +
      '<button class="link danger bs-card-remove" data-bs-remove="' + t.id + '" onclick="event.stopPropagation()">remove</button></div>';
  };
  // Legs: the transition between consecutive stops, plus the two legs
  // bookending the whole trip (home airport out to the first city, last
  // city back home). contextPlaceId is the city each leg is filed under --
  // a stop-to-stop leg files under its origin city, and both home legs
  // file under the trip-city end they touch (first city for the outbound
  // flight, last city for the return flight), so every leg has exactly one
  // home. That's also the exact grouping the detailed list below uses
  // (rekeyed by city, matching Hotels) instead of the old "Rome -> Bari"
  // leg-pair headers.
  const homeAirport = (state.meta && state.meta.homeAirport) || "Home";
  const legDefs = [];
  if (ranges.length) {
    const firstR = ranges[0];
    const firstPlace = getPlace(firstR.placeId);
    legDefs.push({ fromLabel: homeAirport, toLabel: firstPlace ? firstPlace.label : firstR.placeId, legDate: firstR.dateStart, contextPlaceId: firstR.placeId });
  }
  ranges.slice(0, -1).forEach((fromR, i) => {
    const toR = ranges[i + 1];
    const fromPlace = getPlace(fromR.placeId);
    const toPlace = getPlace(toR.placeId);
    legDefs.push({ fromLabel: fromPlace ? fromPlace.label : fromR.placeId, toLabel: toPlace ? toPlace.label : toR.placeId, legDate: fromR.dateEnd, contextPlaceId: fromR.placeId });
  });
  if (ranges.length) {
    const lastR = ranges[ranges.length - 1];
    const lastPlace = getPlace(lastR.placeId);
    legDefs.push({ fromLabel: lastPlace ? lastPlace.label : lastR.placeId, toLabel: homeAirport, legDate: lastR.dateEnd, contextPlaceId: lastR.placeId });
  }
  const matchedIds = new Set();
  legDefs.forEach((leg, idx) => {
    leg.key = "leg" + idx;
    leg.routeLabel = esc(leg.fromLabel) + " &rarr; " + esc(leg.toLabel);
    leg.matches = leg.legDate ? transportBookings.filter((t) => t.date && t.date <= leg.legDate && (t.endDate || t.date) >= leg.legDate) : [];
    leg.matches.forEach((t) => matchedIds.add(t.id));
    leg.conflict = leg.matches.length > 1;
    if (!leg.matches.length) leg.status = "missing";
    else {
      const st = new Set(leg.matches.map((t) => t.status));
      leg.status = st.has("confirmed") ? "confirmed" : (st.has("booked") ? "booked" : "idea");
    }
  });
  // ---- intercity connection summary: one chip per leg (including the two
  // home bookend legs), focused purely on "can I actually get from city to
  // city" -- standalone transport (day-trip ferries etc., not tied to a
  // city-to-city move) intentionally has no place here.
  const legSummaryHtml = legDefs.length
    ? '<div class="bs-summary-list">' + legDefs.map((leg) => chipHtml(leg.status, leg.routeLabel, leg.conflict, 'data-bs-jump-leg="' + esc(leg.key) + '"')).join("") + '</div>'
    : "";
  const legsByCity = new Map();
  legDefs.forEach((leg) => {
    if (!legsByCity.has(leg.contextPlaceId)) legsByCity.set(leg.contextPlaceId, []);
    legsByCity.get(leg.contextPlaceId).push(leg);
  });
  // ---- detailed transport list, grouped by city exactly like Hotels --
  // each leg files under the city it originates from (contextPlaceId
  // above already encodes that), and any standalone transport booking
  // whose own city tag falls in this place and whose date falls inside
  // this city's stay window is filed here too.
  const transportGroups = ranges.map((r) => {
    const place = getPlace(r.placeId);
    const placeLabel = esc(place ? place.label : r.placeId);
    const placeDateLabel = r.dateStart ? esc(fmtDate(r.dateStart)) + " &ndash; " + esc(fmtDate(r.dateEnd)) : "dates not set";
    const headHtml = '<div class="bs-city-head" data-bs-city="' + esc(r.placeId) + '">' + placeLabel + '<span class="bs-place-nights muted">' + placeDateLabel + '</span></div>';
    const legsHere = legsByCity.get(r.placeId) || [];
    const legCards = legsHere.map((leg) => {
      if (!leg.matches.length) {
        return '<div class="bs-card bs-card-missing" data-bs-leg-key="' + esc(leg.key) + '" data-bs-add-leg="' + esc(leg.legDate || "") + '" data-bs-leg-place="' + esc(leg.contextPlaceId) + '">' +
          '<div class="bs-card-main"><span class="bs-date">' + (leg.legDate ? esc(fmtDate(leg.legDate)) : "") + '<span class="bs-sub muted">' + leg.routeLabel + '</span></span>' +
          '<span class="muted">No transport booked yet</span></div>' + statusCell("missing") + '</div>';
      }
      return leg.matches.map((t) => transportCardHtml(t, leg.routeLabel, leg.key)).join("");
    }).join("");
    const standalone = (r.dateStart ? transportBookings.filter((t) => !matchedIds.has(t.id) && place && place.cityIds.includes(t.city) && t.date >= r.dateStart && t.date <= r.dateEnd) : [])
      .map((t) => transportCardHtml(t, null, null)).join("");
    const cardsHtml = legCards + standalone;
    const blockOpen = '<div class="bs-block" data-bs-transport-block="' + esc(r.placeId) + '">';
    if (!cardsHtml) return blockOpen + headHtml + '<div class="bs-cards"><div class="muted">Nothing tied to this city&rsquo;s dates yet.</div></div></div>';
    return blockOpen + headHtml + '<div class="bs-cards">' + cardsHtml + '</div></div>';
  }).join("");
  // Same collapsible-section chrome as Where to stay / See & do / Where to
  // eat (sub-h header, rule, a "+" to add a new booking, chevron), instead
  // of the plain <h4> these used before -- same visual language, same
  // open/closed persistence mechanism (the shared "planOpen" key).
  el2.innerHTML =
    '<details class="plan-collapse" data-collapse-key="bs-hotels">' +
    '<summary><div class="sub-h"><h3>Hotels</h3><span class="rule"></span><button class="sec-add" data-sec-add="bs-hotel" title="Add a hotel booking" aria-label="Add a hotel booking">+</button><span class="arw">&rsaquo;</span></div>' + hotelSummaryHtml + '</summary>' +
    '<div class="plan-collapse-body bs-group">' + hotelGroups + '</div></details>' +
    '<details class="plan-collapse" data-collapse-key="bs-transport">' +
    '<summary><div class="sub-h"><h3>Transportation</h3><span class="rule"></span><button class="sec-add" data-sec-add="bs-transport" title="Add a transport booking" aria-label="Add a transport booking">+</button><span class="arw">&rsaquo;</span></div>' + legSummaryHtml + '</summary>' +
    '<div class="plan-collapse-body bs-group">' + transportGroups + '</div></details>';
  // Two-tier expand: tapping the chevron/header (anywhere in <summary>
  // that isn't a row or the "+" button, both of which stopPropagation)
  // opens every city's block -- that's the SESSION_BS_FILTER reset below.
  // Tapping a specific summary row instead filters down to just that
  // city's block (see the [data-bs-jump-*] handlers further down), hiding
  // the rest entirely rather than leaving them visible-but-collapsed.
  const blockAttr = (key) => (key === "bs-hotels" ? "data-bs-hotel-block" : "data-bs-transport-block");
  const applyBsFilter = (key) => {
    const attr = blockAttr(key);
    const filter = SESSION_BS_FILTER[key];
    el2.querySelectorAll("[" + attr + "]").forEach((block) => {
      block.style.display = filter && block.getAttribute(attr) !== filter ? "none" : "";
    });
  };
  // Same collapse-state handling as the per-city planning sections -- these
  // start closed on every page load, then remember whatever you left them
  // at only for the rest of this visit (in-memory state, not persisted).
  el2.querySelectorAll(".plan-collapse").forEach((det) => {
    if (SESSION_COLLAPSE_STATE[det.dataset.collapseKey]) det.setAttribute("open", "");
    else det.removeAttribute("open");
    applyBsFilter(det.dataset.collapseKey);
    det.addEventListener("toggle", () => {
      SESSION_COLLAPSE_STATE[det.dataset.collapseKey] = det.open;
      applyBsFilter(det.dataset.collapseKey);
    });
    det.querySelector("summary").addEventListener("click", () => {
      // Applied here directly rather than left to the "toggle" listener
      // above -- the native toggle event fires as a queued task per spec,
      // not synchronously with the click, so waiting on it would leave a
      // beat where the filter state and the visible DOM disagree.
      SESSION_BS_FILTER[det.dataset.collapseKey] = null;
      applyBsFilter(det.dataset.collapseKey);
    });
  });
  el2.querySelectorAll("[data-sec-add]").forEach((btn) => btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    openBookingForm(state, null, null);
  }));
  el2.querySelectorAll("[data-bs-add-leg]").forEach((card) => card.addEventListener("click", () => {
    const fromPlace = getPlace(card.dataset.bsLegPlace) || null;
    openBookingForm(state, null, fromPlace, card.dataset.bsAddLeg || undefined);
  }));
  // A missing-hotel card has nothing to open yet -- jump down to that
  // city's "Where to stay" section so you can pick one.
  el2.querySelectorAll("[data-bs-hotel]").forEach((card) => card.addEventListener("click", () => {
    const target = document.getElementById(card.dataset.bsHotel);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  }));
  // Every real booking's card opens the same detail view used everywhere
  // else in the app (Edit/Remove inside), instead of a bare "edit" link --
  // the whole card is now the click target.
  el2.querySelectorAll("[data-bs-view-booking]").forEach((card) => card.addEventListener("click", () => {
    const b = state.bookings.find((x) => x.id === card.dataset.bsViewBooking);
    if (b) openItemDetailCard("booking", b, placeForCity(b.city) || null);
  }));
  // One-click remove for a stray/duplicate lodging booking, right in the
  // dashboard -- no need to open the full detail card just to find the
  // delete action inside it. stopPropagation on the button keeps this from
  // also triggering the card's own click-to-open handler above.
  el2.querySelectorAll("[data-bs-remove]").forEach((btn) => btn.addEventListener("click", () => {
    const b = state.bookings.find((x) => x.id === btn.dataset.bsRemove);
    if (b && confirm('Remove "' + b.title + '" (' + fmtDate(b.date) + ' - ' + fmtDate(b.endDate) + ')?')) {
      Store.remove("bookings", b.id);
    }
  }));
  // Summary rows live inside the <summary> itself (so they stay visible
  // while the section is collapsed, right under the header) -- which means
  // a plain click would also fire the native summary toggle, same as the
  // "+" add button above. preventDefault + stopPropagation there, then
  // drive the open/closed state ourselves: auto-open the collapsible if
  // it's closed (never toggle an already-open one closed), filter the
  // detail list down to just the tapped city/leg. No scroll-to-target --
  // the filter itself already surfaces the right block right under the
  // summary, so jumping the page as well felt redundant/jarring.
  el2.querySelectorAll("[data-bs-jump-hotel-city]").forEach((chip) => chip.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const det = el2.querySelector('[data-collapse-key="bs-hotels"]');
    if (det && !det.open) { det.setAttribute("open", ""); SESSION_COLLAPSE_STATE["bs-hotels"] = true; }
    SESSION_BS_FILTER["bs-hotels"] = chip.dataset.bsJumpHotelCity;
    applyBsFilter("bs-hotels");
  }));
  el2.querySelectorAll("[data-bs-jump-leg]").forEach((chip) => chip.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const det = el2.querySelector('[data-collapse-key="bs-transport"]');
    if (det && !det.open) { det.setAttribute("open", ""); SESSION_COLLAPSE_STATE["bs-transport"] = true; }
    // The summary row is per-leg, but the detail list below groups by city
    // (a city can hold two legs, e.g. an arrival + a departure) -- so this
    // filters to that leg's city block rather than isolating the single
    // leg card. Simpler and consistent with how Hotels filters, at the
    // cost of occasionally showing one extra card alongside the tapped leg.
    const leg = legDefs.find((l) => l.key === chip.dataset.bsJumpLeg);
    SESSION_BS_FILTER["bs-transport"] = leg ? leg.contextPlaceId : null;
    applyBsFilter("bs-transport");
  }));
}

// ---- itinerary editor: a vertical timeline of stops, reorder / resize / add-remove ----
function renderItineraryEditor(state) {
  const container = document.getElementById("itineraryStopsList");
  if (!container) return;
  const ranges = Store.computeStopRanges();

  // View mode: just city + dates, each stop tappable to jump straight to
  // that city's section further down the page. Edit mode: full controls
  // (nights, reorder, remove, add a stop). Toggled by the Manage trip/Done
  // button. (The colored route-strip bar and the date-range/nights/stops
  // summary line that used to sit above this were removed -- redundant with
  // what's already visible in the hero and in this list itself.)
  const simpleList = '<div class="ie-timeline">' + state.trip.stops.map((stop, i) => {
    const place = getPlace(stop.placeId);
    const range = ranges[i];
    const dateLabel = range && range.dateStart ? fmtDate(range.dateStart) + " – " + fmtDate(range.dateEnd) : "";
    const accent = getAccent(stop.placeId) || "#7cc0c2";
    const thumbStyle = "color:" + accent + (place ? ";background-image:url('" + place.image + "')" : ";background:" + accent);
    return '<div class="ie-stop ie-simple ie-jump" data-jump="' + esc(stop.placeId) + '" role="button" tabindex="0">' +
      '<div class="ie-thumb" style="' + thumbStyle + '"></div>' +
      '<div class="ie-simple-body">' +
      '<div class="ie-stop-name">' + esc(place ? place.label : stop.placeId) + '</div>' +
      '<div class="ie-stop-dates muted">' + esc(dateLabel) + '</div>' +
      '</div>' +
      '</div>';
  }).join("") + '</div>';

  const timeline = '<div class="ie-timeline">' + state.trip.stops.map((stop, i) => {
    const place = getPlace(stop.placeId);
    const range = ranges[i];
    const dateLabel = range && range.dateStart ? fmtDate(range.dateStart) + " – " + fmtDate(range.dateEnd) : "";
    const accent = getAccent(stop.placeId) || "#7cc0c2";
    const thumbStyle = "color:" + accent + (place ? ";background-image:url('" + place.image + "')" : ";background:" + accent);
    // Rename only offered for user-created destinations (state.places) -- a
    // built-in city's name is authored in code, not stored, so it can't be
    // edited from here.
    const isBuiltin = PLACES.some((x) => x.id === stop.placeId);
    return '<div class="ie-stop">' +
      '<div class="ie-thumb" style="' + thumbStyle + '"></div>' +
      '<div class="ie-stop-card">' +
      '<div class="ie-stop-top">' +
      '<div class="ie-stop-name">' + esc(place ? place.label : stop.placeId) +
      (isBuiltin ? "" : ' <button class="link" data-rename-stop="' + i + '" title="Rename this destination">rename</button>') + '</div>' +
      '<div class="ie-stop-order">' +
      '<button class="ie-arrow" data-move-up="' + i + '"' + (i === 0 ? " disabled" : "") + '>&uarr;</button>' +
      '<button class="ie-arrow" data-move-down="' + i + '"' + (i === state.trip.stops.length - 1 ? " disabled" : "") + '>&darr;</button>' +
      '</div></div>' +
      '<div class="ie-stop-bottom">' +
      '<div class="ie-stop-nights">' +
      '<button class="ie-step" data-nights-dec="' + i + '">-</button>' +
      '<span class="ie-nights-val" data-nights-val="' + i + '">' + stop.nights + (stop.nights === 1 ? " night" : " nights") + '</span>' +
      '<button class="ie-step" data-nights-inc="' + i + '">+</button>' +
      '</div>' +
      '<div class="ie-stop-dates muted">' + esc(dateLabel) + '</div>' +
      '<button class="link" data-remove-stop="' + i + '">remove</button>' +
      '</div></div></div>';
  }).join("") + '</div>';

  container.innerHTML = state.trip.stops.length
    ? (itineraryEditMode ? timeline : simpleList)
    : '<div class="muted">No stops yet -- add one below.</div>';

  // View-mode stops jump to that city's section on tap/click (and Enter/
  // Space, since they're keyboard-focusable) -- not wired in edit mode,
  // where a tap on the card is more likely aiming at the reorder/nights
  // controls inside it.
  if (!itineraryEditMode) {
    container.querySelectorAll(".ie-jump").forEach((el3) => {
      const jump = () => {
        const target = document.getElementById(el3.dataset.jump);
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      };
      el3.addEventListener("click", jump);
      el3.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); jump(); } });
    });
  }

  const toggle = document.getElementById("ieEditToggle");
  if (toggle) {
    toggle.textContent = itineraryEditMode ? "Done" : "Manage trip";
    toggle.onclick = () => { itineraryEditMode = !itineraryEditMode; renderItineraryEditor(Store.getState()); };
  }
  const headTag = document.getElementById("ieHeadTag");
  if (headTag) headTag.textContent = itineraryEditMode ? "reorder, adjust nights, add or remove stops" : "";
  const ieAdd = document.querySelector(".ie-add");
  if (ieAdd) ieAdd.style.display = itineraryEditMode ? "" : "none";

  function bump(i) {
    const span = container.querySelector('[data-nights-val="' + i + '"]');
    if (!span) return;
    span.classList.add("bump");
    setTimeout(() => span.classList.remove("bump"), 200);
  }

  container.querySelectorAll("[data-move-up]").forEach((btn) => btn.addEventListener("click", () => Store.moveTripStop(parseInt(btn.dataset.moveUp, 10), -1)));
  container.querySelectorAll("[data-move-down]").forEach((btn) => btn.addEventListener("click", () => Store.moveTripStop(parseInt(btn.dataset.moveDown, 10), 1)));
  container.querySelectorAll("[data-nights-dec]").forEach((btn) => btn.addEventListener("click", () => {
    const i = parseInt(btn.dataset.nightsDec, 10);
    bump(i);
    Store.setTripStopNights(i, state.trip.stops[i].nights - 1);
  }));
  container.querySelectorAll("[data-nights-inc]").forEach((btn) => btn.addEventListener("click", () => {
    const i = parseInt(btn.dataset.nightsInc, 10);
    bump(i);
    Store.setTripStopNights(i, state.trip.stops[i].nights + 1);
  }));
  container.querySelectorAll("[data-remove-stop]").forEach((btn) => btn.addEventListener("click", () => Store.removeTripStop(parseInt(btn.dataset.removeStop, 10))));
  container.querySelectorAll("[data-rename-stop]").forEach((btn) => btn.addEventListener("click", () => {
    const i = parseInt(btn.dataset.renameStop, 10);
    const place = getPlace(state.trip.stops[i].placeId);
    if (place) openRenamePlaceModal(place);
  }));

  const addBtn = document.getElementById("addStopBtn");
  if (addBtn) addBtn.onclick = () => openAddStopModal(state);
}

// Adding a stop opens a modal so you can see (and choose) exactly which dates it
// lands on before committing -- pick the place, where in the sequence it goes,
// and how many nights, with a live preview of the resulting date range.
// Small curated palette offered when creating a brand-new destination --
// distinct from every built-in PLACE_ACCENT so a new place always reads as
// its own thing next to the library cities.
const NEW_PLACE_PALETTE = ["#b8873a", "#b8492f", "#1c8f93", "#7a3b52", "#2f6b4a", "#3d7ab8", "#c0623a", "#6f8f5a"];

function openAddStopModal(state) {
  const usedIds = state.trip.stops.map((s) => s.placeId);
  const available = getPlaces().filter((p) => usedIds.indexOf(p.id) === -1);
  const placeOpts = '<option value="__new__">+ Create a new destination…</option>' +
    available.map((p) => '<option value="' + p.id + '">' + esc(p.label) + '</option>').join("");
  const positionOpts = state.trip.stops.map((s, i) => {
    const p = getPlace(s.placeId);
    return '<option value="' + i + '">Before ' + esc(p ? p.label : s.placeId) + '</option>';
  }).join("") + '<option value="' + state.trip.stops.length + '" selected>At the end</option>';
  const swatches = NEW_PLACE_PALETTE.map((c, i) =>
    '<button type="button" class="swatch' + (i === 0 ? " on" : "") + '" data-swatch="' + c + '" style="background:' + c + '" aria-label="' + c + '"></button>'
  ).join("");
  const body =
    '<label class="field">Place</label><select data-field="placeId">' + placeOpts + '</select>' +
    '<div id="newPlaceFields" style="display:' + (available.length ? "none" : "block") + '">' +
    '<label class="field">Name</label><input data-field="newLabel" placeholder="e.g. Vieste">' +
    '<label class="field">Accent color</label><div class="swatch-row">' + swatches + '</div>' +
    '<input type="hidden" data-field="newAccent" value="' + NEW_PLACE_PALETTE[0] + '">' +
    '<label class="field">Image URL (optional)</label><input data-field="newImageUrl" placeholder="Paste a photo URL, or leave blank for a color header">' +
    '</div>' +
    '<label class="field">Insert</label><select data-field="position">' + positionOpts + '</select>' +
    '<label class="field">Nights</label><input data-field="nights" type="number" min="1" value="1">' +
    '<div class="ie-preview muted" id="addStopPreview" style="margin-top:.6rem"></div>';
  openModal("Add a stop", body, (data) => {
    let placeId = data.placeId;
    if (placeId === "__new__") {
      const label = (data.newLabel || "").trim();
      if (!label) return; // no name given -- silently no-op, matches other required-field forms
      const place = Store.addPlace(label, data.newAccent, (data.newImageUrl || "").trim());
      placeId = place.id;
    }
    Store.insertTripStop(parseInt(data.position, 10), placeId, parseInt(data.nights, 10) || 1);
  }, "Add stop");

  // Live preview: simulate the insertion against a copy of the current stops
  // and show the computed date range, without touching real state yet. Also
  // toggles the new-destination fields and wires the accent swatch picker.
  function updatePreview() {
    const placeSelect = document.querySelector('[data-field="placeId"]');
    const positionSelect = document.querySelector('[data-field="position"]');
    const nightsInput = document.querySelector('[data-field="nights"]');
    const preview = document.getElementById("addStopPreview");
    if (!placeSelect || !positionSelect || !nightsInput || !preview) return;
    const isNew = placeSelect.value === "__new__";
    const fields = document.getElementById("newPlaceFields");
    if (fields) fields.style.display = isNew ? "block" : "none";
    if (isNew) { preview.textContent = ""; return; }
    const position = parseInt(positionSelect.value, 10);
    const nights = parseInt(nightsInput.value, 10) || 1;
    const candidate = state.trip.stops.slice();
    candidate.splice(position, 0, { placeId: placeSelect.value, nights: nights });
    const ranges = Store.computeRangesFor(candidate, state.trip.startDate);
    const r = ranges[position];
    const shifted = position < state.trip.stops.length;
    preview.textContent = (r && r.dateStart ? fmtDate(r.dateStart) + " – " + fmtDate(r.dateEnd) : "") +
      (shifted ? " (every stop after this shifts later by " + nights + (nights === 1 ? " night)" : " nights)") : "");
  }
  setTimeout(() => {
    ["placeId", "position", "nights"].forEach((f) => {
      const elx = document.querySelector('[data-field="' + f + '"]');
      if (elx) elx.addEventListener("input", updatePreview);
    });
    document.querySelectorAll("[data-swatch]").forEach((btn) => btn.addEventListener("click", () => {
      document.querySelectorAll("[data-swatch]").forEach((b) => b.classList.remove("on"));
      btn.classList.add("on");
      const hidden = document.querySelector('[data-field="newAccent"]');
      if (hidden) hidden.value = btn.dataset.swatch;
    }));
    updatePreview();
  }, 0);
}

// Renaming only ever applies to a user-created destination (state.places) --
// built-ins are authored in code and aren't editable from the UI.
function openRenamePlaceModal(place) {
  const body = '<label class="field">Name</label><input data-field="label" value="' + esc(place.label) + '">';
  openModal("Rename destination", body, (data) => {
    const label = (data.label || "").trim();
    if (label) Store.renamePlace(place.id, label);
  }, "Save");
}


// ---- toolkit: budget rollup ----
// Every booking's cost, converted to one currency, rolled up against the
// per-person budget target from meta. Lodging bookings store a nightly rate,
// so their total is cost x nights; everything else is already a total for
// that leg. The EUR->USD rate is cached in localStorage for a day and falls
// back gracefully when offline.
const FX_CACHE_KEY = "itcroatia2026_fx_eur_usd_v1";
const FX_FALLBACK_RATE = 1.14; // approx EUR->USD, used only if fetch + cache both fail

async function getUsdPerEur() {
  try {
    const cached = JSON.parse(localStorage.getItem(FX_CACHE_KEY) || "null");
    if (cached && Date.now() - cached.ts < 24 * 60 * 60 * 1000) return cached.rate;
  } catch (e) { /* ignore */ }
  try {
    const res = await fetch("https://api.frankfurter.app/latest?from=EUR&to=USD");
    const j = await res.json();
    const rate = j && j.rates && j.rates.USD;
    if (rate) {
      try { localStorage.setItem(FX_CACHE_KEY, JSON.stringify({ rate, ts: Date.now() })); } catch (e) { /* ignore */ }
      return rate;
    }
  } catch (e) { /* offline or blocked */ }
  try {
    const cached = JSON.parse(localStorage.getItem(FX_CACHE_KEY) || "null");
    if (cached) return cached.rate;
  } catch (e) { /* ignore */ }
  return FX_FALLBACK_RATE;
}

function nightsBetween(dateStart, dateEnd) {
  if (!dateStart || !dateEnd) return 1;
  const n = Math.round((new Date(dateEnd + "T00:00:00") - new Date(dateStart + "T00:00:00")) / 86400000);
  return n > 0 ? n : 1;
}

const BUDGET_CAT_LABELS = { flight: "Flights", lodging: "Lodging", transport: "Transport", activities: "Activities & meals", other: "Other" };
function budgetCategoryFor(b) {
  if (b.category === "flight") return "flight";
  if (b.category === "lodging") return "lodging";
  if (["train", "ferry", "catamaran", "bus"].indexOf(b.category) !== -1) return "transport";
  return "other";
}
function budgetItemMeta(b, entry) {
  const curSym = b.currency === "EUR" ? "€" : "$";
  let base = curSym + Math.round(b.cost || 0).toLocaleString();
  if (entry.nights) base += "/night × " + entry.nights + (entry.nights === 1 ? " night" : " nights");
  const parts = [base];
  if (b.currency === "EUR") parts.push("≈ $" + Math.round(entry.amtUSD).toLocaleString());
  parts.push(b.status);
  return parts.join(" · ");
}
function budgetItemLine(entry, moneyFmt) {
  const b = entry.booking;
  return '<li><span class="bi-title">' + esc(b.title) + '</span>' +
    '<span class="bi-amt">' + moneyFmt(entry.amtUSD) + '</span>' +
    '<span class="bi-meta muted">' + budgetItemMeta(b, entry) + '</span></li>';
}

async function renderBudget(state) {
  const container = document.getElementById("budgetPanel");
  if (!container) return;
  const rate = await getUsdPerEur();
  const cats = { flight: 0, lodging: 0, transport: 0, activities: 0, other: 0 };
  const grouped = { flight: [], lodging: [], transport: [], activities: [], other: [] };
  state.bookings.forEach((b) => {
    let amt = b.cost || 0;
    const nights = b.category === "lodging" ? nightsBetween(b.date, b.endDate) : null;
    if (nights) amt = amt * nights;
    if (b.currency === "EUR") amt = amt * rate;
    const catKey = budgetCategoryFor(b);
    cats[catKey] += amt;
    grouped[catKey].push({ booking: b, amtUSD: amt, nights });
  });
  (state.activities || []).forEach((a) => {
    if (!a.cost) return;
    let amt = a.cost;
    if (a.currency === "EUR") amt = amt * rate;
    cats.activities += amt;
    grouped.activities.push({ booking: a, amtUSD: amt, nights: null });
  });
  const total = cats.flight + cats.lodging + cats.transport + cats.activities + cats.other;
  const itemCount = state.bookings.length + grouped.activities.length;
  const travelers = (state.meta.travelers && state.meta.travelers.length) || 2;
  const perPerson = total / travelers;
  const low = state.meta.budgetPerPersonLow || 0;
  const high = state.meta.budgetPerPersonHigh || 0;
  const pctOfHigh = high ? Math.min(100, Math.round((perPerson / high) * 100)) : 0;
  const over = high && perPerson > high;

  function moneyFmt(usdAmt) {
    if (budgetCurrency === "EUR") return "€" + Math.round(usdAmt / rate).toLocaleString();
    return "$" + Math.round(usdAmt).toLocaleString();
  }

  // The details panel would otherwise slam shut every time anything in the
  // app re-renders (which is constantly -- any edit anywhere calls renderAll).
  // Read its current open/closed state before replacing the DOM and restore it.
  const existingDetails = container.querySelector(".budget-detail");
  const wasOpen = existingDetails ? existingDetails.open : false;

  container.innerHTML =
    '<div class="budget-total">' +
    '<div class="bt-row"><div class="bt-amount">' + moneyFmt(perPerson) + ' <span style="font-size:1rem;color:var(--muted);font-family:\'Outfit\'">per person, booked so far</span></div>' +
    '<div class="currency-toggle"><button class="chip' + (budgetCurrency === "USD" ? " on" : "") + '" data-currency="USD">USD</button><button class="chip' + (budgetCurrency === "EUR" ? " on" : "") + '" data-currency="EUR">EUR</button></div></div>' +
    '<div class="bt-sub">Target: ' + moneyFmt(low) + '–' + moneyFmt(high) + ' per person &middot; total for both of you: ' + moneyFmt(total) +
    ' <button class="link" id="editBudgetTargetBtn">edit target</button></div>' +
    '<div class="budget-bar"><div class="budget-bar-fill' + (over ? " over" : "") + '" style="width:' + pctOfHigh + '%"></div></div>' +
    '</div>' +
    '<details class="budget-detail"' + (wasOpen ? " open" : "") + '><summary>Show all ' + itemCount + ' items<span class="arw">+</span></summary>' +
    ["flight", "lodging", "transport", "activities", "other"].map((catKey) => {
      const items = grouped[catKey];
      if (!items.length) return "";
      return '<div class="budget-detail-group"><h4>' + BUDGET_CAT_LABELS[catKey] +
        '<span>' + moneyFmt(cats[catKey]) + '</span></h4>' +
        '<ul class="budget-item-list">' + items.map((it) => budgetItemLine(it, moneyFmt)).join("") + '</ul></div>';
    }).join("") +
    '</details>';

  container.querySelectorAll("[data-currency]").forEach((btn) => btn.addEventListener("click", () => {
    budgetCurrency = btn.dataset.currency;
    renderBudget(Store.getState());
  }));
  const editTargetBtn = container.querySelector("#editBudgetTargetBtn");
  if (editTargetBtn) editTargetBtn.addEventListener("click", () => openBudgetTargetModal(Store.getState()));
}

function openBudgetTargetModal(state) {
  const low = state.meta.budgetPerPersonLow || 0;
  const high = state.meta.budgetPerPersonHigh || 0;
  const body =
    '<label class="field">Target, low end (per person, USD)</label><input data-field="low" type="number" value="' + low + '">' +
    '<label class="field">Target, high end (per person, USD)</label><input data-field="high" type="number" value="' + high + '">';
  openModal("Edit budget target", body, (data) => {
    Store.updateMeta({ budgetPerPersonLow: parseFloat(data.low) || 0, budgetPerPersonHigh: parseFloat(data.high) || 0 });
  }, "Save");
}

// ---- toolkit: documents ----
// ---- toolkit: emergency info ----
function renderEmergencyInfo(state) {
  const container = document.getElementById("emergencyInfo");
  if (!container) return;
  const placeCards = (state.trip ? state.trip.stops : []).map((s) => {
    const place = getPlace(s.placeId);
    if (!place) return "";
    const cityId = place.cityIds[0];
    const label = (typeof CITY_LABEL_MAP !== "undefined" && CITY_LABEL_MAP[cityId]) || place.label;
    return '<div class="util-card"><h4>' + esc(place.label) + '</h4>' +
      '<div><a class="link" href="' + mapsUrl("Hospital near " + label) + '" target="_blank" rel="noopener">Nearest hospital</a> &middot; ' +
      '<a class="link" href="' + mapsUrl("Pharmacy near " + label) + '" target="_blank" rel="noopener">Pharmacy</a></div></div>';
  }).join("");
  container.innerHTML =
    '<div class="util-card"><h4>Emergency number</h4><div class="muted">' + esc(EMERGENCY_INFO.euNumber) + '</div></div>' +
    EMERGENCY_INFO.embassies.map((e) => '<div class="util-card"><h4>' + esc(e.name) + '</h4>' +
      '<div class="muted">' + esc(e.address) + '</div><div class="muted">' + esc(e.phone) + '</div>' +
      '<div><a class="link" href="' + esc(e.url) + '" target="_blank" rel="noopener">Emergency contact page</a></div></div>').join("") +
    '<div class="util-card"><h4>24/7 citizen services (from abroad)</h4><div class="muted">' + esc(EMERGENCY_INFO.globalLine) + '</div></div>' +
    placeCards;
}

// ---- toolkit: notes ----
function renderNotes(state) {
  document.getElementById("notesList").innerHTML = state.notesLog.slice().reverse().map((n) =>
    '<div class="note-row">' + esc(n.text) + '<time>' + new Date(n.ts).toLocaleString() + '</time></div>').join("") ||
    '<div class="muted">No notes yet.</div>';
}

// ---- prep checklist ----
function groupByPhase(items) {
  const phases = [];
  items.forEach((item) => {
    let group = phases.find((p) => p.phase === item.phase);
    if (!group) { group = { phase: item.phase, items: [] }; phases.push(group); }
    group.items.push(item);
  });
  return phases;
}

// Canonical on-page order for the phase dropdown: "Before you book" first,
// then whatever timeframes exist in chronological (insertion) order, then
// "General" last -- always includes both endpoints even if they're
// currently empty, matching what renderPrep always shows as cards.
function prepPhaseOrder(items) {
  const rest = groupByPhase((items || []).filter((it) => it.phase !== "Before you book" && it.phase !== "General")).map((g) => g.phase);
  return ["Before you book"].concat(rest, ["General"]);
}

function attachPrepToggleHandlers(container) {
  container.querySelectorAll("[data-prep-toggle]").forEach((cb) => cb.addEventListener("change", (e) => {
    const state2 = Store.getState();
    state2.prepChecklist = state2.prepChecklist.map((it) => it.id === cb.dataset.prepToggle ? Object.assign({}, it, { done: e.target.checked }) : it);
    Store.persist();
  }));
  container.querySelectorAll("[data-prep-edit]").forEach((btn) => btn.addEventListener("click", () => {
    const state2 = Store.getState();
    const item = state2.prepChecklist.find((it) => it.id === btn.dataset.prepEdit);
    if (item) openPrepItemModal(state2, item);
  }));
  container.querySelectorAll("[data-prep-hide-phase]").forEach((cb) => cb.addEventListener("change", () => {
    PREP_SHOW_DONE[cb.dataset.prepHidePhase] = cb.checked;
    const card = cb.closest(".prep-phase");
    if (card) card.classList.toggle("hide-done", !cb.checked);
  }));
  // Remember which phase blocks are expanded so a background sync poll
  // (which re-renders the whole list) doesn't collapse a section the user
  // just opened.
  container.querySelectorAll(".prep-phase").forEach((det) => det.addEventListener("toggle", () => {
    PREP_OPEN_PHASES[det.dataset.prepPhase] = det.open;
  }));
}

// Add (or edit) a single to-do in the Prep checklist. Phase is free text with
// autocomplete suggestions from whatever phases already exist, so a new item
// either slots into an existing group or starts a new one. forcedPhase comes
// from clicking "+ add to this section" on a specific phase block.
function openPrepItemModal(state, existing, forcedPhase) {
  // Dropdown, not free text -- pick from the phases/timeframes that already
  // exist on the page (plus General), so editing an item is also how you
  // move it to a different phase/timing.
  const phaseOrder = prepPhaseOrder(state.prepChecklist || []);
  const defaultPhase = existing ? existing.phase : (forcedPhase || phaseOrder[0]);
  const phaseOpts = phaseOrder.map((p) => '<option value="' + esc(p) + '"' + (p === defaultPhase ? " selected" : "") + '>' + esc(p) + '</option>').join("");
  const body =
    '<label class="field">To-do</label><textarea data-field="text">' + esc(existing ? existing.text : "") + '</textarea>' +
    '<label class="field">Phase / timing</label><select data-field="phase">' + phaseOpts + '</select>' +
    (existing ? '<div style="margin-top:8px"><button class="link danger" id="deletePrepBtn">Remove this to-do</button></div>' : "");
  openModal(existing ? "Edit to-do" : "Add a to-do", body, (data) => {
    if (!data.text) return;
    const payload = { phase: data.phase || "General", text: data.text, done: existing ? existing.done : false };
    if (existing) Store.update("prepChecklist", existing.id, payload);
    else Store.add("prepChecklist", payload, "pc");
  }, existing ? "Save" : "Add");
  if (existing) setTimeout(() => {
    const d = document.getElementById("deletePrepBtn");
    if (d) d.addEventListener("click", () => { Store.remove("prepChecklist", existing.id); closeModal(); });
  }, 0);
}

// One merged Prep checklist: "Before you book" first, then the full phased
// plan (Now / 3-4mo / 2-3mo / 1-2mo / 1-2wk), then a catch-all "General"
// section, all in the same dark section. Every section gets its own
// "+ add to this section" control so a new to-do can go straight into
// whichever timeframe it belongs to.
function prepItemHtml(item) {
  return '<div class="prep-item-row' + (item.done ? " done" : "") + '"><label class="prep-item' + (item.done ? " done" : "") + '"><input type="checkbox" data-prep-toggle="' + item.id + '" ' + (item.done ? "checked" : "") + '><span>' + esc(item.text) + '</span></label>' +
    '<button class="prep-edit" data-prep-edit="' + item.id + '">edit</button></div>';
}
function prepPhaseBlock(phaseName, items) {
  const showOn = !!PREP_SHOW_DONE[phaseName];
  const openOn = !!PREP_OPEN_PHASES[phaseName];
  const incomplete = items.filter((it) => !it.done).length;
  const status = items.length === 0 ? "" : (incomplete === 0 ? "All done" : incomplete + " incomplete");
  return '<details class="prep-phase' + (showOn ? "" : " hide-done") + '" data-prep-phase="' + esc(phaseName) + '"' + (openOn ? " open" : "") + '>' +
    '<summary class="prep-phase-head"><h4>' + esc(phaseName) + '</h4>' +
    (status ? '<span class="prep-phase-status' + (incomplete === 0 ? " all-done" : "") + '">' + esc(status) + '</span>' : "") +
    '<span class="arw">+</span></summary>' +
    '<div class="prep-phase-body">' +
    '<label class="prep-hide-toggle"><input type="checkbox" data-prep-hide-phase="' + esc(phaseName) + '"' + (showOn ? " checked" : "") + '> Show completed</label>' +
    items.map(prepItemHtml).join("") +
    '<button class="prep-add" data-prep-add-phase="' + esc(phaseName) + '">+ Add to-do</button></div></details>';
}
// Each card's "Show completed" checkbox filters just that card (not
// persisted -- resets to unchecked, i.e. completed to-dos start hidden, on
// every page load, same as the collapsible sections). Toggling it adds/
// removes a class on that .prep-phase card; CSS below hides rows already
// marked .done unless that class is off.

function renderPrep(state) {
  const items = state.prepChecklist || [];
  const beforeItems = items.filter((it) => it.phase === "Before you book");
  const generalItems = items.filter((it) => it.phase === "General");
  const restPhases = groupByPhase(items.filter((it) => it.phase !== "Before you book" && it.phase !== "General"));
  const container = document.getElementById("prepList");
  const beforeHtml = prepPhaseBlock("Before you book", beforeItems);
  const restHtml = restPhases.map((g) => prepPhaseBlock(g.phase, g.items)).join("");
  const generalHtml = prepPhaseBlock("General", generalItems);
  container.innerHTML = beforeHtml + restHtml + generalHtml;
  attachPrepToggleHandlers(container);
  container.querySelectorAll("[data-prep-add-phase]").forEach((btn) => btn.addEventListener("click", () =>
    openPrepItemModal(Store.getState(), null, btn.dataset.prepAddPhase)));
}

// Compact sync-status icon in the nav: spinning arrows while syncing, a
// check circle once synced, a crossed-out cloud when offline, and a phone
// when running local-only. Hover (or long-press) shows the full label.
function renderSyncStatus(syncStatus) {
  const elx = document.getElementById("syncStatus");
  if (!elx) return;
  const labels = { "local-only": "Saved on this device only", connecting: "Syncing...", synced: "Synced across devices", offline: "Offline -- changes saved locally" };
  const svgAttrs = 'viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  const icons = {
    connecting: '<svg class="spin" ' + svgAttrs + '><path d="M21 12a9 9 0 1 1-2.64-6.36"/><polyline points="21 3 21 9 15 9"/></svg>',
    synced: '<svg ' + svgAttrs + '><circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5 4.5-5.5"/></svg>',
    offline: '<svg ' + svgAttrs + '><path d="M17.5 19a4.5 4.5 0 0 0 .8-8.9 6 6 0 0 0-11.6 1A4.5 4.5 0 0 0 7.5 19h10"/><line x1="4" y1="4" x2="20" y2="20"/></svg>',
    "local-only": '<svg ' + svgAttrs + '><rect x="7" y="3" width="10" height="18" rx="2"/><line x1="11" y1="17.5" x2="13" y2="17.5"/></svg>'
  };
  elx.className = "sync-pill sync-" + syncStatus;
  elx.title = labels[syncStatus] || syncStatus;
  elx.setAttribute("aria-label", labels[syncStatus] || syncStatus);
  elx.innerHTML = icons[syncStatus] || icons["local-only"];
}

// ---- master render ----
function renderAll(state, syncStatus) {
  renderSyncStatus(syncStatus);
  // Rebuild the city-section skeleton only when the set/order of itinerary
  // cities changes (not on every sync poll), then render their dynamic parts.
  const sig = itineraryPlaceIds().join(",");
  if (sig !== lastSkeletonSig) { buildPlacesSkeleton(); lastSkeletonSig = sig; }
  renderHero(state);
  renderTodayView(state);
  renderItineraryEditor(state);
  renderPlaces(state);
  renderEmergencyInfo(state);
  renderNotes(state);
  renderPrep(state);
  renderBookingStatus(state);
  renderBudget(state);
}

// ---- today sheet: bottom sheet on mobile, centered modal on desktop ----
// Lives fixed/overlaid rather than inline in the page flow, so the page
// loads straight into the header + itinerary. Opened from the "sun" tab
// (mobile bottom nav) or the Today link in the top nav (desktop), closed
// via the (x) button, a backdrop tap, or Escape.
function isMobileTodayNav() {
  return window.matchMedia && window.matchMedia("(max-width:600px)").matches;
}

function reduceMotionActive() {
  return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// FLIP-moves the real "sun" icon element between its resting spot in the
// bottom nav and a docking slot at the top of the sheet, so it visually
// travels with the sheet rather than a generic drag-handle bar appearing
// in its place -- only meaningful on mobile, where the bottom nav (and
// therefore the icon) actually exists on screen.
function moveTodayIcon(toSheet) {
  if (!isMobileTodayNav()) return;
  const icon = document.querySelector(".bn-today-ico");
  const navBtn = document.querySelector(".bn-today");
  const sheetSlot = document.getElementById("tvIconSlot");
  if (!icon || !navBtn || !sheetSlot) return;
  const dest = toSheet ? sheetSlot : navBtn;
  if (icon.parentElement === dest) return;
  if (reduceMotionActive()) {
    dest.prepend(icon);
    return;
  }
  const before = icon.getBoundingClientRect();
  dest.prepend(icon);
  const after = icon.getBoundingClientRect();
  const dx = before.left - after.left;
  const dy = before.top - after.top;
  icon.classList.remove("tv-icon-flying");
  icon.style.transform = "translate(" + dx + "px," + dy + "px)";
  // Force layout before re-enabling the transition so the browser animates
  // FROM the offset transform back to none, instead of jumping instantly.
  void icon.offsetWidth;
  icon.classList.add("tv-icon-flying");
  icon.style.transform = "";
  icon.addEventListener("transitionend", () => icon.classList.remove("tv-icon-flying"), { once: true });
}

function onTvKeydown(e) {
  if (e.key === "Escape") closeTodaySheet();
}

function openTodaySheet() {
  const section = document.getElementById("todayView");
  const backdrop = document.getElementById("tvBackdrop");
  if (!section || !backdrop) return;
  // Only one overlay (this sheet or a page panel) should ever be showing
  // at once.
  closePage();
  todayViewOffset = 0;
  renderTodayView(Store.getState());
  moveTodayIcon(true);
  document.body.classList.add("tv-sheet-open");
  section.classList.add("tv-open");
  backdrop.classList.add("tv-open");
  document.addEventListener("keydown", onTvKeydown);
}

function closeTodaySheet() {
  const section = document.getElementById("todayView");
  const backdrop = document.getElementById("tvBackdrop");
  if (!section || !backdrop) return;
  section.classList.remove("tv-open");
  backdrop.classList.remove("tv-open");
  document.body.classList.remove("tv-sheet-open");
  moveTodayIcon(false);
  document.removeEventListener("keydown", onTvKeydown);
  // Don't leave the Today tab looking active once its sheet is closed --
  // whatever section is actually in view will pick up "active" again on
  // the next scroll via the IntersectionObserver in setupScrollspy.
  document.querySelectorAll(".tl, .bn-tab").forEach((l) => {
    if (l.dataset.target === "todayView") l.classList.remove("active");
  });
}

function isTodaySheetOpen() {
  const section = document.getElementById("todayView");
  return !!section && section.classList.contains("tv-open");
}

function setupTodaySheet() {
  const backdrop = document.getElementById("tvBackdrop");
  if (backdrop) backdrop.addEventListener("click", closeTodaySheet);
  // The sun icon doubles as the sheet's own handle -- once it has flown up
  // into the sheet header, tapping it again closes the sheet (the same
  // gesture you'd use to drag a real bottom sheet back down).
  const icon = document.querySelector(".bn-today-ico");
  if (icon) {
    icon.addEventListener("click", (e) => {
      if (icon.closest("#todayView")) {
        e.stopPropagation();
        closeTodaySheet();
      }
    });
  }
}

// ---- full-page overlays: Bookings, Toolkit, Prep ----
// Same in-memory-overlay approach as the Today sheet -- no URL change, no
// router. Home (hero + itinerary) stays mounted the whole time; opening a
// page just slides this panel in over it. Panel ids match the nav's
// existing data-target values (see index.html), so no separate id-mapping
// is needed here.
const PAGE_PANEL_IDS = ["bookings", "toolkit", "prep"];

function onPagePanelKeydown(e) {
  if (e.key === "Escape") closePage();
}

function openPage(name) {
  const panel = document.getElementById(name);
  if (!panel || !panel.classList.contains("page-panel")) return;
  // Only one page panel should ever be open at a time -- without this,
  // switching straight from e.g. Bookings to Toolkit left Bookings' own
  // pp-open class in place underneath (same z-index, later markup always
  // wins the paint order), so tapping back to Bookings did nothing except
  // via its back button, which was the only path that actually cleared a
  // panel's pp-open class.
  document.querySelectorAll(".page-panel.pp-open").forEach((p) => {
    if (p !== panel) closePage(p.id);
  });
  // Same reasoning for the Today sheet -- it's a different overlay
  // (bottom sheet vs. full page, higher z-index) but only one of any kind
  // should ever be showing at once.
  closeTodaySheet();
  panel.classList.add("pp-open");
  panel.setAttribute("aria-hidden", "false");
  document.body.classList.add("pp-open-lock");
  document.addEventListener("keydown", onPagePanelKeydown);
}

// With no name, closes whichever page panel is currently open (used by
// each panel's own back button and by Escape).
function closePage(name) {
  const panel = name ? document.getElementById(name) : document.querySelector(".page-panel.pp-open");
  if (!panel) return;
  panel.classList.remove("pp-open");
  panel.setAttribute("aria-hidden", "true");
  document.body.classList.remove("pp-open-lock");
  document.removeEventListener("keydown", onPagePanelKeydown);
  document.querySelectorAll(".tl, .bn-tab").forEach((l) => {
    if (l.dataset.target === panel.id) l.classList.remove("active");
  });
}

function setupPagePanels() {
  document.querySelectorAll(".page-panel .pp-back").forEach((btn) => {
    btn.addEventListener("click", () => closePage(btn.closest(".page-panel").id));
  });
}

// ---- scrollspy ----
// Drives both the top nav chips (.tl) and the mobile bottom tab bar
// (.bn-tab) off the same click-to-jump + IntersectionObserver highlighting
// -- they share the data-target convention, so a section just needs an id
// to be reachable from either. The bottom nav's targets (itineraryTop,
// bookingStatus, prep, toolkit) are a coarser set than the top nav's
// per-city stops, so a couple of ids exist purely for the bottom nav to
// jump to (see index.html).
function setupScrollspy() {
  const links = Array.from(document.querySelectorAll(".tl, .bn-tab"));
  // todayView and the Bookings/Toolkit/Prep page panels are all overlays
  // now, not scrollable sections -- they're reachable via the same
  // data-target links, but shouldn't be part of the IntersectionObserver's
  // scroll-position band.
  const OVERLAY_IDS = ["todayView", ...PAGE_PANEL_IDS];
  const sections = links.map((l) => document.getElementById(l.dataset.target)).filter((s) => s && !OVERLAY_IDS.includes(s.id));
  // A tap sets the highlight immediately (source of truth for the target
  // you asked for), then the smooth scroll animation runs. While that
  // animation is in flight, the IntersectionObserver's band can briefly
  // land on a neighboring section -- e.g. Bookings is short enough that
  // once its banner reaches the top of the viewport, Toolkit's banner is
  // already inside the band underneath it -- which flipped the highlight
  // away from what was just tapped a moment after landing. Suppress
  // IO-driven highlighting until the triggered scroll actually finishes.
  let suppressSpy = false;
  let suppressTimer = null;
  const clearSuppress = () => { suppressSpy = false; };
  links.forEach((l) => l.addEventListener("click", () => {
    // Today is an overlay sheet now, not a page section -- open it instead
    // of scrolling, and always land on the actual current day rather than
    // wherever the ‹ › arrows or calendar picker last left it, so "Today"
    // never silently shows a stale date from an earlier browse.
    if (l.dataset.target === "todayView") {
      openTodaySheet();
      links.forEach((x) => x.classList.toggle("active", x.dataset.target === l.dataset.target));
      return;
    }
    // Bookings/Toolkit/Prep are full-page overlays -- open the page
    // instead of scrolling to a section that no longer lives in the Home
    // scroll. Tapping the tab for the page you're already on is a no-op
    // (openPage just re-adds a class that's already there).
    if (PAGE_PANEL_IDS.includes(l.dataset.target)) {
      openPage(l.dataset.target);
      links.forEach((x) => x.classList.toggle("active", x.dataset.target === l.dataset.target));
      return;
    }
    // Itinerary sits right under the hero -- jumping straight to its
    // section (rather than the very top of the page) would skip past the
    // hero entirely, so this one scrolls to the page top instead to show
    // it off on the way down. It's also how you get back to Home from any
    // open page panel, so close whichever one is open first.
    if (l.dataset.target === "itineraryTop") {
      closePage();
      closeTodaySheet();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      const target = document.getElementById(l.dataset.target);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    links.forEach((x) => x.classList.toggle("active", x.dataset.target === l.dataset.target));
    suppressSpy = true;
    clearTimeout(suppressTimer);
    if ("onscrollend" in window) {
      window.addEventListener("scrollend", clearSuppress, { once: true });
      suppressTimer = setTimeout(clearSuppress, 1500); // safety net if scrollend never fires
    } else {
      suppressTimer = setTimeout(clearSuppress, 700);
    }
  }));
  const io = new IntersectionObserver((entries) => {
    if (suppressSpy) return;
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        links.forEach((l) => l.classList.toggle("active", l.dataset.target === id));
        // Keep the current stop's chip visible in the horizontally-scrolling
        // nav strip as you scroll the page -- otherwise on mobile, once
        // you're a few cities in, the active chip can be scrolled off-screen
        // in the nav itself with no obvious way to tell you're "on" it.
        const activeLink = links.find((l) => l.dataset.target === id);
        if (activeLink) activeLink.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
      }
    });
  }, { rootMargin: "-40% 0px -55% 0px" });
  sections.forEach((s) => io.observe(s));
}

// ---- back to top ----
function setupTotop() {
  const btn = document.getElementById("totop");
  window.addEventListener("scroll", () => { btn.classList.toggle("show", window.scrollY > 800); }, { passive: true });
  btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
}

// ---- static UI bindings ----
function setupStaticBindings() {
  document.getElementById("addNoteBtn").addEventListener("click", () => {
    openModal("Add note", '<label class="field">Note</label><textarea data-field="text"></textarea>',
      (data) => Store.add("notesLog", { text: data.text, ts: new Date().toISOString() }, "n"));
  });
}

// ---- boot ----
window.addEventListener("DOMContentLoaded", async () => {
  buildPlacesSkeleton();
  setupStaticBindings();
  setupScrollspy();
  setupTotop();
  setupTodaySheet();
  setupPagePanels();
  initHeroIntro();
  Store.subscribe(renderAll);
  await Store.init();
  setInterval(tickCountdowns, 30000);
});

// ---- offline support: cache the app shell so it still works with patchy data ----
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => { /* offline support is best-effort */ });
  });
}
