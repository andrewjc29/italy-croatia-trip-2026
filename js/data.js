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

const SEED_DATA = {
  meta: {
    tripName: "Italy + Croatia 2026",
    startDate: null,
    numDays: 12,
    homeAirport: "SFO",
    travelers: ["Andrew", "Partner"],
    budgetPerPersonLow: 3000,
    budgetPerPersonHigh: 4000,
    routeNotes: "Route B confirmed: Rome, then Puglia/Bari, then Croatia (Dubrovnik-Hvar-Split or reverse). Open-jaw flights: SFO-Rome nonstop out, Dubrovnik/Split-SFO one-stop back. No rental car -- flights, trains, ferries, catamarans, buses only."
  },
  bookings: [],
  activities: [],
  restaurants: [],
  packing: [],
  documents: [],
  notesLog: []
};

// -- Bookings: lodging + transport legs, day = day index (1-based) --
SEED_DATA.bookings.push(
  { id: "bk1", category: "flight", title: "SFO -> Rome (nonstop)", fromCity: "SFO", toCity: "rome", day: 1, endDay: 1, time: "", provider: "United / ITA Airways", confirmation: "", cost: 500, currency: "USD", link: "https://www.google.com/travel/flights", status: "idea", notes: "~12h nonstop. Est $400-600pp. Avoid Basic Economy to keep checked bag free." },
  { id: "bk2", category: "lodging", title: "Rome hotel", city: "rome", day: 1, endDay: 3, time: "", provider: "", confirmation: "", cost: 200, currency: "USD", link: "", status: "idea", notes: "2 nights. Trastevere or Testaccio area. Est $80-120/night pp." },
  { id: "bk3", category: "train", title: "Rome -> Bari (high-speed)", fromCity: "rome", toCity: "bari", day: 3, endDay: 3, time: "", provider: "Trenitalia Frecciargento / Italo", confirmation: "", cost: 30, currency: "EUR", link: "https://www.trenitalia.com", status: "idea", notes: "~4h direct. From EUR13-20 booked ahead, EUR30-60 closer to travel. ~10 trains/day." },
  { id: "bk4", category: "lodging", title: "Bari / Puglia base", city: "bari", day: 3, endDay: 7, time: "", provider: "Airbnb", confirmation: "", cost: 220, currency: "USD", link: "", status: "idea", notes: "4 nights. Base for Polignano, Alberobello, Matera, Lecce day trips. Est $40-70/night pp." },
  { id: "bk5", category: "ferry", title: "Bari -> Dubrovnik ferry (Jadrolinija Line 54)", fromCity: "bari", toCity: "dubrovnik", day: 7, endDay: 7, time: "11:00", provider: "Jadrolinija", confirmation: "", cost: 85, currency: "EUR", link: "https://www.jadrolinija.hr/en/search-buy-ticket", status: "idea", notes: "RECOMMENDED crossing. Sept 1-15: Fri/Sat. Sept 16+: Tue/Thu/Sat 11:00am. 7-10hr daytime crossing. ~EUR78-90pp, bags included." },
  { id: "bk6", category: "other", title: "Alt: Ryanair Bari -> Dubrovnik flight", fromCity: "bari", toCity: "dubrovnik", day: 7, endDay: 7, time: "", provider: "Ryanair", confirmation: "", cost: 100, currency: "USD", link: "https://www.ryanair.com", status: "idea", notes: "Backup to the ferry. 45 min. Base fare $30-60 + checked bag EUR40-55. Total ~$75-120pp. More flexible, multiple days/week." },
  { id: "bk7", category: "lodging", title: "Dubrovnik hotel", city: "dubrovnik", day: 7, endDay: 9, time: "", provider: "", confirmation: "", cost: 400, currency: "USD", link: "", status: "idea", notes: "2 nights. Boutique hotel. Est $60-100/night pp." },
  { id: "bk8", category: "catamaran", title: "Dubrovnik -> Hvar catamaran", fromCity: "dubrovnik", toCity: "hvar", day: 9, endDay: 9, time: "", provider: "Krilo / TP Line / Jadrolinija", confirmation: "", cost: 50, currency: "EUR", link: "https://www.krilo.hr", status: "idea", notes: "~3h with island stops. Book 1-2 weeks ahead in September, these sell out." },
  { id: "bk9", category: "lodging", title: "Hvar stay", city: "hvar", day: 9, endDay: 10, time: "", provider: "", confirmation: "", cost: 80, currency: "USD", link: "", status: "idea", notes: "1 night overnight on the island." },
  { id: "bk10", category: "catamaran", title: "Hvar -> Split catamaran", fromCity: "hvar", toCity: "split", day: 10, endDay: 10, time: "", provider: "Krilo / TP Line", confirmation: "", cost: 30, currency: "EUR", link: "https://www.tp-line.hr", status: "idea", notes: "~1h, multiple daily departures." },
  { id: "bk11", category: "lodging", title: "Split hotel", city: "split", day: 10, endDay: 12, time: "", provider: "", confirmation: "", cost: 200, currency: "USD", link: "", status: "idea", notes: "2 nights." },
  { id: "bk12", category: "flight", title: "Split/Dubrovnik -> SFO (1 stop)", fromCity: "split", toCity: "SFO", day: 12, endDay: 12, time: "", provider: "", confirmation: "", cost: 750, currency: "USD", link: "https://www.google.com/travel/flights", status: "idea", notes: "One stop via European hub, ~14-18h. Est $600-900pp. Whichever city ends the itinerary is the return departure city -- no backtracking." }
);

