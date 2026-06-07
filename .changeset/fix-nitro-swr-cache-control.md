---
'@aws-amplify/hosting': patch
---

Fix Nitro SWR route rules emitting hard caching instead of
stale-while-revalidate. A rule like `routeRules: { '/news': { swr: 30 } }`
(or `cache: { swr: true, maxAge: 30 }`) emitted
`Cache-Control: public, max-age=30, s-maxage=30` — the opposite of SWR, and it
let browsers pin the response for 30s with no revalidation. SWR rules now emit
`public, s-maxage=N, stale-while-revalidate=…` with no `max-age`, so CloudFront
serves the stale edge copy while revalidating and browsers always revalidate.
Plain `cache.maxAge` (non-SWR) is unchanged.
