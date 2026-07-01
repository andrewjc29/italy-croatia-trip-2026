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
let hotelFilter = {}; // placeId -> "all" | "budget" | "splurge"

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
      '<div class="nights" id="nights-' + p.id + '"></div></div></div>' +
      '<div class="wrap">' +
      '<p class="blurb">' + p.blurb + "</p>" +

      '<div class="sub-h"><h3>Day by day</h3><span class="rule"></span></div>' +
      '<div id="days-' + p.id + '"></div>' +

      '<div class="sub-h"><h3>Where to stay</h3><span class="tag">shortlist &middot; choose one to book</span><span class="rule"></span></div>' +
      '<div class="filters" id="hotelfilters-' + p.id + '">' +
      '<button class="chip on" data-filter="all">All</button>' +
      '<button class="chip" data-filter="budget">Within budget</button>' +
      '<button class="chip" data-filter="splurge">Splurge picks</button>' +
      '</div>' +
      '<div id="hotels-' + p.id + '"></div>' +
      '<button class="link add-row-btn" data-add-hotel="' + p.id + '">+ add a hotel option</button>' +

      '<div class="sub-h"><h3>See &amp; do</h3><span class="rule"></span></div>' +
      '<div id="seedo-' + p.id + '" class="cards"></div>' +

      '<div class="sub-h"><h3>Where to eat</h3><span class="tag">vegetarian friendly noted</span><span class="rule"></span></div>' +
      '<div class="filters" id="filters-' + p.id + '">' +
      '<button class="chip on" data-filter="all">All</button>' +
      '<button class="chip" data-filter="veg">Vegetarian</button>' +
      '<button class="chip" data-filter="nonveg">Omnivore</button>' +
      '</div>' +
      '<div id="foodcards-' + p.id + '" class="cards"></div>' +

      (tips ? '<details class="tips"><summary>Good to know<span class="arw">+</span></summary><ul>' + tips + "</ul></details>" : "") +
      "</div></section>" + (i < PLACES.length - 1 ? '<div class="divider"></div>' : "");
  }).join("");

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

function currentLodgingBooking(state, place) {
  return state.bookings.find((b) => b.category === "lodging" && place.cityIds.indexOf(b.city) !== -1);
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
    const lines = d.activities.map((a) =>
      '<div class="item-line"><span><span class="time">' + esc(a.time || "") + '</span>' + esc(a.title) + '</span>' +
      '<button class="link" data-edit-act="' + a.id + '">edit</button></div>').join("");
    const transportLines = d.transport.map((t) =>
      '<div class="item-line"><span>' + esc(t.title) + '</span><span class="status-pill ' + t.status + '">' + t.status + '</span></div>').join("");
    return '<div class="day-row"><div class="day-num">' + d.day + '</div><div class="day-body">' +
      '<div class="day-date">' + (d.date ? fmtDate(d.date) : "Day " + d.day) + '</div>' +
      transportLines + lines +
      '<button class="add-line" data-add-act="' + esc(d.date || "") + '">+ add to this day</button></div></div>';
  }).join("") + "</div>";
  el2.querySelectorAll("[data-add-act]").forEach((btn) => btn.addEventListener("click", () => openActivityForm(state, btn.dataset.addAct, null, place)));
  el2.querySelectorAll("[data-edit-act]").forEach((btn) => btn.addEventListener("click", () => {
    const a = state.activities.find((x) => x.id === btn.dataset.editAct);
    openActivityForm(state, a.date, a, place);
  }));
}

