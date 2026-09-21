// GET /sitemap.xml — generated at request time so it always matches the
// actual deployed domain, with no hardcoded hostname to keep in sync.
// barber-website.html is intentionally left out: it's a quiet footer link
// for shop owners, not something meant to show up in search results.

const PAGES = [
  '/',
  '/services.html',
  '/gallery.html',
  '/about.html',
  '/reviews.html',
  '/contact.html',
  '/offer.html',
];

export async function onRequestGet({ request }) {
  const origin = new URL(request.url).origin;
  const urls = PAGES.map(
    (p) => `  <url><loc>${origin}${p}</loc></url>`
  ).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;

  return new Response(xml, {
    headers: { 'content-type': 'application/xml' },
  });
}
