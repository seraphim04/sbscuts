// POST /api/rewards-optin
//
// Staff-only endpoint that sets whether a client appears on the public
// leaderboard (/rewards.html, Leaderboard tab). Separate from
// rewards-log.js so staff can update someone's opt-in choice without it
// requiring (or accidentally logging) a visit.
//
// Off by default for every client — nobody appears on the public
// leaderboard unless a staff member explicitly turns this on for them,
// which should only happen after the client has actually agreed to be
// listed. The leaderboard only ever shows a first name + last initial and
// a 1–6 progress count — never a phone number or full name.
//
// Same PIN + lockout protection as rewards-log.js / rewards-redeem.js.

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

  if (!record) {
    return json({ error: 'not_found', detail: 'No visit history for this number yet — add a visit first.' }, 404);
  }
  if (!record.name) {
    return json({ error: 'name_required', detail: 'Add a name for this client before listing them on the leaderboard.' }, 400);
  }

  record.leaderboardOptIn = !!body.leaderboardOptIn;

  try {
    await env.REWARDS_KV.put(`client:${phone}`, JSON.stringify(record));
  } catch (err) {
    return json({ error: 'storage_error', detail: err.message }, 500);
  }

  return json({ ok: true, phone, leaderboardOptIn: record.leaderboardOptIn });
}
