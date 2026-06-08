---
'@aws-amplify/hosting': patch
---

Fix Astro deploying a dead image-optimization Lambda. The Astro adapter set
`manifest.imageOptimization` (pointing a `type:'handler'` Lambda at Astro's
`entry.handler`, which is an HTTP-server listener) but emitted no route
targeting `/_image`, so CloudFront sent image requests to the catch-all SSR
Lambda while a 1024 MB / reserved-concurrency-10 image Lambda received zero
traffic — and would have crashed on the wrong invocation contract if it ever
had. The adapter no longer emits `imageOptimization` for Astro; `/_image` is
served by Astro's standalone server inside the SSR Lambda, where Astro applies
its own `image.domains` / `image.remotePatterns`.
