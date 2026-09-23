// GET /api/rewards-leaderboard
//
// Public. Returns the current-rotation progress (1–visitsPerReward, or
// "reward ready") for every client who has been explicitly opted in via
// the staff admin page (see functions/api/rewards-optin.js). Nobody
// appears here by default — opt-in is per client, set by staff after the
// client agrees to it.
//
// Privacy: only ever returns a first name + last initial (never a full
// name, phone number, or any other contact info), and only a capped
// 0..visitsPerReward progress count for the client's CURRENT rotation —
// never a lifetime total, which is why someone who just redeemed shows
// back at 0 like anyone else starting out.
//
// Scale note: this lists every `client:*` key in REWARDS_KV and reads
// each one to build the ranking. That's fine for a single shop's client
// list (well into the hundreds), but isn't how you'd want to do this at
// much larger scale — a KV namespace isn't a queryable database. Capped
// to the first 1000 keys (a single KV list() page) and the top 50
// opted-in results, which comfortably covers a single-barber shop.

const VISITS_PER_REWARD = 6; // keep in sync with config.js + the other rewards-*.js files
const MAX_RESULTS = 50;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

// "Marcus Davis" -> "Marcus D." · "Cher" -> "Cher" (no last name on file).
function displayName(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

export async function onRequestGet({ env }) {
  if (!env.REWARDS_KV) {
    return json({ error: 'not_configured', detail: 'REWARDS_KV is not bound for this project.' }, 500);
  }

  let listing;
  try {
    listing = await env.REWARDS_KV.list({ prefix: 'client:', limit: 1000 });
  } catch (err) {
    return json({ error: 'storage_error', detail: err.message }, 500);
  }

  const entries = [];
  for (const key of listing.keys) {
    let record;
    try {
      const raw = await env.REWARDS_KV.get(key.name);
      if (!raw) continue;
      record = JSON.parse(raw);
    } catch {
      continue;
    }
    if (!record || !record.leaderboardOptIn || !record.name) continue;

    const visits = Math.min(record.visits || 0, VISITS_PER_REWARD);
    entries.push({
      displayName: displayName(record.name),
      visits,
      visitsPerReward: VISITS_PER_REWARD,
      rewardReady: (record.visits || 0) >= VISITS_PER_REWARD,
    });
  }

  entries.sort((a, b) => b.visits - a.visits || a.displayName.localeCompare(b.displayName));

  return json({ entries: entries.slice(0, MAX_RESULTS) });
}
