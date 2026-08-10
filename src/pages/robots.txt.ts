const body = `User-agent: *
Allow: /
Disallow: /seo-dashboard/
Disallow: /api/

Sitemap: https://popstarlawngames.com/sitemap.xml
`;

export function GET() {
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
