// App shell: scrollspy nav, per-place rendering, shared helpers, modal system.

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
function fmtTime12(hhmm) {
  if (!hhmm) return "";
  const parts = hhmm.split(":");
  const d = new Date();
  d.setHours(parseInt(parts[0], 10) || 0, parseInt(parts[1], 10) || 0, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}
function esc(s) { return (s === undefined || s === null) ? "" : String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
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
function renderTransportLine(t) {
  const bits = [];
  if (t.provider) bits.push(esc(t.provider));
  if (t.confirmation) bits.push("Conf# " + esc(t.confirmation));
  if (t.time) bits.push(esc(t.time));
  return '<div class="item-line item-line-clickable" data-view-booking="' + t.id + '"><span>' + esc(t.title) +
    (bits.length ? ' <span class="muted">(' + bits.join(" · ") + ')</span>' : "") + '</span>' +
    '<span class="il-actions"><span class="status-pill ' + t.status + '">' + t.status + '</span></span></div>';
}
function renderActivityLine(a) {
  return '<div class="item-line item-line-clickable act-draggable" draggable="true" data-view-activity="' + a.id + '"><span class="drag-grip" aria-hidden="true">&#8942;&#8942;</span><span><span class="time">' + esc(a.time || "") + '</span>' + esc(a.title) + '</span></div>';
}

// Calendar-style drag-to-time. Every day box is an hour rail; dropping an
// activity on an hour slot sets its time to that hour (and its date to that
// day, so items can also be dragged between days). Dropping on the "anytime"
// tray clears the time. Manual time edits in the form move the block the
// same way, since the rail is rebuilt from activity times on every render.
function wireActivityDrag(container) {
  let dragged = null;
  container.querySelectorAll(".act-draggable").forEach((row) => {
    row.addEventListener("dragstart", (e) => {
      dragged = row;
      row.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      try { e.dataTransfer.setData("text/plain", row.dataset.viewActivity); } catch (err) { /* IE quirk */ }
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
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      slot.classList.add("drag-over");
    });
    slot.addEventListener("dragleave", (e) => {
      if (!slot.contains(e.relatedTarget)) slot.classList.remove("drag-over");
    });
    slot.addEventListener("drop", (e) => {
      if (!dragged) return;
      e.preventDefault();
      slot.classList.remove("drag-over");
      const id = dragged.dataset.viewActivity;
      const patch = { time: slot.dataset.hour !== undefined ? String(slot.dataset.hour).padStart(2, "0") + ":00" : "" };
      if (slot.dataset.date) patch.date = slot.dataset.date;
      Store.update("activities", id, patch);
    });
  });
}

function hourLabel(h) {
  return h === 0 ? "12 AM" : h < 12 ? h + " AM" : h === 12 ? "12 PM" : (h - 12) + " PM";
}

// One day rendered as an hour rail (8 AM - 10 PM by default, stretched to
// fit any earlier/later activities) plus an "anytime" tray for untimed items.
function renderDayTimeline(d) {
  const timed = d.activities.filter((a) => a.time);
  const untimed = d.activities.filter((a) => !a.time);
  let minH = 8, maxH = 22;
  timed.forEach((a) => {
    const h = parseInt(a.time.slice(0, 2), 10);
    if (h < minH) minH = h;
    if (h > maxH) maxH = h;
  });
  const dateAttr = esc(d.date || "");
  const anytime = untimed.length
    ? '<div class="day-anytime" data-date="' + dateAttr + '"><span class="anytime-label">Anytime</span><div class="hour-items">' + untimed.map(renderActivityLine).join("") + '</div></div>'
    : '<div class="day-anytime day-anytime-empty" data-date="' + dateAttr + '"><span class="anytime-label">Anytime · drop here to unschedule a time</span></div>';
  const slots = [];
  for (let h = minH; h <= maxH; h++) {
    const items = timed.filter((a) => parseInt(a.time.slice(0, 2), 10) === h);
    slots.push('<div class="hour-slot' + (items.length ? " has-items" : "") + '" data-hour="' + h + '" data-date="' + dateAttr + '">' +
      '<span class="hour-label">' + hourLabel(h) + '</span>' +
      '<div class="hour-items">' + items.map(renderActivityLine).join("") + '</div></div>');
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

// Activity row variant for the Today view: optional Now/Next pill and a
// one-tap "→ tomorrow" reschedule button.
function renderTodayActivityLine(a, nn, canMove) {
  const pill = nn ? '<span class="nn-pill nn-' + nn + '">' + nn + '</span>' : "";
  const moveBtn = canMove ? '<button class="move-tomorrow" data-move-tomorrow="' + a.id + '" title="Move to tomorrow">&rarr; tomorrow</button>' : "";
  return '<div class="item-line item-line-clickable' + (nn === "now" ? " is-now" : "") + '" data-view-activity="' + a.id + '">' +
    '<span><span class="time">' + esc(a.time || "") + '</span>' + esc(a.title) + pill + '</span>' +
    '<span class="il-actions">' + moveBtn + '</span></div>';
}

let foodFilter = {}; // placeId -> "all" | "veg" | "nonveg"
let hotelFilter = {}; // placeId -> "all" | "budget" | "splurge"
let todayViewOffset = 0; // Today view day-paging offset (0 = actual today)
let itineraryEditMode = false; // itinerary editor: view (false) vs edit controls (true)
let budgetCurrency = "USD"; // display-only toggle for the budget panel, not persisted

// A day's lodging, rendered as a bar along the bottom of that day's box --
// labeled Check-in / Check-out / Staying at, depending on where this date
// falls relative to the booking's date/endDate. Colored to match that city's
// accent (same palette as the itinerary editor's timeline dots/thumbnails),
// so the bar visually ties back to which place you're in.
function renderDayHotelBar(lodging, dateStr, placeId) {
  if (!lodging) return "";
  const isCheckin = lodging.date === dateStr;
  const isCheckout = lodging.endDate === dateStr;
  let label, timeVal;
  if (isCheckin && isCheckout) { label = "Check-in & check-out"; timeVal = lodging.checkinTime || lodging.checkoutTime; }
  else if (isCheckin) { label = "Check-in"; timeVal = lodging.checkinTime; }
  else if (isCheckout) { label = "Check-out"; timeVal = lodging.checkoutTime; }
  else { label = "Staying at"; timeVal = ""; }
  const timeHtml = timeVal ? " · " + esc(fmtTime12(timeVal)) : "";
  const accent = PLACE_ACCENT[placeId] || "#1d6a8c";
  return '<div class="day-hotel-bar item-line-clickable" data-view-booking="' + lodging.id + '" style="background:' + accent + '"><span class="dhb-label">' + esc(label) + timeHtml + '</span>' +
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
  const mapsLink = isBooking ? item.link : mapsUrlForCity(item.title, item.city);
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
  const accent = PLACE_ACCENT[place && place.id] || "#1d6a8c";
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
    '<div class="idc-rows">' + rows.map((r) => '<div class="idc-row"><span class="idc-label">' + esc(r[0]) + '</span><span class="idc-val">' + esc(r[1]) + '</span></div>').join("") + '</div>' +
    (rows.length === 0 ? '<p class="muted">No extra details yet -- add some from Edit below.</p>' : "") +
    (mapsLink ? '<div class="pm-actions"><span></span><a class="site" href="' + esc(mapsLink) + '" target="_blank" rel="noopener">Map</a></div>' : "") +
    '</div>' +
    '<div class="pm-footer">' +
    '<button class="link" id="idcEditBtn">Edit details</button>' +
    '<button class="link danger" id="idcRemoveBtn">Remove</button>' +
    '</div></div></div>');
  root.appendChild(overlay);
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
  const accent = PLACE_ACCENT[place.id] || "#1d6a8c";
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
    (item.url ? '<a class="site" href="' + esc(item.url) + '" target="_blank" rel="noopener">Map</a>' : "") +
    '</div></div>' +
    '<div class="pm-footer">' +
    '<button class="link" id="pmEdit">Edit details</button>' +
    '<button class="link danger" id="pmRemove">Remove</button>' +
    '</div></div></div>');
  root.appendChild(overlay);
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
  container.innerHTML = PLACES.map((p, i) => {
    const num = String(i + 1).padStart(2, "0");
    const tips = (PLACE_TIPS[p.id] || []).map((t) => "<li>" + esc(t) + "</li>").join("");
    return '<section id="' + p.id + '">' +
      '<div class="place-head"><div class="bg" style="background-image:url(\'' + p.image + '\')"></div>' +
      '<div class="ph-inner"><div class="place-num">' + num + " / " + PLACES.length + '</div>' +
      "<h2>" + esc(p.title) + " <em>" + esc(p.titleEm) + "</em></h2>" +
      '<div class="nights" id="nights-' + p.id + '"></div></div></div>' +
      '<div class="wrap">' +
      '<div class="sub-h"><h3>Day by day</h3><span class="rule"></span></div>' +
      '<div class="wishlist" id="wishlist-' + p.id + '" style="display:none"></div>' +
      '<div id="days-' + p.id + '"></div>' +

      '<details class="plan-collapse" data-collapse-key="stay-' + p.id + '" open>' +
      '<summary><div class="sub-h"><h3>Where to stay</h3><span class="rule"></span><span class="arw">+</span></div></summary>' +
      '<div class="plan-collapse-body">' +
      '<p class="sub-sub">Choose one to book</p>' +
      '<div class="filters" id="hotelfilters-' + p.id + '">' +
      '<button class="chip on" data-filter="all">All</button>' +
      '<button class="chip" data-filter="budget">Within budget</button>' +
      '<button class="chip" data-filter="splurge">Splurge picks</button>' +
      '</div>' +
      '<div id="hotels-' + p.id + '"></div>' +
      '<button class="link add-row-btn" data-add-hotel="' + p.id + '">+ add a hotel option</button>' +
      '</div></details>' +

      '<details class="plan-collapse" data-collapse-key="seedo-' + p.id + '" open>' +
      '<summary><div class="sub-h"><h3>See &amp; do</h3><span class="rule"></span><span class="arw">+</span></div></summary>' +
      '<div class="plan-collapse-body">' +
      '<div id="seedo-' + p.id + '" class="cards"></div>' +
      '</div></details>' +

      '<details class="plan-collapse" data-collapse-key="food-' + p.id + '" open>' +
      '<summary><div class="sub-h"><h3>Where to eat</h3><span class="rule"></span><span class="arw">+</span></div></summary>' +
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
      "</div></section>" + (i < PLACES.length - 1 ? '<div class="divider"></div>' : "");
  }).join("");

  // Planning sections (stay / see&do / eat) collapse per city -- handy once a
  // city is fully planned. Open/closed is remembered on this device.
  let collapsed = {};
  try { collapsed = JSON.parse(localStorage.getItem("planCollapse") || "{}"); } catch (err) { collapsed = {}; }
  container.querySelectorAll(".plan-collapse").forEach((det) => {
    if (collapsed[det.dataset.collapseKey]) det.removeAttribute("open");
    det.addEventListener("toggle", () => {
      collapsed[det.dataset.collapseKey] = !det.open;
      try { localStorage.setItem("planCollapse", JSON.stringify(collapsed)); } catch (err) { /* private mode */ }
    });
  });

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
    btn.addEventListener("click", () => openHotelForm(Store.getState(), null, PLACES.find((p) => p.id === btn.dataset.addHotel))));
}

function placeForCity(cityId) { return PLACES.find((p) => p.cityIds.indexOf(cityId) !== -1); }

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
  const place = PLACES.find((p) => p.id === placeId);
  const days = Store.getItineraryDays().filter((d) => d.placeId === placeId);
  const el2 = document.getElementById("days-" + placeId);
  if (!days.length) { el2.innerHTML = '<div class="day-rows"><div class="day-row"><div class="day-body muted">Not currently in your itinerary. Add it back in the itinerary editor above.</div></div></div>'; return; }
  el2.innerHTML = '<div class="day-rows">' + days.map((d) => {
    const lines = renderDayTimeline(d);
    const transportLines = d.transport.map(renderTransportLine).join("");
    const hotelBar = renderDayHotelBar(d.lodging, d.date, placeId);
    return '<div class="day-row"><div class="day-dot">' + d.day + '</div><div class="day-body">' +
      '<div class="day-date">' + (d.date ? fmtDate(d.date) : "Day " + d.day) + '</div>' +
      transportLines + lines +
      '<div class="day-add-row">' +
      '<button class="add-line" data-add-act="' + esc(d.date || "") + '">+ add to this day</button>' +
      '<button class="add-line" data-add-booking="' + esc(d.date || "") + '">+ add a booking</button>' +
      '</div>' + hotelBar + '</div></div>';
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
  const place = PLACES.find((p) => p.id === placeId);
  const placeLodgings = lodgingBookingsForPlace(state, place);
  let list = (state.hotels || []).filter((h) => h.placeId === placeId);
  const filter = hotelFilter[placeId] || "all";
  if (filter === "budget") list = list.filter((h) => !h.splurge);
  if (filter === "splurge") list = list.filter((h) => h.splurge);
  const el2 = document.getElementById("hotels-" + placeId);
  el2.innerHTML = '<div class="table-scroll"><table><thead><tr><th>Hotel</th><th>Nightly</th><th>Pros</th><th>Cons</th><th></th></tr></thead><tbody>' +
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
        (h.url ? '<a href="' + esc(h.url) + '" target="_blank" rel="noopener">Visit site</a><br>' : "") +
        '<button class="site-link" data-choose-hotel="' + h.id + '">' + (existingForHotel ? "Chosen -- edit dates" : "Choose this") + '</button><br>' +
        '<button class="link" data-edit-hotel="' + h.id + '">edit</button></td></tr>';
    }).join("") + "</tbody></table></div>" +
    (placeLodgings.length > 1 ? '<div class="muted" style="font-size:.82rem;margin-top:.4rem">Split stay: ' +
      placeLodgings.map((b) => esc(b.title) + " (" + esc(fmtDate(b.date)) + "–" + esc(fmtDate(b.endDate)) + ")").join(", ") + '</div>' : "");
  el2.querySelectorAll("[data-choose-hotel]").forEach((btn) => btn.addEventListener("click", () => {
    const h = state.hotels.find((x) => x.id === btn.dataset.chooseHotel);
    const existingForHotel = placeLodgings.find((b) => b.title === h.name);
    openHotelChooseConfirm(state, h, place, existingForHotel, placeLodgings);
  }));
  el2.querySelectorAll("[data-edit-hotel]").forEach((btn) => btn.addEventListener("click", () => openHotelForm(state, state.hotels.find((x) => x.id === btn.dataset.editHotel), place)));
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
    '<div class="grid2" style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><div><label class="field">Check-in time (optional)</label><input type="time" data-field="checkinTime" value="' + esc(current ? current.checkinTime : "") + '"></div>' +
    '<div><label class="field">Check-out time (optional)</label><input type="time" data-field="checkoutTime" value="' + esc(current ? current.checkoutTime : "") + '"></div></div>';
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
    (existing ? '<div style="margin-top:8px"><button class="link" id="deleteHotelBtn">Remove</button></div>' : "");
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
  const place = PLACES.find((p) => p.id === placeId);
  const list = (state.thingsToDo || []).filter((s) => s.placeId === placeId);
  const el2 = document.getElementById("seedo-" + placeId);
  el2.innerHTML = list.map((s) =>
    '<div class="card card-clickable" data-view-see="' + s.id + '"><div class="pic"></div><div class="body"><div class="kind">' + esc(s.kind) + '</div>' +
    '<h4>' + esc(s.name) + '</h4>' +
    '<div class="foot">' +
    '<button class="site" data-add-day-see="' + s.id + '">+ Add to a day</button>' +
    (s.url ? '<a class="site" href="' + esc(s.url) + '" target="_blank" rel="noopener">Map</a>' : "") +
    '</div></div></div>').join("") +
    '<div class="card" style="align-items:center;justify-content:center;min-height:150px"><button class="link" data-add-see="' + placeId + '">+ add a thing to do</button></div>';
  el2.querySelectorAll("[data-add-see]").forEach((btn) => btn.addEventListener("click", () => openSeeForm(state, null, place)));
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
    (existing ? '<div style="margin-top:8px"><button class="link" id="deleteSeeBtn">Remove</button></div>' : "");
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
  const place = PLACES.find((p) => p.id === placeId);
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
    '</div></div></div>').join("") +
    '<div class="card" style="align-items:center;justify-content:center;min-height:150px"><button class="link" data-add-rest="' + placeId + '">+ add restaurant</button></div>';
  el2.querySelectorAll("[data-add-rest]").forEach((btn) => btn.addEventListener("click", () => openRestForm(state, null, place)));
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
    '<label class="field">Time (optional)</label><input type="time" data-field="time">' +
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
  const place = PLACES.find((p) => p.id === placeId);
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
      '<label class="field">Time (optional)</label><input type="time" data-field="time" value="' + esc(a.time || "") + '">';
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
  PLACES.forEach((p) => { renderPlaceNights(p.id, state); renderPlaceWishlist(p.id, state); renderPlaceDays(p.id, state); renderPlaceHotels(p.id, state); renderPlaceSee(p.id, state); renderPlaceFood(p.id, state); });
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
    '<label class="field">Time (optional)</label><input type="time" data-field="time" value="' + esc(existing ? existing.time : "") + '">' +
    '<label class="field">City</label><select data-field="city">' + cityOpts + '</select>' +
    '<label class="field">Type</label><select data-field="type">' + typeOpts + '</select>' +
    '<div class="grid2" style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><div><label class="field">Cost per person (optional)</label><input data-field="cost" type="number" value="' + (existing && existing.cost ? existing.cost : "") + '"></div>' +
    '<div><label class="field">Currency</label><select data-field="currency">' + currencyOpts + '</select></div></div>' +
    '<label class="field">Status</label><select data-field="status">' + statusOpts + '</select>' +
    '<label class="field">Notes</label><textarea data-field="notes">' + esc(existing ? existing.notes : "") + '</textarea>' +
    (existing ? '<div style="margin-top:8px"><button class="link" id="deleteActBtn">Remove this item</button></div>' : "");
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
    '<label class="field">Time (optional)</label><input type="time" data-field="time" value="' + esc(existing ? existing.time : "") + '">' +
    '<div class="grid2" style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><div><label class="field">Check-in time (for a stay)</label><input type="time" data-field="checkinTime" value="' + esc(existing ? existing.checkinTime : "") + '"></div>' +
    '<div><label class="field">Check-out time (for a stay)</label><input type="time" data-field="checkoutTime" value="' + esc(existing ? existing.checkoutTime : "") + '"></div></div>' +
    '<label class="field">Provider</label><input data-field="provider" value="' + esc(existing ? existing.provider : "") + '">' +
    '<label class="field">Confirmation #</label><input data-field="confirmation" value="' + esc(existing ? existing.confirmation : "") + '">' +
    '<div class="grid2" style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><div><label class="field">Cost per person</label><input data-field="cost" type="number" value="' + (existing ? existing.cost : "") + '"></div>' +
    '<div><label class="field">Currency</label><select data-field="currency">' + currencyOpts + '</select></div></div>' +
    '<label class="field">Status</label><select data-field="status">' + statusOpts + '</select>' +
    '<label class="field">Link</label><input data-field="link" value="' + esc(existing ? existing.link : "") + '">' +
    '<label class="field">Notes</label><textarea data-field="notes">' + esc(existing ? existing.notes : "") + '</textarea>' +
    (existing ? '<div style="margin-top:8px"><button class="link" id="deleteBkBtn">Remove this booking</button></div>' : "");
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
    (existing ? '<div style="margin-top:8px"><button class="link" id="deleteRestBtn">Remove</button></div>' : "");
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
  const baseISO = previewDate || new Date().toISOString().slice(0, 10);
  const days = Store.getItineraryDays();
  const viewISO = isoAddDays(baseISO, todayViewOffset);
  let today = days.find((d) => d.date === viewISO);
  if (!today && todayViewOffset !== 0) { todayViewOffset = 0; today = days.find((d) => d.date === baseISO); }
  if (!today) { section.style.display = "none"; return; }
  section.style.display = "";
  const rel = todayViewOffset;
  const badge = section.querySelector(".tv-badge");
  if (badge) {
    badge.textContent = rel === 0 ? (previewDate ? "Today (preview)" : "Today")
      : rel === 1 ? "Tomorrow" : rel === -1 ? "Yesterday"
      : new Date(today.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long" });
    badge.title = rel === 0 ? "" : "Tap to jump back to today";
    badge.onclick = rel === 0 ? null : () => { todayViewOffset = 0; renderTodayView(Store.getState()); };
    badge.style.cursor = rel === 0 ? "" : "pointer";
  }
  document.getElementById("todayDate").textContent = fmtDate(today.date);
  const prevBtn = document.getElementById("tvPrev");
  const nextBtn = document.getElementById("tvNext");
  if (prevBtn && nextBtn) {
    prevBtn.disabled = !days.find((d) => d.date === isoAddDays(viewISO, -1));
    nextBtn.disabled = !days.find((d) => d.date === isoAddDays(viewISO, 1));
    prevBtn.onclick = () => { todayViewOffset--; renderTodayView(Store.getState()); };
    nextBtn.onclick = () => { todayViewOffset++; renderTodayView(Store.getState()); };
  }
  const place = PLACES.find((p) => p.id === today.placeId);
  const dayNum = days.indexOf(today) + 1;
  const accent = PLACE_ACCENT[today.placeId] || "#1d6a8c";
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
  const tripEnd = days.length ? days[days.length - 1].date : null;
  const canMove = tripEnd && today.date < tripEnd;
  const cityHtml = place
    ? '<div class="tv-city" style="color:' + accent + '">' + esc(place.label) +
      '<span class="tv-daynum">Day ' + dayNum + " of " + days.length + '</span></div>'
    : "";
  const hotelHtml = renderDayHotelBar(today.lodging, today.date, today.placeId);
  const transportHtml = today.transport.map(renderTransportLine).join("");
  const actsHtml = today.activities.map((a) =>
    renderTodayActivityLine(a, a.id === nowId ? "now" : a.id === nextId ? "next" : null, canMove)).join("");
  const contentEl = document.getElementById("todayContent");
  contentEl.innerHTML =
    cityHtml + transportHtml +
    (actsHtml || '<div class="muted" style="padding:.4rem 0">Nothing scheduled yet for this day.</div>') +
    hotelHtml;
  contentEl.querySelectorAll("[data-view-booking]").forEach((row) => row.addEventListener("click", () => {
    const b = Store.getState().bookings.find((x) => x.id === row.dataset.viewBooking);
    if (b) openItemDetailCard("booking", b, place);
  }));
  contentEl.querySelectorAll("[data-view-activity]").forEach((row) => row.addEventListener("click", () => {
    const a = Store.getState().activities.find((x) => x.id === row.dataset.viewActivity);
    if (a) openItemDetailCard("activity", a, place);
  }));
  contentEl.querySelectorAll("[data-move-tomorrow]").forEach((btn) => btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const a = Store.getState().activities.find((x) => x.id === btn.dataset.moveTomorrow);
    if (a) Store.update("activities", a.id, { date: isoAddDays(a.date, 1) });
  }));
}

