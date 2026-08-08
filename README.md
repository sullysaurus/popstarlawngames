# Popstar Lawn Games

Premium, date-first lawn-game rental storefront and SEO playbook built with Astro.

## Commands

```sh
npm install
npm run dev
npm run check
npm run build
```

The current inquiry flow is a working front-end prototype. The next integration point is a rental
platform such as Goodshuffle Pro for live inventory, proposals, contracts, deposits, and payments.

To send inquiry forms directly to a form service or booking webhook, copy `.env.example` to `.env`
and set `PUBLIC_BOOKING_FORM_ENDPOINT`. Without an endpoint, the form opens a pre-filled email to
`PUBLIC_BOOKING_EMAIL`, so a visitor never reaches a dead end.

Video asset specifications live in `public/assets/README.md`.

## Publishing a guide

Add a Markdown file to `src/content/blog/` using the frontmatter schema in
`src/content.config.ts`. Astro automatically adds it to the Playbook index and builds its route.
