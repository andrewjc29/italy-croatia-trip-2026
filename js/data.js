// Seed data for the Italy + Croatia 2026 trip planner.
// This is the STARTING point only. Once the app runs, all edits are made
// through the UI and persisted to localStorage (and to the shared Google
// Sheet backend once configured in config.js) -- this file is never
// rewritten by normal use.

const CITIES = [
  { id: "rome",        name: "Rome",              country: "Italy",   lat: 41.9028, lng: 12.4964 },
  { id: "bari",        name: "Bari",               country: "Italy",   lat: 41.1171, lng: 16.8719 },
  { id: "polignano",   name: "Polignano a Mare",   country: "Italy",   lat: 40.9968, lng: 17.2203 },
  { id: "alberobello", name: "Alberobello",        country: "Italy",   lat: 40.7827, lng: 17.2378 },
  { id: "matera",      name: "Matera",             country: "Italy",   lat: 40.6664, lng: 16.6043 },
  { id: "lecce",       name: "Lecce",              country: "Italy",   lat: 40.3515, lng: 18.1750 },
  { id: "dubrovnik",   name: "Dubrovnik",          country: "Croatia", lat: 42.6507, lng: 18.0944 },
  { id: "hvar",        name: "Hvar",               country: "Croatia", lat: 43.1729, lng: 16.4413 },
  { id: "split",       name: "Split",              country: "Croatia", lat: 43.5081, lng: 16.4402 },
  // -- Phase 4 destinations --
  { id: "ostuni",      name: "Ostuni",             country: "Italy",   lat: 40.7284, lng: 17.5750 },
  { id: "monopoli",    name: "Monopoli",           country: "Italy",   lat: 40.9515, lng: 17.3020 },
  { id: "otranto",     name: "Otranto",            country: "Italy",   lat: 40.1454, lng: 18.4903 },
  { id: "korcula",     name: "Korčula",            country: "Croatia", lat: 42.9603, lng: 17.1358 },
  { id: "mljet",       name: "Mljet",              country: "Croatia", lat: 42.7770, lng: 17.3550 },
  { id: "makarska",    name: "Makarska",           country: "Croatia", lat: 43.2967, lng: 17.0178 }
];

// -- Maps link helpers: every hotel/restaurant/thing-to-do link is a Google
// Maps search built from its name + place, so it always resolves. --
const CITY_LABEL_MAP = {
  rome: "Rome, Italy", bari: "Bari, Italy", polignano: "Polignano a Mare, Italy",
  alberobello: "Alberobello, Italy", matera: "Matera, Italy", lecce: "Lecce, Italy",
  dubrovnik: "Dubrovnik, Croatia", hvar: "Hvar, Croatia", split: "Split, Croatia",
  ostuni: "Ostuni, Italy", monopoli: "Monopoli, Italy", otranto: "Otranto, Italy",
  korcula: "Korčula, Croatia", mljet: "Mljet, Croatia", makarska: "Makarska, Croatia"
};
const PLACE_LABEL_MAP = {
  rome: "Rome, Italy", puglia: "Bari, Italy", dubrovnik: "Dubrovnik, Croatia",
  hvar: "Hvar, Croatia", split: "Split, Croatia",
  ostuni: "Ostuni, Italy", monopoli: "Monopoli, Italy", otranto: "Otranto, Italy",
  korcula: "Korčula, Croatia", mljet: "Mljet, Croatia", makarska: "Makarska, Croatia"
};
// Plain-text (not URL-encoded) versions of the same query used to build the
// map links below -- this is what "copy address" copies to the clipboard.
// There's no real street-address data for most saved places, so this
// name + city/place string is the closest reliable stand-in and it always
// matches whatever the map links point at.
function locationLabel(name, cityId) {
  return [name, CITY_LABEL_MAP[cityId] || ""].filter(Boolean).join(", ");
}
function locationLabelForPlace(name, extra, placeId) {
  return [name, extra, PLACE_LABEL_MAP[placeId] || ""].filter(Boolean).join(", ");
}
function mapsUrl(query) {
  return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(query);
}
function mapsUrlForCity(name, cityId) {
  return mapsUrl(locationLabel(name, cityId));
}
function mapsUrlForPlace(name, extra, placeId) {
  return mapsUrl(locationLabelForPlace(name, extra, placeId));
}
function appleMapsUrl(query) {
  return "https://maps.apple.com/?q=" + encodeURIComponent(query);
}
function appleMapsUrlForCity(name, cityId) {
  return appleMapsUrl(locationLabel(name, cityId));
}
function appleMapsUrlForPlace(name, extra, placeId) {
  return appleMapsUrl(locationLabelForPlace(name, extra, placeId));
}
// booking.com has no public per-property lookup API and none of the saved
// hotels have a curated property URL, so "Book here" goes to a booking.com
// search pre-filled with the hotel name + city -- gets you straight to the
// listing (or very close to it) without hand-maintaining a link per hotel.
function bookingComUrlForPlace(name, placeId) {
  return "https://www.booking.com/searchresults.html?ss=" + encodeURIComponent([name, PLACE_LABEL_MAP[placeId] || ""].filter(Boolean).join(", "));
}

// Mirrors the per-city accent colors in css/styles.css (#rome, #puglia, ...).
// Used for the timeline dot colors in the itinerary editor, which lives outside
// any single place's scoped CSS variables.
const PLACE_ACCENT = {
  rome: "#c0623a",
  puglia: "#0f8a86",
  dubrovnik: "#1f6f99",
  hvar: "#6f8f5a",
  split: "#106b86",
  ostuni: "#b8873a",
  monopoli: "#b8492f",
  otranto: "#1c8f93",
  korcula: "#7a3b52",
  mljet: "#2f6b4a",
  makarska: "#3d7ab8"
};

// Typical September climate (F), used until a live forecast is close enough to
// be meaningful. Rough averages from climate-normal sources, not a specific year.
const SEPT_CLIMATE_NORMALS = {
  rome: { high: 78, low: 60, sea: null, note: "Mild and mostly dry, occasional showers late month." },
  bari: { high: 82, low: 66, sea: 74, note: "Warm and mostly dry, the easiest weather of the trip." },
  dubrovnik: { high: 74, low: 63, sea: 76, note: "Warm days, comfortable nights, cooling toward month's end." },
  hvar: { high: 79, low: 64, sea: 73, note: "Similar to Split with an island breeze." },
  split: { high: 79, low: 64, sea: 73, note: "Warm days, comfortable nights." },
  ostuni: { high: 82, low: 65, sea: 74, note: "Warm hilltop days, cooler evenings than the coast below." },
  monopoli: { high: 81, low: 66, sea: 75, note: "Right on the Adriatic -- warm, dry, easy swimming weather." },
  otranto: { high: 80, low: 66, sea: 75, note: "Where the Adriatic meets the Ionian -- warm and mostly dry." },
  korcula: { high: 79, low: 64, sea: 74, note: "Island climate, similar to Hvar and Split." },
  mljet: { high: 78, low: 64, sea: 74, note: "Cooler and greener than the mainland, pine-shaded." },
  makarska: { high: 80, low: 66, sea: 75, note: "Warm beach weather under Biokovo's shade in the afternoon." }
};

// Verified via US State Dept / embassy sites, July 2026.
const EMERGENCY_INFO = {
  euNumber: "112 -- EU-wide emergency number (police, fire, ambulance), works in both Italy and Croatia.",
  embassies: [
    { country: "Italy", name: "U.S. Embassy Rome", address: "Via Vittorio Veneto 121, 00187 Rome", phone: "+39 06-4674-1", url: "https://it.usembassy.gov/u-s-citizen-services/emergency-contact/" },
    { country: "Croatia", name: "U.S. Embassy Zagreb", address: "Ulica Thomasa Jeffersona 2, 10010 Zagreb", phone: "+385 1 661-2200", url: "https://hr.usembassy.gov/contact/" }
  ],
  globalLine: "24/7 U.S. citizen emergency line (from abroad): +1-202-501-4444"
};

const SEED_DATA = {
  meta: {
    tripName: "Italy + Croatia 2026",
    homeAirport: "SFO",
    travelers: ["Andrew", "Partner"],
    budgetPerPersonLow: 3000,
    budgetPerPersonHigh: 4000,
    routeNotes: "Route B confirmed: Rome, then Puglia/Bari, then Croatia (Dubrovnik-Hvar-Split or reverse). Open-jaw flights: SFO-Rome nonstop out, Dubrovnik/Split-SFO one-stop back. No rental car -- flights, trains, ferries, catamarans, buses only."
  },
  bookings: [],
  activities: [],
  restaurants: [],
  documents: [],
  notesLog: [],
  // User-created destinations only. Built-in cities stay authored in code
  // (PLACES / PLACE_ACCENT / PLACE_TIPS) so catalog improvements and new
  // cities always show; the effective catalog is PLACES + state.places,
  // merged by getPlaces() in app.js. Empty until you add a place from the site.
  places: []
};

// -- Bookings: lodging + transport legs, day = day index (1-based) --
SEED_DATA.trip = {
  startDate: "2026-09-03",
  stops: [
    { placeId: "rome", nights: 2 },
    { placeId: "puglia", nights: 4 },
    { placeId: "dubrovnik", nights: 2 },
    { placeId: "hvar", nights: 1 },
    { placeId: "split", nights: 2 }
  ]
};

SEED_DATA.bookings.push(
  {"id":"bk1","category":"flight","title":"SFO -> Rome (nonstop)","fromCity":"SFO","toCity":"rome","time":"","provider":"United / ITA Airways","confirmation":"","cost":500,"currency":"USD","link":"https://www.google.com/travel/flights","status":"idea","notes":"~12h nonstop. Est $400-600pp. Avoid Basic Economy to keep checked bag free.","date":"2026-09-03","endDate":"2026-09-03"},
  {"id":"bk2","category":"lodging","title":"Rome hotel","city":"rome","time":"","provider":"","confirmation":"","cost":200,"currency":"USD","link":"","status":"idea","notes":"2 nights. Trastevere or Testaccio area. Est $80-120/night pp.","date":"2026-09-03","endDate":"2026-09-05"},
  {"id":"bk3","category":"train","title":"Rome -> Bari (high-speed)","fromCity":"rome","toCity":"bari","time":"","provider":"Trenitalia Frecciargento / Italo","confirmation":"","cost":30,"currency":"EUR","link":"https://www.trenitalia.com","status":"idea","notes":"~4h direct. From EUR13-20 booked ahead, EUR30-60 closer to travel. ~10 trains/day.","date":"2026-09-05","endDate":"2026-09-05"},
  {"id":"bk4","category":"lodging","title":"Bari / Puglia base","city":"bari","time":"","provider":"Airbnb","confirmation":"","cost":220,"currency":"USD","link":"","status":"idea","notes":"4 nights. Base for Polignano, Alberobello, Matera, Lecce day trips. Est $40-70/night pp.","date":"2026-09-05","endDate":"2026-09-09"},
  {"id":"bk5","category":"ferry","title":"Bari -> Dubrovnik ferry (Jadrolinija Line 54)","fromCity":"bari","toCity":"dubrovnik","time":"11:00","provider":"Jadrolinija","confirmation":"","cost":85,"currency":"EUR","link":"https://www.jadrolinija.hr/en/search-buy-ticket","status":"idea","notes":"RECOMMENDED crossing. Sept 1-15: Fri/Sat. Sept 16+: Tue/Thu/Sat 11:00am. 7-10hr daytime crossing. ~EUR78-90pp, bags included.","date":"2026-09-09","endDate":"2026-09-09"},
  {"id":"bk6","category":"other","title":"Alt: Ryanair Bari -> Dubrovnik flight","fromCity":"bari","toCity":"dubrovnik","time":"","provider":"Ryanair","confirmation":"","cost":100,"currency":"USD","link":"https://www.ryanair.com","status":"idea","notes":"Backup to the ferry. 45 min. Base fare $30-60 + checked bag EUR40-55. Total ~$75-120pp. More flexible, multiple days/week.","date":"2026-09-09","endDate":"2026-09-09"},
  {"id":"bk7","category":"lodging","title":"Dubrovnik hotel","city":"dubrovnik","time":"","provider":"","confirmation":"","cost":400,"currency":"USD","link":"","status":"idea","notes":"2 nights. Boutique hotel. Est $60-100/night pp.","date":"2026-09-09","endDate":"2026-09-11"},
  {"id":"bk8","category":"catamaran","title":"Dubrovnik -> Hvar catamaran","fromCity":"dubrovnik","toCity":"hvar","time":"","provider":"Krilo / TP Line / Jadrolinija","confirmation":"","cost":50,"currency":"EUR","link":"https://www.krilo.hr","status":"idea","notes":"~3h with island stops. Book 1-2 weeks ahead in September, these sell out.","date":"2026-09-11","endDate":"2026-09-11"},
  {"id":"bk9","category":"lodging","title":"Hvar stay","city":"hvar","time":"","provider":"","confirmation":"","cost":80,"currency":"USD","link":"","status":"idea","notes":"1 night overnight on the island.","date":"2026-09-11","endDate":"2026-09-12"},
  {"id":"bk10","category":"catamaran","title":"Hvar -> Split catamaran","fromCity":"hvar","toCity":"split","time":"","provider":"Krilo / TP Line","confirmation":"","cost":30,"currency":"EUR","link":"https://www.tp-line.hr","status":"idea","notes":"~1h, multiple daily departures.","date":"2026-09-12","endDate":"2026-09-12"},
  {"id":"bk11","category":"lodging","title":"Split hotel","city":"split","time":"","provider":"","confirmation":"","cost":200,"currency":"USD","link":"","status":"idea","notes":"2 nights.","date":"2026-09-12","endDate":"2026-09-14"},
  {"id":"bk12","category":"flight","title":"Split/Dubrovnik -> SFO (1 stop)","fromCity":"split","toCity":"SFO","time":"","provider":"","confirmation":"","cost":750,"currency":"USD","link":"https://www.google.com/travel/flights","status":"idea","notes":"One stop via European hub, ~14-18h. Est $600-900pp. Whichever city ends the itinerary is the return departure city -- no backtracking.","date":"2026-09-14","endDate":"2026-09-14"}
);

