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
  { id: "split",       name: "Split",              country: "Croatia", lat: 43.5081, lng: 16.4402 }
];

// -- Maps link helpers: every hotel/restaurant/thing-to-do link is a Google
// Maps search built from its name + place, so it always resolves. --
const CITY_LABEL_MAP = {
  rome: "Rome, Italy", bari: "Bari, Italy", polignano: "Polignano a Mare, Italy",
  alberobello: "Alberobello, Italy", matera: "Matera, Italy", lecce: "Lecce, Italy",
  dubrovnik: "Dubrovnik, Croatia", hvar: "Hvar, Croatia", split: "Split, Croatia"
};
const PLACE_LABEL_MAP = {
  rome: "Rome, Italy", puglia: "Bari, Italy", dubrovnik: "Dubrovnik, Croatia",
  hvar: "Hvar, Croatia", split: "Split, Croatia"
};
function mapsUrl(query) {
  return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(query);
}
function mapsUrlForCity(name, cityId) {
  return mapsUrl([name, CITY_LABEL_MAP[cityId] || ""].filter(Boolean).join(", "));
}
function mapsUrlForPlace(name, extra, placeId) {
  return mapsUrl([name, extra, PLACE_LABEL_MAP[placeId] || ""].filter(Boolean).join(", "));
}

// Mirrors the per-city accent colors in css/styles.css (#rome, #puglia, ...).
// Used for the timeline dot colors in the itinerary editor, which lives outside
// any single place's scoped CSS variables.
const PLACE_ACCENT = {
  rome: "#c0623a",
  puglia: "#0f8a86",
  dubrovnik: "#1f6f99",
  hvar: "#6f8f5a",
  split: "#106b86"
};

