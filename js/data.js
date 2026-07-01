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

SEED_DATA.notesLog.push(
  { id: "n1", text: "Trip plan imported from research doc (2026-06-24). Route B confirmed: Italy first, Croatia second. Open decisions: exact September dates, points/miles check, final Croatia direction (Dubrovnik-first vs Split-first, depends on ferry schedule).", ts: new Date().toISOString() }
);

// -- Places: the blog-style sections. Each pulls its bookings/activities/
// restaurants by matching city id. Accent colors carried over from the
// original travel guide's per-city theming. --
const PLACES = [
  { id: "rome", label: "Rome", nights: "2 nt", cityIds: ["rome"], image: "assets/images/rome.jpg",
    title: "Rome", titleEm: "the Eternal City", blurb: "Two nights to shake off jet lag: ancient ruins in the morning, long lunches, a slow walk through Trastevere at golden hour." },
  { id: "puglia", label: "Puglia", nights: "4 nt", cityIds: ["bari", "polignano", "alberobello", "matera", "lecce"], image: "assets/images/bari.jpg",
    title: "Puglia", titleEm: "the heel of Italy", blurb: "Four nights based in Bari, with day trips to whitewashed towns, cave dwellings, and cliffside swimming. Naturally vegetarian-friendly, course after course." },
  { id: "dubrovnik", label: "Dubrovnik", nights: "2 nt", cityIds: ["dubrovnik"], image: "assets/images/dubrovnik.jpg",
    title: "Dubrovnik", titleEm: "the Pearl of the Adriatic", blurb: "Old town walls, kayaking the coastline, and a first taste of Croatia after the ferry crossing from Bari." },
  { id: "hvar", label: "Hvar", nights: "1 nt", cityIds: ["hvar"], image: "assets/images/hvar.jpg",
    title: "Hvar", titleEm: "island time", blurb: "One overnight on the island, reached by catamaran, with lavender hills and a slower pace than the mainland cities." },
  { id: "split", label: "Split", nights: "2 nt", cityIds: ["split"], image: "assets/images/split.jpg",
    title: "Split", titleEm: "Diocletian's city", blurb: "Two nights in a Roman palace turned living city, before the flight home." }
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
  { id: "pc1", phase: "Now (6 months out)", text: "Check credit cards and airline accounts for points, miles, travel credits, and foreign transaction fee status.", done: false },
  { id: "pc2", phase: "Now (6 months out)", text: "Pick exact September dates (early vs mid vs late). Late September has slightly lower prices and thinner crowds.", done: false },
  { id: "pc3", phase: "Now (6 months out)", text: "Set up price alerts on Google Flights for the open-jaw: SFO to Rome + Dubrovnik or Split to SFO.", done: false },
  { id: "pc4", phase: "Now (6 months out)", text: "Confirm the Croatia direction against the Jadrolinija ferry schedule. This decides which city you book first and which is your departure airport.", done: false },
  { id: "pc5", phase: "3-4 months before", text: "Book transatlantic flights (open-jaw). Best prices typically 2-3 months ahead for September.", done: false },
  { id: "pc6", phase: "3-4 months before", text: "Book Rome to Bari train on trenitalia.com or italotreno.com. Cheapest fares go fast.", done: false },
  { id: "pc7", phase: "3-4 months before", text: "Book the Bari to Dubrovnik (or Split) ferry on jadrolinija.hr.", done: false },
  { id: "pc8", phase: "2-3 months before", text: "Book accommodation. Boutique hotels for Rome and Dubrovnik, Airbnbs for Puglia and Split/Hvar.", done: false },
  { id: "pc9", phase: "2-3 months before", text: "Book Ryanair Bari to Dubrovnik if choosing flight over ferry, add checked bag at booking for the lowest fee.", done: false },
  { id: "pc10", phase: "2-3 months before", text: "Research and shortlist restaurants. Reserve any splurge or tasting-menu dinners in Rome and Puglia.", done: false },
  { id: "pc11", phase: "1-2 months before", text: "Book catamaran tickets for the Croatian island hops (Krilo, TP Line, Jadrolinija). These sell out in September.", done: false },
  { id: "pc12", phase: "1-2 months before", text: "Book any day-trip activities: cooking class in Puglia, kayaking in Dubrovnik, wine tour.", done: false },
  { id: "pc13", phase: "1-2 months before", text: "Confirm all transport connections and save confirmations somewhere both of you can reach.", done: false },
  { id: "pc14", phase: "1-2 weeks before", text: "Download offline maps (Google Maps or Maps.me) for every city on the route.", done: false },
  { id: "pc15", phase: "1-2 weeks before", text: "Notify your bank and credit cards of travel dates.", done: false },
  { id: "pc16", phase: "1-2 weeks before", text: "Check ETIAS status for your September 2026 dates, visa-exempt US travelers will need it once it launches.", done: false },
  { id: "pc17", phase: "1-2 weeks before", text: "Final packing: layers for evenings, swimwear, comfortable walking shoes.", done: false }
];
