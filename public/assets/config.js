/* =========================================================================
   SITE CONFIG — the one file to edit for day-to-day changes.
   Every page reads from window.SITE below. Update this file and it
   propagates to every page automatically.

   ADDING REVIEWS LATER: push objects onto `reviews`, shaped like:
     { quote: "Real client quote.", name: "First name or initials", rating: 5 }
   The Reviews section (and the Home preview) is hidden automatically while
   this array is empty, and appears automatically once you add entries.
   Never add a placeholder or fabricated entry here.

   ADDING PHOTOS LATER: drop image files into /public/assets/gallery/ and
   push entries onto `gallery`, shaped like:
     { src: "/assets/gallery/fade-01.jpg", alt: "Skin fade with hard part" }
   Photo-dependent sections (Home preview, Gallery page, About portrait)
   hide automatically while their list is empty and appear automatically
   once you add entries. Keep alt text descriptive for accessibility.
   ========================================================================= */

window.SITE = {

  // ---- Identity -----------------------------------------------------
  name: "SBS Cuts",
  barberName: "Seraphim Davis",
  tagline: "Clean fades, tapers, and lineups — a professional experience in every chair.",
  founded: "2022",
  experienceLine: "Cutting professionally since 2022 · experience across 3+ barbershops",

  // Homepage (short) and About page (full) biography — verbatim, do not
  // edit casually; these were written and approved by the business owner.
  bioShort: "Seraphim Davis is the barber and entrepreneur behind SBS Cuts. Cutting professionally since 2022, he has gained experience across more than three barbershops while developing a reputation for clean work, attention to detail, and a professional client experience. His Christian faith, business education, creative personality, and experience across multiple entrepreneurial ventures shape how he serves clients and continues building SBS Cuts in Norfolk.",

  bioFull: [
    "Seraphim Davis is the barber and entrepreneur behind SBS Cuts. He began cutting hair in 2022 and has developed his experience across more than three barbershops, learning how different environments, clients, and professionals approach the craft. His work is centered on clean fades, tapers, lineups, attention to detail, and creating a professional experience where every client feels comfortable, respected, and confident in the final result.",
    "A committed Christian, Seraphim strives to let his faith shape how he works and treats people. His values of integrity, discipline, humility, service, and continuous growth influence both his barbering and his approach to business. SBS Cuts welcomes clients from every background while maintaining an environment built on respect and professionalism.",
    "Seraphim studied Business Administration and business-management principles at Virginia State University. His education, combined with hands-on entrepreneurial experience, has helped him understand branding, customer service, marketing, operations, and the importance of building lasting client relationships.",
    "Outside of barbering, Seraphim has pursued several entrepreneurial ventures involving clothing resale, custom automotive services, apparel development, content creation, and website development for barbers. Each venture reflects his creative mindset, willingness to learn, and determination to build opportunities through practical skills.",
    "Known for being personable, ambitious, creative, and detail-oriented, Seraphim enjoys connecting with people while taking his work seriously. He is committed to improving his craft, expanding SBS Cuts throughout Norfolk, and helping other entrepreneurs present their businesses professionally. For him, barbering is more than completing a haircut — it is an opportunity to serve people, build trust, and leave every client feeling better than when they arrived."
  ],

  // ---- Booking --------------------------------------------------------
  bookingUrl: "http://book.thecut.co/Seraphim-Davis-sd4e0it",

  // ---- Booking / walk-in policy ----------------------------------------
  policies: {
    walkIns: "Walk-ins are welcome. Scheduled appointments are always given priority.",
    lateArrival: "Appointments receive priority at their scheduled time. If you arrive late, your reserved appointment time may be released so the next client can be served. You may still be accommodated, but you may have to wait for the next available opening.",
    deposit: "No deposit is required for regular appointments — unless you've previously missed an appointment without notice."
  },

  // ---- Contact ----------------------------------------------------------
  email: "sbscuts@gmail.com",
  phone: "", // none on file — the phone row is hidden automatically until this is set
  address: {
    line1: "8206 Hampton Blvd",
    line2: "Norfolk, VA 23505",
    mapUrl: "https://www.google.com/maps/dir/?api=1&destination=8206+Hampton+Blvd%2C+Norfolk%2C+VA+23505"
  },

  // ---- Hours ------------------------------------------------------------
  // Sunday-first to line up with JavaScript's Date.getDay() (0 = Sunday).
  hours: [
    { day: "Sunday", time: "10am – 5pm" },
    { day: "Monday", time: "10am – 7pm" },
    { day: "Tuesday", time: "9am – 7pm" },
    { day: "Wednesday", time: "9am – 7pm" },
    { day: "Thursday", time: "9am – 7pm" },
    { day: "Friday", time: "9am – 7pm" },
    { day: "Saturday", time: "8am – 7pm" }
  ],

  // ---- Social -------------------------------------------------------
  // No Google Business review link exists — reviews are handled through
  // TheCut booking profile instead. Never add a Google review link here
  // until a real one exists.
  social: {
    instagram: "https://instagram.com/sbscuts",
    tiktok: "https://www.tiktok.com/@sbscutss",
    youtube: "https://www.youtube.com/@sbscuts"
  },

  // ---- Payment (in person) ---------------------------------------------
  // Cash App is accepted but no handle is published yet — it's listed as
  // an accepted method without being a clickable payment link. Add
  // `payment.cashapp.handle` (e.g. "$SBSCuts") once verified and the
  // contact page will turn it into a link automatically.
  payment: {
    cash: true,
    applePay: true,
    cashapp: { accepted: true, handle: "" }
  },

  // ---- Services -----------------------------------------------------
  services: [
    { name: "Adult Cut", price: "$35", duration: "40 min", description: "Full haircut and lineup, with an optional straight razor finish and/or enhancements." },
    { name: "Shape Up (Adult)", price: "$20", duration: "20 min", description: "Shape up only, including enhancement and a straight razor finish. No clippers or guards." },
    { name: "Head Shave", price: "$35", duration: "30 min", description: "Head shave without a straight razor on the scalp. Beard shaping included if needed." },
    { name: "Eyebrow Shape Up", price: "$10", duration: "10 min", description: "Eyebrow shaping only." },
    { name: "Kids Cut", price: "$25", duration: "35 min", description: "For ages 17 and under. Full haircut and lineup, with an optional straight razor finish and/or enhancements." },
    { name: "Kids Shape Up", price: "$15", duration: "20 min", description: "For ages 17 and under. Shape up only, including enhancement and a straight razor finish. No clippers or guards." },
    { name: "Beard Clean Up/Shape Up", price: "$20", duration: "20 min", description: "Beard shaping and cleanup where needed, with a razor finish." },
    { name: "House Calls", price: "Starting at $60", duration: "Varies", description: "On-location cuts. Contact for availability and details." }
  ],

  // ---- First-time / referral offer ------------------------------------
  offer: {
    active: true,
    headline: "Bring 3, Get Yours Free",
    terms: "Bring three separate clients with you, each booking and paying for their own service on the same day as yours, and your own regular haircut service — including everything normally included with it — is free."
  },

  // ---- Reviews (empty by design — see file header for how to add) -----
  reviews: [],

  // ---- Gallery (empty by design — see file header for how to add) -----
  gallery: [],

  // ---- Portrait photo (empty by design) --------------------------------
  // The Home and About page portrait blocks are hidden entirely until
  // this is set. Add a real photo to /public/assets/gallery/ and point
  // this at it, e.g. "/assets/gallery/portrait.jpg".
  barberPhoto: "",

  // ---- Barber-website service (nationwide) -----------------------------
  websiteOffer: {
    startingPrice: "$399",
    depositPrice: "$199",
    remainingPrice: "$200",
    productionTime: "1–2 business days",
    availability: "Nationwide",
    note: "$399 is the starting price for everything currently on this site. Additional or custom features may require a separate quote."
  },

  // ---- Site-wide -----------------------------------------------------
  // Update this once a custom domain is live — it's used for canonical
  // links, Open Graph tags, and structured data across every page.
  siteUrl: "https://sbscuts.pages.dev",

  // ---- Spam protection for the application form (optional) -------------
  // Leave blank to run on the built-in honeypot + timing check only. To
  // add Cloudflare Turnstile: create a Turnstile widget in the Cloudflare
  // dashboard, put its Site Key here, and put its Secret Key in this
  // project's TURNSTILE_SECRET_KEY environment variable — the form and
  // functions/api/apply.js both pick it up automatically once set.
  turnstileSiteKey: ""
};
