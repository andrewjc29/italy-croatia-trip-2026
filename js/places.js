// Optional Google Places auto-fill: given a name + city, looks up the real
// place and returns a short category + description you can drop into a
// restaurant / thing-to-do form. No-ops entirely if GOOGLE_MAPS_API_KEY
// (js/config.js) is left blank.
//
// Uses the Maps JavaScript API client library (google.maps.places.Place),
// not a direct REST fetch -- Google's Places REST endpoints don't send
// CORS headers for browser calls, but the JS SDK is built for this and
// works client-side with a referrer-restricted key.

const PlacesLookup = (() => {
  let loadPromise = null;

  function isConfigured() {
    return typeof GOOGLE_MAPS_API_KEY === "string" && GOOGLE_MAPS_API_KEY.trim().length > 0;
  }

  function loadLibrary() {
    if (loadPromise) return loadPromise;
    loadPromise = new Promise((resolve, reject) => {
      if (!isConfigured()) { reject(new Error("no-key")); return; }
      if (window.google && window.google.maps && window.google.maps.places) { resolve(); return; }
      const script = document.createElement("script");
      script.src = "https://maps.googleapis.com/maps/api/js?key=" + encodeURIComponent(GOOGLE_MAPS_API_KEY) + "&libraries=places&v=weekly&loading=async";
      script.async = true;
      script.onerror = () => reject(new Error("Failed to load Google Maps script -- check the API key and referrer restrictions."));
      script.onload = () => {
        if (window.google && window.google.maps && window.google.maps.places) resolve();
        else reject(new Error("Google Maps loaded but the Places library is missing -- enable 'Maps JavaScript API' and 'Places API (New)' for this key."));
      };
      document.head.appendChild(script);
    });
    return loadPromise;
  }

  // Turns a Places "type" like "italian_restaurant" or "tourist_attraction"
  // into a short human label, e.g. "Italian restaurant".
  function humanizeType(type) {
    if (!type) return "";
    const skip = new Set(["point_of_interest", "establishment", "food", "store"]);
    if (skip.has(type)) return "";
    return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  // name: place name to search for. cityLabel: e.g. "Rome, Italy" (from
  // CITY_LABEL_MAP). Returns { kind, description, url } or throws.
  async function lookup(name, cityLabel) {
    await loadLibrary();
    const { Place } = await google.maps.importLibrary("places");
    const query = [name, cityLabel].filter(Boolean).join(", ");
    const results = await Place.searchByText({
      textQuery: query,
      fields: ["displayName", "editorialSummary", "types", "googleMapsURI", "formattedAddress"],
      maxResultCount: 1
    });
    const places = results && results.places;
    if (!places || !places.length) throw new Error('No Google Places result found for "' + query + '".');
    const p = places[0];
    const kind = humanizeType((p.types || []).find((t) => humanizeType(t))) || "";
    return {
      kind: kind,
      description: p.editorialSummary || "",
      url: p.googleMapsURI || "",
      address: p.formattedAddress || ""
    };
  }

  return { isConfigured, lookup };
})();
