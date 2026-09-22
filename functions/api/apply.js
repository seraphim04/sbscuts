// POST /api/apply
//
// Receives the "Get Your Website" application form from
// public/barber-website.html, validates and sanitizes it, and emails the
// full application to the business owner via Resend's REST API. No npm
// package is used (this project has no build step — see
// functions/api/website-deposit.js for why), so this calls Resend over
// plain fetch().
//
// REQUIRED ENV VAR:
//   RESEND_API_KEY  — from resend.com, Cloudflare Pages -> this project ->
//                      Settings -> Environment variables.
// OPTIONAL ENV VARS:
//   NOTIFY_EMAIL         — where applications are sent. Defaults to
//                          sbscuts@gmail.com if not set.
//   FROM_EMAIL           — the From: address Resend sends as. Must be a
//                          domain verified in Resend, OR Resend's shared
//                          sandbox sender (onboarding@resend.dev), which
//                          works immediately with no domain setup but is
//                          only meant for testing. Defaults to the sandbox
//                          sender if not set — replace once a domain is
//                          verified in Resend.
//   TURNSTILE_SECRET_KEY — enables real CAPTCHA verification (see below).
//                          Skipped gracefully if not set.

const NOTIFY_EMAIL_DEFAULT = 'sbscuts@gmail.com';
const FROM_EMAIL_DEFAULT = 'SBS Cuts Website <onboarding@resend.dev>';

// Minimum time (ms) between the form rendering and the submit arriving.
// A real person takes several seconds to read the form and type into it;
// a bot that fills and submits instantly gets caught here. Low enough
// that no real visitor should ever be blocked by it.
const MIN_FILL_TIME_MS = 1200;

const FIELD_LIMITS = {
  name: 100, businessName: 100, email: 200, phone: 30, city: 100,
  state: 60, social: 200, bookingLink: 200, ownsDomain: 20,
  features: 1000, launchDate: 60, budget: 60, notes: 1500,
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

// Strips tags/control characters and caps length — applications are
// forwarded as HTML email, so this keeps the email safe from injected
// markup and keeps any single field from being used to send a huge
// payload.
function clean(value, maxLen) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .trim()
    .slice(0, maxLen);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function onRequestPost({ request, env }) {
  if (!env.RESEND_API_KEY) {
    return json({ error: 'not_configured', detail: 'RESEND_API_KEY is not set for this project.' }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  // --- Spam checks (silent — a bot gets a normal-looking 200 so it
  // doesn't learn to adapt, but nothing is actually sent) -------------
  if (typeof body.hp === 'string' && body.hp.trim() !== '') {
    return json({ ok: true });
  }
  const loadedAt = Number(body.ts);
  if (!loadedAt || Date.now() - loadedAt < MIN_FILL_TIME_MS) {
    return json({ ok: true });
  }

  // --- Optional Turnstile verification --------------------------------
  if (env.TURNSTILE_SECRET_KEY) {
    const token = typeof body.turnstileToken === 'string' ? body.turnstileToken : '';
    if (!token) {
      return json({ error: 'captcha_required' }, 400);
    }
    try {
      const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          secret: env.TURNSTILE_SECRET_KEY,
          response: token,
          remoteip: request.headers.get('CF-Connecting-IP') || '',
        }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyData.success) {
        return json({ error: 'captcha_failed' }, 400);
      }
    } catch {
      return json({ error: 'captcha_error' }, 502);
    }
  }

  // --- Sanitize every field --------------------------------------------
  const f = {};
  for (const [key, max] of Object.entries(FIELD_LIMITS)) {
    f[key] = clean(body[key], max);
  }

  // --- Validate required fields -----------------------------------------
  const missing = [];
  if (!f.name) missing.push('name');
  if (!f.businessName) missing.push('businessName');
  if (!isValidEmail(f.email)) missing.push('valid email');
  if (!f.phone) missing.push('phone');
  if (!f.city || !f.state) missing.push('city/state');
  if (body.agreeTerms !== true) missing.push('agreement to terms');
  if (missing.length) {
    return json({ error: 'missing_required_fields', fields: missing }, 400);
  }

  // --- Optional lightweight duplicate guard (only if a KV namespace
  // called APPLICATIONS_KV is bound to this project — entirely optional,
  // skipped gracefully otherwise; see README notes for how to add one). -
  if (env.APPLICATIONS_KV) {
    try {
      const dedupeKey = `apply:${f.email.toLowerCase()}`;
      const recent = await env.APPLICATIONS_KV.get(dedupeKey);
      if (recent) {
        return json({ ok: true, note: 'duplicate_suppressed' });
      }
      await env.APPLICATIONS_KV.put(dedupeKey, '1', { expirationTtl: 600 }); // 10 min
    } catch {
      // KV not actually usable — don't block the application over it.
    }
  }

  const to = env.NOTIFY_EMAIL || NOTIFY_EMAIL_DEFAULT;
  const from = env.FROM_EMAIL || FROM_EMAIL_DEFAULT;

  const rows = [
    ['Name', f.name], ['Business / shop name', f.businessName], ['Email', f.email],
    ['Phone', f.phone], ['City / state', `${f.city}, ${f.state}`],
    ['Instagram / social link', f.social || '—'], ['Current booking link', f.bookingLink || '—'],
    ['Already owns a domain', f.ownsDomain || '—'], ['Desired launch date', f.launchDate || '—'],
    ['Budget range', f.budget || '—'],
  ];
  const rowsHtml = rows.map(([label, val]) =>
    `<tr><td style="padding:6px 12px 6px 0;color:#6B675F;white-space:nowrap;">${escapeHtml(label)}</td><td style="padding:6px 0;">${escapeHtml(val)}</td></tr>`
  ).join('');

  const html = `
    <div style="font-family:sans-serif;max-width:640px;">
      <h2 style="margin:0 0 16px;">New "Get Your Website" application</h2>
      <table style="border-collapse:collapse;width:100%;margin-bottom:20px;">${rowsHtml}</table>
      <p style="color:#6B675F;font-size:13px;margin:0 0 6px;text-transform:uppercase;letter-spacing:0.05em;">Features requested</p>
      <p style="white-space:pre-wrap;margin:0 0 20px;">${escapeHtml(f.features || '—')}</p>
      <p style="color:#6B675F;font-size:13px;margin:0 0 6px;text-transform:uppercase;letter-spacing:0.05em;">Additional details</p>
      <p style="white-space:pre-wrap;margin:0;">${escapeHtml(f.notes || '—')}</p>
    </div>`;

  let resendRes;
  try {
    resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to,
        reply_to: f.email,
        subject: `Website application — ${f.businessName}`,
        html,
      }),
    });
  } catch (err) {
    return json({ error: 'network_error', detail: err.message }, 502);
  }

  if (!resendRes.ok) {
    let detail = 'Unknown email delivery error';
    try { detail = (await resendRes.json())?.message || detail; } catch {}
    return json({ error: 'delivery_failed', detail }, 502);
  }

  return json({ ok: true });
}
