# SBS Cuts — Deployment & Setup Guide

This covers everything needed to deploy this update and keep the site running: environment variables, Stripe setup, email delivery, the webhook, and how to add reviews/photos later.

## 1. Environment variables (Cloudflare Pages → this project → Settings → Environment variables)

| Variable | Required? | Purpose |
|---|---|---|
| `STRIPE_SECRET_KEY` | **Required** | Your SBS Cuts Stripe account's secret key. Used by `functions/api/website-deposit.js` to create the $199 deposit Checkout Session. This must be a **separate Stripe account/key from any other project** — never reuse a key from elsewhere. |
| `STRIPE_WEBHOOK_SECRET` | **Required** for the webhook | The signing secret (`whsec_...`) Stripe gives you when you create the webhook endpoint (see §3 below). Without it, `functions/api/stripe-webhook.js` refuses all requests. |
| `RESEND_API_KEY` | **Required** for the application form | From resend.com. Used by `functions/api/apply.js` (and reused by the webhook for the payment-confirmation email) to send email. |
| `NOTIFY_EMAIL` | Optional | Where applications and payment confirmations are sent. Defaults to `sbscuts@gmail.com` if not set. |
| `FROM_EMAIL` | Optional | The From: address on outgoing email. Defaults to Resend's shared sandbox sender (`onboarding@resend.dev`), which works immediately with no setup but is best for testing only. Once you verify a domain in Resend, set this to something like `SBS Cuts <hello@yourdomain.com>`. |
| `TURNSTILE_SECRET_KEY` | Optional | Enables real CAPTCHA verification on the application form on top of the built-in honeypot + timing checks. Skipped gracefully if unset. |
| `APPLICATIONS_KV` | Optional (KV namespace binding, not a plain variable) | Adds duplicate-submission suppression (10 minutes) and duplicate-webhook-delivery suppression (24 hours). The site works correctly without it. |

None of these are used in the frontend — every API key stays server-side inside Cloudflare Pages Functions, never shipped to the browser.

## 2. Stripe setup