// Typical September climate (F), used until a live forecast is close enough to
// be meaningful. Rough averages from climate-normal sources, not a specific year.
const SEPT_CLIMATE_NORMALS = {
  rome: { high: 78, low: 60, sea: null, note: "Mild and mostly dry, occasional showers late month." },
  bari: { high: 82, low: 66, sea: 74, note: "Warm and mostly dry, the easiest weather of the trip." },
  dubrovnik: { high: 74, low: 63, sea: 76, note: "Warm days, comfortable nights, cooling toward month's end." },
  hvar: { high: 79, low: 64, sea: 73, note: "Similar to Split with an island breeze." },
  split: { high: 79, low: 64, sea: 73, note: "Warm days, comfortable nights." }
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
  notesLog: []
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
    title: "Split", titleEm: "Diocletian's city", blurb: "Stay in <strong>Veli Varo\u0161</strong>, the stone neighborhood on Marjan Hill's slope, five to ten minutes from Diocletian's Palace and the Riva but quieter and better value, with the best local konobas and wine bars. The palace interior is atmospheric but the noisiest at night." }
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
    "description": "Book the combined timed ticket online and go early. The Forum and Palatine Hill are included and far quieter than the arena.",
    "url": "https://www.google.com/maps/search/?api=1&query=Colosseum%2C%20Forum%20%26%20Palatine%2C%20Rome%2C%20Italy"
  },
  {
    "id": "td2",
    "placeId": "rome",
    "city": "rome",
    "name": "Roman Forum at golden hour",
    "kind": "Walk among ruins",
    "description": "The political heart of the ancient city. Enter from the Palatine side late afternoon when the stone turns amber and crowds thin.",
    "url": "https://www.google.com/maps/search/?api=1&query=Roman%20Forum%20at%20golden%20hour%2C%20Rome%2C%20Italy"
  },
  {
    "id": "td3",
    "placeId": "rome",
    "city": "rome",
    "name": "Pantheon",
    "kind": "Free to enter",
    "description": "The best-preserved Roman building still standing, its dome open to the sky. Pair with espresso at nearby Sant'Eustachio.",
    "url": "https://www.google.com/maps/search/?api=1&query=Pantheon%2C%20Rome%2C%20Italy"
  },
  {
    "id": "td4",
    "placeId": "rome",
    "city": "rome",
    "name": "Piazza Navona",
    "kind": "Baroque heart",
    "description": "Bernini's fountains and a film-set square of cafes and street artists. A short walk from the Pantheon through the centro.",
    "url": "https://www.google.com/maps/search/?api=1&query=Piazza%20Navona%2C%20Rome%2C%20Italy"
  },
  {
    "id": "td5",
    "placeId": "rome",
    "city": "rome",
    "name": "Vatican Museums & St Peter's",
    "kind": "Optional morning",
    "description": "If you want it, book the earliest slot or a skip-the-line tour. Otherwise trade it for a slower Trastevere morning.",
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
    "description": "Whitewashed town on limestone cliffs over a turquoise cove. Swim at Lama Monachile, then sit with a coffee on the terraces above.",
    "url": "https://www.google.com/maps/search/?api=1&query=Polignano%20a%20Mare%2C%20Polignano%20a%20Mare%2C%20Italy"
  },
  {
    "id": "td8",
    "placeId": "puglia",
    "city": "alberobello",
    "name": "Alberobello trulli",
    "kind": "~1 hr · FSE line",
    "description": "UNESCO village of conical stone houses. Wander the Rione Monti and Aia Piccola districts early, before the tour buses.",
    "url": "https://www.google.com/maps/search/?api=1&query=Alberobello%20trulli%2C%20Alberobello%2C%20Italy"
  },
  {
    "id": "td9",
    "placeId": "puglia",
    "city": "matera",
    "name": "Matera's Sassi",
    "kind": "~1 hr · FAL line",
    "description": "Ancient cave dwellings carved into a ravine, glowing at dusk. One of the oldest continuously inhabited places on earth.",
    "url": "https://www.google.com/maps/search/?api=1&query=Matera's%20Sassi%2C%20Matera%2C%20Italy"
  },
  {
    "id": "td10",
    "placeId": "puglia",
    "city": "lecce",
    "name": "Lecce, the Baroque south",
    "kind": "~1.5 hr by train",
    "description": "Honey-colored Baroque facades and the famous pasticciotto custard pastry. The 'Florence of the south.'",
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
    "description": "Learn to hand-roll orecchiette with a local before feasting on the result. The most memorable Bari afternoon.",
    "url": "https://www.google.com/maps/search/?api=1&query=Orecchiette%20cooking%20class%2C%20Bari%2C%20Italy"
  },
  {
    "id": "td13",
    "placeId": "dubrovnik",
    "city": "dubrovnik",
    "name": "Walk the City Walls",
    "kind": "The icon",
    "description": "A circuit of the medieval ramparts above terracotta roofs and the Adriatic. Go at opening or late afternoon to dodge heat and cruise crowds.",
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
    "description": "A ten-minute ferry to a forested islet with peacocks, a botanical garden and quiet swimming coves. An easy half-day escape.",
    "url": "https://www.google.com/maps/search/?api=1&query=Lokrum%20Island%2C%20Dubrovnik%2C%20Croatia"
  },
  {
    "id": "td16",
    "placeId": "dubrovnik",
    "city": "dubrovnik",
    "name": "Mount Srđ cable car",
    "kind": "Sunset",
    "description": "Ride up for the panoramic view over the walled city and islands. Best timed for golden hour, with a drink at the top.",
    "url": "https://www.google.com/maps/search/?api=1&query=Mount%20Sr%C4%91%20cable%20car%2C%20Dubrovnik%2C%20Croatia"
  },
  {
    "id": "td17",
    "placeId": "dubrovnik",
    "city": "dubrovnik",
    "name": "Sea kayak under the walls",
    "kind": "On the water",
    "description": "Paddle out from Pile beneath the ramparts to a sea cave and Lokrum. The classic active afternoon; sunset trips available.",
    "url": "https://www.google.com/maps/search/?api=1&query=Sea%20kayak%20under%20the%20walls%2C%20Dubrovnik%2C%20Croatia"
  },
  {
    "id": "td18",
    "placeId": "dubrovnik",
    "city": "dubrovnik",
    "name": "Game of Thrones film spots",
    "kind": "Pop culture",
    "description": "The Old Town doubled as King's Landing. Self-guide the steps and squares, or take a themed walking tour.",
    "url": "https://www.google.com/maps/search/?api=1&query=Game%20of%20Thrones%20film%20spots%2C%20Dubrovnik%2C%20Croatia"
  },
  {
    "id": "td19",
    "placeId": "hvar",
    "city": "hvar",
    "name": "Španjola (Spanish) Fortress",
    "kind": "The must-do",
    "description": "A short uphill walk to the island's signature view: orange rooftops, the harbor and the Pakleni Islands beyond. Best at sunset.",
    "url": "https://www.google.com/maps/search/?api=1&query=%C5%A0panjola%20(Spanish)%20Fortress%2C%20Hvar%2C%20Croatia"
  },
  {
    "id": "td20",
    "placeId": "hvar",
    "city": "hvar",
    "name": "Pakleni Islands",
    "kind": "On the water",
    "description": "A string of islets minutes offshore with clear lagoons and hidden coves. Hop a taxi-boat from the harbor for a swim.",
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
    "description": "The island is known for its vineyards. Do a tasting in town or a short tour into the hills for local Plavac and Bogdanuša.",
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
    "description": "A 1,700-year-old Roman palace still lived in today. Walk the Peristyle, descend into the cellars, and get lost in the marble lanes.",
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
    "description": "The forested peninsula above town. A morning walk to the viewpoints over Split and the islands, with quiet chapels along the way.",
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
    "description": "A clifftop fortress just outside town with sweeping coastal views (and more Game of Thrones scenery). Quick bus from the center.",
    "url": "https://www.google.com/maps/search/?api=1&query=Klis%20Fortress%2C%20Split%2C%20Croatia"
  }
];

