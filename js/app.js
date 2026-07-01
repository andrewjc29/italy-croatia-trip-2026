// App shell: tabs, rendering dispatch, shared helpers, modal system.

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
function esc(s) { return (s === undefined || s === null) ? "" : String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function el(html) { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstChild; }

const VIEWS = ["dashboard", "itinerary", "bookings", "packing", "food", "map", "weather", "documents", "notes"];
let mapInstance = null;

function switchTab(name) {
  document.querySelectorAll(".tab-btn").forEach((b) => b.classList.toggle("active", b.dataset.tab === name));
  VIEWS.forEach((v) => document.getElementById("view-" + v).classList.toggle("hidden", v !== name));
  renderView(name, Store.getState());
}

document.getElementById("tabs").addEventListener("click", (e) => {
  const btn = e.target.closest(".tab-btn");
  if (btn) switchTab(btn.dataset.tab);
});

function renderView(name, state) {
  if (name === "dashboard") renderDashboard(state);
  if (name === "itinerary") renderItinerary(state);
  if (name === "bookings") renderBookings(state);
  if (name === "packing") renderPacking(state);
  if (name === "food") renderFood(state);
  if (name === "map") renderMap(state);
  if (name === "weather") renderWeather(state);
  if (name === "documents") renderDocuments(state);
  if (name === "notes") renderNotes(state);
}

function renderAll(state, syncStatus) {
  document.getElementById("tripTitle").textContent = state.meta.tripName || "Trip Planner";
  const statusEl = document.getElementById("syncStatus");
  const labels = { "local-only": "saved on this device", connecting: "connecting...", synced: "synced", offline: "offline, saved locally" };
  statusEl.textContent = labels[syncStatus] || syncStatus;
  const active = document.querySelector(".tab-btn.active");
  renderView(active ? active.dataset.tab : "dashboard", state);
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

// ---- Dashboard ----
function renderDashboard(state) {
  const days = Store.getItineraryDays();
  const bookingCounts = { idea: 0, booked: 0, confirmed: 0 };
  state.bookings.forEach((b) => bookingCounts[b.status] = (bookingCounts[b.status] || 0) + 1);
  const total = state.bookings.length || 1;
  const pct = Math.round(((bookingCounts.booked + bookingCounts.confirmed) / total) * 100);

  let countdown = "Dates not set yet";
  if (state.meta.startDate) {
    const days2go = Math.ceil((new Date(state.meta.startDate) - new Date()) / 86400000);
    countdown = days2go > 0 ? days2go + " days to go" : "Trip underway or past";
  }

  const nextUp = days.find((d) => d.lodging || d.transport.length || d.activities.length);

  document.getElementById("view-dashboard").innerHTML =
    '<div class="card"><h3>' + esc(state.meta.tripName) + '</h3>' +
    '<div class="grid2">' +
      '<div><div class="muted">Countdown</div><div>' + esc(countdown) + '</div></div>' +
      '<div><div class="muted">Trip length</div><div>' + state.meta.numDays + ' days, from ' + esc(state.meta.homeAirport) + '</div></div>' +
    '</div>' +
    '<label class="field">Start date (once locked in, the whole itinerary recalculates)</label>' +
    '<input type="date" id="dashStartDate" value="' + esc(state.meta.startDate || "") + '">' +
    '<div style="margin-top:10px"><button class="btn small" id="editTripBtn">Edit trip name / length</button></div>' +
    '</div>' +

    '<div class="card"><h3>Booking progress</h3>' +
    '<div class="row"><div>' + pct + '% booked or confirmed</div><div class="muted">' + bookingCounts.idea + ' idea &middot; ' + bookingCounts.booked + ' booked &middot; ' + bookingCounts.confirmed + ' confirmed</div></div>' +
    '</div>' +

    '<div class="card"><h3>Route</h3><div class="muted">' + esc(state.meta.routeNotes) + '</div></div>' +

    (nextUp ? '<div class="card day-card"><h3>Day ' + nextUp.day + (nextUp.date ? " -- " + fmtDate(nextUp.date) : "") + '</h3>' +
      '<div class="muted">' + (nextUp.cityId ? cityName(nextUp.cityId) : "") + '</div></div>' : "");

  document.getElementById("dashStartDate").addEventListener("change", (e) => {
    Store.updateMeta({ startDate: e.target.value || null });
  });
  document.getElementById("editTripBtn").addEventListener("click", () => {
    openModal("Edit trip", '<label class="field">Trip name</label><input data-field="tripName" value="' + esc(state.meta.tripName) + '">' +
      '<label class="field">Number of days</label><input data-field="numDays" type="number" value="' + state.meta.numDays + '">',
      (data) => Store.updateMeta({ tripName: data.tripName, numDays: parseInt(data.numDays, 10) || state.meta.numDays }));
  });
}

// ---- Itinerary: fully derived from bookings + activities ----
function renderItinerary(state) {
  const days = Store.getItineraryDays();
  const html = days.map((d) => {
    const lodgingHtml = d.lodging
      ? '<div class="muted">Staying: ' + esc(d.lodging.title) + (d.lodging.provider ? " (" + esc(d.lodging.provider) + ")" : "") + ' <span class="badge ' + d.lodging.status + '">' + d.lodging.status + "</span></div>"
      : "";
    const transportHtml = d.transport.map((t) =>
      '<div class="activity-row"><span>' + esc(t.title) + '</span><span class="badge ' + t.status + '">' + t.status + "</span></div>").join("");
    const actHtml = d.activities.map((a) =>
      '<div class="activity-row"><span>' + (a.time ? esc(a.time) + " -- " : "") + esc(a.title) + '</span>' +
      '<span><button class="link" data-edit-act="' + a.id + '">edit</button></span></div>').join("");
    return '<div class="card day-card"><div class="row"><h3>Day ' + d.day + (d.date ? " -- " + fmtDate(d.date) : "") +
      (d.cityId ? " -- " + esc(cityName(d.cityId)) : "") + '</h3>' +
      '<button class="btn small secondary" data-add-act="' + d.day + '">+ Add to this day</button></div>' +
      lodgingHtml + transportHtml + (actHtml || '<div class="muted">Nothing planned yet.</div>') + '</div>';
  }).join("");
  document.getElementById("view-itinerary").innerHTML = html;

  document.querySelectorAll("[data-add-act]").forEach((btn) => btn.addEventListener("click", () => openActivityForm(state, parseInt(btn.dataset.addAct, 10))));
  document.querySelectorAll("[data-edit-act]").forEach((btn) => btn.addEventListener("click", () => {
    const a = state.activities.find((x) => x.id === btn.dataset.editAct);
    openActivityForm(state, a.day, a);
  }));
}

function openActivityForm(state, day, existing) {
  const cityOpts = CITIES.map((c) => '<option value="' + c.id + '"' + (existing && existing.city === c.id ? " selected" : "") + ">" + c.name + "</option>").join("");
  const typeOpts = ["sight", "meal", "experience", "free"].map((t) => '<option value="' + t + '"' + (existing && existing.type === t ? " selected" : "") + ">" + t + "</option>").join("");
  const body =
    '<label class="field">Title (e.g. a dinner spot, a sight, a tour)</label><input data-field="title" value="' + esc(existing ? existing.title : "") + '">' +
    '<label class="field">Time</label><input data-field="time" placeholder="19:30" value="' + esc(existing ? existing.time : "") + '">' +
    '<label class="field">City</label><select data-field="city">' + cityOpts + '</select>' +
    '<label class="field">Type</label><select data-field="type">' + typeOpts + '</select>' +
    '<label class="field">Notes</label><textarea data-field="notes">' + esc(existing ? existing.notes : "") + '</textarea>' +
    (existing ? '<div style="margin-top:8px"><button class="link" id="deleteActBtn">Remove this item</button></div>' : "");
  openModal(existing ? "Edit itinerary item" : "Add to day " + day, body, (data) => {
    const payload = { day: day, title: data.title, time: data.time, city: data.city, type: data.type, notes: data.notes, status: existing ? existing.status : "idea" };
    if (existing) Store.update("activities", existing.id, payload);
    else Store.add("activities", payload, "a");
  }, "Save");
  if (existing) {
    setTimeout(() => {
      const delBtn = document.getElementById("deleteActBtn");
      if (delBtn) delBtn.addEventListener("click", () => { Store.remove("activities", existing.id); closeModal(); });
    }, 0);
  }
}

// ---- Bookings: lodging + transport. Editing these drives the Itinerary tab. ----
function renderBookings(state) {
  const rows = state.bookings.slice().sort((a, b) => a.day - b.day).map((b) => {
    const span = b.category === "lodging" ? "Day " + b.day + "-" + b.endDay : "Day " + b.day;
    return '<div class="card"><div class="row">' +
      '<div><strong>' + esc(b.title) + '</strong><div class="muted">' + esc(b.category) + " -- " + span + (b.cost ? " -- " + fmtMoney(b.cost, b.currency) : "") + '</div></div>' +
      '<div><span class="badge ' + b.status + '">' + b.status + '</span></div></div>' +
      (b.notes ? '<div class="muted" style="margin-top:6px">' + esc(b.notes) + '</div>' : "") +
      '<div style="margin-top:8px"><button class="link" data-edit-bk="' + b.id + '">edit</button></div></div>';
  }).join("");
  document.getElementById("view-bookings").innerHTML =
    '<div style="margin-bottom:10px"><button class="btn" id="addBookingBtn">+ Add hotel stay / flight / ferry / train</button></div>' + rows;
  document.getElementById("addBookingBtn").addEventListener("click", () => openBookingForm(state));
  document.querySelectorAll("[data-edit-bk]").forEach((btn) => btn.addEventListener("click", () => {
    openBookingForm(state, state.bookings.find((x) => x.id === btn.dataset.editBk));
  }));
}

function openBookingForm(state, existing) {
  const cats = ["lodging", "flight", "train", "ferry", "catamaran", "bus", "other"];
  const catOpts = cats.map((c) => '<option value="' + c + '"' + (existing && existing.category === c ? " selected" : "") + ">" + c + "</option>").join("");
  const statusOpts = ["idea", "booked", "confirmed"].map((s) => '<option value="' + s + '"' + (existing && existing.status === s ? " selected" : "") + ">" + s + "</option>").join("");
  const cityOpts = CITIES.map((c) => '<option value="' + c.id + '"' + (existing && existing.city === c.id ? " selected" : "") + ">" + c.name + "</option>").join("");
  const body =
    '<label class="field">What is this? (e.g. "Hotel Ravello" or "Rome -> Bari train")</label><input data-field="title" value="' + esc(existing ? existing.title : "") + '">' +
    '<label class="field">Category</label><select data-field="category">' + catOpts + '</select>' +
    '<label class="field">City (for a stay)</label><select data-field="city">' + cityOpts + '</select>' +
    '<div class="grid2"><div><label class="field">Start day (check-in / departure day)</label><input data-field="day" type="number" value="' + (existing ? existing.day : "1") + '"></div>' +
    '<div><label class="field">End day (check-out day, same as start for transport)</label><input data-field="endDay" type="number" value="' + (existing ? existing.endDay : "1") + '"></div></div>' +
    '<label class="field">Provider</label><input data-field="provider" value="' + esc(existing ? existing.provider : "") + '">' +
    '<label class="field">Confirmation #</label><input data-field="confirmation" value="' + esc(existing ? existing.confirmation : "") + '">' +
    '<div class="grid2"><div><label class="field">Cost per person</label><input data-field="cost" type="number" value="' + (existing ? existing.cost : "") + '"></div>' +
    '<div><label class="field">Status</label><select data-field="status">' + statusOpts + '</select></div></div>' +
    '<label class="field">Link</label><input data-field="link" value="' + esc(existing ? existing.link : "") + '">' +
    '<label class="field">Notes</label><textarea data-field="notes">' + esc(existing ? existing.notes : "") + '</textarea>' +
    (existing ? '<div style="margin-top:8px"><button class="link" id="deleteBkBtn">Remove this booking</button></div>' : "");
  openModal(existing ? "Edit booking" : "Add booking", body, (data) => {
    const payload = Object.assign({}, data, {
      day: parseInt(data.day, 10) || 1,
      endDay: parseInt(data.endDay, 10) || parseInt(data.day, 10) || 1,
      cost: parseFloat(data.cost) || 0,
      currency: existing ? existing.currency : "USD"
    });
    if (existing) Store.update("bookings", existing.id, payload);
    else Store.add("bookings", payload, "bk");
  }, "Save");
  if (existing) {
    setTimeout(() => {
      const delBtn = document.getElementById("deleteBkBtn");
      if (delBtn) delBtn.addEventListener("click", () => { Store.remove("bookings", existing.id); closeModal(); });
    }, 0);
  }
}

// ---- Packing ----
function renderPacking(state) {
  const byCat = {};
  state.packing.forEach((p) => { (byCat[p.category] = byCat[p.category] || []).push(p); });
  let html = '<div style="margin-bottom:10px"><button class="btn" id="addPackBtn">+ Add packing item</button></div>';
  Object.keys(byCat).forEach((cat) => {
    html += '<div class="card"><h3>' + esc(cat) + '</h3>' + byCat[cat].map((p) =>
      '<div class="pack-item' + (p.checked ? " checked" : "") + '"><input type="checkbox" data-toggle-pack="' + p.id + '" ' + (p.checked ? "checked" : "") + '>' +
      '<span>' + esc(p.item) + '</span><button class="link" data-del-pack="' + p.id + '" style="margin-left:auto">remove</button></div>').join("") + '</div>';
  });
  document.getElementById("view-packing").innerHTML = html;
  document.getElementById("addPackBtn").addEventListener("click", () => {
    openModal("Add packing item", '<label class="field">Item</label><input data-field="item">' +
      '<label class="field">Category</label><input data-field="category" placeholder="Documents, Clothing, Gear...">',
      (data) => Store.add("packing", { item: data.item, category: data.category || "Other", checked: false }, "p"));
  });
  document.querySelectorAll("[data-toggle-pack]").forEach((cb) => cb.addEventListener("change", (e) =>
    Store.update("packing", cb.dataset.togglePack, { checked: e.target.checked })));
  document.querySelectorAll("[data-del-pack]").forEach((btn) => btn.addEventListener("click", () =>
    Store.remove("packing", btn.dataset.delPack)));
}

// ---- Food / restaurant guide ----
function renderFood(state) {
  let html = '<div style="margin-bottom:10px"><button class="btn" id="addRestBtn">+ Add restaurant / dish</button></div>';
  const byCity = {};
  state.restaurants.forEach((r) => { (byCity[r.city] = byCity[r.city] || []).push(r); });
  Object.keys(byCity).forEach((cityId) => {
    html += '<div class="card"><h3>' + esc(cityName(cityId)) + '</h3>' + byCity[cityId].map((r) =>
      '<div class="card rest-card ' + (r.vegetarian ? "veg" : "nonveg") + '"><div class="row"><strong>' + esc(r.name) + '</strong>' +
      '<span class="badge ' + (r.vegetarian ? "confirmed" : "idea") + '">' + (r.vegetarian ? "vegetarian friendly" : "omnivore") + '</span></div>' +
      '<div class="muted">' + esc(r.dish) + '</div>' + (r.notes ? '<div class="muted">' + esc(r.notes) + '</div>' : "") +
      '<div style="margin-top:6px"><button class="link" data-add-day="' + r.id + '">add to a day</button> &middot; <button class="link" data-edit-rest="' + r.id + '">edit</button></div></div>').join("") + '</div>';
  });
  document.getElementById("view-food").innerHTML = html;
  document.getElementById("addRestBtn").addEventListener("click", () => openRestForm(state));
  document.querySelectorAll("[data-edit-rest]").forEach((btn) => btn.addEventListener("click", () =>
    openRestForm(state, state.restaurants.find((x) => x.id === btn.dataset.editRest))));
  document.querySelectorAll("[data-add-day]").forEach((btn) => btn.addEventListener("click", () => {
    const r = state.restaurants.find((x) => x.id === btn.dataset.addDay);
    openModal("Add \"" + r.name + "\" to which day?", '<label class="field">Day number</label><input data-field="day" type="number" value="1">',
      (data) => Store.add("activities", { day: parseInt(data.day, 10) || 1, city: r.city, time: "", title: r.name + " (" + r.dish + ")", type: "meal", notes: r.notes, status: "idea" }, "a"));
  }));
}
function openRestForm(state, existing) {
  const cityOpts = CITIES.map((c) => '<option value="' + c.id + '"' + (existing && existing.city === c.id ? " selected" : "") + ">" + c.name + "</option>").join("");
  const body = '<label class="field">Name</label><input data-field="name" value="' + esc(existing ? existing.name : "") + '">' +
    '<label class="field">Dish / specialty</label><input data-field="dish" value="' + esc(existing ? existing.dish : "") + '">' +
    '<label class="field">City</label><select data-field="city">' + cityOpts + '</select>' +
    '<label class="field">Notes / reservation info</label><textarea data-field="notes">' + esc(existing ? existing.notes : "") + '</textarea>';
  openModal(existing ? "Edit" : "Add restaurant", body, (data) => {
    const payload = { name: data.name, dish: data.dish, city: data.city, notes: data.notes, vegetarian: existing ? existing.vegetarian : true };
    if (existing) Store.update("restaurants", existing.id, payload);
    else Store.add("restaurants", payload, "r");
  });
}

// ---- Map ----
function renderMap(state) {
  document.getElementById("view-map").innerHTML = '<div id="map-canvas"></div><div class="muted" style="margin-top:8px">Pins follow city order from your bookings/activities.</div>';
  setTimeout(() => {
    if (mapInstance) { mapInstance.remove(); mapInstance = null; }
    mapInstance = L.map("map-canvas").setView([42.5, 16.5], 6);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "&copy; OpenStreetMap contributors" }).addTo(mapInstance);
    const visitedIds = [];
    Store.getItineraryDays().forEach((d) => { if (d.cityId && visitedIds[visitedIds.length - 1] !== d.cityId) visitedIds.push(d.cityId); });
    const latlngs = [];
    visitedIds.forEach((id) => {
      const c = CITIES.find((x) => x.id === id);
      if (!c) return;
      L.marker([c.lat, c.lng]).addTo(mapInstance).bindPopup(c.name);
      latlngs.push([c.lat, c.lng]);
    });
    if (latlngs.length > 1) L.polyline(latlngs, { color: "#2f6b5e" }).addTo(mapInstance);
    if (latlngs.length) mapInstance.fitBounds(latlngs, { padding: [30, 30] });
  }, 50);
}

