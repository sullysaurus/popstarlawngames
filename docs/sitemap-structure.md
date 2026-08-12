# Sitemap structure

The production sitemap is generated at `/sitemap.xml` during each Astro build.

Included URLs:

- Homepage
- Blog index
- Blog articles whose `publishedDate` has arrived

Excluded URLs:

- Future-dated articles
- Noindex SEO dashboard
- API endpoints

The nightly SEO GitHub Action triggers a Netlify build, so a scheduled article enters the sitemap on the same deployment that makes its page public. The sitemap is referenced from `/robots.txt` and submitted to the `sc-domain:popstarlawngames.com` Search Console property.
