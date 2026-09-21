import Stripe from 'stripe';

// Flat $199.99 deposit toward a $399 flat-rate barber-shop website build
// (the same system SBS Cuts runs on: Home, Services, Gallery, About,
// Reviews, Contact, all driven by one config file). The remaining $199.01
// is collected separately once the client's build is ready to launch.
// Keep this number in sync with the price shown on
// public/barber-website.html and public/assets/config.js if it ever
// changes.
const DEPOSIT_CENTS = 19999;

// IMPORTANT: this is a completely separate Stripe account/key from
// sergotstock's. Set STRIPE_SECRET_KEY in this Cloudflare Pages project's
// own environment variables (Workers & Pages -> this project -> Settings
// -> Environment variables) — never reuse sergotstock's key here.

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

// POST /api/website-deposit   body: none — single fixed-price item, so
// there's nothing to validate before sending the buyer to Stripe. Stripe
// Checkout itself collects name, email, and phone, plus two short custom
// fields below so there's enough to start a build without a separate form.
// Every successful payment shows up in the Stripe Dashboard automatically
// — that dashboard *is* the leads list, no extra database needed.
export async function onRequestPost({ request, env }) {
  const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    httpClient: Stripe.createFetchHttpClient(), // required for Cloudflare Workers/Pages
  });
  const origin = new URL(request.url).origin;

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          unit_amount: DEPOSIT_CENTS,
          product_data: {
            name: 'Barber Website Build — Reservation Deposit',
            description: "$199.99 to reserve your barber-shop website build ($399 total, $199.01 due at launch). Refunded in full if you're not happy with the initial design direction.",
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
          text: { maximum_length: 200 },
        },
        {
          key: 'shop_link',
          label: { type: 'custom', custom: 'Current site / Instagram / booking link (if any)' },
          type: 'text',
          text: { maximum_length: 255 }, // Stripe's hard cap on custom_fields text length
        },
      ],
      success_url: `${origin}/deposit-confirmed.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/barber-website.html?canceled=1`,
    });
  } catch (err) {
    return json({ error: 'stripe_error', detail: err.message }, 500);
  }

  return json({ url: session.url });
}
