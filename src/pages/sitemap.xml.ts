import { getCollection } from "astro:content";

const siteUrl = "https://popstarlawngames.com";

const escapeXml = (value: string) =>
  value.replace(/[<>&'\"]/g, (character) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    "'": "&apos;",
    '"': "&quot;",
  })[character] ?? character);

const formatDate = (date: Date) => date.toISOString().slice(0, 10);

export async function GET() {
  const buildTime = new Date();
  const posts = (await getCollection("blog"))
    .filter((post) => post.data.publishedDate.valueOf() <= buildTime.valueOf())
    .sort((a, b) => a.data.publishedDate.valueOf() - b.data.publishedDate.valueOf());

  const latestPostDate = posts.reduce(
    (latest, post) => {
      const modified = post.data.updatedDate ?? post.data.publishedDate;
      return modified.valueOf() > latest.valueOf() ? modified : latest;
    },
    new Date("2026-08-08T00:00:00.000Z"),
  );

  const urls = [
    { loc: `${siteUrl}/`, lastmod: "2026-08-10" },
    { loc: `${siteUrl}/blog/`, lastmod: formatDate(latestPostDate) },
    ...posts.map((post) => ({
      loc: `${siteUrl}/blog/${post.id}/`,
      lastmod: formatDate(post.data.updatedDate ?? post.data.publishedDate),
    })),
  ];

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map(
      ({ loc, lastmod }) =>
        `  <url>\n    <loc>${escapeXml(loc)}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`,
    ),
    "</urlset>",
    "",
  ].join("\n");

  return new Response(body, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
