// POST /api/rewards-redeem
//
// Staff-only endpoint that redeems a client's reward once they've hit
// VISITS_PER_REWARD visits — called from public/admin/rewards.html after
// giving them their free cut. Any visits beyond the threshold carry over
// toward their next reward rather than being lost (e.g. 7 visits redeems
// down to 1, not 0).
//
// Same PIN + lockout protection as functions/api/rewards-log.js — see
// that file's header comment for the required env vars/bindings.

const VISITS_PER_REWARD = 6; // keep in sync with config.js + rewards-log.js
const MAX_FAILED_ATTEMPTS = 8;
const LOCKOUT_WINDOW_SECONDS = 900;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function normalizePhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  return digits.slice(-10);
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_PIN) {
    return json({ error: 'not_configured', detail: 'ADMIN_PIN is not set for this project.' }, 500);
  }
  if (!env.REWARDS_KV) {
    return json({ error: 'not_configured', detail: 'REWARDS_KV is not bound for this project.' }, 500);
  }

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const lockoutKey = `pinfail:${ip}`;

  let failCount = 0;
  try {
    failCount = Number(await env.REWARDS_KV.get(lockoutKey)) || 0;
  } catch {}
  if (failCount >= MAX_FAILED_ATTEMPTS) {
    return json({ error: 'too_many_attempts', detail: 'Too many incorrect PIN attempts. Try again later.' }, 429);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const pin = typeof body.pin === 'string' ? body.pin : '';
  if (!safeEqual(pin, env.ADMIN_PIN)) {
    try {
      await env.REWARDS_KV.put(lockoutKey, String(failCount + 1), { expirationTtl: LOCKOUT_WINDOW_SECONDS });
    } catch {}
    return json({ error: 'invalid_pin' }, 401);
  }
  try {
    await env.REWARDS_KV.delete(lockoutKey);
  } catch {}

  const phone = normalizePhone(body.phone);
  if (phone.length < 7) {
    return json({ error: 'invalid_phone' }, 400);
  }

  let record = null;
  try {
    const raw = await env.REWARDS_KV.get(`client:${phone}`);
    if (raw) record = JSON.parse(raw);
  } catch {}

  if (!record || (record.visits || 0) < VISITS_PER_REWARD) {
    return json({ error: 'reward_not_ready', visits: record?.visits || 0, visitsPerReward: VISITS_PER_REWARD }, 400);
  }

  record.visits = record.visits - VISITS_PER_REWARD;
  record.totalRedeemed = (record.totalRedeemed || 0) + 1;
  record.lastRedeemed = new Date().toISOString();

  try {
    await env.REWARDS_KV.put(`client:${phone}`, JSON.stringify(record));
  } catch (err) {
    return json({ error: 'storage_error', detail: err.message }, 500);
  }

  return json({
    ok: true,
    phone,
    name: record.name || '',
    visits: record.visits,
    visitsPerReward: VISITS_PER_REWARD,
    visitsRemaining: Math.max(0, VISITS_PER_REWARD - record.visits),
    rewardReady: record.visits >= VISITS_PER_REWARD,
    totalRedeemed: record.totalRedeemed,
  });
}
