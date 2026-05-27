---
'@aws-amplify/hosting': minor
---

Lift framework-config work into CloudFront primitives. Two improvements:

- **Next.js multi-matcher edge functions**: `detectEdgeRoutes` now iterates every `matchers[]` entry per function. Customers writing `export const config = { matcher: ['/admin/:path*', '/api/admin/:path*'] }` no longer lose every matcher after the first to the regular SSR Lambda.
- **Astro redirects lift**: `astro.config.{ts,mjs}` `redirects:` table is now lifted onto `manifest.redirects[]` (string shorthand → 301; object form `{ destination, status }` honored). Capped at 100 entries (matches the Next.js cap) so the compiled CloudFront viewer Function stays under 10 KB; overflow stays in the Astro SSR Lambda.

A planned third change — replacing the hand-rolled JS-literal parser (`extractJsonObjectAfter`) in the Nitro adapter with a direct `nitro.json` read — was deferred. As of Nitro 2.13.4 / Nuxt 4.4.6 (latest stable at the time of this PR), `routeRules` is not present in `.output/nitro.json`, so the bundle scanner remains the only source. Tracked as a follow-up.
