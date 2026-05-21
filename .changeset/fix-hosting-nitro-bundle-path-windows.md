---
'@aws-amplify/hosting': patch
---

Resolve Nitro's server bundle (`nitro.mjs`) under `.output/server/chunks/` regardless of which subdirectory Nitro emits it into. Nitro v2's `getChunkName` does an `id.startsWith(runtimeDir)` prefix match where `id` is Rollup's POSIX-normalized path but `runtimeDir` is `path.resolve()`'d (OS-specific separators). On Windows the match fails and `nitro.mjs` falls through to the `chunks/_/` catch-all bucket; on Linux/macOS it lands in `chunks/nitro/`. The hosting Nitro adapter previously hardcoded `chunks/nitro/nitro.mjs`, which silently disabled both the bundled-routeRules extraction and the API Gateway REST handler patch on Windows builds — every URL rendered as `/` and `POST /api/echo` returned `text/html` instead of `application/json`. The adapter now probes `chunks/nitro/`, `chunks/_/`, then any `chunks/*/` for `nitro.mjs`.
