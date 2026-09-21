/* =========================================================================
   Shared chrome: nav, footer, mobile menu, Book Now wiring, and the
   "still has placeholders" banner. Every page includes this after
   config.js and after the page has <div id="site-header"></div> and
   <div id="site-footer"></div> in place.
   ========================================================================= */

(function () {
  const S = window.SITE || {};

  const NAV_LINKS = [
    { href: "/", label: "Home" },
    { href: "/services.html", label: "Services" },
    { href: "/gallery.html", label: "Gallery" },
    { href: "/about.html", label: "About" },
    { href: "/reviews.html", label: "Reviews" },
    { href: "/contact.html", label: "Contact" }
  ];

  function currentPath() {
    const p = location.pathname;
    return p === "" ? "/" : p;
  }

  function renderNav() {
    const el = document.getElementById("site-header");
    if (!el) return;
    const path = currentPath();
    const links = NAV_LINKS.map(l => {
      const isHome = l.href === "/" && (path === "/" || path === "/index.html");
      const active = isHome || (l.href !== "/" && path.endsWith(l.href));
      return `<a href="${l.href}"${active ? ' class="active" aria-current="page"' : ""}>${l.label}</a>`;
    }).join("");

    el.innerHTML = `
      <header class="site-nav">
        <div class="nav-row">
          <a href="/" class="nav-logo">${S.name || "[Your Barber Business Name]"}</a>
          <button class="nav-toggle" id="navToggle" aria-label="Toggle menu" aria-expanded="false">Menu</button>
          <nav class="nav-links" id="navLinks">
            ${links}
            <a href="${S.bookingUrl || '#'}" class="btn btn-accent btn-small nav-book js-book" target="_blank" rel="noopener">Book Now</a>
          </nav>
        </div>
      </header>`;

    const toggle = document.getElementById("navToggle");
    const navLinks = document.getElementById("navLinks");
    if (toggle && navLinks) {
      toggle.addEventListener("click", () => {
        const open = navLinks.classList.toggle("open");
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
      });
    }
  }

  function renderFooter() {
    const el = document.getElementById("site-footer");
    if (!el) return;
    const addr = S.address || {};
    el.innerHTML = `
      <footer class="site-footer">
        <div class="container">
          <div class="footer-grid">
            <div class="footer-col">
              <h4>${S.name || "[Your Barber Business Name]"}</h4>
              <p>${S.tagline || "[Your tagline]"}</p>
              <a href="${S.bookingUrl || '#'}" class="js-book" target="_blank" rel="noopener">Book an appointment &rarr;</a>
            </div>
            <div class="footer-col">
              <h4>Visit</h4>
              <p>${addr.line1 || "[Street address]"}</p>
              <p>${addr.line2 || "[City, State ZIP]"}</p>
              <a href="${addr.mapUrl || '#'}" target="_blank" rel="noopener">Get directions &rarr;</a>
            </div>
            <div class="footer-col">
              <h4>Connect</h4>
              <a href="mailto:${(S.email || '').replace(/[\[\]]/g,'')}">${S.email || "[your-business-email@example.com]"}</a>
              ${S.phone ? `<a href="tel:${S.phone.replace(/[^0-9+]/g,'')}">${S.phone}</a>` : ""}
              <a href="${(S.social && S.social.instagram) || '#'}" target="_blank" rel="noopener">Instagram</a>
              <a href="${(S.social && S.social.youtube) || '#'}" target="_blank" rel="noopener">YouTube</a>
              <a href="${(S.social && S.social.googleReviewUrl) || '#'}" target="_blank" rel="noopener">Leave a Google review</a>
            </div>
          </div>
          <div class="footer-bottom">
            <div class="copyright">&copy; ${new Date().getFullYear()} ${S.name || "[Your Barber Business Name]"}. All rights reserved.</div>
            <div class="upsell-link">Own a shop? <a href="/barber-website.html">I build sites like this one &rarr;</a></div>
          </div>
        </div>
      </footer>`;
  }

  function isPlaceholder(val) {
    if (typeof val !== "string") return false;
    return val.includes("[") || val.includes("placeholder") || val === "#";
  }

  // Shared helper other pages use when rendering data-driven fields (like
  // the services list) so any still-unconfirmed value — bracketed text or
  // "TBD" — gets the same dashed placeholder flag as everything else.
  window.phWrap = function (val) {
    if (typeof val !== "string" || !val) return val || "";
    const flagged = val.includes("[") || /^tbd$/i.test(val.trim());
    return flagged
      ? `<span class="ph" title="Placeholder — confirm before launch">${val}</span>`
      : val;
  };

  function renderBuildBanner() {
    // Shows on every page until the core fields are filled in, so a
    // half-configured site never accidentally looks finished to a visitor.
    const coreFields = [S.name, S.bookingUrl, S.email];
    const stillPlaceholder = coreFields.some(isPlaceholder);
    if (!stillPlaceholder) return;
    const banner = document.createElement("div");
    banner.className = "build-banner";
    banner.innerHTML = `<strong>Preview build.</strong> This site still has placeholder info — fill in <code>/assets/config.js</code> before sharing this link publicly.`;
    document.body.insertBefore(banner, document.body.firstChild);
  }

  function bindBookButtons() {
    document.querySelectorAll(".js-book").forEach(btn => {
      btn.setAttribute("href", S.bookingUrl || "#");
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    renderNav();
    renderFooter();
    renderBuildBanner();
    bindBookButtons();
  });
})();
