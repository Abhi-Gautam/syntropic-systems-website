# Syntropic Systems

The source for [syntropicsystems.dev](https://syntropicsystems.dev): Abhishek Gautam’s engineering publication and project laboratory.

## Local development

Requirements:

- Node.js compatible with Astro 7
- Playwright Chromium for browser regression tests

```bash
npm install
npx playwright install chromium
npm run dev
```

`npm run dev` synchronizes project-owned Markdown and assets before Astro starts.

## Build and validation

```bash
npm test
npm run check
npm run build
npm run test:browser
```

The build fails when canonical Markdown or SVG media is unavailable, media has no alt text, an SVG violates the responsive/accessibility contract, or Astro cannot render the imported content.

## Content ownership

Project repositories own their canonical articles and project-specific media. This repository owns shared layouts, styles, imports, validation, and deployment.

Registered sources live in [`content-sources.json`](./content-sources.json). For Animesh:

```text
**/animesh/docs/public/article.md
**/animesh/docs/public/assets/
```

During sync:

```text
project Markdown ──copy/fetch──> src/generated/      (ignored)
project static SVG ──copy/fetch──> public/media/     (ignored)
Astro ──build──> dist/                               (ignored)
```

Generated copies are never canonical and are not committed. Local builds read the registered project checkout; clean CI builds fetch the same explicit files from the configured raw GitHub ref.

## Deployment

Cloudflare Workers serves the static `dist/` directory configured by [`wrangler.jsonc`](./wrangler.jsonc).

```bash
npm run build
npx wrangler deploy
```