// ---- Where to stay (hotels shortlist -> "Choose this" writes/updates the lodging booking) ----
function renderPlaceHotels(placeId, state) {
  const place = PLACES.find((p) => p.id === placeId);
  const current = currentLodgingBooking(state, place);
  let list = (state.hotels || []).filter((h) => h.placeId === placeId);
  const filter = hotelFilter[placeId] || "all";
  if (filter === "budget") list = list.filter((h) => !h.splurge);
  if (filter === "splurge") list = list.filter((h) => h.splurge);
  const el2 = document.getElementById("hotels-" + placeId);
  el2.innerHTML = '<div class="table-scroll"><table><thead><tr><th>Hotel</th><th>Nightly</th><th>Pros</th><th>Cons</th><th></th></tr></thead><tbody>' +
    list.map((h) => {
      const chosen = current && current.title === h.name;
      return '<tr><td class="hotel">' + esc(h.name) + '<span class="area">' + esc(h.area) + '</span>' +
        (h.splurge ? '<span class="pill">splurge</span>' : "") + '</td>' +
        '<td class="cost">' + esc(h.costLabel || fmtMoney(h.cost, "USD")) + '</td>' +
        '<td>' + esc(h.pros || "") + '</td><td>' + esc(h.cons || "") + '</td>' +
        '<td class="actions">' +
        (h.url ? '<a href="' + esc(h.url) + '" target="_blank" rel="noopener">Visit site</a><br>' : "") +
        '<button class="site-link" data-choose-hotel="' + h.id + '">' + (chosen ? "Chosen" : "Choose this") + '</button><br>' +
        '<button class="link" data-edit-hotel="' + h.id + '">edit</button></td></tr>';
    }).join("") + "</tbody></table></div>";
  el2.querySelectorAll("[data-choose-hotel]").forEach((btn) => btn.addEventListener("click", () => {
    const h = state.hotels.find((x) => x.id === btn.dataset.chooseHotel);
    openHotelChooseConfirm(state, h, place, current);
  }));
  el2.querySelectorAll("[data-edit-hotel]").forEach((btn) => btn.addEventListener("click", () => openHotelForm(state, state.hotels.find((x) => x.id === btn.dataset.editHotel), place)));
}