// ---- Weather (Open-Meteo, no key needed) ----
async function renderWeather(state) {
  const visited = [];
  Store.getItineraryDays().forEach((d) => { if (d.cityId && visited.indexOf(d.cityId) === -1) visited.push(d.cityId); });
  const container = document.getElementById("view-weather");
  container.innerHTML = '<div class="muted">Loading forecast...</div>';
  const cards = await Promise.all(visited.map(async (id) => {
    const c = CITIES.find((x) => x.id === id);
    if (!c) return "";
    try {
      const res = await fetch("https://api.open-meteo.com/v1/forecast?latitude=" + c.lat + "&longitude=" + c.lng + "&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&forecast_days=7&temperature_unit=fahrenheit&timezone=auto");
      const j = await res.json();
      const cur = j.current ? Math.round(j.current.temperature_2m) + "F now" : "";
      return '<div class="card"><h3>' + esc(c.name) + '</h3><div class="muted">' + cur + '</div>' +
        '<div class="muted">7-day highs: ' + (j.daily ? j.daily.temperature_2m_max.map((t) => Math.round(t)).join(", ") : "n/a") + 'F</div></div>';
    } catch (e) { return '<div class="card"><h3>' + esc(c.name) + '</h3><div class="muted">Forecast unavailable right now.</div></div>'; }
  }));
  container.innerHTML = (cards.join("") || '<div class="muted">Add a stay or activity to see weather for that city.</div>') +
    '<div class="muted" style="margin-top:8px">Forecasts sharpen inside the 14-day window before travel.</div>';
}

