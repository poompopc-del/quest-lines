// Quest Lines v2 — serverless bridge to Claude (Vercel: files in /api become endpoints).
// Your ANTHROPIC_API_KEY stays on the server; the game never sees it.
//
//   GET  /api/claude  -> { ok: true, configured: boolean }   (game uses this to switch AI mode on)
//   POST /api/claude  { turns:[{role,content}], maxTokens? } -> parsed JSON from the model
//
// Error codes the game understands: not_configured, bad_request, rate_limited,
// invalid_json, server_error.

const MODEL = 'claude-sonnet-5'; // check https://docs.claude.com if this id is ever retired
const MAX_TOKENS_CAP = 4000;
const DEFAULT_TOKENS = 3000;

// Tiny best-effort per-IP limiter (per warm instance) to protect your API bill.
const WINDOW_MS = 60_000, MAX_PER_WINDOW = 30;
const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter(t => now - t < WINDOW_MS);
  arr.push(now); hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > MAX_PER_WINDOW;
}

function extractJSON(text) {
  const cleaned = text.replace(/```json|```/g, '').trim();
  try { return JSON.parse(cleaned); } catch {}
  const a = cleaned.indexOf('{'), b = cleaned.lastIndexOf('}');
  if (a !== -1 && b > a) { try { return JSON.parse(cleaned.slice(a, b + 1)); } catch {} }
  return undefined;
}

export default async function handler(req, res) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (req.method === 'GET') {
    res.status(200).json({ ok: true, configured: !!apiKey, model: MODEL });
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ code: 'bad_request', error: 'Method not allowed' });
    return;
  }
  if (!apiKey) {
    res.status(503).json({ code: 'not_configured', error: 'Missing ANTHROPIC_API_KEY on the server.' });
    return;
  }

  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'anon').split(',')[0].trim();
  if (limited(ip)) {
    res.status(429).json({ code: 'rate_limited', error: 'Too many requests — slow down a little.' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
  const { turns, maxTokens } = body || {};
  if (!Array.isArray(turns) || turns.length === 0 || turns.length > 60) {
    res.status(400).json({ code: 'bad_request', error: 'Missing or invalid "turns".' });
    return;
  }
  const messages = turns
    .filter(t => t && (t.role === 'user' || t.role === 'assistant') && typeof t.content === 'string')
    .map(t => ({ role: t.role, content: t.content.slice(0, 12000) }));
  if (!messages.length || messages[0].role !== 'user') {
    res.status(400).json({ code: 'bad_request', error: 'First turn must be from the user.' });
    return;
  }
  const max_tokens = Math.min(MAX_TOKENS_CAP, Math.max(200, Number(maxTokens) || DEFAULT_TOKENS));

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({ model: MODEL, max_tokens, messages }),
    });
    const data = await upstream.json().catch(() => ({}));

    if (!upstream.ok) {
      const code = upstream.status === 429 || upstream.status === 529 ? 'rate_limited' : 'server_error';
      res.status(upstream.status).json({ code, error: data?.error?.message || 'Anthropic API error' });
      return;
    }

    const text = (data.content || []).map(b => (b.type === 'text' ? b.text : '')).join('');
    const parsed = extractJSON(text);
    if (parsed === undefined) {
      res.status(502).json({ code: 'invalid_json', error: 'Model did not return valid JSON.' });
      return;
    }
    res.status(200).json(parsed);
  } catch (err) {
    res.status(500).json({ code: 'server_error', error: err?.message || 'Unexpected server error.' });
  }
}
