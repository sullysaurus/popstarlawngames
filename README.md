# Popstar Lawn Games

Premium, date-first lawn-game rental storefront and SEO playbook built with Astro.

## Commands

```sh
npm install
npm run dev
npm run check
npm run build
```

Availability requests use a native Netlify form named `availability-request`. Netlify detects the
form during deploy, stores submissions in the site dashboard, and redirects successful requests to
`/thanks/`. No inventory or checkout platform is required.

Video asset specifications live in `public/assets/README.md`.

## SEO command center

The nightly GitHub Action collects GA4, Google Search Console, and capped Keywords Everywhere
data; builds a private HTML dashboard; and scores a review-first content queue. Approved queue
items are drafted locally with Codex, without an OpenAI API key. Nothing publishes without a merge.

The preferred drafting flow is local and does not require the OpenAI API:

```sh
npm run content:queue
npm run content:brief -- next
```

Then ask Codex: `Use $popstar-content-engine to draft the next queued article locally.`

The website dashboard lives at `https://popstarlawngames.com/seo-dashboard/`. A separate Netlify
ingestion token protects report uploads.

See [`docs/seo-dashboard-setup.md`](docs/seo-dashboard-setup.md) for the one-time Google access,
GitHub secrets, costs, and editorial workflow.

```sh
npm run test:seo
npm run seo:dashboard
```

## Publishing a guide

Add a Markdown file to `src/content/blog/` using the frontmatter schema in
`src/content.config.ts`. Astro automatically adds it to the Playbook index and builds its route.
