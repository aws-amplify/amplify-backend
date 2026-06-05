---
'@aws-amplify/hosting': patch
---

fix(hosting): serve prerendered (SSG) Astro pages from S3 instead of the SSR Lambda.

The Astro adapter only routed prerendered pages to S3 when `output: 'hybrid'`. Astro 5 deprecated `hybrid` — the modern pattern is `output: 'server'` with per-page `export const prerender = true`, whose prerendered HTML still lands in `dist/client/`. Gating on `=== 'hybrid'` meant `server`-mode builds sent every prerendered page through the catch-all SSR Lambda, re-rendering frozen HTML on every request (a Lambda invocation + higher TTFB for content S3 serves directly). Now the prerender→S3 walk runs for `server` builds too, capped at 8 pages to respect CloudFront's 24-additional-behavior limit (overflow stays on the Lambda, logged).

Note: this does **not** apply to Next.js/OpenNext. OpenNext stores prerendered output as `.cache` blobs in its incremental cache (read by the SSR Lambda's cache handler, which also drives ISR revalidation and tag purging), not as flat `.html` files servable from S3 — so prerendered Next pages correctly continue to serve through the Lambda. Nuxt/Nitro already served prerendered pages from S3 and is unchanged.
