---
'@aws-amplify/hosting': minor
---

Lift Nitro `routeRules.cors: true` and `routeRules.cache.maxAge` into manifest.headers so CloudFront serves CORS and edge-cacheable Cache-Control without a Lambda invocation. User-declared `headers: { ... }` always wins over auto-emitted entries.