// Choosing a hotel always confirms the exact check-in/check-out dates before
// writing (or updating) the lodging booking -- this is what makes it show up
// correctly in the day-by-day itinerary.
function openHotelChooseConfirm(state, h, place, current) {
  const range = Store.getStopRangeForPlace(place.id);
  const tripRange = Store.getTripDateRange();
  const defaultCheckin = current ? current.date : (range ? range.dateStart : (tripRange.start || ""));
  const defaultCheckout = current ? current.endDate : (range ? range.dateEnd : (tripRange.end || ""));
  const body =
    '<p>Confirm your stay at <strong>' + esc(h.name) + '</strong>. This sets the dates shown in the day-by-day itinerary.</p>' +
    '<label class="field">Check-in</label><input type="date" data-field="date" value="' + esc(defaultCheckin) + '">' +
    '<label class="field">Check-out</label><input type="date" data-field="endDate" value="' + esc(defaultCheckout) + '">';
  openModal("Confirm your stay", body, (data) => {
    const payload = {
      category: "lodging", title: h.name, city: h.placeId === "puglia" ? "bari" : place.cityIds[0],
      provider: h.area, cost: h.cost, currency: "USD", link: h.url, notes: h.pros,
      date: data.date, endDate: data.endDate || data.date
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
    '<div class="card"><div class="pic"></div><div class="body"><div class="kind">' + esc(s.kind) + '</div><h4>' + esc(s.name) + '</h4>' +
    '<p>' + esc(s.description) + '</p>' +
    '<div class="foot">' + (s.url ? '<a class="site" href="' + esc(s.url) + '" target="_blank" rel="noopener">More</a>' : "<span></span>") +
    '<button class="site" data-add-day-see="' + s.id + '">add to a day</button></div>' +
    '<div style="margin-top:.4rem"><button class="link" data-edit-see="' + s.id + '">edit</button></div></div></div>').join("") +
    '<div class="card" style="align-items:center;justify-content:center;min-height:150px"><button class="link" data-add-see="' + placeId + '">+ add a thing to do</button></div>';
  el2.querySelectorAll("[data-edit-see]").forEach((btn) => btn.addEventListener("click", () => openSeeForm(state, state.thingsToDo.find((x) => x.id === btn.dataset.editSee), place)));
  el2.querySelectorAll("[data-add-see]").forEach((btn) => btn.addEventListener("click", () => openSeeForm(state, null, place)));
  el2.querySelectorAll("[data-add-day-see]").forEach((btn) => btn.addEventListener("click", () => {
    const s = state.thingsToDo.find((x) => x.id === btn.dataset.addDaySee);
    openAddToDayModal(s.name, s.city, s.description, "sight", place);
  }));
}

function openSeeForm(state, existing, place) {
  const cityOpts = place.cityIds.map((id) => '<option value="' + id + '"' + ((existing ? existing.city : place.cityIds[0]) === id ? " selected" : "") + ">" + cityName(id) + "</option>").join("");
  const body =
    '<label class="field">Name</label><input data-field="name" value="' + esc(existing ? existing.name : "") + '">' +
    '<label class="field">Kind / category</label><input data-field="kind" value="' + esc(existing ? existing.kind : "") + '">' +
    '<label class="field">City</label><select data-field="city">' + cityOpts + '</select>' +
    '<label class="field">Description</label><textarea data-field="description">' + esc(existing ? existing.description : "") + '</textarea>' +
    (existing ? '<div style="margin-top:8px"><button class="link" id="deleteSeeBtn">Remove</button></div>' : "");
  openModal(existing ? "Edit" : "Add a thing to do", body, (data) => {
    const payload = { name: data.name, kind: data.kind, city: data.city, description: data.description, url: mapsUrlForCity(data.name, data.city), placeId: place.id };
    if (existing) Store.update("thingsToDo", existing.id, payload);
    else Store.add("thingsToDo", payload, "td");
  });
  if (existing) setTimeout(() => {
    const d = document.getElementById("deleteSeeBtn");
    if (d) d.addEventListener("click", () => { Store.remove("thingsToDo", existing.id); closeModal(); });
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
    '<div class="card"><div class="pic"></div><div class="body"><h4>' + esc(r.name) + '</h4>' +
    '<div class="kind">' + esc(r.kind) + '</div><p>' + esc(r.description || "") + '</p>' +
    '<div class="foot"><span class="veg ' + (r.vegetarian ? "yes" : "no") + '">' + (r.vegetarian ? "vegetarian" : "omnivore") + '</span>' +
    '<button class="site" data-add-day="' + r.id + '">add to a day</button></div>' +
    '<div style="margin-top:.4rem">' + (r.url ? '<a class="link" href="' + esc(r.url) + '" target="_blank" rel="noopener">map</a> &middot; ' : "") + '<button class="link" data-edit-rest="' + r.id + '">edit</button></div></div></div>').join("") +
    '<div class="card" style="align-items:center;justify-content:center;min-height:150px"><button class="link" data-add-rest="' + placeId + '">+ add restaurant</button></div>';
  el2.querySelectorAll("[data-edit-rest]").forEach((btn) => btn.addEventListener("click", () => openRestForm(state, state.restaurants.find((x) => x.id === btn.dataset.editRest), place)));
  el2.querySelectorAll("[data-add-rest]").forEach((btn) => btn.addEventListener("click", () => openRestForm(state, null, place)));
  el2.querySelectorAll("[data-add-day]").forEach((btn) => btn.addEventListener("click", () => {
    const r = state.restaurants.find((x) => x.id === btn.dataset.addDay);
    openAddToDayModal(r.name + " (" + r.kind + ")", r.city, r.description, "meal", place);
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
    '<label class="field">Time (optional)</label><input type="time" data-field="time">';
  openModal('Add "' + title + '" to your itinerary', body, (data) => {
    Store.add("activities", { date: data.date, time: data.time || "", city: cityId, title: title, type: type, notes: notes, status: "idea" }, "a");
  }, "Add to itinerary");
}

function renderPlaces(state) {
  PLACES.forEach((p) => { renderPlaceNights(p.id, state); renderPlaceDays(p.id, state); renderPlaceHotels(p.id, state); renderPlaceSee(p.id, state); renderPlaceFood(p.id, state); });
}

// ---- forms ----
function openActivityForm(state, date, existing, place) {
  const cityOpts = CITIES.map((c) => '<option value="' + c.id + '"' + (existing && existing.city === c.id ? " selected" : "") + ">" + c.name + "</option>").join("");
  const typeOpts = ["sight", "meal", "experience", "free"].map((t) => '<option value="' + t + '"' + (existing && existing.type === t ? " selected" : "") + ">" + t + "</option>").join("");
  const tripRange = Store.getTripDateRange();
  const dateVal = existing ? existing.date : date;
  const body =
    '<label class="field">Title (a dinner spot, a sight, a tour)</label><input data-field="title" value="' + esc(existing ? existing.title : "") + '">' +
    '<label class="field">Date</label><input type="date" data-field="date" value="' + esc(dateVal || "") + '" min="' + esc(tripRange.start || "") + '" max="' + esc(tripRange.end || "") + '">' +
    '<label class="field">Time (optional)</label><input type="time" data-field="time" value="' + esc(existing ? existing.time : "") + '">' +
    '<label class="field">City</label><select data-field="city">' + cityOpts + '</select>' +
    '<label class="field">Type</label><select data-field="type">' + typeOpts + '</select>' +
    '<label class="field">Notes</label><textarea data-field="notes">' + esc(existing ? existing.notes : "") + '</textarea>' +
    (existing ? '<div style="margin-top:8px"><button class="link" id="deleteActBtn">Remove this item</button></div>' : "");
  openModal(existing ? "Edit itinerary item" : "Add to " + (dateVal ? fmtDate(dateVal) : "your itinerary"), body, (data) => {
    const payload = { date: data.date, title: data.title, time: data.time, city: data.city, type: data.type, notes: data.notes, status: existing ? existing.status : "idea" };
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
  const tripRange = Store.getTripDateRange();
  const body =
    '<label class="field">What is this? (e.g. "Hotel Ravello" or "Rome -> Bari train")</label><input data-field="title" value="' + esc(existing ? existing.title : "") + '">' +
    '<label class="field">Category</label><select data-field="category">' + catOpts + '</select>' +
    '<label class="field">City (for a stay)</label><select data-field="city">' + cityOpts + '</select>' +
    '<div class="grid2" style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><div><label class="field">Date (check-in / travel day)</label><input type="date" data-field="date" value="' + esc(existing ? existing.date : (tripRange.start || "")) + '" min="' + esc(tripRange.start || "") + '" max="' + esc(tripRange.end || "") + '"></div>' +
    '<div><label class="field">End date (checkout day, if a stay)</label><input type="date" data-field="endDate" value="' + esc(existing ? existing.endDate : "") + '" min="' + esc(tripRange.start || "") + '" max="' + esc(tripRange.end || "") + '"></div></div>' +
    '<label class="field">Time (optional)</label><input type="time" data-field="time" value="' + esc(existing ? existing.time : "") + '">' +
    '<label class="field">Provider</label><input data-field="provider" value="' + esc(existing ? existing.provider : "") + '">' +
    '<label class="field">Confirmation #</label><input data-field="confirmation" value="' + esc(existing ? existing.confirmation : "") + '">' +
    '<div class="grid2" style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><div><label class="field">Cost per person</label><input data-field="cost" type="number" value="' + (existing ? existing.cost : "") + '"></div>' +
    '<div><label class="field">Status</label><select data-field="status">' + statusOpts + '</select></div></div>' +
    '<label class="field">Link</label><input data-field="link" value="' + esc(existing ? existing.link : "") + '">' +
    '<label class="field">Notes</label><textarea data-field="notes">' + esc(existing ? existing.notes : "") + '</textarea>' +
    (existing ? '<div style="margin-top:8px"><button class="link" id="deleteBkBtn">Remove this booking</button></div>' : "");
  openModal(existing ? "Edit booking" : "Add booking", body, (data) => {
    const payload = Object.assign({}, data, {
      date: data.date,
      endDate: data.endDate || data.date,
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

function openRestForm(state, existing, place) {
  const cityOpts = place.cityIds.map((id) => '<option value="' + id + '"' + ((existing ? existing.city : place.cityIds[0]) === id ? " selected" : "") + ">" + cityName(id) + "</option>").join("");
  const body = '<label class="field">Name</label><input data-field="name" value="' + esc(existing ? existing.name : "") + '">' +
    '<label class="field">Kind / specialty</label><input data-field="kind" value="' + esc(existing ? existing.kind : "") + '">' +
    '<label class="field">City</label><select data-field="city">' + cityOpts + '</select>' +
    '<label class="field">Description / reservation info</label><textarea data-field="description">' + esc(existing ? existing.description : "") + '</textarea>' +
    '<label class="field">Vegetarian friendly?</label><select data-field="vegetarian"><option value="true"' + (existing && existing.vegetarian ? " selected" : "") + '>Yes</option><option value="false"' + (existing && !existing.vegetarian ? " selected" : "") + '>No</option></select>' +
    (existing ? '<div style="margin-top:8px"><button class="link" id="deleteRestBtn">Remove</button></div>' : "");
  openModal(existing ? "Edit" : "Add restaurant", body, (data) => {
    const payload = { name: data.name, kind: data.kind, city: data.city, description: data.description, url: mapsUrlForCity(data.name, data.city), vegetarian: data.vegetarian === "true", placeId: place.id };
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

  const bookingCounts = { idea: 0, booked: 0, confirmed: 0 };
  state.bookings.forEach((b) => bookingCounts[b.status] = (bookingCounts[b.status] || 0) + 1);
  const total = state.bookings.length || 1;
  const pct = Math.round(((bookingCounts.booked + bookingCounts.confirmed) / total) * 100);
  document.getElementById("bookingProgress").textContent = pct + "% booked or confirmed (" + bookingCounts.idea + " still ideas)";
}

// ---- itinerary editor: flexible, editable stop order / nights / add-remove ----
function renderItineraryEditor(state) {
  const container = document.getElementById("itineraryStopsList");
  if (!container) return;
  const ranges = Store.computeStopRanges();
  container.innerHTML = state.trip.stops.map((stop, i) => {
    const place = PLACES.find((p) => p.id === stop.placeId);
    const range = ranges[i];
    const dateLabel = range && range.dateStart ? fmtDate(range.dateStart) + " – " + fmtDate(range.dateEnd) : "";
    return '<div class="ie-stop">' +
      '<div class="ie-stop-order">' +
      '<button class="ie-arrow" data-move-up="' + i + '"' + (i === 0 ? " disabled" : "") + '>&uarr;</button>' +
      '<button class="ie-arrow" data-move-down="' + i + '"' + (i === state.trip.stops.length - 1 ? " disabled" : "") + '>&darr;</button>' +
      '</div>' +
      '<div class="ie-stop-name">' + esc(place ? place.label : stop.placeId) + '</div>' +
      '<div class="ie-stop-nights">' +
      '<button class="ie-step" data-nights-dec="' + i + '">-</button>' +
      '<span>' + stop.nights + (stop.nights === 1 ? " night" : " nights") + '</span>' +
      '<button class="ie-step" data-nights-inc="' + i + '">+</button>' +
      '</div>' +
      '<div class="ie-stop-dates muted">' + esc(dateLabel) + '</div>' +
      '<button class="link" data-remove-stop="' + i + '">remove</button>' +
      '</div>';
  }).join("") || '<div class="muted">No stops yet -- add one below.</div>';

  container.querySelectorAll("[data-move-up]").forEach((btn) => btn.addEventListener("click", () => Store.moveTripStop(parseInt(btn.dataset.moveUp, 10), -1)));
  container.querySelectorAll("[data-move-down]").forEach((btn) => btn.addEventListener("click", () => Store.moveTripStop(parseInt(btn.dataset.moveDown, 10), 1)));
  container.querySelectorAll("[data-nights-dec]").forEach((btn) => btn.addEventListener("click", () => {
    const i = parseInt(btn.dataset.nightsDec, 10);
    Store.setTripStopNights(i, state.trip.stops[i].nights - 1);
  }));
  container.querySelectorAll("[data-nights-inc]").forEach((btn) => btn.addEventListener("click", () => {
    const i = parseInt(btn.dataset.nightsInc, 10);
    Store.setTripStopNights(i, state.trip.stops[i].nights + 1);
  }));
  container.querySelectorAll("[data-remove-stop]").forEach((btn) => btn.addEventListener("click", () => Store.removeTripStop(parseInt(btn.dataset.removeStop, 10))));

  const addSelect = document.getElementById("addStopSelect");
  const addBtn = document.getElementById("addStopBtn");
  if (addSelect) {
    const usedIds = state.trip.stops.map((s) => s.placeId);
    const available = PLACES.filter((p) => usedIds.indexOf(p.id) === -1);
    addSelect.innerHTML = available.map((p) => '<option value="' + p.id + '">' + esc(p.label) + '</option>').join("");
    const wrap = addSelect.closest(".ie-add");
    if (wrap) wrap.style.display = available.length ? "" : "none";
  }
  if (addBtn) addBtn.onclick = () => {
    if (addSelect && addSelect.value) Store.addTripStop(addSelect.value, 1);
  };
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
}

// The "Before you book" section: the original guide's 6 foundational steps only.
function renderPrep(state) {
  const beforeItems = (state.prepChecklist || []).filter((it) => it.phase === "Before you book");
  const container = document.getElementById("prepList");
  container.innerHTML = beforeItems.map((item) =>
    '<label class="prep-item' + (item.done ? " done" : "") + '"><input type="checkbox" data-prep-toggle="' + item.id + '" ' + (item.done ? "checked" : "") + '><span>' + esc(item.text) + '</span></label>').join("");
  attachPrepToggleHandlers(container);
}

// The Toolkit "Next steps" block: the full phased plan (Now / 3-4mo / 2-3mo / 1-2mo / 1-2wk).
function renderNextSteps(state) {
  const rest = (state.prepChecklist || []).filter((it) => it.phase !== "Before you book");
  const phases = groupByPhase(rest);
  const container = document.getElementById("nextStepsList");
  container.innerHTML = phases.map((g) =>
    '<div class="nextstep-phase"><h4>' + esc(g.phase) + '</h4>' + g.items.map((item) =>
      '<label class="nextstep-item' + (item.done ? " done" : "") + '"><input type="checkbox" data-prep-toggle="' + item.id + '" ' + (item.done ? "checked" : "") + '><span>' + esc(item.text) + '</span></label>').join("") +
    "</div>").join("");
  attachPrepToggleHandlers(container);
}

// ---- master render ----
function renderAll(state, syncStatus) {
  const labels = { "local-only": "saved on this device", connecting: "connecting...", synced: "synced across devices", offline: "offline, saved locally" };
  document.getElementById("syncStatus").textContent = labels[syncStatus] || syncStatus;
  renderHero(state);
  renderItineraryEditor(state);
  renderPlaces(state);
  renderDocuments(state);
  renderNotes(state);
  renderPrep(state);
  renderNextSteps(state);
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
