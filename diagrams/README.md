# Diagrams

Hand-drawn blog diagrams, drawn with [rough.js](https://roughjs.com) at
generation time and committed as static SVG to `src/content/blog/diagrams/`.
Nothing runs in the browser.

```sh
bun run diagrams
```

This regenerates the SVGs and clears Astro's content caches, which don't
notice SVG-only changes. Stop `bun run dev` before running it and start it
again afterwards, or the running server keeps serving the old diagrams.

In a post, reference a diagram as an image on its own line:

```md
![Alt text describing the diagram](./diagrams/saltrss-architecture.svg)
```

`src/lib/inline-diagrams.ts` inlines it at build time, so it follows the site's
light/dark toggle and fonts. `tests/diagrams.test.ts` fails if the committed
SVGs are out of date.

## Logos

- `icons/cloudflare.svg`, `ubuntu.svg`, `tailscale.svg`, `caddy.svg`, `rss.svg`:
  [Simple Icons](https://simpleicons.org) 16.36.0, CC0-1.0.
- `icons/freshrss.svg`: `p/themes/icons/icon.svg` from the
  [FreshRSS repo](https://github.com/FreshRSS/FreshRSS).
