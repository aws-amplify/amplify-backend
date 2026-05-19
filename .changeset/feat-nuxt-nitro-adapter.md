---
'@aws-amplify/hosting': minor
---

Add Nuxt and Nitro framework adapter for `@aws-amplify/hosting`.

A single `nitroAdapter` handles every Nitro-based framework — Nuxt, SolidStart, Analog, TanStack Start, and standalone Nitro apps. Auto-detection (`detectFramework()`) returns `'nitro'` for `nuxt`, `nitropack`, `@solidjs/start`, `@analogjs/platform-server`, and `@tanstack/start`. A thin `nuxt.ts` alias re-exports `nitroAdapter` so explicit `framework: 'nuxt'` callers keep working.

Features:

- Streaming SSR via Lambda response streaming (`nitro.awsLambda.streaming: true`).
- ISR / SWR cache: when `swr` / `isr` / `cache` route rules are present, the adapter injects a Nitro plugin that mounts an S3-backed `unstorage` driver. The L3 provisions a dedicated S3 bucket for cache state.
- Image optimization via IPX: when `@nuxt/image` is in the project's dependencies, the adapter materialises a dedicated IPX Lambda; `/_ipx/*` routes hit the image-opt Lambda, which fetches originals from the static-assets bucket via its execution role.