// -- Activities: day-specific sights, meals, experiences, free time --
SEED_DATA.activities.push(
  {"id":"a1","city":"rome","time":"","title":"Jet lag buffer -- walk Trastevere","type":"free","cost":0,"status":"idea","notes":"Slow lunch, early dinner. Arrive morning off the nonstop.","date":"2026-09-03"},
  {"id":"a2","city":"rome","time":"09:00","title":"Colosseum + Forum + Pantheon","type":"sight","cost":30,"status":"idea","notes":"Optional Vatican in the morning instead.","date":"2026-09-04"},
  {"id":"a3","city":"rome","time":"13:00","title":"Lunch in Trastevere","type":"meal","cost":25,"status":"idea","notes":"Cacio e pepe, supplì.","vegetarianFriendly":true,"date":"2026-09-04"},
  {"id":"a4","city":"rome","time":"20:00","title":"Dinner in Testaccio","type":"meal","cost":35,"status":"idea","notes":"Authentic, less touristy neighborhood.","vegetarianFriendly":true,"date":"2026-09-04"},
  {"id":"a5","city":"bari","time":"10:00","title":"Bari Vecchia + orecchiette making","type":"experience","cost":20,"status":"idea","notes":"Morning in old town.","date":"2026-09-06"},
  {"id":"a6","city":"polignano","time":"14:00","title":"Polignano a Mare -- cliffs + swim","type":"sight","cost":0,"status":"idea","notes":"30 min regional train from Bari. Return to Bari for dinner.","date":"2026-09-06"},
  {"id":"a7","city":"alberobello","time":"09:00","title":"Alberobello trulli + Ostuni","type":"sight","cost":0,"status":"idea","notes":"Option A day trip. FSE regional train/bus ~1h from Bari.","date":"2026-09-07"},
  {"id":"a8","city":"matera","time":"09:00","title":"Matera cave dwellings","type":"sight","cost":0,"status":"idea","notes":"Option B day trip instead of Alberobello/Ostuni. ~1h by train/bus from Bari.","date":"2026-09-07"},
  {"id":"a9","city":"lecce","time":"09:00","title":"Lecce -- Baroque architecture + pasticciotto","type":"sight","cost":0,"status":"idea","notes":"1.5h Trenitalia regional train. OR a free/slow day in Bari (cooking class, beach, long lunch) as buffer before Croatia.","date":"2026-09-08"},
  {"id":"a10","city":"dubrovnik","time":"","title":"Old town walls + kayaking","type":"experience","cost":40,"status":"idea","notes":"","date":"2026-09-10"},
  {"id":"a11","city":"split","time":"","title":"Diocletian's Palace old town","type":"sight","cost":0,"status":"idea","notes":"","date":"2026-09-13"}
);

SEED_DATA.notesLog.push(
  { id: "n1", text: "Trip plan imported from research doc (2026-06-24). Route B confirmed: Italy first, Croatia second. Open decisions: exact September dates, points/miles check, final Croatia direction (Dubrovnik-first vs Split-first, depends on ferry schedule).", ts: new Date().toISOString() }
);

// -- Places: the blog-style sections. Each pulls its bookings/activities/
// restaurants by matching city id. Accent colors carried over from the
// original travel guide's per-city theming. --
const PLACES = [
  { id: "rome", label: "Rome", cityIds: ["rome"], image: "assets/images/rome.jpg",
    title: "Rome", titleEm: "the Eternal City", blurb: "Base in <strong>Monti</strong> (local, trendy, metro-connected, ten minutes from the Colosseum) or <strong>Trastevere</strong> (cobblestoned, best food density, no metro but very walkable). Both beat the tourist zones around Trevi and the Spanish Steps for value and atmosphere." },
  { id: "puglia", label: "Puglia", cityIds: ["bari", "polignano", "alberobello", "matera", "lecce"], image: "assets/images/bari.jpg",
    title: "Puglia", titleEm: "the heel of Italy", blurb: "Base in the <strong>Murat Quarter</strong>, Bari's modern heart of wide boulevards, the best dining and the main shopping street, beside Bari Centrale where every day trip departs. Puglia's cucina povera is largely vegetarian by default, the easiest eating of the whole trip." },
  { id: "dubrovnik", label: "Dubrovnik", cityIds: ["dubrovnik"], image: "assets/images/dubrovnik.jpg",
    title: "Dubrovnik", titleEm: "the Pearl of the Adriatic", blurb: "You arrive by Jadrolinija ferry into Gru\u017e, so a Gru\u017e or <strong>Plo\u010de</strong> base makes sense. Plo\u010de is the upscale 'Riviera' just east of the walls, sea-facing, ten minutes from the Old Town harbor, the local pick for couples. <strong>Pile</strong>, just west of the walls, is quieter and flatter with quick Old Town access." },
  { id: "hvar", label: "Hvar", cityIds: ["hvar"], image: "assets/images/hvar.jpg",
    title: "Hvar", titleEm: "island time", blurb: "One night between catamarans, so stay central in <strong>Hvar Town</strong>: it's walkable end to end in twenty minutes and puts the square, the harbor, the restaurants and the fortress walk at your door. Make this night count." },
  { id: "split", label: "Split", cityIds: ["split"], image: "assets/images/split.jpg",
    title: "Split", titleEm: "Diocletian's city", blurb: "Stay in <strong>Veli Varo\u0161</strong>, the stone neighborhood on Marjan Hill's slope, five to ten minutes from Diocletian's Palace and the Riva but quieter and better value, with the best local konobas and wine bars. The palace interior is atmospheric but the noisiest at night." },
  // -- Phase 4 destinations: Ostuni, Monopoli, Otranto (around Bari, not duplicating the
  // existing Puglia sub-towns) and Korcula, Mljet, Makarska (between Dubrovnik and Split). --
  { id: "ostuni", label: "Ostuni", cityIds: ["ostuni"], image: "assets/images/ostuni.jpg",
    title: "Ostuni", titleEm: "the White City", blurb: "Base in or near the <strong>Centro Storico</strong>, the whitewashed hilltop old town that gives Ostuni its name -- walkable end to end and ringed by views to the Adriatic. The surrounding <strong>masserie</strong> (converted farmhouses) in the olive-grove countryside are the other real option, ten to twenty minutes out by car, for a quieter pool-and-view stay." },
  { id: "monopoli", label: "Monopoli", cityIds: ["monopoli"], image: "assets/images/monopoli.jpg",
    title: "Monopoli", titleEm: "the working harbor", blurb: "Base near the <strong>Centro Storico</strong> and its working fishing harbor, Porto Antico -- flatter and more low-key than flashier neighbor Polignano a Mare, with its own strong lungomare restaurant scene and easy beach-hopping just outside town." },
  { id: "otranto", label: "Otranto", cityIds: ["otranto"], image: "assets/images/otranto.jpg",
    title: "Otranto", titleEm: "Italy's edge on the Adriatic", blurb: "Base inside or just outside the <strong>Centro Storico</strong>, ringed by 15th-century walls and a five-minute walk from the city beach. Italy's easternmost town, where the Adriatic and Ionian seas meet, with Byzantine churches and a Baroque-adjacent Salento charm." },
  { id: "korcula", label: "Korčula", cityIds: ["korcula"], image: "assets/images/korcula.jpg",
    title: "Korčula", titleEm: "Marco Polo's island", blurb: "Stay in <strong>Korčula Town</strong>'s fishbone-planned old town, walkable in minutes and the departure point for the Škoji islets (Badija, Stupe, Vrnik) and Lumbarda's vineyards. Reputed birthplace of Marco Polo." },
  { id: "mljet", label: "Mljet", cityIds: ["mljet"], image: "assets/images/mljet.jpg",
    title: "Mljet", titleEm: "the green island", blurb: "Base near <strong>Pomena</strong>, the small harbor at the edge of Mljet National Park's saltwater lakes. The island has almost no built-up center, so this is less a town stay and more a quiet base inside the pine forest for the park itself." },
  { id: "makarska", label: "Makarska", cityIds: ["makarska"], image: "assets/images/makarska.jpg",
    title: "Makarska", titleEm: "under Biokovo", blurb: "Base along the <strong>Riva</strong>, the palm-lined waterfront promenade beneath Mount Biokovo, with the Makarska Riviera's beaches stretching either side and a cable car up the mountain for those who want the view." }
];

const PLACE_TIPS = {
  rome: ["Lunch is the big meal, restaurants close 3-5pm, dinner starts 8pm+.", "Tipping is not expected. Round up 5-10% at sit-down restaurants for good service.", "Avoid picture-menu restaurants near the big tourist sites."],
  puglia: ["Book day-trip trains (Polignano, Alberobello, Matera, Lecce) a day ahead in September.", "Puglia is naturally vegetarian-friendly: fave e cicoria, burrata, orecchiette cime di rapa, focaccia Barese.", "WhatsApp is commonly used to reserve tables at smaller trattorias."],
  dubrovnik: ["Peka must be ordered 2-3 hours ahead. Ask your host to recommend a place and call ahead.", "Check menu prices in the Old Town before ordering, some tourist-facing spots overcharge.", "Ferry check-in: arrive 60-90 minutes early, passport ready."],
  hvar: ["Catamarans can sell out in September, book 1-2 weeks ahead.", "Currency is the euro throughout, Croatia adopted it in 2023."],
  split: ["No border crossing between Italy and Croatia, both are Schengen.", "September sea temperature is still swimmable, around 75F, pack layers for evenings."]
};

// -- Prep checklist: merges the trip-plan's phased next-steps with the
// original guide's before-you-book steps. Interactive, checkable, persisted. --
SEED_DATA.prepChecklist = [
  { id: "pc0a", phase: "Before you book", text: "Lock the per-stop night splits inside your September window using the planner. This sets your exact booking nights.", done: false },
  { id: "pc0b", phase: "Before you book", text: "Confirm the Croatia direction against the Jadrolinija ferry schedule. Entering at Dubrovnik vs Split decides which city you book first and which is your departure airport.", done: false },
  { id: "pc0c", phase: "Before you book", text: "Shortlist 1-2 hotels per stop from the Where to Stay tables. Mark your splurge night, Stari Grad (Dubrovnik) and Palace Elisabeth (Hvar) are the strongest candidates.", done: false },
  { id: "pc0d", phase: "Before you book", text: "Price the shortlist live for your exact nights on each hotel's own site and Booking.com. Direct booking sometimes beats the OTA rate and adds perks.", done: false },
  { id: "pc0e", phase: "Before you book", text: "Carry your passport for the ferry. Border posts at Italy-Croatia sea crossings are lifted, but ID is checked at check-in, and the EU Entry/Exit System (photo + fingerprints) is rolling out at Croatian ports.", done: false },
  { id: "pc0f", phase: "Before you book", text: "Check ETIAS status before you go. Visa-exempt travelers, including US citizens, will need ETIAS authorization for the Schengen area once it launches.", done: false },
  { id: "pc1", phase: "Now (6 months out)", text: "Check credit cards and airline accounts for points, miles, travel credits, and foreign transaction fee status.", done: false },
  { id: "pc2", phase: "Now (6 months out)", text: "Pick exact September dates (early vs mid vs late). Late September has slightly lower prices and thinner crowds.", done: false },
  { id: "pc3", phase: "Now (6 months out)", text: "Set up price alerts on Google Flights for the open-jaw: SFO to Rome + Dubrovnik or Split to SFO.", done: false },
  { id: "pc5", phase: "3-4 months before (May-June 2026)", text: "Book transatlantic flights (open-jaw). Best prices typically 2-3 months ahead for September.", done: false },
  { id: "pc6", phase: "3-4 months before (May-June 2026)", text: "Book Rome to Bari train on trenitalia.com or italotreno.com. Cheapest fares go fast.", done: false },
  { id: "pc7", phase: "3-4 months before (May-June 2026)", text: "Book the Bari to Dubrovnik (or Split) ferry on jadrolinija.hr.", done: false },
  { id: "pc8", phase: "2-3 months before (June-July 2026)", text: "Book accommodation. Boutique hotels for Rome and Dubrovnik, Airbnbs for Puglia and Split/Hvar.", done: false },
  { id: "pc9", phase: "2-3 months before (June-July 2026)", text: "Book Ryanair Bari to Dubrovnik if choosing flight over ferry, add checked bag at booking for the lowest fee.", done: false },
  { id: "pc10", phase: "2-3 months before (June-July 2026)", text: "Research and shortlist restaurants. Reserve any splurge or tasting-menu dinners in Rome and Puglia.", done: false },
  { id: "pc11", phase: "1-2 months before (July-August 2026)", text: "Book catamaran tickets for the Croatian island hops (Krilo, TP Line, Jadrolinija). These sell out in September.", done: false },
  { id: "pc12", phase: "1-2 months before (July-August 2026)", text: "Book any day-trip activities: cooking class in Puglia, kayaking in Dubrovnik, wine tour.", done: false },
  { id: "pc13", phase: "1-2 months before (July-August 2026)", text: "Confirm all transport connections and save confirmations somewhere both of you can reach.", done: false },
  { id: "pc14", phase: "1-2 weeks before", text: "Download offline maps (Google Maps or Maps.me) for every city on the route.", done: false },
  { id: "pc15", phase: "1-2 weeks before", text: "Notify your bank and credit cards of travel dates.", done: false },
  { id: "pc16", phase: "1-2 weeks before", text: "Check ETIAS status for your September 2026 dates, visa-exempt US travelers will need it once it launches.", done: false },
  { id: "pc17", phase: "1-2 weeks before", text: "Final packing: layers for evenings, swimwear, comfortable walking shoes.", done: false }
];

