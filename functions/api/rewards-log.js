// POST /api/rewards-log
//
// Staff-only endpoint that adds one visit to a client's rewards progress.
// Called from the PIN-protected public/admin/rewards.html page after a
// cut — there is no booking-system integration that can trigger this
// automatically (theCut has no public API/webhook for that as of this
// writing), so a real person taps "Add Visit" once per client, per cut.
//
// REQUIRED ENV VARS / BINDINGS:
//   ADMIN_PIN  — a PIN you choose (Cloudflare Pages -> this project ->
//                Settings -> Environment variables). Keep this private —
//                it's the only thing standing between the public
//                internet and adding fake visits. It is a lightweight
//                deterrent appropriate for a one-person shop, not
//                bank-grade auth; don't reuse a PIN you use elsewhere.
//   REWARDS_KV — same KV namespace as functions/api/rewards-status.js.

// Keep in sync with public/assets/config.js -> rewards.visitsPerReward.
const VISITS_PER_REWARD = 6;

// After this many wrong-PIN attempts from one IP within the window, that
// IP is locked out for the rest of the window — a basic brake against
// someone guessing a short PIN by brute force. Skipped gracefully if
// REWARDS_KV isn't bound (the PIN check itself still applies either way).
const MAX_FAILED_ATTEMPTS = 8;
const LOCKOUT_WINDOW_SECONDS = 900; // 15 minutes

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

function clean(value, maxLen) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .trim()
    .slice(0, maxLen);
}

// Constant-time-ish string comparison to avoid an obvious short-circuit
// timing leak when checking the PIN.
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
  } catch {
    // If KV is briefly unreachable, don't block a legitimate request over it.
  }
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
    } catch {
      // Non-fatal — worst case the lockout doesn't count this attempt.
    }
    return json({ error: 'invalid_pin' }, 401);
  }

  // Correct PIN — clear any accumulated failures for this IP.
  try {
    await env.REWARDS_KV.delete(lockoutKey);
  } catch {}

  const phone = normalizePhone(body.phone);
  if (phone.length < 7) {
    return json({ error: 'invalid_phone' }, 400);
  }
  const name = clean(body.name, 100);

  let record = null;
  try {
    const raw = await env.REWARDS_KV.get(`client:${phone}`);
    if (raw) record = JSON.parse(raw);
  } catch {}

  if (!record) {
    record = { phone, name: name || '', visits: 0, totalRedeemed: 0, leaderboardOptIn: false, createdAt: new Date().toISOString() };
  }
  if (name) record.name = name; // update name if a newer one was entered
  // Optional — lets staff set/update the leaderboard opt-in choice in the
  // same tap as logging a visit. Omit this field entirely from the
  // request to leave the existing opt-in choice untouched.
  if (typeof body.leaderboardOptIn === 'boolean') record.leaderboardOptIn = body.leaderboardOptIn;
  record.visits = (record.visits || 0) + 1;
  record.lastVisit = new Date().toISOString();

  try {
    await env.REWARDS_KV.put(`client:${phone}`, JSON.stringify(record));
  } catch (err) {
    return json({ error: 'storage_error', detail: err.message }, 500);
  }

  return json({
    ok: true,
    phone,
    name: record.name,
    leaderboardOptIn: !!record.leaderboardOptIn,
    visits: record.visits,
    visitsPerReward: VISITS_PER_REWARD,
    visitsRemaining: Math.max(0, VISITS_PER_REWARD - record.visits),
    rewardReady: record.visits >= VISITS_PER_REWARD,
    totalRedeemed: record.totalRedeemed || 0,
  });
}
