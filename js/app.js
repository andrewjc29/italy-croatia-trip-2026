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
function esc(s) { return (s === undefined || s === null) ? "" : String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function el(html) { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstChild; }

let mapInstance = null;
let foodFilter = {}; // placeId -> "all" | "veg" | "nonveg"

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
      '<div class="nights">' + esc(p.nights) + " in " + esc(p.label) + "</div></div></div>" +
      '<div class="wrap">' +
      '<p class="blurb">' + esc(p.blurb) + "</p>" +
      '<div class="sub-h"><h3>Where you\'re staying</h3><span class="rule"></span></div>' +
      '<div id="stay-' + p.id + '"></div>' +
      '<div class="sub-h"><h3>Day by day</h3><span class="rule"></span></div>' +
      '<div id="days-' + p.id + '"></div>' +
      '<div class="sub-h"><h3>Food &amp; drink</h3><span class="tag">vegetarian friendly noted</span><span class="rule"></span></div>' +
      '<div class="filters" id="filters-' + p.id + '">' +
      '<button class="chip on" data-filter="all">All</button>' +
      '<button class="chip" data-filter="veg">Vegetarian</button>' +
      '<button class="chip" data-filter="nonveg">Omnivore</button>' +
      '</div>' +
      '<div id="foodcards-' + p.id + '" class="cards"></div>' +
      (tips ? '<details class="tips"><summary>Good to know<span class="arw">+</span></summary><ul>' + tips + "</ul></details>" : "") +
      "</div></section>" + (i < PLACES.length - 1 ? '<div class="divider"></div>' : "");
  }).join("");

  document.querySelectorAll(".filters").forEach((box) => {
    box.addEventListener("click", (e) => {
      const btn = e.target.closest(".chip");
      if (!btn) return;
      const placeId = box.id.replace("filters-", "");
      foodFilter[placeId] = btn.dataset.filter;
      box.querySelectorAll(".chip").forEach((c) => c.classList.toggle("on", c === btn));
      renderPlaceFood(placeId, Store.getState());
    });
  });
}

function placeForCity(cityId) { return PLACES.find((p) => p.cityIds.indexOf(cityId) !== -1); }

function renderPlaceStay(placeId, state) {
  const place = PLACES.find((p) => p.id === placeId);
  const stays = state.bookings.filter((b) => place.cityIds.indexOf(b.city) !== -1 || place.cityIds.indexOf(b.fromCity) !== -1 || place.cityIds.indexOf(b.toCity) !== -1);
  const el2 = document.getElementById("stay-" + placeId);
  if (!stays.length) {
    el2.innerHTML = '<div class="stay-card"><div><div class="stay-name">Nothing booked yet</div><div class="stay-meta">Add a hotel stay, flight, train, or ferry for ' + esc(place.label) + '</div></div>' +
      '<button class="btn secondary" data-add-booking="' + placeId + '">+ Add</button></div>';
  } else {
    el2.innerHTML = stays.map((b) =>
      '<div class="stay-card"><div><div class="stay-name">' + esc(b.title) + '</div><div class="stay-meta">' + esc(b.category) +
      (b.provider ? " · " + esc(b.provider) : "") + (b.cost ? " · " + fmtMoney(b.cost, b.currency) : "") + '</div></div>' +
      '<div style="display:flex;align-items:center;gap:.6rem"><span class="status-pill ' + b.status + '">' + b.status + '</span>' +
      '<button class="link" data-edit-booking="' + b.id + '">edit</button></div></div>').join("") +
      '<div style="margin-top:.6rem"><button class="link" data-add-booking="' + placeId + '">+ add another</button></div>';
  }
  el2.querySelectorAll("[data-add-booking]").forEach((b) => b.addEventListener("click", () => openBookingForm(state, null, place)));
  el2.querySelectorAll("[data-edit-booking]").forEach((b) => b.addEventListener("click", () => openBookingForm(state, state.bookings.find((x) => x.id === b.dataset.editBooking))));
}

