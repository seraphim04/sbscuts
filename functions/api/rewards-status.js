// POST /api/rewards-status
//
// Public, read-only lookup for the rewards program. A client types in
// their phone number on public/rewards.html and this returns how many
// visits they've logged and whether a free cut is ready. No PIN needed —
// this only ever returns the record for the exact phone number given, and
// deliberately does not confirm or deny whether OTHER numbers exist in
// the system beyond returning a fresh "0 visits" record for an unknown
// one (so it can't be used to enumerate real clients' phone numbers).
//
// Visits are only ever added by staff, from the PIN-protected
// public/admin/rewards.html page — see functions/api/rewards-log.js and
// functions/api/rewards-redeem.js.
//
// REQUIRED ENV VAR / BINDING:
//   REWARDS_KV — a Cloudflare KV namespace bound to this project
//                (Workers & Pages -> this project -> Settings -> Bindings
//                -> KV Namespace Bindings -> variable name REWARDS_KV).
//                See DEPLOYMENT.md for exact setup steps.

// Keep in sync with public/assets/config.js -> rewards.visitsPerReward.
const VISITS_PER_REWARD = 6;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

// Normalizes any phone number format down to its last 10 digits, so
// "(757) 555-1234", "757-555-1234", and "7575551234" all resolve to the
// same client record.
function normalizePhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  return digits.slice(-10);
}

export async function onRequestPost({ request, env }) {
  if (!env.REWARDS_KV) {
    return json({ error: 'not_configured', detail: 'REWARDS_KV is not bound for this project.' }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const phone = normalizePhone(body.phone);
  if (phone.length < 7) {
    return json({ error: 'invalid_phone' }, 400);
  }

  let record = null;
  try {
    const raw = await env.REWARDS_KV.get(`client:${phone}`);
    if (raw) record = JSON.parse(raw);
  } catch {
    // Treat a read failure the same as "no record yet" rather than
    // erroring — this endpoint is read-only and low-stakes either way.
  }

  const visits = record?.visits || 0;
  const totalRedeemed = record?.totalRedeemed || 0;

  return json({
    found: !!record,
    name: record?.name || '',
    visits,
    visitsPerReward: VISITS_PER_REWARD,
    visitsRemaining: Math.max(0, VISITS_PER_REWARD - visits),
    rewardReady: visits >= VISITS_PER_REWARD,
    totalRedeemed,
    leaderboardOptIn: !!record?.leaderboardOptIn,
  });
}