1. Log into the Stripe account for **SBS Cuts specifically** (not any other project's account).
2. Developers → API keys → copy the **Secret key** → set it as `STRIPE_SECRET_KEY` in Cloudflare Pages.
3. Apple Pay works automatically through Stripe Checkout with no extra setup on your end — Stripe shows it to eligible visitors on eligible devices/browsers once your domain is verified in Stripe (Settings → Payment methods → Apple Pay, "Add a new domain" if prompted).
4. The deposit is a **fixed $199** (of a $399 starting price), created fresh on every submission — nothing is stored or reused between sessions. The remaining $200 is *never* auto-charged; that's a separate, manual step you take once a build is ready to launch (e.g. a second Stripe Payment Link or invoice you send by hand).
5. Every completed payment appears in the Stripe Dashboard automatically, tagged with metadata (`applicant_name`, `applicant_email`, `applicant_business`) when the applicant came through the new application form — that's your source of truth for who paid.

## 3. Stripe webhook setup

1. In the Stripe Dashboard: **Developers → Webhooks → Add endpoint**.
2. Endpoint URL: `https://sbscuts.pages.dev/api/stripe-webhook` (update this if a custom domain is attached later).
3. Events to send: **`checkout.session.completed`** (that's the only event this project handles; anything else is safely acknowledged and ignored).
4. After creating it, Stripe shows a **Signing secret** starting with `whsec_...` — copy that into Cloudflare Pages as `STRIPE_WEBHOOK_SECRET`.
5. What it does: verifies the request really came from Stripe (HMAC-SHA256 signature check, done by hand with the Web Crypto API — no SDK needed), then sends a backup confirmation email to `NOTIFY_EMAIL` with the payment amount, buyer info, and shop name. This exists in case a buyer closes their browser tab before reaching the on-site confirmation page — the buyer's own receipt still comes directly from Stripe either way.

## 4. Email delivery (Resend) setup

1. Create a free account at resend.com.
2. API Keys → create one → set it as `RESEND_API_KEY` in Cloudflare Pages.
3. To send from your own address instead of the shared sandbox sender: Domains → add and verify your domain (a few DNS records), then set `FROM_EMAIL` to an address on that domain.
4. Until a domain is verified, leave `FROM_EMAIL` unset — it falls back to Resend's sandbox sender, which works immediately for testing but should be replaced before treating this as fully production-ready.

## 5. Adding real reviews later

Open `public/assets/config.js` and push objects onto the `reviews` array:

```js
reviews: [
  { quote: "Real client quote, copied word-for-word.", name: "First name or initials, with permission", rating: 5 },
],
```

The Reviews page and the Home page preview are both driven by this array. While it's empty, both show a clean "no reviews yet, see TheCut" message instead of any placeholder or fabricated content — no code changes needed beyond editing this array. **Never invent a quote, name, or rating.**

## 6. Adding real photos later

1. Drop image files into `public/assets/gallery/` (create the folder if it doesn't exist yet).
2. Push entries onto the `gallery` array in `config.js`:

```js
gallery: [
  { src: "/assets/gallery/fade-01.jpg", alt: "Skin fade with hard part" },
],
```

The Gallery page and the Home page preview both pick this up automatically and hide their "coming soon" empty state as soon as there's at least one entry. Keep `alt` text descriptive — it's read aloud by screen readers.

3. For the barber's own portrait (used on Home and About), set `barberPhoto` in `config.js` to the image path, e.g. `barberPhoto: "/assets/gallery/portrait.jpg"`. Both pages hide the portrait block entirely (and reflow to full width) until this is set.

## 7. Dependencies

Confirmed: **zero npm dependencies**, `package.json` has none, and there is intentionally no build command configured in Cloudflare Pages (Framework preset: None, Build command: blank, Build output directory: `public`). Every external API call — Stripe, Resend, Turnstile — goes over plain `fetch()` to each service's REST API, and webhook signature verification uses the Web Crypto API built into the Cloudflare Workers runtime. This is why the earlier "Could not resolve 'stripe'" build failure can't recur: there's nothing for a bundler to resolve.

## 8. Placeholder-free confirmation

Every page was checked for leftover placeholder markup, placeholder classes (`.ph`, `.ph-note`), fabricated reviews, "[bracketed]" filler text, and stock/AI photo language — none remain. Sections that depend on content that doesn't exist yet (reviews, gallery, portrait) render an honest, clearly-worded empty state instead of a placeholder, and appear automatically the moment real content is added to `config.js`. All Google Review buttons and links have been removed; Zelle and Venmo have been removed; Cash, Cash App (unlinked until a handle is added), and Apple Pay are listed instead.

## 9. Cloudflare Pages compatibility confirmation

- No build step, no bundler, no npm install required — matches this project's existing (working) Cloudflare Pages configuration.
- All server logic lives in `functions/api/*.js` and `functions/sitemap.xml.js` as Cloudflare Pages Functions (file-based routing), using only Web-standard APIs (`fetch`, `crypto.subtle`, `Request`/`Response`) available in the Workers runtime — no Node-only APIs.
- `_headers` and `robots.txt` are both plain static files Cloudflare Pages reads automatically at deploy time; no dashboard configuration needed for them.

## 10. What changed in this pass — quick summary

- Real bio, business info, address, hours, and social links (including new TikTok and YouTube) are live in `config.js`.
- Booking/walk-in/late-arrival/deposit policy wording is shown on Home and Contact, worded exactly as specified.
- The referral offer now requires all three referred clients to book the **same day**.
- All Google Review content is gone; Reviews page points to TheCut instead, and both Reviews and Gallery hide cleanly until real content exists.
- Payment methods are Cash, Cash App (unlinked until a handle is set), and Apple Pay — no Zelle, no Venmo.
- The website-build offer is now **$399 starting price / $199 deposit / $200 remaining**, 1–2 business days, nationwide, with a "custom features may require a separate quote" note.
- A prominent "Get Your Website" nav pill links to a rebuilt, fully indexable `barber-website.html` with a real application form (name, business, email, phone, city/state, social, booking link, domain ownership, features, launch date, budget, notes) plus a payment/refund policy acknowledgment checkbox — wired to `/api/apply` (emails the application via Resend) and then `/api/website-deposit` (Stripe Checkout).
- `functions/api/website-deposit.js` now accepts applicant name/email/business for Stripe metadata and `customer_email`, uses an idempotency key to avoid duplicate charges from double-clicks, and reflects the new $199/$200 figures.
- `functions/api/stripe-webhook.js` is new: verifies Stripe's signature by hand (Web Crypto, no SDK) and sends a backup payment-confirmation email.
- Full SEO pass: real titles/descriptions, canonical URLs, Open Graph tags, and `BarberShop` JSON-LD structured data on Home and Contact; `sitemap.xml` now includes `barber-website.html` since it's a real, discoverable page now.
- Accessibility pass: a skip-to-content link and `<main>` landmark on every page, labeled form fields, visible focus states, and a hidden-but-accessible honeypot field on the application form.