// ---- hero + intro ----
function renderHero(state) {
  const totalDays = Store.getTotalDays();
  document.title = state.meta.tripName + " · " + totalDays + " days";
  const startDate = state.trip && state.trip.startDate;
  let countdown = "Dates not set";
  if (startDate) {
    const days2go = Math.ceil((new Date(startDate) - new Date()) / 86400000);
    countdown = days2go > 0 ? days2go + " days to go" : "Underway or past";
  }
  document.getElementById("heroMeta").innerHTML =
    '<span>' + (state.trip ? state.trip.stops.length : PLACES.length) + " stops</span><span>" + totalDays + ' days</span><span><strong>' + countdown + '</strong></span>';
}

// A bigger, more prominent countdown banner (separate from the small hero
// meta line above) -- shows days-to-go before the trip, which day you're on
// while traveling, and a wrap-up message afterward.
function renderCountdown(state) {
  const el2 = document.getElementById("countdownBanner");
  if (!el2) return;
  const range = Store.getTripDateRange();
  if (!range.start) { el2.style.display = "none"; return; }
  const msPerDay = 86400000;
  const todayISO = new Date().toISOString().slice(0, 10);
  const todayD = new Date(todayISO + "T00:00:00");
  const startD = new Date(range.start + "T00:00:00");
  const endD = range.end ? new Date(range.end + "T00:00:00") : null;
  el2.style.display = "";
  let cls = "countdown-banner", html;
  if (todayD < startD) {
    const days = Math.round((startD - todayD) / msPerDay);
    cls += " cd-upcoming";
    html = '<div class="cd-card"><div class="cd-num">' + days + '</div><div class="cd-label">' +
      (days === 1 ? "day" : "days") + ' until departure<span class="cd-sub">' + esc(fmtDate(range.start)) + '</span></div></div>';
  } else if (endD && todayD >= endD) {
    cls += " cd-done";
    html = '<div class="cd-card"><div class="cd-num">&#10003;</div><div class="cd-label">Trip complete<span class="cd-sub">Hope it was unforgettable</span></div></div>';
  } else {
    const dayNum = Math.round((todayD - startD) / msPerDay) + 1;
    const totalDays = Store.getTotalDays();
    cls += " cd-live";
    html = '<div class="cd-card"><div class="cd-num">' + dayNum + '</div><div class="cd-label">of ' + totalDays +
      " -- you're on the trip<span class=\"cd-sub\">Enjoy today</span></div></div>";
  }
  el2.className = cls;
  el2.innerHTML = html;
}

