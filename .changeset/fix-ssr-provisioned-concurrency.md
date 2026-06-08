---
'@aws-amplify/hosting': patch
---

Fix `compute.provisionedConcurrency` being inert for SSR. The L3 forwarded only
memory/timeout/reserved-concurrency to the SSR compute, so the documented
cold-start remedy provisioned nothing; even if an alias had existed, the SSR
REST API integration targeted `$LATEST`. Now the construct forwards
`provisionedConcurrency` to the SSR Lambda, creates a `live` alias with that
many warm execution environments (even though SSR has no Function URL), and
points the REST API integration at the alias so the warm instances actually
serve traffic. Warmup is correctly skipped when provisioned concurrency is set
via the prop (previously only the manifest value was checked).
