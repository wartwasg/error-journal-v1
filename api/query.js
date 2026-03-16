/*
 * api/query.js — Vercel Serverless Function
 *
 * Runs server-side on Vercel. Proxies SQL queries to Neon's HTTP API.
 * Credentials are hardcoded here (server-side only, never exposed to browser).
 *
 * Why no URL parsing: The URL constructor can silently drop or mangle
 * credentials containing special characters. We hardcode them directly
 * to guarantee the correct Basic Auth header is always sent.
 */

// ── Neon credentials (split out to avoid any URL-parsing issues) ──
const NEON_USER = 'neondb_owner';
const NEON_PASS = 'npg_eLT6d5RNUxWy';
const NEON_HOST = 'ep-jolly-wind-amrwqrqo-pooler.c-5.us-east-1.aws.neon.tech';
const NEON_DB   = 'neondb';

// Full connection string passed as a header (required by Neon HTTP API)
const CONN_STR =
  `postgresql://${NEON_USER}:${NEON_PASS}@${NEON_HOST}/${NEON_DB}?sslmode=require&channel_binding=require`;

// HTTP endpoint for Neon's SQL API
const NEON_ENDPOINT = `https://${NEON_HOST}/sql`;

// Basic Auth header — built directly from parts, no URL parsing
const NEON_AUTH = 'Basic ' + Buffer.from(`${NEON_USER}:${NEON_PASS}`).toString('base64');

module.exports = async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { query, params = [] } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Missing query field in request body' });
    }

    // Forward the query to Neon server-side — no CORS restrictions here
    const neonRes = await fetch(NEON_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type':           'application/json',
        'Authorization':          NEON_AUTH,
        'Neon-Connection-String': CONN_STR,
      },
      body: JSON.stringify({ query, params }),
    });

    const data = await neonRes.json();

    if (!neonRes.ok) {
      const errMsg = data.message || data.error || `Neon returned HTTP ${neonRes.status}`;
      console.error('[api/query] Neon error:', errMsg);
      return res.status(neonRes.status).json({ error: errMsg });
    }

    return res.status(200).json(data);

  } catch (err) {
    console.error('[api/query] Exception:', err.message);
    return res.status(500).json({ error: err.message });
  }
};