// ---- Documents ----
function renderDocuments(state) {
  let html = '<div style="margin-bottom:10px"><button class="btn" id="addDocBtn">+ Add document link</button></div>';
  html += state.documents.map((d) =>
    '<div class="card"><div class="row"><strong>' + esc(d.title) + '</strong><span class="muted">' + esc(d.category) + '</span></div>' +
    (d.link ? '<div><a href="' + esc(d.link) + '" target="_blank" rel="noopener">' + esc(d.link) + '</a></div>' : "") +
    (d.notes ? '<div class="muted">' + esc(d.notes) + '</div>' : "") +
    '<div style="margin-top:6px"><button class="link" data-del-doc="' + d.id + '">remove</button></div></div>').join("");
  document.getElementById("view-documents").innerHTML = html;
  document.getElementById("addDocBtn").addEventListener("click", () => {
    openModal("Add document", '<label class="field">Title</label><input data-field="title">' +
      '<label class="field">Category</label><input data-field="category" placeholder="Passport, Confirmation, Ticket...">' +
      '<label class="field">Link (Drive, PDF, etc)</label><input data-field="link">' +
      '<label class="field">Notes</label><textarea data-field="notes"></textarea>',
      (data) => Store.add("documents", data, "doc"));
  });
  document.querySelectorAll("[data-del-doc]").forEach((btn) => btn.addEventListener("click", () => Store.remove("documents", btn.dataset.delDoc)));
}