function renderPlaceDays(placeId, state) {
  const place = PLACES.find((p) => p.id === placeId);
  const days = Store.getItineraryDays().filter((d) => d.cityId && place.cityIds.indexOf(d.cityId) !== -1);
  const el2 = document.getElementById("days-" + placeId);
  if (!days.length) { el2.innerHTML = '<div class="day-rows"><div class="day-row"><div class="day-body muted">No days assigned to ' + esc(place.label) + ' yet, add a stay above.</div></div></div>'; return; }
  el2.innerHTML = '<div class="day-rows">' + days.map((d) => {
    const lines = d.activities.map((a) =>
      '<div class="item-line"><span><span class="time">' + esc(a.time || "") + '</span>' + esc(a.title) + '</span>' +
      '<button class="link" data-edit-act="' + a.id + '">edit</button></div>').join("");
    const transportLines = d.transport.map((t) =>
      '<div class="item-line"><span>' + esc(t.title) + '</span><span class="status-pill ' + t.status + '">' + t.status + '</span></div>').join("");
    return '<div class="day-row"><div class="day-num">' + d.day + '</div><div class="day-body">' +
      '<div class="day-date">' + (d.date ? fmtDate(d.date) : "Day " + d.day) + '</div>' +
      transportLines + lines +
      '<button class="add-line" data-add-act="' + d.day + '">+ add to this day</button></div></div>';
  }).join("") + "</div>";
  el2.querySelectorAll("[data-add-act]").forEach((btn) => btn.addEventListener("click", () => openActivityForm(state, parseInt(btn.dataset.addAct, 10))));
  el2.querySelectorAll("[data-edit-act]").forEach((btn) => btn.addEventListener("click", () => {
    const a = state.activities.find((x) => x.id === btn.dataset.editAct);
    openActivityForm(state, a.day, a);
  }));
}

function renderPlaceFood(placeId, state) {
  const place = PLACES.find((p) => p.id === placeId);
  let list = state.restaurants.filter((r) => place.cityIds.indexOf(r.city) !== -1);
  const filter = foodFilter[placeId] || "all";
  if (filter === "veg") list = list.filter((r) => r.vegetarian);
  if (filter === "nonveg") list = list.filter((r) => !r.vegetarian);
  const el2 = document.getElementById("foodcards-" + placeId);
  el2.innerHTML = list.map((r) =>
    '<div class="card"><div class="pic"></div><div class="body"><h4>' + esc(r.name) + '</h4>' +
    '<div class="kind">' + esc(r.dish) + '</div><p>' + esc(r.notes || "") + '</p>' +
    '<div class="foot"><span class="veg ' + (r.vegetarian ? "yes" : "no") + '">' + (r.vegetarian ? "vegetarian" : "omnivore") + '</span>' +
    '<button class="site" data-add-day="' + r.id + '">add to a day</button></div>' +
    '<div style="margin-top:.4rem"><button class="link" data-edit-rest="' + r.id + '">edit</button></div></div></div>').join("") +
    '<div class="card" style="align-items:center;justify-content:center;min-height:150px"><button class="link" data-add-rest="' + placeId + '">+ add restaurant</button></div>';
  el2.querySelectorAll("[data-edit-rest]").forEach((btn) => btn.addEventListener("click", () => openRestForm(state, state.restaurants.find((x) => x.id === btn.dataset.editRest))));
  el2.querySelectorAll("[data-add-rest]").forEach((btn) => btn.addEventListener("click", () => openRestForm(state, null, place.cityIds[0])));
  el2.querySelectorAll("[data-add-day]").forEach((btn) => btn.addEventListener("click", () => {
    const r = state.restaurants.find((x) => x.id === btn.dataset.addDay);
    openModal('Add "' + r.name + '" to which day?', '<label class="field">Day number</label><input data-field="day" type="number" value="1">',
      (data) => Store.add("activities", { day: parseInt(data.day, 10) || 1, city: r.city, time: "", title: r.name + " (" + r.dish + ")", type: "meal", notes: r.notes, status: "idea" }, "a"));
  }));
}

function renderPlaces(state) {
  PLACES.forEach((p) => { renderPlaceStay(p.id, state); renderPlaceDays(p.id, state); renderPlaceFood(p.id, state); });
}

// ---- forms ----
function openActivityForm(state, day, existing) {
  const cityOpts = CITIES.map((c) => '<option value="' + c.id + '"' + (existing && existing.city === c.id ? " selected" : "") + ">" + c.name + "</option>").join("");
  const typeOpts = ["sight", "meal", "experience", "free"].map((t) => '<option value="' + t + '"' + (existing && existing.type === t ? " selected" : "") + ">" + t + "</option>").join("");
  const body =
    '<label class="field">Title (a dinner spot, a sight, a tour)</label><input data-field="title" value="' + esc(existing ? existing.title : "") + '">' +
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
  if (existing) setTimeout(() => {
    const d = document.getElementById("deleteActBtn");
    if (d) d.addEventListener("click", () => { Store.remove("activities", existing.id); closeModal(); });
  }, 0);
}

