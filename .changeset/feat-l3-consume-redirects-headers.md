---
'@aws-amplify/hosting': minor
---

feat(hosting): L3 consumes manifest.redirects[] and manifest.headers[]

The Nitro adapter has emitted both fields since the asset-gaps PR but
the L3 ignored them, leaving Nuxt route rules like
`'/old-page': { redirect: '/about' }` and
`'/headers-test': { headers: { ... } }` to be handled by the SSR Lambda
on every request — correct user-visible behavior, but every redirect /
custom-headered response cost a Lambda invocation.

L3 now wires both:

- **Redirects** — encoded into the existing CloudFront viewer-request
  function (one per behavior cap, so we extend the build-id-rewrite
  function on the static path and the forwarded-host function on the
  compute path with the same redirect table). Matching redirects return
  the 30x at the edge — no Lambda invocation, sub-millisecond response.
  Supports exact match (`/old`), prefix wildcard (`/old/*`), and tail
  forwarding when destination also ends in `*` (`/old/* -> /new/*`
  rewrites the captured tail).

- **Custom headers** — for each `manifest.headers[]` entry, a
  per-pattern `ResponseHeadersPolicy` is attached to the matching
  CloudFront behavior. The policy bundles the security headers + the
  custom headers, so security headers stay applied. If no behavior
  exists for the source pattern, a static behavior is synthesized.

Limits: 100 redirect rules per CloudFront Function (10 KB compiled cap).
Custom-headers entries can't exceed the CloudFront 24-additional-behavior
cap; ones that would are skipped with a warning. Both limits are
documented in the new generators.

Tests: defaults.test.ts adds 11 cases covering the generated function
runtime semantics (exact match, suffix wildcard, tail forwarding, status
validation, MAX cap). Hosting test suite stays at 342/342 green.