// -- Hotels: real shortlist per place, extracted from the original travel guide. --
SEED_DATA.hotels = [
  {
    "id": "ht1",
    "placeId": "rome",
    "name": "Leonardo Boutique Hotel Rome Monti",
    "area": "Monti",
    "costLabel": "~$180–260",
    "cost": 220,
    "pros": "Heart of Rome's trendiest local quarter; wine bars and trattorias at the door; Cavour metro and Termini walkable.",
    "cons": "Some nightlife noise; rooms compact.",
    "url": "https://www.google.com/maps/search/?api=1&query=Leonardo%20Boutique%20Hotel%20Rome%20Monti%2C%20Monti%2C%20Rome%2C%20Italy",
    "splurge": false
  },
  {
    "id": "ht2",
    "placeId": "rome",
    "name": "Donna Camilla Savelli",
    "area": "Trastevere",
    "costLabel": "~$280–380",
    "cost": 330,
    "pros": "12th-century convent with a quiet courtyard of olive and orange trees; two blocks from the Tiber; deeply romantic.",
    "cons": "No metro nearby; upper end of range.",
    "url": "https://www.google.com/maps/search/?api=1&query=Donna%20Camilla%20Savelli%2C%20Trastevere%2C%20Rome%2C%20Italy",
    "splurge": true
  },
  {
    "id": "ht3",
    "placeId": "rome",
    "name": "Loly Boutique Hotel Roma",
    "area": "Trastevere edge",
    "costLabel": "~$200–300",
    "cost": 250,
    "pros": "4-star with its own restaurant, bar and terrace; walkable to Campo de' Fiori; Piramide metro ~10 min.",
    "cons": "Busier edge of the district; breakfast varies.",
    "url": "https://www.google.com/maps/search/?api=1&query=Loly%20Boutique%20Hotel%20Roma%2C%20Trastevere%20edge%2C%20Rome%2C%20Italy",
    "splurge": false
  },
  {
    "id": "ht4",
    "placeId": "rome",
    "name": "Princeps Boutique Hotel",
    "area": "Monti",
    "costLabel": "~$160–240",
    "cost": 200,
    "pros": "Bright modern rooms opposite Santa Maria Maggiore; Colosseum 10 min; close to Termini for the Bari train. Best value.",
    "cons": "3-star, limited amenities; daytime tour traffic.",
    "url": "https://www.google.com/maps/search/?api=1&query=Princeps%20Boutique%20Hotel%2C%20Monti%2C%20Rome%2C%20Italy",
    "splurge": false
  },
  {
    "id": "ht5",
    "placeId": "rome",
    "name": "Tree Charme Parliament",
    "area": "Centro Storico",
    "costLabel": "~$250–350",
    "cost": 300,
    "pros": "Design-forward, ~500m from the Pantheon; max sightseeing density on a short stay; near Giolitti gelato.",
    "cons": "Most touristed zone; no metro; upper range.",
    "url": "https://www.google.com/maps/search/?api=1&query=Tree%20Charme%20Parliament%2C%20Centro%20Storico%2C%20Rome%2C%20Italy",
    "splurge": false
  },
  {
    "id": "ht6",
    "placeId": "puglia",
    "name": "Dilman Luxury Stay",
    "area": "Central Bari",
    "costLabel": "~$140–220",
    "cost": 180,
    "pros": "Boutique stay in the buzzing center; walkable to Via Sparano shopping, Teatro Petruzzelli and the station.",
    "cons": "City-center street noise; few on-site services.",
    "url": "https://www.google.com/maps/search/?api=1&query=Dilman%20Luxury%20Stay%2C%20Central%20Bari%2C%20Bari%2C%20Italy",
    "splurge": false
  },
  {
    "id": "ht7",
    "placeId": "puglia",
    "name": "200 Rooms and Terrace",
    "area": "Murat",
    "costLabel": "~$120–180",
    "cost": 150,
    "pros": "Bright 4-room B&B with rooftop skyline terrace; elegant rooms, friendly hosts; best neighborhood.",
    "cons": "Tiny, books fast; B&B-level services.",
    "url": "https://www.google.com/maps/search/?api=1&query=200%20Rooms%20and%20Terrace%2C%20Murat%2C%20Bari%2C%20Italy",
    "splurge": false
  },
  {
    "id": "ht8",
    "placeId": "puglia",
    "name": "Al Pescatore B&B",
    "area": "Old-town edge",
    "costLabel": "~$110–170",
    "cost": 140,
    "pros": "Six modern rooms, rooftop with port and castle views; laid-back, near Castello Normanno-Svevo.",
    "cons": "Communal breakfast; old-town-edge night noise.",
    "url": "https://www.google.com/maps/search/?api=1&query=Al%20Pescatore%20B%26B%2C%20Old-town%20edge%2C%20Bari%2C%20Italy",
    "splurge": false
  },
  {
    "id": "ht9",
    "placeId": "puglia",
    "name": "Grand Hotel Oriente",
    "area": "Murat · Corso Cavour",
    "costLabel": "~$160–260",
    "cost": 210,
    "pros": "Hotel-style comfort in the modern center; prime spot near sea, old town and station; good breakfast.",
    "cons": "Pricier; classic rather than boutique style.",
    "url": "https://www.google.com/maps/search/?api=1&query=Grand%20Hotel%20Oriente%2C%20Murat%20%C2%B7%20Corso%20Cavour%2C%20Bari%2C%20Italy",
    "splurge": false
  },
  {
    "id": "ht10",
    "placeId": "puglia",
    "name": "Residenze Al Castello",
    "area": "Bari Vecchia",
    "costLabel": "~$90–160",
    "cost": 125,
    "pros": "Authentic old-town charm steps from Basilica di San Nicola and the street-food alleys; most atmospheric, cheapest.",
    "cons": "Noisy lanes, possible stairs, fewer amenities.",
    "url": "https://www.google.com/maps/search/?api=1&query=Residenze%20Al%20Castello%2C%20Bari%20Vecchia%2C%20Bari%2C%20Italy",
    "splurge": false
  },
  {
    "id": "ht11",
    "placeId": "dubrovnik",
    "name": "Boutique Hotel Stari Grad",
    "area": "Old Town",
    "costLabel": "~$300–450",
    "cost": 375,
    "pros": "Top couples boutique in the city; rooftop terrace with stunning wall-and-sea views; steps from everything.",
    "cons": "Tiny, books far ahead; Old Town stairs and luggage hauling.",
    "url": "https://www.google.com/maps/search/?api=1&query=Boutique%20Hotel%20Stari%20Grad%2C%20Old%20Town%2C%20Dubrovnik%2C%20Croatia",
    "splurge": true
  },
  {
    "id": "ht12",
    "placeId": "dubrovnik",
    "name": "Boutique Hotel Kazbek",
    "area": "Gruž (harbor)",
    "costLabel": "~$280–400",
    "cost": 340,
    "pros": "Restored 16th-century villa with pool and waterfront; near your ferry arrival point; local vibe, good transport.",
    "cons": "15–20 min from Old Town; Gruž is more workaday.",
    "url": "https://www.google.com/maps/search/?api=1&query=Boutique%20Hotel%20Kazbek%2C%20Gru%C5%BE%20(harbor)%2C%20Dubrovnik%2C%20Croatia",
    "splurge": false
  },
  {
    "id": "ht13",
    "placeId": "dubrovnik",
    "name": "Hotel Excelsior Dubrovnik",
    "area": "Ploče",
    "costLabel": "~$400–600+",
    "cost": 500,
    "pros": "Iconic seafront landmark; 5 min to the walls; stunning pool, over-water terrace, spa, best Old Town views.",
    "cons": "Well above budget; five-star formality.",
    "url": "https://www.google.com/maps/search/?api=1&query=Hotel%20Excelsior%20Dubrovnik%2C%20Plo%C4%8De%2C%20Dubrovnik%2C%20Croatia",
    "splurge": true
  },
  {
    "id": "ht14",
    "placeId": "dubrovnik",
    "name": "Dominus Rooms",
    "area": "Pile",
    "costLabel": "~$180–280",
    "cost": 230,
    "pros": "Clean, well-rated guesthouse with lovely decor near Pile Gate; walk into Old Town in minutes; near the bus hub. Best value-to-location.",
    "cons": "Guesthouse service level; daytime gate foot traffic.",
    "url": "https://www.google.com/maps/search/?api=1&query=Dominus%20Rooms%2C%20Pile%2C%20Dubrovnik%2C%20Croatia",
    "splurge": false
  },
  {
    "id": "ht15",
    "placeId": "dubrovnik",
    "name": "Pearl of Adriatic (apt)",
    "area": "Ploče",
    "costLabel": "~$200–320",
    "cost": 260,
    "pros": "Renovated large apartment with incredible sea views, ~8 min from Ploče Gate; space and a kitchen for slow mornings.",
    "cons": "No housekeeping or breakfast; some steps to the water.",
    "url": "https://www.google.com/maps/search/?api=1&query=Pearl%20of%20Adriatic%20(apt)%2C%20Plo%C4%8De%2C%20Dubrovnik%2C%20Croatia",
    "splurge": false
  },
  {
    "id": "ht16",
    "placeId": "hvar",
    "name": "Hotel Moeesy Blue & Green Oasis",
    "area": "Hvar Town",
    "costLabel": "~$250–380",
    "cost": 315,
    "pros": "Top boutique-luxury pick for couples; beautiful pool and terrace, elegant interiors, adults-oriented calm.",
    "cons": "Pricey for one night; short walk above the center.",
    "url": "https://www.google.com/maps/search/?api=1&query=Hotel%20Moeesy%20Blue%20%26%20Green%20Oasis%2C%20Hvar%20Town%2C%20Hvar%2C%20Croatia",
    "splurge": false
  },
  {
    "id": "ht17",
    "placeId": "hvar",
    "name": "Palace Elisabeth, Hvar",
    "area": "Main square",
    "costLabel": "~$350–500+",
    "cost": 425,
    "pros": "The grande dame, first 5-star on Hvar, right on St Stephen's Square below the fortress walk. Step into the prettiest streets.",
    "cons": "Well above budget; formal five-star feel.",
    "url": "https://www.google.com/maps/search/?api=1&query=Palace%20Elisabeth%2C%20Hvar%2C%20Main%20square%2C%20Hvar%2C%20Croatia",
    "splurge": true
  },
  {
    "id": "ht18",
    "placeId": "hvar",
    "name": "Heritage Hotel Park Hvar",
    "area": "Hvar Town",
    "costLabel": "~$200–300",
    "cost": 250,
    "pros": "Highly rated by couples; central, reliable comfort and breakfast; easy walk to harbor and square.",
    "cons": "Less design flair; books out in season.",
    "url": "https://www.google.com/maps/search/?api=1&query=Heritage%20Hotel%20Park%20Hvar%2C%20Hvar%20Town%2C%20Hvar%2C%20Croatia",
    "splurge": false
  },
  {
    "id": "ht19",
    "placeId": "hvar",
    "name": "Heritage Hotel Dea Hvar",
    "area": "Hvar Town",
    "costLabel": "~$180–280",
    "cost": 230,
    "pros": "Mid-range boutique in town, named a couples favorite; walkable to everything. Good value.",
    "cons": "Smaller property; some compact rooms.",
    "url": "https://www.google.com/maps/search/?api=1&query=Heritage%20Hotel%20Dea%20Hvar%2C%20Hvar%20Town%2C%20Hvar%2C%20Croatia",
    "splurge": false
  },
  {
    "id": "ht20",
    "placeId": "hvar",
    "name": "Adriana Hvar Spa Hotel",
    "area": "Waterfront",
    "costLabel": "~$280–400",
    "cost": 340,
    "pros": "Waterfront spa hotel with a rooftop pool facing the harbor; relaxing decompress after island-hopping.",
    "cons": "Larger resort feel; upper price end.",
    "url": "https://www.google.com/maps/search/?api=1&query=Adriana%20Hvar%20Spa%20Hotel%2C%20Waterfront%2C%20Hvar%2C%20Croatia",
    "splurge": false
  },
  {
    "id": "ht21",
    "placeId": "split",
    "name": "Divota Apartment Hotel",
    "area": "Veli Varoš",
    "costLabel": "~$220–340",
    "cost": 280,
    "pros": "Stylishly renovated stone houses with a spa; easy walk to the Palace; surrounded by konobas (Fife, Cicibela) and wine bars.",
    "cons": "Steep stepped streets, often no elevator; hard with heavy bags.",
    "url": "https://www.google.com/maps/search/?api=1&query=Divota%20Apartment%20Hotel%2C%20Veli%20Varo%C5%A1%2C%20Split%2C%20Croatia",
    "splurge": false
  },
  {
    "id": "ht22",
    "placeId": "split",
    "name": "Briig Boutique Hotel",
    "area": "Near Old Town",
    "costLabel": "~$200–300",
    "cost": 250,
    "pros": "Stylish 4-star in a converted factory; bold design, wellness facilities, exceptional breakfast; easy reach of Old Town and beach.",
    "cons": "Slightly outside the core; industrial-chic not for everyone.",
    "url": "https://www.google.com/maps/search/?api=1&query=Briig%20Boutique%20Hotel%2C%20Near%20Old%20Town%2C%20Split%2C%20Croatia",
    "splurge": false
  },
  {
    "id": "ht23",
    "placeId": "split",
    "name": "Judita Palace",
    "area": "Inside the Palace",
    "costLabel": "~$280–420",
    "cost": 350,
    "pros": "Romantic 16th-century palace with antique interiors; right in the heart of the Old Town. Upgrade for a balcony room.",
    "cons": "Noisiest area at night; higher price.",
    "url": "https://www.google.com/maps/search/?api=1&query=Judita%20Palace%2C%20Inside%20the%20Palace%2C%20Split%2C%20Croatia",
    "splurge": true
  },
  {
    "id": "ht24",
    "placeId": "split",
    "name": "Boutique Hotel Luxe",
    "area": "Near the Palace",
    "costLabel": "~$200–300",
    "cost": 250,
    "pros": "Stylish 4-star ~0.2 mi from the Palace with spa, hot tub and sauna; high guest rating; near Bačvice Beach.",
    "cons": "On a busier road vs quiet Veli Varoš; spa-hotel feel.",
    "url": "https://www.google.com/maps/search/?api=1&query=Boutique%20Hotel%20Luxe%2C%20Near%20the%20Palace%2C%20Split%2C%20Croatia",
    "splurge": false
  },
  {
    "id": "ht25",
    "placeId": "split",
    "name": "Cornaro Hotel",
    "area": "Old Town",
    "costLabel": "~$190–300",
    "cost": 245,
    "pros": "Central heritage-style stay close to the Palace and Riva; reliable comfort without going full luxury.",
    "cons": "Old Town evening crowd noise; confirm the exact stepped street.",
    "url": "https://www.google.com/maps/search/?api=1&query=Cornaro%20Hotel%2C%20Old%20Town%2C%20Split%2C%20Croatia",
    "splurge": false
  },
  {
    "id": "ht26", "placeId": "ostuni", "name": "La Sommità Relais & Chateaux", "area": "Centro Storico",
    "costLabel": "~$350–550", "cost": 450,
    "pros": "The finest in-town address; charming luxury boutique hotel with a Michelin restaurant on site.",
    "cons": "Books out early; upper end of the range.",
    "url": "https://www.google.com/maps/search/?api=1&query=La%20Sommit%C3%A0%20Relais%20%26%20Chateaux%2C%20Ostuni%2C%20Italy",
    "splurge": true
  },
  {
    "id": "ht27", "placeId": "ostuni", "name": "I 7 Archi Guest House", "area": "Centro Storico",
    "costLabel": "~$180–260", "cost": 220,
    "pros": "Studios, suites and apartments right in the old town; unbeatable walking-distance location.",
    "cons": "On the pricier side for a guest house; limited on-site services.",
    "url": "https://www.google.com/maps/search/?api=1&query=I%207%20Archi%20Guest%20House%2C%20Ostuni%2C%20Italy",
    "splurge": false
  },
  {
    "id": "ht28", "placeId": "ostuni", "name": "Masseria Moroseta", "area": "Countryside, ~15 min out",
    "costLabel": "~$300–450", "cost": 375,
    "pros": "Design-forward masseria with sea views, a pool and its own restaurant; the best-known Puglian design brand.",
    "cons": "Need a car; removed from the old town.",
    "url": "https://www.google.com/maps/search/?api=1&query=Masseria%20Moroseta%2C%20Ostuni%2C%20Italy",
    "splurge": true
  },
  {
    "id": "ht29", "placeId": "ostuni", "name": "Paragon 700 Boutique Hotel & Spa", "area": "Centro Storico edge",
    "costLabel": "~$220–320", "cost": 270,
    "pros": "5-star boutique about a 5-minute walk from the center; quiet, private, with a lovely pool.",
    "cons": "Smaller property, books up in season.",
    "url": "https://www.google.com/maps/search/?api=1&query=Paragon%20700%20Boutique%20Hotel%20%26%20Spa%2C%20Ostuni%2C%20Italy",
    "splurge": false
  },
  {
    "id": "ht30", "placeId": "monopoli", "name": "Hotel Don Ferrante", "area": "Centro Storico",
    "costLabel": "~$300–420", "cost": 360,
    "pros": "Old Town's most luxurious option; utter privacy, footsteps to everything. Best splurge in town.",
    "cons": "Upper end of the range; small property.",
    "url": "https://www.google.com/maps/search/?api=1&query=Hotel%20Don%20Ferrante%2C%20Monopoli%2C%20Italy",
    "splurge": true
  },
  {
    "id": "ht31", "placeId": "monopoli", "name": "Dimora Pietrabianca", "area": "Centro Storico",
    "costLabel": "~$150–220", "cost": 185,
    "pros": "Quaint boutique hotel at fair prices; terrace rooms are especially lovely.",
    "cons": "Smaller rooms; limited amenities.",
    "url": "https://www.google.com/maps/search/?api=1&query=Dimora%20Pietrabianca%2C%20Monopoli%2C%20Italy",
    "splurge": false
  },
  {
    "id": "ht32", "placeId": "monopoli", "name": "Orazio 33 B&B", "area": "Centro Storico",
    "costLabel": "~$120–190", "cost": 150,
    "pros": "In-demand, well-loved design B&B in the heart of the old town.",
    "cons": "Books out early; B&B-level services.",
    "url": "https://www.google.com/maps/search/?api=1&query=Orazio%2033%20B%26B%2C%20Monopoli%2C%20Italy",
    "splurge": false
  },
  {
    "id": "ht33", "placeId": "monopoli", "name": "Masseria Torrepietra", "area": "Just outside town",
    "costLabel": "~$180–280", "cost": 220,
    "pros": "19th-century countryside masseria; classic Puglian design and a good family-friendly option.",
    "cons": "Need a car for the old town; outside walking distance.",
    "url": "https://www.google.com/maps/search/?api=1&query=Masseria%20Torrepietra%2C%20Monopoli%2C%20Italy",
    "splurge": false
  },
  {
    "id": "ht34", "placeId": "otranto", "name": "Masseria Prosperi", "area": "Countryside, near Otranto",
    "costLabel": "~$280–420", "cost": 350,
    "pros": "Elegant countryside masseria with an indoor pool; sleeps up to 18, good for groups.",
    "cons": "Need a car; not an in-town stay.",
    "url": "https://www.google.com/maps/search/?api=1&query=Masseria%20Prosperi%2C%20Otranto%2C%20Italy",
    "splurge": true
  },
  {
    "id": "ht35", "placeId": "otranto", "name": "Masseria Longa", "area": "Countryside, near Otranto",
    "costLabel": "~$220–330", "cost": 275,
    "pros": "Rustic stone masseria near the Adriatic coast; secluded gardens, quieter alternative to the Old Town.",
    "cons": "Need a car; a short drive from the Old Town and beach.",
    "url": "https://www.google.com/maps/search/?api=1&query=Masseria%20Longa%2C%20Otranto%2C%20Italy",
    "splurge": false
  },
  {
    "id": "ht36", "placeId": "korcula", "name": "Lešić Dimitri Palace", "area": "Old Town",
    "costLabel": "~$450–700+", "cost": 550,
    "pros": "The island's only 5-star; restored 18th-century bishop's palace, Michelin-starred restaurant, spa. Best splurge.",
    "cons": "Well above budget for most nights.",
    "url": "https://www.google.com/maps/search/?api=1&query=Le%C5%A1i%C4%87%20Dimitri%20Palace%2C%20Kor%C4%8Dula%2C%20Croatia",
    "splurge": true
  },
  {
    "id": "ht37", "placeId": "korcula", "name": "Aminess Korčula Heritage Hotel", "area": "Old Town seafront",
    "costLabel": "~$180–280", "cost": 230,
    "pros": "The island's oldest hotel (1912); seafront in the heart of the Old Town, views over the marina.",
    "cons": "Simpler rooms than the price suggests; older building.",
    "url": "https://www.google.com/maps/search/?api=1&query=Aminess%20Kor%C4%8Dula%20Heritage%20Hotel%2C%20Kor%C4%8Dula%2C%20Croatia",
    "splurge": false
  },
  {
    "id": "ht38", "placeId": "korcula", "name": "Hotel Liburna", "area": "15 min walk from Old Town",
    "costLabel": "~$140–220", "cost": 180,
    "pros": "Good-sized outdoor pool with panoramic views; most rooms have sea views; solid value.",
    "cons": "Not walking-distance close; more resort than boutique.",
    "url": "https://www.google.com/maps/search/?api=1&query=Hotel%20Liburna%2C%20Kor%C4%8Dula%2C%20Croatia",
    "splurge": false
  },
  {
    "id": "ht39", "placeId": "mljet", "name": "Hotel Odisej", "area": "Pomena, inside the National Park",
    "costLabel": "~$160–240", "cost": 200,
    "pros": "The only traditional hotel on the island, right by the National Park entrance and Pomena harbor.",
    "cons": "Dated compared to mainland options; very limited alternatives if it's full.",
    "url": "https://www.google.com/maps/search/?api=1&query=Hotel%20Odisej%2C%20Mljet%2C%20Croatia",
    "splurge": false
  },
  {
    "id": "ht40", "placeId": "mljet", "name": "Apartmaji Mljet Soline", "area": "Soline, inside the National Park",
    "costLabel": "~$90–140", "cost": 110,
    "pros": "Simple boarding house overlooking both the sea and the lake, right at the heart of the National Park.",
    "cons": "Basic, guesthouse-level amenities.",
    "url": "https://www.google.com/maps/search/?api=1&query=Apartmaji%20Mljet%20Soline%2C%20Mljet%2C%20Croatia",
    "splurge": false
  },
  {
    "id": "ht41", "placeId": "makarska", "name": "Hotel Osejava", "area": "Osejava peninsula",
    "costLabel": "~$160–240", "cost": 200,
    "pros": "Highly rated, quiet spot on the Osejava peninsula, close to the beach and a short walk to the Riva.",
    "cons": "A bit removed from the busiest part of town (a plus for some).",
    "url": "https://www.google.com/maps/search/?api=1&query=Hotel%20Osejava%2C%20Makarska%2C%20Croatia",
    "splurge": false
  },
  {
    "id": "ht42", "placeId": "makarska", "name": "Hotel Dalmacija", "area": "Near the Riva",
    "costLabel": "~$130–200", "cost": 165,
    "pros": "Well-reviewed, central, easy walk to the promenade and old town.",
    "cons": "Simpler amenities than the resort-style properties.",
    "url": "https://www.google.com/maps/search/?api=1&query=Hotel%20Dalmacija%2C%20Makarska%2C%20Croatia",
    "splurge": false
  },
  {
    "id": "ht43", "placeId": "makarska", "name": "Aminess Khalani Beach Hotel", "area": "Beachfront",
    "costLabel": "~$220–340", "cost": 280,
    "pros": "Direct beach access, pools, resort amenities -- a comfortable splurge option on the Riviera.",
    "cons": "Resort-style rather than boutique; a walk from the old town.",
    "url": "https://www.google.com/maps/search/?api=1&query=Aminess%20Khalani%20Beach%20Hotel%2C%20Makarska%2C%20Croatia",
    "splurge": true
  }
];