function openBookingForm(state, existing, place) {
  const cats = ["lodging", "flight", "train", "ferry", "catamaran", "bus", "other"];
  const catOpts = cats.map((c) => '<option value="' + c + '"' + (existing && existing.category === c ? " selected" : "") + ">" + c + "</option>").join("");
  const statusOpts = ["idea", "booked", "confirmed"].map((s) => '<option value="' + s + '"' + (existing && existing.status === s ? " selected" : "") + ">" + s + "</option>").join("");
  const defaultCity = existing ? existing.city : (place ? place.cityIds[0] : CITIES[0].id);
  const cityOpts = CITIES.map((c) => '<option value="' + c.id + '"' + (defaultCity === c.id ? " selected" : "") + ">" + c.name + "</option>").join("");
  const body =
    '<label class="field">What is this? (e.g. "Hotel Ravello" or "Rome -> Bari train")</label><input data-field="title" value="' + esc(existing ? existing.title : "") + '">' +
    '<label class="field">Category</label><select data-field="category">' + catOpts + '</select>' +
    '<label class="field">City (for a stay)</label><select data-field="city">' + cityOpts + '</select>' +
    '<div class="grid2" style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><div><label class="field">Start day</label><input data-field="day" type="number" value="' + (existing ? existing.day : "1") + '"></div>' +
    '<div><label class="field">End day (checkout day)</label><input data-field="endDay" type="number" value="' + (existing ? existing.endDay : "1") + '"></div></div>' +
    '<label class="field">Provider</label><input data-field="provider" value="' + esc(existing ? existing.provider : "") + '">' +
    '<label class="field">Confirmation #</label><input data-field="confirmation" value="' + esc(existing ? existing.confirmation : "") + '">' +
    '<div class="grid2" style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><div><label class="field">Cost per person</label><input data-field="cost" type="number" value="' + (existing ? existing.cost : "") + '"></div>' +
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
  if (existing) setTimeout(() => {
    const d = document.getElementById("deleteBkBtn");
    if (d) d.addEventListener("click", () => { Store.remove("bookings", existing.id); closeModal(); });
  }, 0);
}

function openRestForm(state, existing, defaultCity) {
  const cityOpts = CITIES.map((c) => '<option value="' + c.id + '"' + ((existing ? existing.city : defaultCity) === c.id ? " selected" : "") + ">" + c.name + "</option>").join("");
  const body = '<label class="field">Name</label><input data-field="name" value="' + esc(existing ? existing.name : "") + '">' +
    '<label class="field">Dish / specialty</label><input data-field="dish" value="' + esc(existing ? existing.dish : "") + '">' +
    '<label class="field">City</label><select data-field="city">' + cityOpts + '</select>' +
    '<label class="field">Notes / reservation info</label><textarea data-field="notes">' + esc(existing ? existing.notes : "") + '</textarea>' +
    (existing ? '<div style="margin-top:8px"><button class="link" id="deleteRestBtn">Remove</button></div>' : "");
  openModal(existing ? "Edit" : "Add restaurant", body, (data) => {
    const payload = { name: data.name, dish: data.dish, city: data.city, notes: data.notes, vegetarian: existing ? existing.vegetarian : true };
    if (existing) Store.update("restaurants", existing.id, payload);
    else Store.add("restaurants", payload, "r");
  });
  if (existing) setTimeout(() => {
    const d = document.getElementById("deleteRestBtn");
    if (d) d.addEventListener("click", () => { Store.remove("restaurants", existing.id); closeModal(); });
  }, 0);
}

// ---- hero + intro ----
function renderHero(state) {
  document.title = state.meta.tripName + " · " + (state.meta.numDays) + " days";
  let countdown = "Dates not set";
  if (state.meta.startDate) {
    const days2go = Math.ceil((new Date(state.meta.startDate) - new Date()) / 86400000);
    countdown = days2go > 0 ? days2go + " days to go" : "Underway or past";
  }
  document.getElementById("heroMeta").innerHTML =
    '<span>' + PLACES.length + " stops</span><span>" + state.meta.numDays + ' days</span><span><strong>' + countdown + '</strong></span>';

  const bookingCounts = { idea: 0, booked: 0, confirmed: 0 };
  state.bookings.forEach((b) => bookingCounts[b.status] = (bookingCounts[b.status] || 0) + 1);
  const total = state.bookings.length || 1;
  const pct = Math.round(((bookingCounts.booked + bookingCounts.confirmed) / total) * 100);
  document.getElementById("bookingProgress").textContent = pct + "% booked or confirmed (" + bookingCounts.idea + " still ideas)";

  const startInput = document.getElementById("startDateInput");
  if (document.activeElement !== startInput) startInput.value = state.meta.startDate || "";
}

