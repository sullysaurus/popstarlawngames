# Video slots

The storefront has prepared video shells for these files:

- `hero-party-loop.mp4` — 8–10 second wide establishing shot, 16:10 or 16:9
- `social-set-loop.mp4` — 5–7 second close-up, 4:3
- `celebration-set-loop.mp4` — 5–7 second guest interaction, 4:3
- `field-day-loop.mp4` — 5–7 second branded corporate moment, 4:3

Export silent H.264 MP4 files, ideally under 2 MB each. Each clip should have a clean loop,
minimal camera movement, saturated daylight color, and room for the site typography and stickers.
The CSS illustrations remain visible as lightweight fallbacks. When clips are ready, change each
matching `<source data-src="…">` in `src/pages/index.astro` to `<source src="…">`. The loaded video will then
reveal itself automatically.

The current JPG photographs are AI-generated art-direction references. Replace them with real
inventory photography before launch so the site accurately represents the delivered products.
