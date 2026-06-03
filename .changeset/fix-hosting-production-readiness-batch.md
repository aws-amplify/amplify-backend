---
'@aws-amplify/hosting': patch
---

fix(hosting): production-readiness batch addressing pre-GA review findings.

Security (P0):

- Image-opt Lambda now enforces `IMAGE_REMOTE_PATTERNS` / `IMAGE_ALLOWED_HOSTNAMES` / `IMAGE_ALLOW_SVG` at runtime (default-deny). Previously the env vars were stamped but never read, leaving the optimizer as an SSRF primitive that could fetch any URL it could reach (incl. internal VPC hosts).
- REST API stage `prod` is now gated by a CloudFront-only secret: a synth-time random value is injected on every origin request via `HttpOrigin.customHeaders` and required by an API GW resource policy keyed on `aws:Referer`. Direct hits to `https://{id}.execute-api.{region}.amazonaws.com/prod/...` are 403'd by API GW before the Lambda fires, restoring the WAF / CSP / HSTS / geo-restriction guarantees that previously only applied to viewers reaching us through CloudFront.

Customer-visible correctness (P1):

- Skew-protection cookie is no longer set on 4xx/5xx HTML responses — a viewer hitting a 503 mid-deploy no longer pins to the broken build for 24h.
- Astro hybrid mode emits both subtree (`/<name>/*`) and bare (`/<name>`) static behaviors regardless of `trailingSlash` mode, so prerendered routes never silently fall through to the SSR Lambda.
- Nitro cache plugin watches for `useStorage('cache')` displacement via `nitro.hook('storage:mounts')` + per-request fallback and re-binds the S3 backend with a one-time warning. Previously a later-named user plugin could shadow the Amplify mount and cache hit rate would silently drop to 0% across Lambda containers.
- Font Content-Type enforcement moved from per-extension `BucketDeployment` to per-pattern `ResponseHeadersPolicy`. RHP overrides origin headers, so even when S3 stored the file as `binary/octet-stream` the response carries the right `font/woff2` etc. Removes 5 BucketDeployments × ~30s deploy time.
- Next.js trailing-slash redirects now read from `prerender-manifest.json#routes` plus `routes-manifest.json#staticRoutes` and `app-paths-manifest.json` (App Router). Previously dynamic routes prerendered via `generateStaticParams` had inconsistent canonical-form behavior between known and unknown params.

Cost / quota (P2):

- Default S3 build retention dropped from 365 → 30 days. Customers who need longer rollback windows opt in via `storage.buildRetentionDays`.
- Per-pattern `ResponseHeadersPolicy` fingerprint now includes the security-header inputs (CSP value). Toggling `cdn.contentSecurityPolicy` no longer churns new policies on every deploy and burns the account-wide RHP quota.
- `assetPrefix` collapsed from 4 prefixed cache behaviors (`_next/static/*`, `_next/image*`, `_next/data/*`, `_next/*`) to a single `<assetPrefix>/*` behavior backed by the same strip function, freeing 3 CloudFront behavior slots per deploy.

Ops (P3):

- Default `monitoring: { enabled: true }` is OFF; opt in to wire CloudFront 5xx, SSR Lambda errors/throttles, image-opt errors, and revalidation DLQ depth alarms. SNS topic ARN surfaced as a CFN output.
- Lambda log retention default bumped from 14 → 30 days (image-opt + middleware now propagate the SSR retention setting).
- `acquireLock` deadline bumped from 1h → 4h so first-time deploys with custom domain + ACM validation aren't treated as stale by a concurrent deploy attempt.
- `resolveProjectDir` walks up from cwd to nearest `package.json` (override via `AMPLIFY_HOSTING_PROJECT_DIR`). Deploys from a subdirectory now error clearly instead of failing inside the adapter.

Drift gate (X.1):

- Adapters export `VERIFIED_OPENNEXT_RANGE` / `VERIFIED_NITRO_RANGE` / `VERIFIED_ASTRO_RANGE`. New unit test (`version_pins.test.ts`) asserts each is a parseable semver range with an explicit upper bound, so contributors can't ship an open-ended pin that silently considers a future major "verified".