// -- Activities: day-specific sights, meals, experiences, free time --
SEED_DATA.activities.push(
  { id: "a1", day: 1, city: "rome", time: "", title: "Jet lag buffer -- walk Trastevere", type: "free", cost: 0, status: "idea", notes: "Slow lunch, early dinner. Arrive morning off the nonstop." },
  { id: "a2", day: 2, city: "rome", time: "09:00", title: "Colosseum + Forum + Pantheon", type: "sight", cost: 30, status: "idea", notes: "Optional Vatican in the morning instead." },
  { id: "a3", day: 2, city: "rome", time: "13:00", title: "Lunch in Trastevere", type: "meal", cost: 25, status: "idea", notes: "Cacio e pepe, supplì.", vegetarianFriendly: true },
  { id: "a4", day: 2, city: "rome", time: "20:00", title: "Dinner in Testaccio", type: "meal", cost: 35, status: "idea", notes: "Authentic, less touristy neighborhood.", vegetarianFriendly: true },
  { id: "a5", day: 4, city: "bari", time: "10:00", title: "Bari Vecchia + orecchiette making", type: "experience", cost: 20, status: "idea", notes: "Morning in old town." },
  { id: "a6", day: 4, city: "polignano", time: "14:00", title: "Polignano a Mare -- cliffs + swim", type: "sight", cost: 0, status: "idea", notes: "30 min regional train from Bari. Return to Bari for dinner." },
  { id: "a7", day: 5, city: "alberobello", time: "09:00", title: "Alberobello trulli + Ostuni", type: "sight", cost: 0, status: "idea", notes: "Option A day trip. FSE regional train/bus ~1h from Bari." },
  { id: "a8", day: 5, city: "matera", time: "09:00", title: "Matera cave dwellings", type: "sight", cost: 0, status: "idea", notes: "Option B day trip instead of Alberobello/Ostuni. ~1h by train/bus from Bari." },
  { id: "a9", day: 6, city: "lecce", time: "09:00", title: "Lecce -- Baroque architecture + pasticciotto", type: "sight", cost: 0, status: "idea", notes: "1.5h Trenitalia regional train. OR a free/slow day in Bari (cooking class, beach, long lunch) as buffer before Croatia." },
  { id: "a10", day: 8, city: "dubrovnik", time: "", title: "Old town walls + kayaking", type: "experience", cost: 40, status: "idea", notes: "" },
  { id: "a11", day: 11, city: "split", time: "", title: "Diocletian's Palace old town", type: "sight", cost: 0, status: "idea", notes: "" }
);

// -- Restaurant / food reference guide (not day-scheduled -- use "add to day" in the UI) --
SEED_DATA.restaurants.push(
  { id: "r1", city: "rome", name: "Sant'Eustachio", dish: "Espresso", vegetarian: true, notes: "Famous, near the Pantheon." },
  { id: "r2", city: "rome", name: "(shortlist TBD)", dish: "Carbonara / Cacio e pepe / Supplì", vegetarian: false, notes: "Trastevere and Testaccio neighborhoods for authentic food." },
  { id: "r3", city: "bari", name: "(shortlist TBD)", dish: "Raw seafood crudo, bombette, sea urchin", vegetarian: false, notes: "Bari Vecchia street food scene, omnivore highlights." },
  { id: "r4", city: "bari", name: "(shortlist TBD)", dish: "Fave e cicoria, burrata, orecchiette cime di rapa, panzerotti, focaccia Barese, sgagliozze", vegetarian: true, notes: "Puglia is a vegetarian paradise -- well served everywhere in this region." },
  { id: "r5", city: "lecce", name: "(shortlist TBD)", dish: "Pasticciotto", vegetarian: true, notes: "Lecce specialty custard pastry." },
  { id: "r6", city: "dubrovnik", name: "(shortlist TBD)", dish: "Peka (slow-roasted, order 2-3h ahead)", vegetarian: false, notes: "Ask your accommodation host to recommend a place and call ahead." },
  { id: "r7", city: "split", name: "(shortlist TBD)", dish: "Soparnik, black risotto, grilled fish", vegetarian: false, notes: "For vegetarian: grilled vegetables, salads, cheese plates, truffle dishes if visiting Istria." }
);

// -- Packing list --
SEED_DATA.packing.push(
  { id: "p1", item: "Passport (valid, no visa needed under 90 days)", category: "Documents", checked: false },
  { id: "p2", item: "Booking confirmations (offline copies)", category: "Documents", checked: false },
  { id: "p3", item: "Credit card with no foreign transaction fee", category: "Documents", checked: false },
  { id: "p4", item: "Offline maps downloaded (Google Maps / Maps.me)", category: "Documents", checked: false },
  { id: "p5", item: "Layers for cool evenings", category: "Clothing", checked: false },
  { id: "p6", item: "Swimwear", category: "Clothing", checked: false },
  { id: "p7", item: "Comfortable walking shoes", category: "Clothing", checked: false },
  { id: "p8", item: "EU power adapter", category: "Gear", checked: false },
  { id: "p9", item: "Portable charger", category: "Gear", checked: false },
  { id: "p10", item: "Sunscreen", category: "Health", checked: false }
);

SEED_DATA.notesLog.push(
  { id: "n1", text: "Trip plan imported from research doc (2026-06-24). Route B confirmed: Italy first, Croatia second. Open decisions: exact September dates, points/miles check, final Croatia direction (Dubrovnik-first vs Split-first, depends on ferry schedule).", ts: new Date().toISOString() }
);