// -- Things to do: real "see & do" cards per place, extracted from the original guide. --
SEED_DATA.thingsToDo = [
  {
    "id": "td1",
    "placeId": "rome",
    "city": "rome",
    "name": "Colosseum, Forum & Palatine",
    "kind": "Ancient Rome",
    "description": "Book the combined timed ticket online and go early.",
    "url": "https://www.google.com/maps/search/?api=1&query=Colosseum%2C%20Forum%20%26%20Palatine%2C%20Rome%2C%20Italy"
  },
  {
    "id": "td2",
    "placeId": "rome",
    "city": "rome",
    "name": "Roman Forum at golden hour",
    "kind": "Walk among ruins",
    "description": "The political heart of the ancient city.",
    "url": "https://www.google.com/maps/search/?api=1&query=Roman%20Forum%20at%20golden%20hour%2C%20Rome%2C%20Italy"
  },
  {
    "id": "td3",
    "placeId": "rome",
    "city": "rome",
    "name": "Pantheon",
    "kind": "Free to enter",
    "description": "The best-preserved Roman building still standing, its dome open to the sky.",
    "url": "https://www.google.com/maps/search/?api=1&query=Pantheon%2C%20Rome%2C%20Italy"
  },
  {
    "id": "td4",
    "placeId": "rome",
    "city": "rome",
    "name": "Piazza Navona",
    "kind": "Baroque heart",
    "description": "Bernini's fountains and a film-set square of cafes and street artists.",
    "url": "https://www.google.com/maps/search/?api=1&query=Piazza%20Navona%2C%20Rome%2C%20Italy"
  },
  {
    "id": "td5",
    "placeId": "rome",
    "city": "rome",
    "name": "Vatican Museums & St Peter's",
    "kind": "Optional morning",
    "description": "If you want it, book the earliest slot or a skip-the-line tour.",
    "url": "https://www.google.com/maps/search/?api=1&query=Vatican%20Museums%20%26%20St%20Peter's%2C%20Rome%2C%20Italy"
  },
  {
    "id": "td6",
    "placeId": "rome",
    "city": "rome",
    "name": "Testaccio market & quarter",
    "kind": "Local life",
    "description": "Rome's real food neighborhood, a working market by day and the home of the city's most honest trattorias by night.",
    "url": "https://www.google.com/maps/search/?api=1&query=Testaccio%20market%20%26%20quarter%2C%20Rome%2C%20Italy"
  },
  {
    "id": "td7",
    "placeId": "puglia",
    "city": "polignano",
    "name": "Polignano a Mare",
    "kind": "30 min by train",
    "description": "Whitewashed town on limestone cliffs over a turquoise cove.",
    "url": "https://www.google.com/maps/search/?api=1&query=Polignano%20a%20Mare%2C%20Polignano%20a%20Mare%2C%20Italy"
  },
  {
    "id": "td8",
    "placeId": "puglia",
    "city": "alberobello",
    "name": "Alberobello trulli",
    "kind": "~1 hr · FSE line",
    "description": "UNESCO village of conical stone houses.",
    "url": "https://www.google.com/maps/search/?api=1&query=Alberobello%20trulli%2C%20Alberobello%2C%20Italy"
  },
  {
    "id": "td9",
    "placeId": "puglia",
    "city": "matera",
    "name": "Matera's Sassi",
    "kind": "~1 hr · FAL line",
    "description": "Ancient cave dwellings carved into a ravine, glowing at dusk.",
    "url": "https://www.google.com/maps/search/?api=1&query=Matera's%20Sassi%2C%20Matera%2C%20Italy"
  },
  {
    "id": "td10",
    "placeId": "puglia",
    "city": "lecce",
    "name": "Lecce, the Baroque south",
    "kind": "~1.5 hr by train",
    "description": "Honey-colored Baroque facades and the famous pasticciotto custard pastry.",
    "url": "https://www.google.com/maps/search/?api=1&query=Lecce%2C%20the%20Baroque%20south%2C%20Lecce%2C%20Italy"
  },
  {
    "id": "td11",
    "placeId": "puglia",
    "city": "bari",
    "name": "Bari Vecchia & Arco Basso",
    "kind": "In Bari",
    "description": "Walk the 'Strada delle Orecchiette' where nonnas shape pasta in the doorways, past the Basilica di San Nicola.",
    "url": "https://www.google.com/maps/search/?api=1&query=Bari%20Vecchia%20%26%20Arco%20Basso%2C%20Bari%2C%20Italy"
  },
  {
    "id": "td12",
    "placeId": "puglia",
    "city": "bari",
    "name": "Orecchiette cooking class",
    "kind": "Hands-on",
    "description": "Learn to hand-roll orecchiette with a local before feasting on the result.",
    "url": "https://www.google.com/maps/search/?api=1&query=Orecchiette%20cooking%20class%2C%20Bari%2C%20Italy"
  },
  {
    "id": "td13",
    "placeId": "dubrovnik",
    "city": "dubrovnik",
    "name": "Walk the City Walls",
    "kind": "The icon",
    "description": "A circuit of the medieval ramparts above terracotta roofs and the Adriatic.",
    "url": "https://www.google.com/maps/search/?api=1&query=Walk%20the%20City%20Walls%2C%20Dubrovnik%2C%20Croatia"
  },
  {
    "id": "td14",
    "placeId": "dubrovnik",
    "city": "dubrovnik",
    "name": "Stradun & the old quarter",
    "kind": "Wander",
    "description": "The polished limestone main street, plus the Rector's Palace, the Franciscan monastery pharmacy and hidden stair-streets.",
    "url": "https://www.google.com/maps/search/?api=1&query=Stradun%20%26%20the%20old%20quarter%2C%20Dubrovnik%2C%20Croatia"
  },
  {
    "id": "td15",
    "placeId": "dubrovnik",
    "city": "dubrovnik",
    "name": "Lokrum Island",
    "kind": "Short boat hop",
    "description": "A ten-minute ferry to a forested islet with peacocks, a botanical garden and quiet swimming coves.",
    "url": "https://www.google.com/maps/search/?api=1&query=Lokrum%20Island%2C%20Dubrovnik%2C%20Croatia"
  },
  {
    "id": "td16",
    "placeId": "dubrovnik",
    "city": "dubrovnik",
    "name": "Mount Srđ cable car",
    "kind": "Sunset",
    "description": "Ride up for the panoramic view over the walled city and islands.",
    "url": "https://www.google.com/maps/search/?api=1&query=Mount%20Sr%C4%91%20cable%20car%2C%20Dubrovnik%2C%20Croatia"
  },
  {
    "id": "td17",
    "placeId": "dubrovnik",
    "city": "dubrovnik",
    "name": "Sea kayak under the walls",
    "kind": "On the water",
    "description": "Paddle out from Pile beneath the ramparts to a sea cave and Lokrum.",
    "url": "https://www.google.com/maps/search/?api=1&query=Sea%20kayak%20under%20the%20walls%2C%20Dubrovnik%2C%20Croatia"
  },
  {
    "id": "td18",
    "placeId": "dubrovnik",
    "city": "dubrovnik",
    "name": "Game of Thrones film spots",
    "kind": "Pop culture",
    "description": "The Old Town doubled as King's Landing.",
    "url": "https://www.google.com/maps/search/?api=1&query=Game%20of%20Thrones%20film%20spots%2C%20Dubrovnik%2C%20Croatia"
  },
  {
    "id": "td19",
    "placeId": "hvar",
    "city": "hvar",
    "name": "Španjola (Spanish) Fortress",
    "kind": "The must-do",
    "description": "A short uphill walk to the island's signature view: orange rooftops, the harbor and the Pakleni Islands beyond.",
    "url": "https://www.google.com/maps/search/?api=1&query=%C5%A0panjola%20(Spanish)%20Fortress%2C%20Hvar%2C%20Croatia"
  },
  {
    "id": "td20",
    "placeId": "hvar",
    "city": "hvar",
    "name": "Pakleni Islands",
    "kind": "On the water",
    "description": "A string of islets minutes offshore with clear lagoons and hidden coves.",
    "url": "https://www.google.com/maps/search/?api=1&query=Pakleni%20Islands%2C%20Hvar%2C%20Croatia"
  },
  {
    "id": "td21",
    "placeId": "hvar",
    "city": "hvar",
    "name": "St Stephen's Square",
    "kind": "The center",
    "description": "Croatia's largest old square, anchored by the cathedral, at its best at golden hour when the marble glows.",
    "url": "https://www.google.com/maps/search/?api=1&query=St%20Stephen's%20Square%2C%20Hvar%2C%20Croatia"
  },
  {
    "id": "td22",
    "placeId": "hvar",
    "city": "hvar",
    "name": "Hvar wine tasting",
    "kind": "Taste",
    "description": "The island is known for its vineyards.",
    "url": "https://www.google.com/maps/search/?api=1&query=Hvar%20wine%20tasting%2C%20Hvar%2C%20Croatia"
  },
  {
    "id": "td23",
    "placeId": "hvar",
    "city": "hvar",
    "name": "Stari Grad",
    "kind": "If you have time",
    "description": "The island's quiet original capital, 30 min away, with a flat old town, harbor and a UNESCO-listed plain of vines and olives.",
    "url": "https://www.google.com/maps/search/?api=1&query=Stari%20Grad%2C%20Hvar%2C%20Croatia"
  },
  {
    "id": "td24",
    "placeId": "hvar",
    "city": "hvar",
    "name": "Swim at Pokonji Dol",
    "kind": "Beach time",
    "description": "An easy pebble cove a short walk from town for a morning dip before your onward catamaran.",
    "url": "https://www.google.com/maps/search/?api=1&query=Swim%20at%20Pokonji%20Dol%2C%20Hvar%2C%20Croatia"
  },
  {
    "id": "td25",
    "placeId": "split",
    "city": "split",
    "name": "Diocletian's Palace",
    "kind": "UNESCO · the heart",
    "description": "A 1,700-year-old Roman palace still lived in today.",
    "url": "https://www.google.com/maps/search/?api=1&query=Diocletian's%20Palace%2C%20Split%2C%20Croatia"
  },
  {
    "id": "td26",
    "placeId": "split",
    "city": "split",
    "name": "Cathedral of St Domnius",
    "kind": "Climb",
    "description": "Climb the bell tower for a tight, rewarding view straight down over the palace rooftops and out to the harbor.",
    "url": "https://www.google.com/maps/search/?api=1&query=Cathedral%20of%20St%20Domnius%2C%20Split%2C%20Croatia"
  },
  {
    "id": "td27",
    "placeId": "split",
    "city": "split",
    "name": "Marjan Hill",
    "kind": "Nature",
    "description": "The forested peninsula above town.",
    "url": "https://www.google.com/maps/search/?api=1&query=Marjan%20Hill%2C%20Split%2C%20Croatia"
  },
  {
    "id": "td28",
    "placeId": "split",
    "city": "split",
    "name": "The Riva & Bačvice",
    "kind": "Aperitivo hour",
    "description": "Palm-lined waterfront for coffee and people-watching, then Bačvice beach for a swim or a game of picigin with locals.",
    "url": "https://www.google.com/maps/search/?api=1&query=The%20Riva%20%26%20Ba%C4%8Dvice%2C%20Split%2C%20Croatia"
  },
  {
    "id": "td29",
    "placeId": "split",
    "city": "split",
    "name": "Trogir & the Blue Lagoon",
    "kind": "Half-day trip",
    "description": "A tiny UNESCO island-town 30 min away, often paired with a swim stop at the turquoise Blue Lagoon off Šolta.",
    "url": "https://www.google.com/maps/search/?api=1&query=Trogir%20%26%20the%20Blue%20Lagoon%2C%20Split%2C%20Croatia"
  },
  {
    "id": "td30",
    "placeId": "split",
    "city": "split",
    "name": "Klis Fortress",
    "kind": "View & history",
    "description": "A clifftop fortress just outside town with sweeping coastal views (and more Game of Thrones scenery).",
    "url": "https://www.google.com/maps/search/?api=1&query=Klis%20Fortress%2C%20Split%2C%20Croatia"
  },
  {"id":"td31","placeId":"ostuni","city":"ostuni","name":"Centro Storico of Ostuni","kind":"The White City","description":"The whitewashed hilltop old town that gives Ostuni its name -- a postcard worth a few hours on foot.","url":"https://www.google.com/maps/search/?api=1&query=Centro%20Storico%2C%20Ostuni%2C%20Italy"},
  {"id":"td32","placeId":"ostuni","city":"ostuni","name":"Piazza della Libertà & Colonna di Sant'Oronzo","kind":"Main square","description":"The town's main square and its stone column honoring the patron saint; ring of cafes and bars.","url":"https://www.google.com/maps/search/?api=1&query=Piazza%20della%20Libert%C3%A0%2C%20Ostuni%2C%20Italy"},
  {"id":"td33","placeId":"ostuni","city":"ostuni","name":"Ostuni Cathedral (Santa Maria Assunta)","kind":"15th-century","description":"A Roman Catholic cathedral with a striking rose window, reached through the Arco Scoppa.","url":"https://www.google.com/maps/search/?api=1&query=Cattedrale%20Santa%20Maria%20Assunta%2C%20Ostuni%2C%20Italy"},
  {"id":"td34","placeId":"ostuni","city":"ostuni","name":"City walls & Corso Vittorio Emanuele II viewpoint","kind":"Views","description":"Ancient walls with views out to the Adriatic; this viewpoint has the best look back at the White City.","url":"https://www.google.com/maps/search/?api=1&query=Ostuni%20city%20walls%2C%20Ostuni%2C%20Italy"},
  {"id":"td35","placeId":"ostuni","city":"ostuni","name":"Tuk-tuk tour of the old town","kind":"Guided","description":"A fun, fast way to see every corner of the hilltop town on a hot day.","url":"https://www.google.com/maps/search/?api=1&query=Ostuni%20tuk%20tuk%20tour%2C%20Ostuni%2C%20Italy"},
  {"id":"td36","placeId":"ostuni","city":"ostuni","name":"La Mercanteria antiques","kind":"Shopping","description":"Traditional Apulian ceramics and antiques; a second-Sunday flea market fills the old town monthly.","url":"https://www.google.com/maps/search/?api=1&query=La%20Mercanteria%2C%20Ostuni%2C%20Italy"},
  {"id":"td37","placeId":"ostuni","city":"ostuni","name":"Pasta cooking class with La Caseddha","kind":"Experience","description":"Learn Puglian pasta shapes from a local producer of olive oil and flour; can come to you or host at the farm.","url":"https://www.google.com/maps/search/?api=1&query=La%20Caseddha%2C%20Ostuni%2C%20Italy"},
  {"id":"td38","placeId":"monopoli","city":"monopoli","name":"Lungomare sunset stroll","kind":"Waterfront","description":"The sea-facing promenade ringing the old town, liveliest right before and after sunset.","url":"https://www.google.com/maps/search/?api=1&query=Lungomare%2C%20Monopoli%2C%20Italy"},
  {"id":"td39","placeId":"monopoli","city":"monopoli","name":"Castello Carlo V & Bastione Santa Maria","kind":"History","description":"A restored medieval castle with a small museum, beside an old defense tower on the promenade.","url":"https://www.google.com/maps/search/?api=1&query=Castello%20Carlo%20V%2C%20Monopoli%2C%20Italy"},
  {"id":"td40","placeId":"monopoli","city":"monopoli","name":"Cattedrale Maria Santissima della Madia","kind":"12th-18th century","description":"Romanesque-Baroque cathedral with a Romanesque crypt below (Museo Cripta Romanica).","url":"https://www.google.com/maps/search/?api=1&query=Cattedrale%20Maria%20Santissima%20della%20Madia%2C%20Monopoli%2C%20Italy"},
  {"id":"td41","placeId":"monopoli","city":"monopoli","name":"Palazzo Palmieri","kind":"Baroque palace","description":"An 18th-century Lecce-style Baroque palace on the piazza of the same name.","url":"https://www.google.com/maps/search/?api=1&query=Palazzo%20Palmieri%2C%20Monopoli%2C%20Italy"},
  {"id":"td42","placeId":"monopoli","city":"monopoli","name":"Porto Antico","kind":"Working harbor","description":"The old fishing harbor with traditional red-and-blue gozzo boats -- classic Puglian coastal life.","url":"https://www.google.com/maps/search/?api=1&query=Porto%20Antico%2C%20Monopoli%2C%20Italy"},
  {"id":"td43","placeId":"monopoli","city":"monopoli","name":"Beach hopping: Cala Porta Vecchia to Cala Paradiso","kind":"Beaches","description":"A string of small coves just outside town, from the central beach to the family-friendly Cala Paradiso.","url":"https://www.google.com/maps/search/?api=1&query=Cala%20Paradiso%2C%20Monopoli%2C%20Italy"},
  {"id":"td44","placeId":"monopoli","city":"monopoli","name":"Boat tour to the Polignano caves","kind":"2.5-7.5 hours","description":"Shared or private boat trips along the coast to Polignano a Mare's sea caves.","url":"https://www.google.com/maps/search/?api=1&query=Polignano%20caves%20boat%20tour%2C%20Monopoli%2C%20Italy"},
  {"id":"td45","placeId":"otranto","city":"otranto","name":"Centro Storico of Otranto","kind":"Old town","description":"A maze of narrow whitewashed streets, boutiques and cafes -- quieter than it looks since everyone's at the beach.","url":"https://www.google.com/maps/search/?api=1&query=Centro%20Storico%2C%20Otranto%2C%20Italy"},
  {"id":"td46","placeId":"otranto","city":"otranto","name":"Cattedrale di Santa Maria Annunziata","kind":"11th century","description":"An 11th-century cathedral with a famous, well-preserved mosaic floor.","url":"https://www.google.com/maps/search/?api=1&query=Cattedrale%20di%20Santa%20Maria%20Annunziata%2C%20Otranto%2C%20Italy"},
  {"id":"td47","placeId":"otranto","city":"otranto","name":"Castello Aragonese & city walls","kind":"15th century","description":"An imposing fortress (ramparts, towers, dungeons, ~€12 entry) with rotating art exhibitions; free walk along the walls.","url":"https://www.google.com/maps/search/?api=1&query=Castello%20Aragonese%2C%20Otranto%2C%20Italy"},
  {"id":"td48","placeId":"otranto","city":"otranto","name":"Otranto city beach","kind":"Beach","description":"Pristine, convenient city-center beach right beside the old town walls.","url":"https://www.google.com/maps/search/?api=1&query=Otranto%20city%20beach%2C%20Otranto%2C%20Italy"},
  {"id":"td49","placeId":"otranto","city":"otranto","name":"Punta Palascìa Lighthouse","kind":"Easternmost point of Italy","description":"Where the Adriatic and Ionian seas meet -- the literal eastern edge of the country.","url":"https://www.google.com/maps/search/?api=1&query=Punta%20Palasc%C3%ACa%20Lighthouse%2C%20Otranto%2C%20Italy"},
  {"id":"td50","placeId":"otranto","city":"otranto","name":"Day trip to Grotta della Poesia","kind":"~30 min away","description":"A famous natural swimming grotto near Roca Vecchia, a legitimate cliff-jump-and-swim spot.","url":"https://www.google.com/maps/search/?api=1&query=Grotta%20della%20Poesia%2C%20Otranto%2C%20Italy"},
  {"id":"td51","placeId":"korcula","city":"korcula","name":"Korčula Old Town","kind":"Medieval fishbone plan","description":"One of the best-preserved medieval towns in the Adriatic, its streets angled to block cold winds and let mild ones through.","url":"https://www.google.com/maps/search/?api=1&query=Kor%C4%8Dula%20Old%20Town%2C%20Kor%C4%8Dula%2C%20Croatia"},
  {"id":"td52","placeId":"korcula","city":"korcula","name":"St. Mark's Cathedral & Bell Tower","kind":"15th century","description":"Gothic-Renaissance cathedral with Tintoretto works; climb the bell tower for the view.","url":"https://www.google.com/maps/search/?api=1&query=St%20Mark's%20Cathedral%2C%20Kor%C4%8Dula%2C%20Croatia"},
  {"id":"td53","placeId":"korcula","city":"korcula","name":"House of Marco Polo","kind":"History","description":"Korčula's reputed connection to the explorer, near the cathedral in the old town.","url":"https://www.google.com/maps/search/?api=1&query=House%20of%20Marco%20Polo%2C%20Kor%C4%8Dula%2C%20Croatia"},
  {"id":"td54","placeId":"korcula","city":"korcula","name":"Island-hop to Badija, Stupe & Vrnik","kind":"Boat trip","description":"Water taxi out to the Škoji islets: a monastery and deer on Badija, a beach club on Stupe, quarries on Vrnik.","url":"https://www.google.com/maps/search/?api=1&query=Badija%20Island%2C%20Kor%C4%8Dula%2C%20Croatia"},
  {"id":"td55","placeId":"korcula","city":"korcula","name":"Wine tasting: Pošip & Grk","kind":"Experience","description":"Local white wines from Korčula's vineyards, with tours to family-run wineries around the island.","url":"https://www.google.com/maps/search/?api=1&query=Ko%C5%A1ip%20wine%20tasting%2C%20Kor%C4%8Dula%2C%20Croatia"},
  {"id":"td56","placeId":"korcula","city":"korcula","name":"Pržina Beach, Lumbarda","kind":"~15 min drive","description":"The island's best sandy beach, in the small fishing village of Lumbarda.","url":"https://www.google.com/maps/search/?api=1&query=Pr%C5%BEina%20Beach%2C%20Lumbarda%2C%20Croatia"},
  {"id":"td57","placeId":"mljet","city":"mljet","name":"Mljet National Park: Veliko & Malo Jezero","kind":"Saltwater lakes","description":"Two connected saltwater lakes ringed by pine forest -- the heart of the park, walkable and bikeable.","url":"https://www.google.com/maps/search/?api=1&query=Mljet%20National%20Park%2C%20Mljet%2C%20Croatia"},
  {"id":"td58","placeId":"mljet","city":"mljet","name":"St. Mary's Islet monastery","kind":"Boat trip on Veliko Jezero","description":"A small Benedictine monastery on an islet in the middle of the Great Lake, reached by a short boat ride.","url":"https://www.google.com/maps/search/?api=1&query=St%20Mary's%20Islet%2C%20Mljet%2C%20Croatia"},
  {"id":"td59","placeId":"mljet","city":"mljet","name":"Bike the lake loop","kind":"Self-guided","description":"Rent a bike in Pomena or Polače to circle the lakes -- the easiest way to see the park without a car.","url":"https://www.google.com/maps/search/?api=1&query=Mljet%20bike%20rental%2C%20Mljet%2C%20Croatia"},
  {"id":"td60","placeId":"mljet","city":"mljet","name":"Odysseus Cave","kind":"Near Babino Polje","description":"A sea cave with a legendary link to Odysseus and Calypso; swimmable in calm weather.","url":"https://www.google.com/maps/search/?api=1&query=Odysseus%20Cave%2C%20Mljet%2C%20Croatia"},
  {"id":"td61","placeId":"makarska","city":"makarska","name":"Biokovo Nature Park cable car","kind":"Mountain views","description":"A cable car up Mount Biokovo for a dramatic view over the Makarska Riviera and the sea.","url":"https://www.google.com/maps/search/?api=1&query=Biokovo%20Skywalk%2C%20Makarska%2C%20Croatia"},
  {"id":"td62","placeId":"makarska","city":"makarska","name":"The Riva promenade","kind":"Waterfront","description":"Palm-lined seafront walk, the social heart of town by day and night.","url":"https://www.google.com/maps/search/?api=1&query=Riva%2C%20Makarska%2C%20Croatia"},
  {"id":"td63","placeId":"makarska","city":"makarska","name":"Kačić Square & St. Mark's Church","kind":"Old town","description":"The main square, named for local poet Andrija Kačić Miošić, anchored by the parish church.","url":"https://www.google.com/maps/search/?api=1&query=Ka%C4%8Di%C4%87%20Square%2C%20Makarska%2C%20Croatia"},
  {"id":"td64","placeId":"makarska","city":"makarska","name":"Malacological Museum","kind":"Shell collection","description":"A well-known, slightly eccentric seashell museum run by Franciscan friars.","url":"https://www.google.com/maps/search/?api=1&query=Malacological%20Museum%2C%20Makarska%2C%20Croatia"},
  {"id":"td65","placeId":"makarska","city":"makarska","name":"Osejava peninsula walk","kind":"Coastal path","description":"A pine-shaded path around the peninsula with pebble coves along the way.","url":"https://www.google.com/maps/search/?api=1&query=Osejava%2C%20Makarska%2C%20Croatia"},
  {"id":"td66","placeId":"makarska","city":"makarska","name":"Day trip to Brela's Punta Rata","kind":"~15 min drive","description":"One of Croatia's most photographed beaches, just up the Riviera from Makarska.","url":"https://www.google.com/maps/search/?api=1&query=Punta%20Rata%2C%20Brela%2C%20Croatia"}
];