// ---- Notes / prep tips ----
const PREP_TIPS = [
  "Currency: Euro everywhere. Croatia adopted EUR in 2023.",
  "Tipping: not expected. Round up 5-10% at sit-down restaurants for good service.",
  "Dining rhythm: lunch is the big meal. Restaurants close 3-5pm. Dinner starts 8pm+.",
  "Scams: check menu prices in Dubrovnik Old Town before ordering. Avoid picture-menu spots near Rome tourist sites.",
  "Weather: September 75-85F, sea still swimmable (~75F). Pack layers for evenings.",
  "Passports: US citizens need a valid passport, no visa under 90 days. No border crossing between Italy and Croatia, both Schengen.",
  "Peka in Croatia: order 2-3 hours ahead. Ask your host to recommend a place and call ahead.",
  "Ferry check-in: arrive 60-90 minutes early for international Jadrolinija ferries, passport ready."
];
function renderNotes(state) {
  const notesHtml = state.notesLog.slice().reverse().map((n) =>
    '<div class="card"><div>' + esc(n.text) + '</div><div class="muted">' + new Date(n.ts).toLocaleString() + '</div></div>').join("");
  document.getElementById("view-notes").innerHTML =
    '<div class="card"><h3>Prep &amp; culture notes</h3>' + PREP_TIPS.map((t) => '<div class="activity-row">' + esc(t) + '</div>').join("") + '</div>' +
    '<div style="margin:10px 0"><button class="btn" id="addNoteBtn">+ Add a note</button></div>' + notesHtml;
  document.getElementById("addNoteBtn").addEventListener("click", () => {
    openModal("Add note", '<label class="field">Note</label><textarea data-field="text"></textarea>',
      (data) => Store.add("notesLog", { text: data.text, ts: new Date().toISOString() }, "n"));
  });
}

// ---- Boot ----
window.addEventListener("DOMContentLoaded", async () => {
  Store.subscribe(renderAll);
  await Store.init();
});