// -- Restaurants: replaces the earlier placeholder list with the real 30-spot guide. --
SEED_DATA.restaurants = [
  {
    "id": "r1",
    "placeId": "rome",
    "city": "rome",
    "name": "Il Duca",
    "kind": "Trastevere · trattoria",
    "description": "Unassuming front, excellent homemade pasta. Fried artichokes, cacio e pepe and a standout truffle ravioli.",
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
    "description": "Loud, homely, famous for pizza. Feels like a huge Italian family dinner; loved by locals and visitors.",
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
    "description": "Herb-forward, fresh and modern. Light lunches, brunch and aperitivo built around aromatic plants. A vegetarian home base.",
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
    "description": "Warm Roman trattoria where the owner greets guests himself. Mushroom-and-truffle pasta and a praised cacio e pepe.",
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
    "description": "Creamy burrata, marinated antipasti and a standout orecchiette con cime di rapa with a peppery bite. Book ahead.",
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
    "description": "Laid-back local favorite in the old town. Burrata, orecchiette in rich tomato sauce, seasonal contorni. Stone walls, buzzy vibe.",
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
    "description": "Fried dough oozing tomato and mozzarella, plus cherry-tomato focaccia. Grab from old-town bakeries and eat on the move.",
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
    "description": "Octopus-focused trattoria in the old-town lanes. Seafood done with heart for the one of you who eats everything.",
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
    "description": "A creamery near Bari making burrata, mozzarella and pecorino in the classic Pugliese tradition. Build your own cheese-and-wine board.",
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
    "description": "Dubrovnik's most celebrated restaurant, on terraces above the sea with fortress views. Fine vegetarian dishes alongside the seafood. The special-occasion splurge.",
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
    "description": "The city's beloved all-vegetarian/vegan spot. Inventive, globally-inspired plates and a daily-changing menu. Reserve, it's small.",
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
    "description": "Twenty years in the center, light pastas, homemade gnocchi and a real selection of vegetarian dishes. Local olive oil on every table.",
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
    "description": "The town's Neapolitan-style pizza, light dough, leopard-spotted crust. The pumpkin-cream pizza is a vegetarian standout.",
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
    "description": "Snug bar for Croatian wine flights with simple cheese and charcuterie plates. The relaxed end to a wall-walking day.",
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
    "description": "Candlelit stone tavern between the square and the fortress. Dalmatian classics including a praised vegetarian stuffed-pepper dish. So traditional they don't sell Coca-Cola.",
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
    "description": "Family-run in a renovated wine cellar with a rooftop terrace facing the cathedral and fortress. Ingredients from the owner's farm.",
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
    "description": "Reliable wood-fired pizza right on the square, with a calm sea view and the bell tower marking the hour. An easy veg lunch.",
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
    "description": "Hvar's seafood is the draw: grilled whole fish, black risotto and octopus. Ask which fish came in that morning.",
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
    "description": "Meat or vegetables slow-roasted under a bell lid. Must be ordered 2–3 hours ahead; ask your hotel to call a konoba.",
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
    "description": "Tiny counter-service spot where the chalkboard changes daily, usually one fish, one meat, one vegetarian. Everything fresh. Arrive at noon.",
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
    "description": "Genuine Dalmatian cooking in the back streets, pašticada with gnocchi, peka, grilled fish. Popular with locals; book for dinner.",
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
    "description": "Varoš has a wave of modern kitchens doing creative, vegetable-forward Dalmatian plates. Good for the veg half of the table.",
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
    "description": "Just outside the tourist zone, so better prices. Food from Hvar island, seafood, grilled meats, and an excellent octopus peka.",
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
    "description": "Varoš does specialty coffee by day and intimate Croatian wine by night. The perfect bookends to a relaxed final stop.",
    "vegetarian": true,
    "vegLabel": "Snacks & small plates",
    "url": "https://www.google.com/maps/search/?api=1&query=Stow%20Coffee%20%26%20Monika's%20Wine%20Bar%2C%20Split%2C%20Croatia"
  }
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
  ]
};
Object.assign(PLACE_TIPS, PLACE_TIPS_REAL);
