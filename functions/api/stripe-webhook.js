// POST /api/stripe-webhook
//
// Stripe webhook endpoint for the barber-website deposit flow. This is a
// backup confirmation path, not the primary one — the buyer already lands
// on /deposit-confirmed.html via Stripe's success_url right after paying.
// This endpoint exists so the shop owner gets a reliable email the moment
// Stripe actually confirms the charge, even if the buyer closes their tab
// before the success page loads.
//
// SET UP IN STRIPE DASHBOARD:
//   Developers -> Webhooks -> Add endpoint
//   Endpoint URL: https://<your-domain>/api/stripe-webhook
//     (https://sbscuts.pages.dev/api/stripe-webhook until a custom domain
//     is attached)
//   Events to send: checkout.session.completed
//   After creating it, Stripe shows a "Signing secret" (starts with
//   whsec_) — copy it into this Cloudflare Pages project's environment
//   variables as STRIPE_WEBHOOK_SECRET.
//
// REQUIRED ENV VARS:
//   STRIPE_WEBHOOK_SECRET — the whsec_... signing secret from the step
//                           above. Requests without a valid signature are
//                           rejected.
// OPTIONAL ENV VARS (reused from functions/api/apply.js):
//   RESEND_API_KEY — if set, this endpoint emails the owner a payment
//                    confirmation. If not set, the webhook still verifies
//                    and returns 200 (Stripe requires a 2xx response even
//                    if there's nothing else to do), it just skips email.
//   NOTIFY_EMAIL   — defaults to sbscuts@gmail.com.
//   FROM_EMAIL     — defaults to Resend's sandbox sender.
//
// No `stripe` npm package is used — see functions/api/website-deposit.js
// for why (this project has no build step). Signature verification is
// done by hand with the Web Crypto API (HMAC-SHA256), which is built into
// the Cloudflare Workers runtime and needs no dependency.

const NOTIFY_EMAIL_DEFAULT = 'sbscuts@gmail.com';
const FROM_EMAIL_DEFAULT = 'SBS Cuts Website <onboarding@resend.dev>';

// Stripe recommends rejecting timestamps older than 5 minutes to guard
// against replay attacks.
const TOLERANCE_SECONDS = 300;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Constant-time-ish hex comparison. Not perfectly constant-time in JS,
// but avoids the most obvious short-circuit timing leak from `===` on
// mismatched-length strings.
function safeEqualHex(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function hmacSha256Hex(secret, payload) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}

// Parses Stripe's `Stripe-Signature` header, e.g.
// "t=1614556800,v1=abc123,v0=def456" -> { t: "1614556800", v1: "abc123" }
function parseSigHeader(header) {
  const out = {};
  for (const part of header.split(',')) {
    const [k, v] = part.split('=');
    if (k === 't' || k === 'v1') out[k] = v;
  }
  return out;
}

async function verifyStripeSignature(rawBody, sigHeader, secret) {
  if (!sigHeader) return { ok: false, reason: 'missing_signature_header' };
  const { t, v1 } = parseSigHeader(sigHeader);
  if (!t || !v1) return { ok: false, reason: 'malformed_signature_header' };

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - Number(t)) > TOLERANCE_SECONDS) {
    return { ok: false, reason: 'timestamp_outside_tolerance' };
  }

  const expected = await hmacSha256Hex(secret, `${t}.${rawBody}`);
  if (!safeEqualHex(expected, v1)) {
    return { ok: false, reason: 'signature_mismatch' };
  }
  return { ok: true };
}

