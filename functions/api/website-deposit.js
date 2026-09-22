// Flat $199 deposit toward a $399-starting-price barber-shop website build
// (the same system SBS Cuts runs on: Home, Services, Gallery, About,
// Reviews, Contact, all driven by one config file). The remaining $200 is
// collected separately once the client's build is ready to launch. Keep
// this number in sync with the price shown on public/barber-website.html
// and public/assets/config.js (websiteOffer) if it ever changes.
const DEPOSIT_CENTS = 19900;

// IMPORTANT: this is a completely separate Stripe account/key from
// sergotstock's. Set STRIPE_SECRET_KEY in this Cloudflare Pages project's
// own environment variables (Workers & Pages -> this project -> Settings
// -> Environment variables) — never reuse sergotstock's key here.
//
// This calls Stripe's REST API directly with fetch() instead of the
// `stripe` npm package. Cloudflare Pages only runs `npm install` when a
// build command is configured — this project intentionally has none (no
// build step at all), so an npm import here would fail to resolve at
// deploy time. Talking to the API over plain HTTP avoids needing a
// dependency, a build command, or any bundling at all.

const STRIPE_API = 'https://api.stripe.com/v1/checkout/sessions';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

// Flattens a nested object into Stripe's bracket-notation form fields,
// e.g. {a:{b:1}} -> "a[b]=1", {a:[{b:1}]} -> "a[0][b]=1".
function flatten(obj, prefix, params) {
  for (const [key, value] of Object.entries(obj)) {
    const field = prefix ? `${prefix}[${key}]` : key;
    if (Array.isArray(value)) {
      value.forEach((item, i) => {
        if (item !== null && typeof item === 'object') {
          flatten(item, `${field}[${i}]`, params);
        } else {
          params.append(`${field}[${i}]`, String(item));
        }
      });
    } else if (value !== null && typeof value === 'object') {
      flatten(value, field, params);
    } else if (value !== undefined && value !== null) {
      params.append(field, String(value));
    }
  }
  return params;
}

function clean(value, maxLen) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .trim()
    .slice(0, maxLen);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Turns arbitrary applicant text into a short, safe idempotency-key
// component. Not cryptographic — just enough to keep the key readable
// and bounded in length.
async function shortHash(str) {
  const enc = new TextEncoder().encode(str);
  const digest = await crypto.subtle.digest('SHA-256', enc);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 24);
}

// POST /api/website-deposit
// body (all optional — this still works with no body at all, e.g. if
// visited directly): { name, email, businessName }. When the applicant
// already submitted the full application via /api/apply, that page
// passes their name/email/business through here so the Stripe session,
// the dashboard record, and the confirmation email all agree — without
// risking a second charge for the same applicant within a short window
// (see idempotency key below).
export async function onRequestPost({ request, env }) {
  if (!env.STRIPE_SECRET_KEY) {
    return json({ error: 'not_configured', detail: 'STRIPE_SECRET_KEY is not set for this project.' }, 500);
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const name = clean(body.name, 100);
  const businessName = clean(body.businessName, 100);
  const email = isValidEmail(clean(body.email, 200)) ? clean(body.email, 200) : '';

  const origin = new URL(request.url).origin;

  const metadata = {
    product: 'barber_website_build',
    deposit_amount: '$199',
    remaining_amount: '$200',
  };
  if (name) metadata.applicant_name = name;
  if (businessName) metadata.applicant_business = businessName;
  if (email) metadata.applicant_email = email;

  const sessionParams = {
    mode: 'payment',
    line_items: [{
      price_data: {
        currency: 'usd',
        unit_amount: DEPOSIT_CENTS,
        product_data: {
          name: 'Barber Website Build — Reservation Deposit ($199 of $399 starting price)',
          description: "$199 to reserve your barber-shop website build (starting at $399 total — custom features may require a separate quote). The remaining $200 is due once your build is ready to launch. Refunded in full if you're not happy with the initial design direction.",
        },
      },
      quantity: 1,
    }],
    phone_number_collection: { enabled: true },
    custom_fields: [
      {
        key: 'shop_name',
        label: { type: 'custom', custom: 'Your shop name' },
        type: 'text',
        text: { maximum_length: 200, ...(businessName ? { default_value: businessName } : {}) },
      },
      {
        key: 'shop_link',
        label: { type: 'custom', custom: 'Current site / Instagram / booking link (if any)' },
        type: 'text',
        text: { maximum_length: 255 }, // Stripe's hard cap on custom_fields text length
      },
    ],
    metadata,
    success_url: `${origin}/deposit-confirmed.html?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/barber-website.html?canceled=1`,
  };
  if (email) sessionParams.customer_email = email;

  const formBody = flatten(sessionParams, '', new URLSearchParams());

  // Idempotency key: the same applicant (by email, or name+business if no
  // email was passed) can't create a second Checkout Session within the
  // same UTC hour just by double-clicking or refreshing. This does not
  // prevent two genuinely separate payments days apart — Stripe's own
  // dashboard remains the source of truth for what was actually charged,
  // and nothing here auto-charges the remaining $200 balance; that is
  // always collected later as its own separate, manually-sent charge.
  const idBasis = email || `${name}|${businessName}` || 'anonymous';
  const hourBucket = Math.floor(Date.now() / (1000 * 60 * 60));
  const idempotencyKey = `website-deposit-${await shortHash(idBasis)}-${hourBucket}`;

  let res, data;
  try {
    res = await fetch(STRIPE_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Idempotency-Key': idempotencyKey,
      },
      body: formBody.toString(),
    });
    data = await res.json();
  } catch (err) {
    return json({ error: 'network_error', detail: err.message }, 500);
  }

  if (!res.ok) {
    return json({ error: 'stripe_error', detail: data?.error?.message || 'Unknown Stripe error' }, 500);
  }

  return json({ url: data.url });
}