// ---- toolkit: map ----
function renderMap() {
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
    if (latlngs.length > 1) L.polyline(latlngs, { color: "#1d6a8c" }).addTo(mapInstance);
    if (latlngs.length) mapInstance.fitBounds(latlngs, { padding: [30, 30] });
  }, 50);
}

// ---- toolkit: weather ----
async function renderWeather() {
  const visited = [];
  Store.getItineraryDays().forEach((d) => { if (d.cityId && visited.indexOf(d.cityId) === -1) visited.push(d.cityId); });
  const container = document.getElementById("weatherGrid");
  container.innerHTML = '<div class="muted">Loading forecast...</div>';
  const cards = await Promise.all(visited.map(async (id) => {
    const c = CITIES.find((x) => x.id === id);
    if (!c) return "";
    try {
      const res = await fetch("https://api.open-meteo.com/v1/forecast?latitude=" + c.lat + "&longitude=" + c.lng + "&current=temperature_2m&daily=temperature_2m_max,temperature_2m_min&forecast_days=7&temperature_unit=fahrenheit&timezone=auto");
      const j = await res.json();
      const cur = j.current ? Math.round(j.current.temperature_2m) + "F now" : "";
      return '<div class="util-card"><h4>' + esc(c.name) + '</h4><div class="muted">' + cur + '</div>' +
        '<div class="muted">7-day highs: ' + (j.daily ? j.daily.temperature_2m_max.map((t) => Math.round(t)).join(", ") : "n/a") + 'F</div></div>';
    } catch (e) { return '<div class="util-card"><h4>' + esc(c.name) + '</h4><div class="muted">Forecast unavailable right now.</div></div>'; }
  }));
  container.innerHTML = cards.join("") || '<div class="muted">Add a stay to see weather for that city.</div>';
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

// ---- toolkit: notes ----
function renderNotes(state) {
  document.getElementById("notesList").innerHTML = state.notesLog.slice().reverse().map((n) =>
    '<div class="note-row">' + esc(n.text) + '<time>' + new Date(n.ts).toLocaleString() + '</time></div>').join("") ||
    '<div class="muted">No notes yet.</div>';
}

// ---- prep checklist ----
function renderPrep(state) {
  const phases = [];
  (state.prepChecklist || []).forEach((item) => {
    let group = phases.find((p) => p.phase === item.phase);
    if (!group) { group = { phase: item.phase, items: [] }; phases.push(group); }
    group.items.push(item);
  });
  document.getElementById("prepList").innerHTML = phases.map((g) =>
    '<div class="prep-phase"><h4>' + esc(g.phase) + '</h4>' + g.items.map((item) =>
      '<label class="prep-item' + (item.done ? " done" : "") + '"><input type="checkbox" data-prep-toggle="' + item.id + '" ' + (item.done ? "checked" : "") + '><span>' + esc(item.text) + '</span></label>').join("") +
    "</div>").join("");
  document.querySelectorAll("[data-prep-toggle]").forEach((cb) => cb.addEventListener("change", (e) => {
    const state2 = Store.getState();
    state2.prepChecklist = state2.prepChecklist.map((it) => it.id === cb.dataset.prepToggle ? Object.assign({}, it, { done: e.target.checked }) : it);
    Store.persist();
  }));
}

// ---- master render ----
function renderAll(state, syncStatus) {
  const labels = { "local-only": "saved on this device", connecting: "connecting...", synced: "synced across devices", offline: "offline, saved locally" };
  document.getElementById("syncStatus").textContent = labels[syncStatus] || syncStatus;
  renderHero(state);
  renderPlaces(state);
  renderDocuments(state);
  renderNotes(state);
  renderPrep(state);
  renderWeather();
  renderMap();
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
  document.getElementById("startDateInput").addEventListener("change", (e) => Store.updateMeta({ startDate: e.target.value || null }));
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
