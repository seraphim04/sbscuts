// POST /api/website-application
//
// Handles submissions from the "Get Your Own Site" application form on
// /barber-website.html. Right now this is a STUB: it validates the input
// and returns success, but it does not actually notify anyone. Applications
// are not currently going anywhere — wire this up before relying on it.
//
// This is a completely separate project from sergotstock (own repo, own
// Cloudflare Pages deployment, own env vars) — nothing here shares
// credentials or infrastructure with that project.
//
// TODO before launch — pick one:
//   1. Cloudflare Email Routing: use `env.SEND_EMAIL` binding (MailChannels
//      or Cloudflare's native email routing) to forward `payload` to the
//      inbox you decide should receive applications (see config.js ->
//      websiteOffer.applicationsGoTo — currently also a placeholder).
//   2. A transactional email API (Resend, Postmark, etc.): call it here
//      with a server-side API key stored as an environment variable, never
//      hardcoded in this file.
//   3. A lightweight store: write to a KV namespace or D1 database bound
//      to this Pages project, then check it manually or build a small
//      admin view (same pattern as sergotstock's /admin, but a separate
//      instance with separate credentials).
//
// Until one of those is wired up, the form's client-side code already
// falls back to a plain "email me directly" message if this endpoint
// ever returns a non-200, so nothing is silently lost — it just isn't
// automated yet.

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export async function onRequestPost({ request }) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: 'invalid_json' }, 400);
  }

  const { name, shop, email, phone, link, notes } = body || {};

  if (!name || !shop || !email) {
    return json({ error: 'missing_required_fields' }, 400);
  }

  // TODO: replace this with an actual notification (see TODO block above).
  // For now, this just confirms receipt of a well-formed submission.
  console.log('[website-application] received (not yet forwarded anywhere):', {
    name, shop, email, phone, link, notes,
  });

  return json({ ok: true, note: 'received_but_not_yet_forwarded' });
}