export async function onRequestPost({ request, env }) {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    // Fail closed — without a secret we cannot verify the request really
    // came from Stripe, so we refuse rather than trust an unverified body.
    return json({ error: 'not_configured', detail: 'STRIPE_WEBHOOK_SECRET is not set for this project.' }, 500);
  }

  const rawBody = await request.text();
  const sigHeader = request.headers.get('stripe-signature');

  const verification = await verifyStripeSignature(rawBody, sigHeader, env.STRIPE_WEBHOOK_SECRET);
  if (!verification.ok) {
    return json({ error: 'invalid_signature', reason: verification.reason }, 400);
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  // Optional duplicate-delivery guard — Stripe can deliver the same event
  // more than once. Skipped gracefully if no KV namespace is bound.
  if (env.APPLICATIONS_KV && event.id) {
    try {
      const dedupeKey = `webhook:${event.id}`;
      const seen = await env.APPLICATIONS_KV.get(dedupeKey);
      if (seen) {
        return json({ ok: true, note: 'duplicate_event_skipped' });
      }
      await env.APPLICATIONS_KV.put(dedupeKey, '1', { expirationTtl: 86400 }); // 24h
    } catch {
      // KV not actually usable — don't block handling the event over it.
    }
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data?.object || {};
    const metadata = session.metadata || {};
    const customFields = session.custom_fields || [];
    const shopName = customFields.find(f => f.key === 'shop_name')?.text?.value || metadata.applicant_business || '—';
    const shopLink = customFields.find(f => f.key === 'shop_link')?.text?.value || '—';
    const buyerEmail = session.customer_details?.email || metadata.applicant_email || '—';
    const buyerName = session.customer_details?.name || metadata.applicant_name || '—';
    const amountTotal = typeof session.amount_total === 'number' ? `$${(session.amount_total / 100).toFixed(2)}` : '—';

    if (env.RESEND_API_KEY) {
      const to = env.NOTIFY_EMAIL || NOTIFY_EMAIL_DEFAULT;
      const from = env.FROM_EMAIL || FROM_EMAIL_DEFAULT;
      const html = `
        <div style="font-family:sans-serif;max-width:640px;">
          <h2 style="margin:0 0 16px;">Deposit payment confirmed</h2>
          <p style="margin:0 0 16px;">Stripe confirmed a $199 website-build deposit payment. This is a backup notice — the buyer was also shown the confirmation page directly.</p>
          <table style="border-collapse:collapse;width:100%;">
            <tr><td style="padding:6px 12px 6px 0;color:#6B675F;white-space:nowrap;">Amount paid</td><td style="padding:6px 0;">${escapeHtml(amountTotal)}</td></tr>
            <tr><td style="padding:6px 12px 6px 0;color:#6B675F;white-space:nowrap;">Name</td><td style="padding:6px 0;">${escapeHtml(buyerName)}</td></tr>
            <tr><td style="padding:6px 12px 6px 0;color:#6B675F;white-space:nowrap;">Email</td><td style="padding:6px 0;">${escapeHtml(buyerEmail)}</td></tr>
            <tr><td style="padding:6px 12px 6px 0;color:#6B675F;white-space:nowrap;">Shop name</td><td style="padding:6px 0;">${escapeHtml(shopName)}</td></tr>
            <tr><td style="padding:6px 12px 6px 0;color:#6B675F;white-space:nowrap;">Current site / social / booking link</td><td style="padding:6px 0;">${escapeHtml(shopLink)}</td></tr>
            <tr><td style="padding:6px 12px 6px 0;color:#6B675F;white-space:nowrap;">Stripe Checkout Session</td><td style="padding:6px 0;">${escapeHtml(session.id || '—')}</td></tr>
          </table>
          <p style="color:#6B675F;font-size:13px;margin-top:20px;">Full payment details, receipt, and refund controls are in the Stripe Dashboard. The remaining $200 is not charged automatically — send that request separately once the build is ready to launch.</p>
        </div>`;

      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            from,
            to,
            subject: `Deposit paid — ${shopName !== '—' ? shopName : buyerName}`,
            html,
          }),
        });
      } catch {
        // Don't fail the webhook over an email delivery problem — Stripe
        // will retry the whole webhook if we return a non-2xx, and the
        // payment itself already succeeded regardless of this email.
      }
    }
  }

  // Stripe only requires a 2xx response to consider the event delivered.
  // Event types we don't specifically handle are acknowledged the same
  // way so Stripe doesn't keep retrying them.
  return json({ received: true });
}
