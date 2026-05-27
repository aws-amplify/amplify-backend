---
'@aws-amplify/hosting': minor
---

Add Astro 4+ framework adapter (`output: 'static' | 'server' | 'hybrid'`), inline-replace hand-rolled file walks and copy logic with `fast-glob` + `fs.cpSync`, extract `readProjectDeps`/`readProjectDepsStrict`, add optional `imageOptimization.domains` allowlist to the deploy manifest, and promote silent OpenNext patch-pattern misses to `UpstreamPatchPatternChangedError` (set `AMPLIFY_HOSTING_LENIENT_PATCHES=1` to revert to a warning).