// -- Restaurants: replaces the earlier placeholder list with the real 30-spot guide. --
SEED_DATA.restaurants = [
  {
    "id": "r1",
    "placeId": "rome",
    "city": "rome",
    "name": "Il Duca",
    "kind": "Trastevere · trattoria",
    "description": "Unassuming front, excellent homemade pasta.",
    "vegetarian": true,
    "vegLabel": "Very veg-friendly",
    "url": "https://www.google.com/maps/search/?api=1&query=Il%20Duca%2C%20Rome%2C%20Italy"
  },
  {
    "id": "r2",
    "placeId": "rome",
    "city": "rome",
    "name": "Ivo a Trastevere",
    "kind": "Trastevere · classic",
    "description": "Loud, homely, famous for pizza.",
    "vegetarian": true,
    "vegLabel": "Easy veg options",
    "url": "https://www.google.com/maps/search/?api=1&query=Ivo%20a%20Trastevere%2C%20Rome%2C%20Italy"
  },
  {
    "id": "r3",
    "placeId": "rome",
    "city": "rome",
    "name": "Aromaticus",
    "kind": "Monti · vegetarian",
    "description": "Herb-forward, fresh and modern.",
    "vegetarian": true,
    "vegLabel": "Vegetarian / vegan",
    "url": "https://www.google.com/maps/search/?api=1&query=Aromaticus%2C%20Rome%2C%20Italy"
  },
  {
    "id": "r4",
    "placeId": "rome",
    "city": "rome",
    "name": "Da Fabrizio al 56",
    "kind": "Trastevere · trattoria",
    "description": "Warm Roman trattoria where the owner greets guests himself.",
    "vegetarian": true,
    "vegLabel": "Veg mains available",
    "url": "https://www.google.com/maps/search/?api=1&query=Da%20Fabrizio%20al%2056%2C%20Rome%2C%20Italy"
  },
  {
    "id": "r5",
    "placeId": "rome",
    "city": "rome",
    "name": "Carciofi in the Ghetto",
    "kind": "Roman-Jewish · seasonal",
    "description": "For omnivore and veg alike: carciofi alla giudia, whole artichokes fried until the leaves open like a flower.",
    "vegetarian": true,
    "vegLabel": "Veg classic",
    "url": "https://www.google.com/maps/search/?api=1&query=Carciofi%20in%20the%20Ghetto%2C%20Rome%2C%20Italy"
  },
  {
    "id": "r6",
    "placeId": "rome",
    "city": "rome",
    "name": "Giolitti & Grezzo",
    "kind": "Treat",
    "description": "Giolitti near the Pantheon for classic gelato; Grezzo in Monti for raw-chocolate and vegan scoops.",
    "vegetarian": true,
    "vegLabel": "Vegan options at Grezzo",
    "url": "https://www.google.com/maps/search/?api=1&query=Giolitti%20%26%20Grezzo%2C%20Rome%2C%20Italy"
  },
  {
    "id": "r7",
    "placeId": "puglia",
    "city": "bari",
    "name": "La Uascezze",
    "kind": "Bari Vecchia · traditional",
    "description": "Creamy burrata, marinated antipasti and a standout orecchiette con cime di rapa with a peppery bite.",
    "vegetarian": true,
    "vegLabel": "Strong veg antipasti & pasta",
    "url": "https://www.google.com/maps/search/?api=1&query=La%20Uascezze%2C%20Bari%2C%20Italy"
  },
  {
    "id": "r8",
    "placeId": "puglia",
    "city": "bari",
    "name": "Antò",
    "kind": "Bari Vecchia · traditional",
    "description": "Laid-back local favorite in the old town.",
    "vegetarian": true,
    "vegLabel": "Many veg classics",
    "url": "https://www.google.com/maps/search/?api=1&query=Ant%C3%B2%2C%20Bari%2C%20Italy"
  },
  {
    "id": "r9",
    "placeId": "puglia",
    "city": "bari",
    "name": "Mamapulia",
    "kind": "Modern trattoria",
    "description": "Puglian dishes with a twist and reliable vegan/veg choices, grilled eggplant, marinated peppers, fave e cicoria.",
    "vegetarian": true,
    "vegLabel": "Dedicated veg / vegan menu",
    "url": "https://www.google.com/maps/search/?api=1&query=Mamapulia%2C%20Bari%2C%20Italy"
  },
  {
    "id": "r10",
    "placeId": "puglia",
    "city": "bari",
    "name": "Panzerotti & focaccia barese",
    "kind": "Street food",
    "description": "Fried dough oozing tomato and mozzarella, plus cherry-tomato focaccia.",
    "vegetarian": true,
    "vegLabel": "Naturally vegetarian",
    "url": "https://www.google.com/maps/search/?api=1&query=Panzerotti%20%26%20focaccia%20barese%2C%20Bari%2C%20Italy"
  },
  {
    "id": "r11",
    "placeId": "puglia",
    "city": "bari",
    "name": "La Tana del Polpo",
    "kind": "For the omnivore",
    "description": "Octopus-focused trattoria in the old-town lanes.",
    "vegetarian": false,
    "vegLabel": "Seafood-led",
    "url": "https://www.google.com/maps/search/?api=1&query=La%20Tana%20del%20Polpo%2C%20Bari%2C%20Italy"
  },
  {
    "id": "r12",
    "placeId": "puglia",
    "city": "bari",
    "name": "Caseificio cheese tasting",
    "kind": "Cheese pilgrimage",
    "description": "A creamery near Bari making burrata, mozzarella and pecorino in the classic Pugliese tradition.",
    "vegetarian": true,
    "vegLabel": "Cheese tasting",
    "url": "https://www.google.com/maps/search/?api=1&query=Caseificio%20cheese%20tasting%2C%20Bari%2C%20Italy"
  },
  {
    "id": "r13",
    "placeId": "dubrovnik",
    "city": "dubrovnik",
    "name": "Nautika",
    "kind": "Pile · fine dining",
    "description": "Dubrovnik's most celebrated restaurant, on terraces above the sea with fortress views.",
    "vegetarian": true,
    "vegLabel": "Veg menu on request",
    "url": "https://www.google.com/maps/search/?api=1&query=Nautika%2C%20Dubrovnik%2C%20Croatia"
  },
  {
    "id": "r14",
    "placeId": "dubrovnik",
    "city": "dubrovnik",
    "name": "Nishta",
    "kind": "Old Town · vegetarian",
    "description": "The city's beloved all-vegetarian/vegan spot.",
    "vegetarian": true,
    "vegLabel": "Fully vegetarian / vegan",
    "url": "https://www.google.com/maps/search/?api=1&query=Nishta%2C%20Dubrovnik%2C%20Croatia"
  },
  {
    "id": "r15",
    "placeId": "dubrovnik",
    "city": "dubrovnik",
    "name": "Spaghetteria Toni",
    "kind": "Old Town · casual",
    "description": "Twenty years in the center, light pastas, homemade gnocchi and a real selection of vegetarian dishes.",
    "vegetarian": true,
    "vegLabel": "Veg dishes throughout",
    "url": "https://www.google.com/maps/search/?api=1&query=Spaghetteria%20Toni%2C%20Dubrovnik%2C%20Croatia"
  },
  {
    "id": "r16",
    "placeId": "dubrovnik",
    "city": "dubrovnik",
    "name": "Pizzeria Papillon",
    "kind": "Old Town · pizza",
    "description": "The town's Neapolitan-style pizza, light dough, leopard-spotted crust.",
    "vegetarian": true,
    "vegLabel": "Easy veg",
    "url": "https://www.google.com/maps/search/?api=1&query=Pizzeria%20Papillon%2C%20Dubrovnik%2C%20Croatia"
  },
  {
    "id": "r17",
    "placeId": "dubrovnik",
    "city": "dubrovnik",
    "name": "Azur",
    "kind": "Old Town · fusion",
    "description": "Mediterranean meets Asian down a quiet alley, plus the local must-tries: black cuttlefish risotto and buzara shellfish.",
    "vegetarian": false,
    "vegLabel": "Seafood & fusion",
    "url": "https://www.google.com/maps/search/?api=1&query=Azur%2C%20Dubrovnik%2C%20Croatia"
  },
  {
    "id": "r18",
    "placeId": "dubrovnik",
    "city": "dubrovnik",
    "name": "D'Vino Wine Bar",
    "kind": "Old Town · wine",
    "description": "Snug bar for Croatian wine flights with simple cheese and charcuterie plates.",
    "vegetarian": true,
    "vegLabel": "Cheese & small plates",
    "url": "https://www.google.com/maps/search/?api=1&query=D'Vino%20Wine%20Bar%2C%20Dubrovnik%2C%20Croatia"
  },
  {
    "id": "r19",
    "placeId": "hvar",
    "city": "hvar",
    "name": "Konoba Menego",
    "kind": "Old Town · konoba",
    "description": "Candlelit stone tavern between the square and the fortress.",
    "vegetarian": true,
    "vegLabel": "Veg dishes available",
    "url": "https://www.google.com/maps/search/?api=1&query=Konoba%20Menego%2C%20Hvar%2C%20Croatia"
  },
  {
    "id": "r20",
    "placeId": "hvar",
    "city": "hvar",
    "name": "Konoba Luviji",
    "kind": "Old Town · wine cellar",
    "description": "Family-run in a renovated wine cellar with a rooftop terrace facing the cathedral and fortress.",
    "vegetarian": true,
    "vegLabel": "Farm produce, veg sides",
    "url": "https://www.google.com/maps/search/?api=1&query=Konoba%20Luviji%2C%20Hvar%2C%20Croatia"
  },
  {
    "id": "r21",
    "placeId": "hvar",
    "city": "hvar",
    "name": "Pizza on St Stephen's",
    "kind": "Main square · casual",
    "description": "Reliable wood-fired pizza right on the square, with a calm sea view and the bell tower marking the hour.",
    "vegetarian": true,
    "vegLabel": "Veg pizzas",
    "url": "https://www.google.com/maps/search/?api=1&query=Pizza%20on%20St%20Stephen's%2C%20Hvar%2C%20Croatia"
  },
  {
    "id": "r22",
    "placeId": "hvar",
    "city": "hvar",
    "name": "Fish of the day konoba",
    "kind": "For the omnivore",
    "description": "Hvar's seafood is the draw: grilled whole fish, black risotto and octopus.",
    "vegetarian": false,
    "vegLabel": "Seafood-led",
    "url": "https://www.google.com/maps/search/?api=1&query=Fish%20of%20the%20day%20konoba%2C%20Hvar%2C%20Croatia"
  },
  {
    "id": "r23",
    "placeId": "hvar",
    "city": "hvar",
    "name": "Peka (order ahead)",
    "kind": "Dalmatian showpiece",
    "description": "Meat or vegetables slow-roasted under a bell lid.",
    "vegetarian": true,
    "vegLabel": "Vegetable peka possible",
    "url": "https://www.google.com/maps/search/?api=1&query=Peka%20(order%20ahead)%2C%20Hvar%2C%20Croatia"
  },
  {
    "id": "r24",
    "placeId": "hvar",
    "city": "hvar",
    "name": "Hvar Brewing Co.",
    "kind": "Craft beer & bites",
    "description": "Relaxed harborside craft brewery for a casual aperitivo with light plates after the fortress climb.",
    "vegetarian": true,
    "vegLabel": "Snacks & veg bites",
    "url": "https://www.google.com/maps/search/?api=1&query=Hvar%20Brewing%20Co.%2C%20Hvar%2C%20Croatia"
  },
  {
    "id": "r25",
    "placeId": "split",
    "city": "split",
    "name": "Villa Spiza",
    "kind": "Old Town · daily menu",
    "description": "Tiny counter-service spot where the chalkboard changes daily, usually one fish, one meat, one vegetarian.",
    "vegetarian": true,
    "vegLabel": "Daily veg option",
    "url": "https://www.google.com/maps/search/?api=1&query=Villa%20Spiza%2C%20Split%2C%20Croatia"
  },
  {
    "id": "r26",
    "placeId": "split",
    "city": "split",
    "name": "Konoba Fetivi",
    "kind": "Near the Palace · konoba",
    "description": "Genuine Dalmatian cooking in the back streets, pašticada with gnocchi, peka, grilled fish.",
    "vegetarian": false,
    "vegLabel": "Some veg; pasta & sides",
    "url": "https://www.google.com/maps/search/?api=1&query=Konoba%20Fetivi%2C%20Split%2C%20Croatia"
  },
  {
    "id": "r27",
    "placeId": "split",
    "city": "split",
    "name": "Articok",
    "kind": "Veli Varoš · modern",
    "description": "Varoš has a wave of modern kitchens doing creative, vegetable-forward Dalmatian plates.",
    "vegetarian": true,
    "vegLabel": "Veg-forward modern",
    "url": "https://www.google.com/maps/search/?api=1&query=Articok%2C%20Split%2C%20Croatia"
  },
  {
    "id": "r28",
    "placeId": "split",
    "city": "split",
    "name": "Konoba Hvaranin",
    "kind": "For the omnivore",
    "description": "Just outside the tourist zone, so better prices.",
    "vegetarian": false,
    "vegLabel": "Seafood & meat",
    "url": "https://www.google.com/maps/search/?api=1&query=Konoba%20Hvaranin%2C%20Split%2C%20Croatia"
  },
  {
    "id": "r29",
    "placeId": "split",
    "city": "split",
    "name": "Fife (Matejuška)",
    "kind": "Old-school · waterfront",
    "description": "A Split institution by the fishermen's harbor, huge portions of homestyle Dalmatian cooking at honest prices.",
    "vegetarian": true,
    "vegLabel": "Veg sides & pastas",
    "url": "https://www.google.com/maps/search/?api=1&query=Fife%20(Mateju%C5%A1ka)%2C%20Split%2C%20Croatia"
  },
  {
    "id": "r30",
    "placeId": "split",
    "city": "split",
    "name": "Stow Coffee & Monika's Wine Bar",
    "kind": "Coffee & wine",
    "description": "Varoš does specialty coffee by day and intimate Croatian wine by night.",
    "vegetarian": true,
    "vegLabel": "Snacks & small plates",
    "url": "https://www.google.com/maps/search/?api=1&query=Stow%20Coffee%20%26%20Monika's%20Wine%20Bar%2C%20Split%2C%20Croatia"
  },
  {"id":"r31","placeId":"ostuni","city":"ostuni","name":"Burro Cafe","kind":"Coffee & breakfast","description":"All-day coffee and pastries in the old town; a favorite morning stop.","vegetarian":true,"vegLabel":"Coffee & pastries","url":"https://www.google.com/maps/search/?api=1&query=Burro%20Cafe%2C%20Ostuni%2C%20Italy"},
  {"id":"r32","placeId":"ostuni","city":"ostuni","name":"Osteria Ricanatti","kind":"Elevated Puglian tasting menu","description":"Only 8 tables; traditional Puglian cuisine with an elevated twist. Call ahead.","vegetarian":true,"vegLabel":"Veg options on request","url":"https://www.google.com/maps/search/?api=1&query=Osteria%20Ricanatti%2C%20Ostuni%2C%20Italy"},
  {"id":"r33","placeId":"ostuni","city":"ostuni","name":"Impasto Napoletano","kind":"Pizza","description":"The best pizza in town by reputation; quiet early, packed by 9pm.","vegetarian":true,"vegLabel":"Veg pizzas available","url":"https://www.google.com/maps/search/?api=1&query=Impasto%20Napoletano%2C%20Ostuni%2C%20Italy"},
  {"id":"r34","placeId":"ostuni","city":"ostuni","name":"Borgo Antico Bistro","kind":"Sunset bar & views","description":"Terraced restaurant with a line for sunset drinks -- arrive early for a table.","vegetarian":true,"vegLabel":"Small plates","url":"https://www.google.com/maps/search/?api=1&query=Borgo%20Antico%20Bistro%2C%20Ostuni%2C%20Italy"},
  {"id":"r35","placeId":"ostuni","city":"ostuni","name":"Vinicolo","kind":"Wine bar","description":"Chic little wine bar for regional wines and small plates.","vegetarian":true,"vegLabel":"Small plates","url":"https://www.google.com/maps/search/?api=1&query=Vinicolo%2C%20Ostuni%2C%20Italy"},
  {"id":"r36","placeId":"ostuni","city":"ostuni","name":"Trattoria Sapere E Sapori","kind":"Traditional Puglian","description":"Orecchiette, pestos and local cheeses in the Centro Storico.","vegetarian":true,"vegLabel":"Very veg-friendly","url":"https://www.google.com/maps/search/?api=1&query=Trattoria%20Sapere%20E%20Sapori%2C%20Ostuni%2C%20Italy"},
  {"id":"r37","placeId":"monopoli","city":"monopoli","name":"Porto Rosso – Bar Ristorante Pizzeria","kind":"Open-air pizzeria","description":"Set right over the water; a standout meal on the coast, with fish and local plates in the adjacent ristorante.","vegetarian":true,"vegLabel":"Veg pizzas available","url":"https://www.google.com/maps/search/?api=1&query=Porto%20Rosso%2C%20Monopoli%2C%20Italy"},
  {"id":"r38","placeId":"monopoli","city":"monopoli","name":"CarloQuinto","kind":"Italian & cocktails","description":"A nightly crowd spilling onto the lungomare for Italian food and cocktails overlooking the sea.","vegetarian":true,"vegLabel":"Veg mains available","url":"https://www.google.com/maps/search/?api=1&query=CarloQuinto%2C%20Monopoli%2C%20Italy"},
  {"id":"r39","placeId":"monopoli","city":"monopoli","name":"Trattoria La Locanda dei Mercanti","kind":"Traditional trattoria","description":"Known for spaghetti alle vongole; reserve ahead, it's popular.","vegetarian":true,"vegLabel":"Veg options available","url":"https://www.google.com/maps/search/?api=1&query=Trattoria%20La%20Locanda%20dei%20Mercanti%2C%20Monopoli%2C%20Italy"},
  {"id":"r40","placeId":"monopoli","city":"monopoli","name":"Titti La Pizzicheria","kind":"Deli & small bites","description":"Apulian cheeses and salamis, with small bites served on the terrace.","vegetarian":false,"vegLabel":"Deli, some veg items","url":"https://www.google.com/maps/search/?api=1&query=Titti%20La%20Pizzicheria%2C%20Monopoli%2C%20Italy"},
  {"id":"r41","placeId":"monopoli","city":"monopoli","name":"Tuttoapposto Winebar","kind":"Wine bar","description":"Evening drinks with a view of the port; ask for a table inside.","vegetarian":true,"vegLabel":"Small plates","url":"https://www.google.com/maps/search/?api=1&query=Tuttoapposto%20Winebar%2C%20Monopoli%2C%20Italy"},
  {"id":"r42","placeId":"monopoli","city":"monopoli","name":"La Portavecchia","kind":"Bakery & patisserie","description":"Go-to spot for fresh bread and Apulian pastries.","vegetarian":true,"vegLabel":"Bakery","url":"https://www.google.com/maps/search/?api=1&query=La%20Portavecchia%2C%20Monopoli%2C%20Italy"},
  {"id":"r43","placeId":"monopoli","city":"monopoli","name":"Bella Blu Gelateria","kind":"Gelato","description":"The best gelato in town -- grab a cone for an evening stroll.","vegetarian":true,"vegLabel":"Gelato","url":"https://www.google.com/maps/search/?api=1&query=Bella%20Blu%20Gelateria%2C%20Monopoli%2C%20Italy"},
  {"id":"r44","placeId":"otranto","city":"otranto","name":"L'Ortale Ristoro Salentissimo","kind":"Garden restaurant","description":"A killer garden out back; a relaxed Salento spot, also good for takeaway to the beach.","vegetarian":true,"vegLabel":"Veg options available","url":"https://www.google.com/maps/search/?api=1&query=L'Ortale%20Ristoro%20Salentissimo%2C%20Otranto%2C%20Italy"},
  {"id":"r45","placeId":"otranto","city":"otranto","name":"Vicolo Matto Fishbar","kind":"Seafood","description":"Traveler-recommended fresh seafood spot in the old town.","vegetarian":false,"vegLabel":"Seafood-forward","url":"https://www.google.com/maps/search/?api=1&query=Vicolo%20Matto%20Fishbar%2C%20Otranto%2C%20Italy"},
  {"id":"r46","placeId":"otranto","city":"otranto","name":"Agli Angeli Ribelli","kind":"Traditional Puglian","description":"Traveler-recommended for classic Puglian cuisine.","vegetarian":true,"vegLabel":"Veg options available","url":"https://www.google.com/maps/search/?api=1&query=Agli%20Angeli%20Ribelli%2C%20Otranto%2C%20Italy"},
  {"id":"r47","placeId":"otranto","city":"otranto","name":"Patronale","kind":"Traditional Puglian","description":"Traveler-recommended, known for fresh seafood and Puglian classics.","vegetarian":true,"vegLabel":"Veg options available","url":"https://www.google.com/maps/search/?api=1&query=Patronale%2C%20Otranto%2C%20Italy"},
  {"id":"r48","placeId":"korcula","city":"korcula","name":"Filippi","kind":"Seafront fine dining","description":"Tuna carpaccio, pan-fried sea bass and homemade macaroni on the seafront promenade -- book a sunset table.","vegetarian":true,"vegLabel":"Veg mains available","url":"https://www.google.com/maps/search/?api=1&query=Filippi%2C%20Kor%C4%8Dula%2C%20Croatia"},
  {"id":"r49","placeId":"korcula","city":"korcula","name":"Adio Mare","kind":"Historic family tavern (since 1974)","description":"Hearty Dalmatian meat and fish dishes on an authentic barbecue, in a former shipbuilding workshop.","vegetarian":false,"vegLabel":"Meat & fish focused","url":"https://www.google.com/maps/search/?api=1&query=Adio%20Mare%2C%20Kor%C4%8Dula%2C%20Croatia"},
  {"id":"r50","placeId":"korcula","city":"korcula","name":"LD Restaurant","kind":"Michelin-starred","description":"Seasonal, local ingredients -- look out for scallops and Ston oysters.","vegetarian":true,"vegLabel":"Veg mains available","url":"https://www.google.com/maps/search/?api=1&query=LD%20Restaurant%2C%20Kor%C4%8Dula%2C%20Croatia"},
  {"id":"r51","placeId":"korcula","city":"korcula","name":"Pod Bore","kind":"Vela Luka","description":"Black cuttlefish risotto, a Dalmatian specialty, with harbor views.","vegetarian":false,"vegLabel":"Seafood-forward","url":"https://www.google.com/maps/search/?api=1&query=Pod%20Bore%2C%20Kor%C4%8Dula%2C%20Croatia"},
  {"id":"r52","placeId":"korcula","city":"korcula","name":"Vrnik Arts Club","kind":"Vrnik islet","description":"Homemade food by the town beach, including creamy macaroni with monkfish.","vegetarian":false,"vegLabel":"Some veg options","url":"https://www.google.com/maps/search/?api=1&query=Vrnik%20Arts%20Club%2C%20Kor%C4%8Dula%2C%20Croatia"},
  {"id":"r53","placeId":"mljet","city":"mljet","name":"Barba Ive","kind":"Pomena harbor","description":"One of a handful of harborside restaurants at the National Park entrance.","vegetarian":false,"vegLabel":"Seafood-forward","url":"https://www.google.com/maps/search/?api=1&query=Barba%20Ive%2C%20Mljet%2C%20Croatia"},
  {"id":"r54","placeId":"mljet","city":"mljet","name":"Komarac","kind":"Bar, Pomena","description":"The island's main bar -- day drinks and a night hangout, one of the only options.","vegetarian":true,"vegLabel":"Drinks & snacks","url":"https://www.google.com/maps/search/?api=1&query=Komarac%2C%20Mljet%2C%20Croatia"},
  {"id":"r55","placeId":"makarska","city":"makarska","name":"La Pentola Trattoria Makarska","kind":"Italian & pizza","description":"Well-reviewed trattoria in town, Italian classics and pizza.","vegetarian":true,"vegLabel":"Veg options available","url":"https://www.google.com/maps/search/?api=1&query=La%20Pentola%20Trattoria%2C%20Makarska%2C%20Croatia"},
  {"id":"r56","placeId":"makarska","city":"makarska","name":"Tempera Streetfood & Bar","kind":"Mediterranean","description":"Casual, well-reviewed streetfood-style spot.","vegetarian":true,"vegLabel":"Veg options available","url":"https://www.google.com/maps/search/?api=1&query=Tempera%20Streetfood%20%26%20Bar%2C%20Makarska%2C%20Croatia"},
  {"id":"r57","placeId":"makarska","city":"makarska","name":"Restaurant Cvit Soli","kind":"Dalmatian","description":"A well-reviewed local pick for Dalmatian dishes.","vegetarian":false,"vegLabel":"Seafood & meat focused","url":"https://www.google.com/maps/search/?api=1&query=Restaurant%20Cvit%20Soli%2C%20Makarska%2C%20Croatia"},
  {"id":"r58","placeId":"makarska","city":"makarska","name":"Konoba Jeska","kind":"Traditional Dalmatian","description":"A deeply traditional konoba tucked in a stone alley near Kačić Square.","vegetarian":false,"vegLabel":"Traditional, some veg items","url":"https://www.google.com/maps/search/?api=1&query=Konoba%20Jeska%2C%20Makarska%2C%20Croatia"}
];

