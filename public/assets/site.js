/* =========================================================================
   Shared chrome: nav, footer, mobile menu, Book Now wiring, and small
   render helpers shared across pages (hide-when-empty sections, contact
   rows that only render when real data exists).
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

    const onWebsitePage = path.endsWith("/barber-website.html");

    el.innerHTML = `
      <header class="site-nav">
        <div class="nav-row">
          <a href="/" class="nav-logo">${S.name || "SBS Cuts"}</a>
          <button class="nav-toggle" id="navToggle" aria-label="Toggle menu" aria-expanded="false">Menu</button>
          <nav class="nav-links" id="navLinks">
            ${links}
            <a href="/barber-website.html" class="nav-pill"${onWebsitePage ? ' aria-current="page"' : ""}>Get Your Website</a>
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
    const social = S.social || {};

    el.innerHTML = `
      <footer class="site-footer">
        <div class="container">
          <div class="footer-grid">
            <div class="footer-col">
              <h4>${S.name || "SBS Cuts"}</h4>
              <p>${S.tagline || ""}</p>
              <a href="${S.bookingUrl || '#'}" class="js-book" target="_blank" rel="noopener">Book an appointment &rarr;</a>
            </div>
            <div class="footer-col">
              <h4>Visit</h4>
              ${addr.line1 ? `<p>${addr.line1}</p>` : ""}
              ${addr.line2 ? `<p>${addr.line2}</p>` : ""}
              ${addr.mapUrl ? `<a href="${addr.mapUrl}" target="_blank" rel="noopener">Get directions &rarr;</a>` : ""}
            </div>
            <div class="footer-col">
              <h4>Connect</h4>
              ${S.email ? `<a href="mailto:${S.email}">${S.email}</a>` : ""}
              ${social.instagram ? `<a href="${social.instagram}" target="_blank" rel="noopener">Instagram</a>` : ""}
              ${social.tiktok ? `<a href="${social.tiktok}" target="_blank" rel="noopener">TikTok</a>` : ""}
              ${social.youtube ? `<a href="${social.youtube}" target="_blank" rel="noopener">YouTube</a>` : ""}
            </div>
          </div>
          <div class="footer-bottom">
            <div class="copyright">&copy; ${new Date().getFullYear()} ${S.name || "SBS Cuts"}. All rights reserved.</div>
            <div class="upsell-link">Own a shop? <a href="/barber-website.html">Get a site like this one &rarr;</a></div>
          </div>
        </div>
      </footer>`;
  }

  function bindBookButtons() {
    document.querySelectorAll(".js-book").forEach(btn => {
      btn.setAttribute("href", S.bookingUrl || "#");
    });
  }

  // Renders a <tr> for a contact-style row only when the value is
  // truthy — callers simply don't get a row for data that doesn't exist,
  // instead of a placeholder-looking blank cell.
  window.renderRowIfPresent = function (tbody, label, valueHtml) {
    if (!valueHtml) return;
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${label}</td><td>${valueHtml}</td>`;
    tbody.appendChild(tr);
  };

  document.addEventListener("DOMContentLoaded", function () {
    renderNav();
    renderFooter();
    bindBookButtons();
  });
})();
