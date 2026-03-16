/*
 * api/query.js — Vercel Serverless Function
 *
 * Uses the official @neondatabase/serverless package which handles
 * auth, connection string parsing, and HTTP transport correctly.
 * No manual URL parsing or Base64 encoding needed.
 */

const { neon } = require('@neondatabase/serverless');

const CONNECTION_STRING =
  'postgresql://neondb_owner:npg_eLT6d5RNUxWy@ep-jolly-wind-amrwqrqo-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require';

// Create the sql query function once (outside handler for reuse)
const sql = neon(CONNECTION_STRING);

module.exports = async function handler(req, res) {
  // CORS preflight
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
      return res.status(400).json({ error: 'Missing query field' });
    }

    // neon.query() runs parameterised SQL and returns { rows, rowCount, fields }
    const result = await sql.query(query, params);

    return res.status(200).json({
      rows:     result.rows     || [],
      rowCount: result.rowCount ?? null,
      fields:   result.fields   || [],
    });

  } catch (err) {
    console.error('[api/query]', err.message);
    return res.status(500).json({ error: err.message });
  }
};