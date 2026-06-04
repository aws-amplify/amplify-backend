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
- Font Content-Type — kept the original per-extension `BucketDeployment` approach. Live deploy testing showed the RHP-based replacement I tried first lost CloudFront's first-match-wins behavior matching to `/_next/*` (more literal segments). The original approach overrides S3 metadata directly so behavior-ordering is irrelevant; the silent-failure concern that motivated the swap is now mitigated by the P3.1 monitoring construct (CloudWatch alarms on Lambda errors).
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

Improvements landed in this PR:

- 2.1 — `compute.warmup: { rate }` adds an EventBridge schedule that synthetically invokes the SSR Lambda. Eliminates cold starts on warm-ish endpoints. Skipped when `provisionedConcurrency` is set.
- 2.2 — `compute.snapStart: true` toggles SnapStart on regional handler-mode Lambdas via the CFN escape hatch. Forward-compat: starts saving cold-start time as soon as Node SnapStart GA's, no code change.
- 2.3 — Nitro cache plugin uses `createRequire` to import `@aws-sdk/client-s3` so the Nitro bundler can't see the import target. The Lambda runtime ships the SDK; we save ~16 MB unzipped per Nitro deploy.
- 2.4 — IPX Lambda zip prunes test fixtures, declaration files, source maps, READMEs, and `examples/` from `node_modules` post-install. Saves ~5-10 MB unzipped (sharp left untouched). `--omit=dev` added to `npm install`.
- 3.2 — `manifest.lifecycle?: Array<{prefix, days}>` lets adapters declare their own per-build orphan-data rules. Next adapter declares `_next/data/`; Astro/Nuxt deploys no longer carry that Next-specific dead-weight rule.
- 3.3 — `storage.inventory?: { enabled: true }` provisions a daily S3 inventory of `builds/` to a dedicated bucket. Useful for cost audits without `aws s3 ls --summarize` per prefix.
- 4.1 — `compute.tracing: { otelEndpoint, otelHeaders?, serviceName? }` stamps `OTEL_EXPORTER_OTLP_ENDPOINT` / `_HEADERS` / `OTEL_SERVICE_NAME` on every regional Lambda the construct creates (SSR, image-opt, revalidation, warmup). Per-function service name (`<base>-ssr`, `<base>-image-optimization`, etc.) for trace disambiguation. Construct does not install any OTel SDK — instrumentation is the user's responsibility.
- 4.1 — Image-opt Lambda now receives `IMAGE_FORMATS` and `IMAGE_DEVICE_SIZES` env vars from `manifest.imageOptimization`. Forward-compat for the IPX runtime; matches the framework's resolved Next/Astro `images.formats` / `deviceSizes`.
- 4.2 — `manifest.basicAuth[]` is now honored end-to-end. CloudFront viewer-request Function gates matching paths via base64 string-compare against the inlined user→pass map. Returns 401 with `WWW-Authenticate: Basic realm="..."` on miss. The previous `BasicAuthNotYetSupportedError` is gone — Nitro `routeRules.basicAuth` works without code changes on the user side.