// -- Real per-place tips, extracted from the original guide (replaces PLACE_TIPS placeholder). --
const PLACE_TIPS_REAL = {
  "rome": [
    "Trastevere and Centro Storico have no metro. Plan on walking, trams (Line 8) and buses.",
    "Book the Rome–Bari high-speed train early on trenitalia.com or italotreno.com. Advance fares start around €13–20.",
    "Lunch is the big meal; many kitchens close 3–5pm and dinner gets going after 8pm.",
    "Skip picture-menu places near the big sights. Head into Testaccio or deeper Trastevere instead.",
    "Vegetarian heads-up: anchovies sneak into pizzas and pastas, and risotto is often made with meat stock. Ask, or look for the veg symbol."
  ],
  "puglia": [
    "Stay near Bari Centrale. Polignano (Trenitalia), Alberobello (FSE) and Matera (FAL) all use different operators, so check each line.",
    "WhatsApp reservation culture is common at Puglia restaurants. Ask your host to message ahead for you.",
    "Puglian cooking is built on vegetables, olive oil and durum wheat, the most vegetarian-friendly region on the route.",
    "A coperto (cover charge, €1–3 for bread and cutlery) often appears on the bill. That's normal, not a scam.",
    "Useful phrase: 'Sono vegetariano/a' (I'm vegetarian)."
  ],
  "dubrovnik": [
    "Check menu prices in the Old Town before you order; the touristed core has some inflated bills.",
    "The Old Town is fully pedestrian with stairs and slopes. Pack light or pick a property with easy access.",
    "Buses connect Gruž (ferry/bus port), Pile, Ploče and Lapad frequently and cheaply.",
    "Time the walls and Old Town for early morning or evening; midday is hottest and most crowded when cruise ships dock.",
    "Carry your passport on the Bari ferry; ID is checked at check-in and Croatia's EU Entry/Exit System scan applies at the port."
  ],
  "hvar": [
    "Catamarans (Krilo, TP Line, Jadrolinija) dock in Hvar Town. Stay central so your one night isn't eaten by transfers.",
    "Book catamaran legs 1–2 weeks ahead in September; they sell out.",
    "Hvar Town is hilly. The fortress is a short uphill walk with the best sunset on the island.",
    "Order peka 2–3 hours in advance; your hotel can call a konoba for you.",
    "Smaller family konobas sometimes prefer cash; carry some euros."
  ],
  "split": [
    "Veli Varoš and the palace interior both have stairs and narrow lanes. Confirm the exact address and access before booking, especially with luggage.",
    "The ferry/catamaran terminal, bus and train stations cluster just southeast of the Old Town, convenient for arrival and your flight home.",
    "Skip the restaurants right on the Peristyle; they charge for the setting. Eat in Varoš or the back streets instead.",
    "September runs noticeably cheaper than peak summer with excellent weather and a swimmable sea.",
    "Tourist tax is about €1.86–2.50 per person per night, paid locally."
  ],
  "ostuni": [
    "The historic center is a ZTL (limited traffic zone) -- if you're driving, you'll park outside and walk in.",
    "Many countryside masserie have Saturday-only check-ins with week-long minimum stays; check before booking.",
    "September to October is the sweet spot: still warm enough to swim, well past peak-summer crowds.",
    "The best view of the White City is from the Corso Vittorio Emanuele II viewpoint on the way out of town.",
    "Book countryside restaurant tables (Masseria Moroseta and similar) ahead -- reservations are required."
  ],
  "monopoli": [
    "The Old Town has no car access; if you're driving, confirm your accommodation's parking situation first.",
    "Trains from Bari Centrale run every 30-50 minutes and cost around €3.30 -- an easy day trip or arrival point.",
    "Siesta is real here: expect shops and some restaurants to close mid-afternoon.",
    "The lungomare comes alive right before and after sunset -- time a stroll for then.",
    "Popular trattorias (like La Locanda dei Mercanti) book out; reserve a day or two ahead in season."
  ],
  "otranto": [
    "It's Italy's easternmost town, so it's the place to watch sunrise, not sunset, over the water.",
    "The Castello Aragonese charges an entrance fee (around €12); the city walls and beach walk are free.",
    "City beaches are steps from the Old Town, but Baia dei Turchi and the Alimini Lakes are worth the short trip out.",
    "Grotta della Poesia (about 30 minutes away) is a legitimate swimming spot, not just a viewpoint -- bring a suit.",
    "Fall (September-October) trades a few degrees of heat for dramatically thinner crowds."
  ],
  "korcula": [
    "It's pronounced KOR-chew-lah. Marco Polo's disputed birthplace, and the island runs with that theme.",
    "The old town is compact and walkable; a water taxi from the harbor gets you out to Badija, Stupe or Vrnik islets.",
    "Local wines to look for: Pošip and Grk (white), Plavac (red) -- Lumbarda's vineyards produce both.",
    "Fine-dining tables (Filippi, LD Restaurant) fill up in high season; reserve ahead, especially for a sunset seating.",
    "Ferries and catamarans connect to both Split and Dubrovnik, so it slots in either direction of the Croatia leg."
  ],
  "mljet": [
    "There's no real town center -- Pomena (by the National Park entrance) and Sobra (the ferry port) are the two hubs.",
    "Mljet National Park has its own entrance fee, covering the saltwater lakes and the boat to St. Mary's Islet.",
    "Dining is limited island-wide; Hotel Odisej and a handful of harbor konobas in Pomena are the main options.",
    "Bring cash for smaller places -- card acceptance is patchier here than on the mainland or bigger islands.",
    "Rent a bike to circle the lakes; it's the easiest way to see the park without a car."
  ],
  "makarska": [
    "The Riva promenade is the social center of town -- come for an evening walk and gelato regardless of where you eat.",
    "The Biokovo cable car (from near town) is a quick way to a genuinely dramatic mountain view over the coast.",
    "Makarska Riviera beaches (including Brela's Punta Rata, a short drive north) are pebble, not sand -- water shoes help.",
    "It's a common ferry/catamaran hub for Hvar and Brac, so it can work as a transit point as well as a stay.",
    "Restaurants right on the Riva charge for the view; a block or two back tends to be better value."
  ]
};
Object.assign(PLACE_TIPS, PLACE_TIPS_REAL);
