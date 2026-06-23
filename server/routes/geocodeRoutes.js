// server/routes/geocodeRoutes.js
const express = require('express');
const axios = require('axios');
const router = express.Router();

// ── Simple in-memory cache (5 min TTL) ────────────────────────────────────────
// Cuts down on repeat calls for the same query (e.g. "Koz", "Kozh", "Kozhi"
// as the user types) and reduces how often we hit Nominatim's rate limit.
const cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

// ── Simple request queue to respect Nominatim's 1 req/sec policy ─────────────
// Nominatim's usage policy requires max 1 request per second from a given
// client. Without this, rapid typing across multiple users can trigger
// 403/429 responses, which look identical to "geocoding failed" from the
// frontend's point of view.
let lastRequestTime = 0;
const MIN_INTERVAL_MS = 1100; // slightly over 1s to be safe

function waitForSlot() {
  return new Promise((resolve) => {
    const now = Date.now();
    const elapsed = now - lastRequestTime;
    const delay = Math.max(0, MIN_INTERVAL_MS - elapsed);
    setTimeout(() => {
      lastRequestTime = Date.now();
      resolve();
    }, delay);
  });
}

router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.json([]);
    }

    const cacheKey = q.toLowerCase().trim();
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      console.log(`💾 Geocode cache hit: "${q}"`);
      return res.json(cached.data);
    }

    console.log(`🔍 Geocoding: ${q}`);

    // Respect Nominatim's rate limit before firing the request
    await waitForSlot();

    const response = await axios.get(
      'https://nominatim.openstreetmap.org/search',
      {
        params: {
          q: q + ', India',
          format: 'json',
          limit: 5,
          addressdetails: 1,
        },
        headers: {
          // Nominatim REQUIRES a descriptive User-Agent or Referer.
          // Must be a real, working contact — they do check.
          'User-Agent': 'RideSharePro/1.0 (ahmedirfad7999@gmail.com)',
          'Accept-Language': 'en',
        },
        timeout: 5000,
      }
    );

    console.log(`✅ Geocode success: ${response.data.length} results for "${q}"`);

    cache.set(cacheKey, { data: response.data, timestamp: Date.now() });

    res.json(response.data);
  } catch (error) {
    // ── DIAGNOSTIC LOGGING ───────────────────────────────────────────────────
    // This tells us EXACTLY why Nominatim failed — check your server
    // terminal/logs for these lines, not the browser console. The frontend
    // only ever sees an empty array either way, by design (see below).
    if (error.response) {
      // Nominatim responded with an error status
      console.error(
        `❌ Geocode HTTP error: status=${error.response.status} for "${req.query.q}"`,
        error.response.data
      );
      if (error.response.status === 403) {
        console.error('   → 403 usually means Nominatim is blocking this server IP or User-Agent.');
      }
      if (error.response.status === 429) {
        console.error('   → 429 means rate-limited. Increase MIN_INTERVAL_MS or add more caching.');
      }
    } else if (error.request) {
      // Request sent, no response — timeout or network/DNS issue
      console.error(`❌ Geocode no response (timeout/network) for "${req.query.q}":`, error.message);
    } else {
      console.error('❌ Geocode setup error:', error.message);
    }

    // Always return [] (not a 500) so the frontend's fallback to
    // MOCK_CITIES kicks in cleanly instead of throwing.
    res.json([]);
  }
});

module.exports = router;