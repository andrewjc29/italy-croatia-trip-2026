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
        // With loading=async, google.maps.places is NOT attached yet at onload.
        // It is pulled in on demand via importLibrary("places") in lookup().
        // Only require that the core Maps object is present here.
        if (window.google && window.google.maps) resolve();
        else reject(new Error("Google Maps failed to initialize -- check the API key and that 'Maps JavaScript API' is enabled."));
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

  // Maps a Places priceLevel (enum string like "PRICE_LEVEL_MODERATE", the
  // enum key "MODERATE", or a legacy 0-4 number) to a "$"..."$$$$" band.
  function priceBand(level) {
    if (level == null || level === "") return "";
    const s = String(level).toUpperCase();
    if (s.indexOf("VERY_EXPENSIVE") !== -1) return "$$$$";
    if (s.indexOf("EXPENSIVE") !== -1) return "$$$";
    if (s.indexOf("MODERATE") !== -1) return "$$";
    if (s.indexOf("INEXPENSIVE") !== -1 || s.indexOf("FREE") !== -1) return "$";
    const n = Number(level);
    if (!isNaN(n) && n >= 1 && n <= 4) return "$".repeat(n);
    return "";
  }

  // Pulls a short neighborhood-ish label out of the Places addressComponents,
  // preferring the most specific: neighborhood, then sublocality, then city.
  function extractArea(components) {
    if (!Array.isArray(components)) return "";
    const want = ["neighborhood", "sublocality", "sublocality_level_1", "locality"];
    for (let i = 0; i < want.length; i++) {
      const c = components.find((x) => (x.types || []).indexOf(want[i]) !== -1);
      if (c) return c.longText || c.shortText || "";
    }
    return "";
  }

  // Normalizes up to 3 review objects to { text, rating, author }. The JS SDK's
  // Review.text is usually a string; guard for the {text, languageCode} shape.
  function normalizeReviews(reviews) {
    if (!Array.isArray(reviews)) return [];
    return reviews.slice(0, 3).map((r) => {
      let text = r && r.text;
      if (text && typeof text === "object") text = text.text || "";
      return {
        text: String(text || "").trim(),
        rating: r && r.rating != null ? r.rating : null,
        author: (r && r.authorAttribution && r.authorAttribution.displayName) || ""
      };
    }).filter((r) => r.text);
  }

  // name: place name to search for. cityLabel: e.g. "Rome, Italy" (from
  // CITY_LABEL_MAP). Returns { kind, description, url, address, area,
  // rating, reviewCount, priceBand, reviews } or throws.
  async function lookup(name, cityLabel) {
    await loadLibrary();
    const { Place } = await google.maps.importLibrary("places");
    const query = [name, cityLabel].filter(Boolean).join(", ");
    const results = await Place.searchByText({
      textQuery: query,
      fields: ["displayName", "editorialSummary", "types", "googleMapsURI",
        "formattedAddress", "addressComponents", "rating", "userRatingCount",
        "priceLevel", "reviews"],
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
      address: p.formattedAddress || "",
      area: extractArea(p.addressComponents),
      rating: p.rating != null ? p.rating : null,
      reviewCount: p.userRatingCount != null ? p.userRatingCount : null,
      priceBand: priceBand(p.priceLevel),
      reviews: normalizeReviews(p.reviews)
    };
  }

  return { isConfigured, lookup };
})();