// ---- booking status at a glance: hotels + inter-city transport only, the
// two categories that actually need to get locked in before the trip ----
function renderBookingStatus(state) {
  const el2 = document.getElementById("bookingStatusPanel");
  if (!el2) return;
  const ranges = Store.computeStopRanges();
  const hotelRows = ranges.map((r) => {
    const place = PLACES.find((p) => p.id === r.placeId);
    // A stop can be split across more than one hotel -- show every lodging
    // booking that overlaps this stop's range as its own row, not just the
    // first one found.
    const lodgings = state.bookings.filter((b) => b.category === "lodging" && b.date < r.dateEnd && b.endDate > r.dateStart);
    if (!lodgings.length) {
      const dateLabel = r.dateStart ? esc(fmtDate(r.dateStart)) + " &ndash; " + esc(fmtDate(r.dateEnd)) : "";
      return '<tr><td class="bs-item">' + esc(place ? place.label : r.placeId) +
        '<span class="bs-sub muted">' + r.nights + (r.nights === 1 ? " night" : " nights") + '</span></td>' +
        '<td class="bs-date">' + dateLabel + '</td>' +
        '<td><span class="muted">No hotel chosen yet</span></td>' +
        '<td><span class="status-pill missing">missing</span></td>' +
        '<td class="actions"><button class="link" data-bs-hotel="' + r.placeId + '" data-bs-booking="">choose</button></td></tr>';
    }
    return lodgings.map((lodging) => {
      const nights = nightsBetween(lodging.date, lodging.endDate);
      const dateLabel = esc(fmtDate(lodging.date)) + " &ndash; " + esc(fmtDate(lodging.endDate));
      return '<tr><td class="bs-item">' + esc(place ? place.label : r.placeId) +
        '<span class="bs-sub muted">' + nights + (nights === 1 ? " night" : " nights") + '</span></td>' +
        '<td class="bs-date">' + dateLabel + '</td>' +
        '<td>' + esc(lodging.title) + '</td>' +
        '<td><span class="status-pill ' + lodging.status + '">' + lodging.status + '</span></td>' +
        '<td class="actions"><button class="link" data-bs-hotel="' + r.placeId + '" data-bs-booking="' + lodging.id + '">edit</button></td></tr>';
    }).join("");
  }).join("");
  const transportBookings = state.bookings.filter((b) => b.category !== "lodging").sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  const transportRows = transportBookings.length ? transportBookings.map((t) => {
    const dateLabel = t.date ? (t.endDate && t.endDate !== t.date ? esc(fmtDate(t.date)) + " &ndash; " + esc(fmtDate(t.endDate)) : esc(fmtDate(t.date))) : '<span class="muted">no date set</span>';
    return '<tr><td class="bs-item">' + esc(t.title) + '</td>' +
      '<td class="bs-date">' + dateLabel + '</td>' +
      '<td>' + esc(t.category) + '</td>' +
      '<td><span class="status-pill ' + t.status + '">' + t.status + '</span></td>' +
      '<td class="actions"><button class="link" data-bs-booking="' + t.id + '">edit</button></td></tr>';
  }).join("") : '<tr><td colspan="5" class="muted">No transport between cities booked yet.</td></tr>';
  el2.innerHTML =
    '<div class="bs-group"><h4>Hotels</h4><div class="table-scroll"><table><thead><tr><th>Stop</th><th>Dates</th><th>Hotel</th><th>Status</th><th></th></tr></thead><tbody>' + hotelRows + '</tbody></table></div></div>' +
    '<div class="bs-group"><h4>Transport between cities</h4><div class="table-scroll"><table><thead><tr><th>Leg</th><th>Date</th><th>Type</th><th>Status</th><th></th></tr></thead><tbody>' + transportRows + '</tbody></table></div></div>';
  el2.querySelectorAll("[data-bs-booking]").forEach((btn) => btn.addEventListener("click", () => {
    const id = btn.dataset.bsBooking;
    if (id) {
      const b = state.bookings.find((x) => x.id === id);
      if (b) openBookingForm(state, b, null);
    } else if (btn.dataset.bsHotel) {
      const target = document.getElementById(btn.dataset.bsHotel);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }));
}

// ---- itinerary editor: a vertical timeline of stops, reorder / resize / add-remove ----
function renderItineraryEditor(state) {
  const container = document.getElementById("itineraryStopsList");
  if (!container) return;
  const ranges = Store.computeStopRanges();
  const totalNights = state.trip.stops.reduce((sum, s) => sum + s.nights, 0) || 1;

  const routeStrip = '<div class="ie-route-strip">' + state.trip.stops.map((stop) => {
    const place = PLACES.find((p) => p.id === stop.placeId);
    const pct = (stop.nights / totalNights) * 100;
    const color = PLACE_ACCENT[stop.placeId] || "#7cc0c2";
    const lbl = stop.nights >= 2 && place ? '<span class="ie-seg-lbl">' + esc(place.label) + '</span>' : "";
    return '<div class="ie-route-seg" style="width:' + pct + '%;background:' + color + '" title="' + esc(place ? place.label : stop.placeId) + ' · ' + stop.nights + (stop.nights === 1 ? " night" : " nights") + '">' + lbl + '</div>';
  }).join("") + '</div>';

  const tripRange = Store.getTripDateRange();
  const summaryLine = tripRange.start
    ? '<div class="ie-summary">' + esc(fmtDate(tripRange.start)) + ' &ndash; ' + esc(fmtDate(tripRange.end)) +
      '<span class="ie-summary-sep">·</span>' + totalNights + ' nights' +
      '<span class="ie-summary-sep">·</span>' + state.trip.stops.length + ' stops</div>'
    : "";

  // View mode: just city + dates. Edit mode: full controls (nights,
  // reorder, remove, add a stop). Toggled by the Edit/Done button.
  const simpleList = '<div class="ie-timeline">' + state.trip.stops.map((stop, i) => {
    const place = PLACES.find((p) => p.id === stop.placeId);
    const range = ranges[i];
    const dateLabel = range && range.dateStart ? fmtDate(range.dateStart) + " – " + fmtDate(range.dateEnd) : "";
    const accent = PLACE_ACCENT[stop.placeId] || "#7cc0c2";
    const thumbStyle = "color:" + accent + (place ? ";background-image:url('" + place.image + "')" : ";background:" + accent);
    return '<div class="ie-stop ie-simple">' +
      '<div class="ie-thumb" style="' + thumbStyle + '"></div>' +
      '<div class="ie-simple-body">' +
      '<div class="ie-stop-name">' + esc(place ? place.label : stop.placeId) + '</div>' +
      '<div class="ie-stop-dates muted">' + esc(dateLabel) + '</div>' +
      '</div>' +
      '<span class="ie-nights-pill" style="background:' + accent + '">' + stop.nights + (stop.nights === 1 ? " night" : " nights") + '</span>' +
      '</div>';
  }).join("") + '</div>';

  const timeline = '<div class="ie-timeline">' + state.trip.stops.map((stop, i) => {
    const place = PLACES.find((p) => p.id === stop.placeId);
    const range = ranges[i];
    const dateLabel = range && range.dateStart ? fmtDate(range.dateStart) + " – " + fmtDate(range.dateEnd) : "";
    const accent = PLACE_ACCENT[stop.placeId] || "#7cc0c2";
    const thumbStyle = "color:" + accent + (place ? ";background-image:url('" + place.image + "')" : ";background:" + accent);
    return '<div class="ie-stop">' +
      '<div class="ie-thumb" style="' + thumbStyle + '"></div>' +
      '<div class="ie-stop-card">' +
      '<div class="ie-stop-top">' +
      '<div class="ie-stop-name">' + esc(place ? place.label : stop.placeId) + '</div>' +
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
    ? (routeStrip + summaryLine + (itineraryEditMode ? timeline : simpleList))
    : '<div class="muted">No stops yet -- add one below.</div>';

  const toggle = document.getElementById("ieEditToggle");
  if (toggle) {
    toggle.textContent = itineraryEditMode ? "Done" : "Edit";
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

  const addBtn = document.getElementById("addStopBtn");
  if (addBtn) addBtn.onclick = () => openAddStopModal(state);
}

// Adding a stop opens a modal so you can see (and choose) exactly which dates it
// lands on before committing -- pick the place, where in the sequence it goes,
// and how many nights, with a live preview of the resulting date range.
function openAddStopModal(state) {
  const usedIds = state.trip.stops.map((s) => s.placeId);
  const available = PLACES.filter((p) => usedIds.indexOf(p.id) === -1);
  if (!available.length) {
    openModal("Add a stop", '<p class="muted">All five places are already in your itinerary. Remove one first if you want to swap it out.</p>', () => {}, "OK");
    return;
  }
  const placeOpts = available.map((p) => '<option value="' + p.id + '">' + esc(p.label) + '</option>').join("");
  const positionOpts = state.trip.stops.map((s, i) => {
    const p = PLACES.find((x) => x.id === s.placeId);
    return '<option value="' + i + '">Before ' + esc(p ? p.label : s.placeId) + '</option>';
  }).join("") + '<option value="' + state.trip.stops.length + '" selected>At the end</option>';
  const body =
    '<label class="field">Place</label><select data-field="placeId">' + placeOpts + '</select>' +
    '<label class="field">Insert</label><select data-field="position">' + positionOpts + '</select>' +
    '<label class="field">Nights</label><input data-field="nights" type="number" min="1" value="1">' +
    '<div class="ie-preview muted" id="addStopPreview" style="margin-top:.6rem"></div>';
  openModal("Add a stop", body, (data) => {
    Store.insertTripStop(parseInt(data.position, 10), data.placeId, parseInt(data.nights, 10) || 1);
  }, "Add stop");

  // Live preview: simulate the insertion against a copy of the current stops
  // and show the computed date range, without touching real state yet.
  function updatePreview() {
    const placeSelect = document.querySelector('[data-field="placeId"]');
    const positionSelect = document.querySelector('[data-field="position"]');
    const nightsInput = document.querySelector('[data-field="nights"]');
    const preview = document.getElementById("addStopPreview");
    if (!placeSelect || !positionSelect || !nightsInput || !preview) return;
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
    updatePreview();
  }, 0);
}


// ---- toolkit: weather ----
// A 7-10 day forecast is meaningless two months out, so this shows typical
// September climate normals until the trip is close enough for a real
// forecast to mean anything, then switches over automatically.
function renderHistoricalWeather(visited, daysUntilTrip) {
  const container = document.getElementById("weatherGrid");
  const cards = visited.map((id) => {
    const c = CITIES.find((x) => x.id === id);
    const norm = SEPT_CLIMATE_NORMALS[id];
    if (!c || !norm) return "";
    return '<div class="util-card"><h4>' + esc(c.name) + '</h4>' +
      '<div class="muted">Typical high ' + norm.high + 'F / low ' + norm.low + 'F</div>' +
      (norm.sea ? '<div class="muted">Sea ~' + norm.sea + 'F</div>' : "") +
      '<div class="muted">' + esc(norm.note) + '</div></div>';
  }).join("");
  const caption = '<div class="muted" style="margin-bottom:.8rem;grid-column:1/-1">' +
    (daysUntilTrip !== null && daysUntilTrip > 0
      ? daysUntilTrip + " days to go -- showing typical September averages. A live forecast appears within 10 days of departure."
      : "Typical September averages.") +
    "</div>";
  container.innerHTML = caption + (cards || '<div class="muted">Add a stay to see typical weather for that city.</div>');
}

async function renderWeather() {
  const visited = [];
  Store.getItineraryDays().forEach((d) => { if (d.cityId && visited.indexOf(d.cityId) === -1) visited.push(d.cityId); });
  const container = document.getElementById("weatherGrid");
  const tripRange = Store.getTripDateRange();
  const daysUntilTrip = tripRange.start ? Math.ceil((new Date(tripRange.start) - new Date()) / 86400000) : null;
  const tripUnderway = tripRange.start && tripRange.end && new Date() >= new Date(tripRange.start) && new Date() <= new Date(tripRange.end);
  const useLiveForecast = tripUnderway || (daysUntilTrip !== null && daysUntilTrip <= 10);

  if (!useLiveForecast) { renderHistoricalWeather(visited, daysUntilTrip); return; }

  container.innerHTML = '<div class="muted">Loading forecast...</div>';
  const cards = await Promise.all(visited.map(async (id) => {
    const c = CITIES.find((x) => x.id === id);
    if (!c) return "";
    try {
      const res = await fetch("https://api.open-meteo.com/v1/forecast?latitude=" + c.lat + "&longitude=" + c.lng + "&current=temperature_2m&daily=temperature_2m_max,temperature_2m_min&forecast_days=10&temperature_unit=fahrenheit&timezone=auto");
      const j = await res.json();
      const cur = j.current ? Math.round(j.current.temperature_2m) + "F now" : "";
      return '<div class="util-card"><h4>' + esc(c.name) + '</h4><div class="muted">' + cur + '</div>' +
        '<div class="muted">Forecast highs: ' + (j.daily ? j.daily.temperature_2m_max.map((t) => Math.round(t)).join(", ") : "n/a") + 'F</div></div>';
    } catch (e) {
      const norm = SEPT_CLIMATE_NORMALS[id];
      return '<div class="util-card"><h4>' + esc(c.name) + '</h4><div class="muted">Forecast unavailable right now' + (norm ? " -- typical high " + norm.high + "F / low " + norm.low + "F" : "") + '.</div></div>';
    }
  }));
  container.innerHTML = cards.join("") || '<div class="muted">Add a stay to see weather for that city.</div>';
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
function renderDocuments(state) {
  document.getElementById("docGrid").innerHTML = state.documents.map((d) =>
    '<div class="util-card"><h4>' + esc(d.title) + '</h4><div class="muted">' + esc(d.category) + '</div>' +
    (d.link ? '<div><a href="' + esc(d.link) + '" target="_blank" rel="noopener">' + esc(d.link) + '</a></div>' : "") +
    (d.notes ? '<div class="muted">' + esc(d.notes) + '</div>' : "") +
    '<div style="margin-top:6px"><button class="link" data-del-doc="' + d.id + '">remove</button></div></div>').join("") ||
    '<div class="muted">No documents yet.</div>';
  document.querySelectorAll("[data-del-doc]").forEach((btn) => btn.addEventListener("click", () => Store.remove("documents", btn.dataset.delDoc)));
}

// ---- toolkit: emergency info ----
function renderEmergencyInfo(state) {
  const container = document.getElementById("emergencyInfo");
  if (!container) return;
  const placeCards = (state.trip ? state.trip.stops : []).map((s) => {
    const place = PLACES.find((p) => p.id === s.placeId);
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
}

// Add (or edit) a single to-do in the Prep checklist. Phase is free text with
// autocomplete suggestions from whatever phases already exist, so a new item
// either slots into an existing group or starts a new one. forcedPhase comes
// from clicking "+ add to this section" on a specific phase block.
function openPrepItemModal(state, existing, forcedPhase) {
  const phases = groupByPhase(state.prepChecklist || []).map((g) => g.phase);
  const datalistOpts = phases.map((p) => '<option value="' + esc(p) + '"></option>').join("");
  const defaultPhase = existing ? existing.phase : (forcedPhase || (phases.length ? phases[phases.length - 1] : ""));
  const body =
    '<label class="field">To-do</label><textarea data-field="text">' + esc(existing ? existing.text : "") + '</textarea>' +
    '<label class="field">Phase / timing</label><input data-field="phase" list="prepPhaseOptions" value="' + esc(defaultPhase) + '">' +
    '<datalist id="prepPhaseOptions">' + datalistOpts + '</datalist>' +
    (existing ? '<div style="margin-top:8px"><button class="link" id="deletePrepBtn">Remove this to-do</button></div>' : "");
  openModal(existing ? "Edit to-do" : "Add a to-do", body, (data) => {
    if (!data.text) return;
    const payload = { phase: data.phase || "Other", text: data.text, done: existing ? existing.done : false };
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
  return '<div class="prep-item-row"><label class="prep-item' + (item.done ? " done" : "") + '"><input type="checkbox" data-prep-toggle="' + item.id + '" ' + (item.done ? "checked" : "") + '><span>' + esc(item.text) + '</span></label>' +
    '<button class="prep-edit" data-prep-edit="' + item.id + '">edit</button></div>';
}
function prepPhaseBlock(phaseName, items) {
  return '<div class="prep-phase"><h4>' + esc(phaseName) + '</h4>' + items.map(prepItemHtml).join("") +
    '<button class="prep-add" data-prep-add-phase="' + esc(phaseName) + '">+ Add to-do</button></div>';
}

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
  renderHero(state);
  renderCountdown(state);
  renderTodayView(state);
  renderItineraryEditor(state);
  renderPlaces(state);
  renderDocuments(state);
  renderEmergencyInfo(state);
  renderNotes(state);
  renderPrep(state);
  renderWeather();
  renderBookingStatus(state);
  renderBudget(state);
}

// ---- scrollspy ----
function setupScrollspy() {
  const links = Array.from(document.querySelectorAll(".tl"));
  const sections = links.map((l) => document.getElementById(l.dataset.target)).filter(Boolean);
  links.forEach((l) => l.addEventListener("click", () => {
    const target = document.getElementById(l.dataset.target);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  }));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        links.forEach((l) => l.classList.toggle("active", l.dataset.target === id));
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
  document.getElementById("addDocBtn").addEventListener("click", () => {
    openModal("Add document", '<label class="field">Title</label><input data-field="title">' +
      '<label class="field">Category</label><input data-field="category" placeholder="Passport, Confirmation, Ticket...">' +
      '<label class="field">Link (Drive, PDF, etc)</label><input data-field="link">' +
      '<label class="field">Notes</label><textarea data-field="notes"></textarea>',
      (data) => Store.add("documents", data, "doc"));
  });
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
  Store.subscribe(renderAll);
  await Store.init();
});

// ---- offline support: cache the app shell so it still works with patchy data ----
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => { /* offline support is best-effort */ });
  });
}
