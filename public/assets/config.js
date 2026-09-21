/* =========================================================================
   SITE CONFIG — the one file to edit.
   Every page on this site reads from window.SITE below. Fill in the real
   values here and they will update everywhere automatically (nav, footer,
   Book Now buttons, prices, hours, etc). You do NOT need to touch any of
   the individual page files for normal edits.

   Anything wrapped like "[ ... ]" is a placeholder — nothing on this site
   was invented or guessed. Replace the bracketed text with your real
   information before you launch. Fields are also visually flagged with a
   dashed underline on the live pages so they're easy to spot.
   ========================================================================= */

window.SITE = {

  // ---- Identity -----------------------------------------------------
  name: "SBS Cuts",
  tagline: "[A short line describing your chair — e.g. \"Classic cuts, straight razor shaves, no rush.\"]",
  founded: "[Year you started cutting hair]",
  credentialLine: "[Confirm exact wording — e.g. \"Licensed Barber, State of ___\" or \"___ years behind the chair\"]",

  // ---- Booking --------------------------------------------------------
  // Used by every "Book Now" button on the site, including the one next
  // to each individual service.
  bookingUrl: "http://book.thecut.co/Seraphim-Davis-sd4e0it",

  // ---- Contact ----------------------------------------------------------
  email: "sbscuts@gmail.com",
  phone: "[Optional — (555) 555-5555]",
  address: {
    line1: "[Street address]",
    line2: "[City, State ZIP]",
    mapUrl: "#map-link-placeholder"
  },

  // ---- Hours ------------------------------------------------------------
  // Shown on Home and Contact. Sunday-first order on purpose — it lines up
  // with JavaScript's Date.getDay() (0 = Sunday) so the Home page can show
  // "today's hours" automatically. Keep this order if you edit it.
  hours: [
    { day: "Sunday", time: "10am – 5pm" },
    { day: "Monday", time: "10am – 7pm" },
    { day: "Tuesday", time: "9am – 7pm" },
    { day: "Wednesday", time: "9am – 7pm" },
    { day: "Thursday", time: "9am – 7pm" },
    { day: "Friday", time: "9am – 7pm" },
    { day: "Saturday", time: "8am – 7pm" }
  ],

  // ---- Social / reviews ---------------------------------------------
  social: {
    instagram: "https://instagram.com/sbscuts",
    youtube: "#youtube-link-placeholder",
    googleReviewUrl: "#google-review-link-placeholder"
  },

  // ---- Payment (for walk-ins / no-card days, if you take these) --------
  payment: {
    cashapp: "[$CashtagPlaceholder or leave blank if not offered]",
    venmo: "[@Venmo-handle-placeholder or leave blank if not offered]",
    zelle: "[Confirmed Zelle recipient name/number/email or leave blank]"
  },

  // ---- Services -----------------------------------------------------
  // Edit this list freely — it drives both the Home preview and the full
  // Services page automatically. Each service gets its own "Book Now"
  // link (using bookingUrl above) rather than any in-page scheduler.
  services: [
    { name: "Adult Cut", price: "$35", duration: "40 min", description: "Full haircut and lineup, with an optional straight razor finish and/or enhancements." },
    { name: "Shape Up (Adult)", price: "$20", duration: "20 min", description: "Shape up only, including enhancement and a straight razor finish. No clippers or guards." },
    { name: "Head Shave", price: "$35", duration: "30 min", description: "Head shave without a straight razor on the scalp. Beard shaping included if needed." },
    { name: "Eyebrow Shape Up", price: "$10", duration: "10 min", description: "Eyebrow shaping only." },
    { name: "Kids Cut", price: "$25", duration: "35 min", description: "For ages 17 and under. Full haircut and lineup, with an optional straight razor finish and/or enhancements." },
    { name: "Kids Shape Up", price: "$15", duration: "20 min", description: "For ages 17 and under. Shape up only, including enhancement and a straight razor finish. No clippers or guards." },
    { name: "Beard Clean Up/Shape Up", price: "$20", duration: "20 min", description: "Beard shaping and cleanup where needed, with a razor finish." },
    { name: "House Calls", price: "Starting at $60", duration: "TBD", description: "[Confirm what's included, travel radius/fee, and availability before launch.]" }
  ],

  // ---- First-time / referral offer ------------------------------------
  // Set active to true once you confirm this offer is currently running,
  // and edit the terms line to match exactly what you want to promise.
  offer: {
    active: true,
    headline: "Bring 3, Get Yours Free",
    terms: "Bring three separate clients with you and only YOUR cut is free — that's 4 people total: the individual trying to get the free cut, plus three separate individuals each getting their own paid service."
  },

  // ---- Barber-website upsell (footer link only, kept quiet) -----------
  // Priced lower than sergotstock's $599/$299.99 split since this build is
  // simpler in scope (no cart, no inventory locking, no admin panel to
  // build — just the same static-page system with a config file to edit).
  // These are DISPLAY-ONLY strings; the actual charged amount lives in
  // functions/api/website-deposit.js (DEPOSIT_CENTS) — keep both in sync
  // if you ever change the price.
  websiteOffer: {
    totalPrice: "$399",
    depositPrice: "$199.99",
    remainingPrice: "$199.01"
  }
};
