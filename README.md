# Italy + Croatia 2026 trip planner

A small, fully interactive planning site for a September 2026 trip:
Rome, Puglia/Bari, and Croatia (Dubrovnik, Hvar, Split).

Live site: https://andrewjc29.github.io/italy-croatia-trip-2026/

## How it works

Everything is data-driven. There is no hardcoded itinerary page -- the
Itinerary tab is generated from whatever is in **Bookings** (hotel stays,
flights, trains, ferries, catamarans) and **Activities** (meals, sights,
day trips). Add a hotel stay with check-in/check-out days and the
itinerary immediately shows that city and lodging for those days. Add a
dinner spot to a specific day from the Food tab or the Itinerary tab
directly, and it appears in that day's list right away. Change the trip
start date on the Dashboard and every day's calendar date recalculates.

No git push is needed for any of this -- it all happens live in the
browser and is saved automatically (localStorage always, plus the shared
Google Sheet backend once you turn it on, see `apps-script/README.md`).

## Structure

- `index.html` -- page shell and tab navigation
- `css/styles.css` -- all styling
- `js/data.js` -- starting seed data only (city list + the research
  already done: draft flights/trains/ferries, day-trip ideas, food guide,
  packing list). Never touched again once the app is running.
- `js/store.js` -- the data layer: local + remote persistence, itinerary
  derivation logic
- `js/app.js` -- rendering and all the add/edit forms for every tab
- `js/config.js` -- the one line you edit to turn on shared sync
- `apps-script/` -- optional Google Sheet backend for cross-device sync

## Running locally

Just open `index.html` in a browser, or serve the folder:

    cd italy-croatia-trip-2026
    python3 -m http.server 8000

then visit http://localhost:8000

## Updating content

Everything (itinerary, bookings, packing, restaurants, notes) is editable
directly on the live site -- no need to touch these files again unless you
want to change styling or add a new feature.
