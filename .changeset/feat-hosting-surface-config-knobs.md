---
'@aws-amplify/hosting': minor
---

Surface three already-implemented capabilities on the public `defineHosting`
config and harden skew-protection config:

- `cdn.ssrDefaultTtl`, `cdn.responseHeadersPolicy`, and `cdn.webAclArn` are now
  declared on `HostingProps.cdn` (they were plumbed through the construct but
  unreachable without a cast). `responseHeadersPolicy` unblocks sharing one
  policy across stacks to dodge the account-level RHP quota; `webAclArn` brings
  your own WAF; `ssrDefaultTtl` enables edge-cached SSR.
- `skewProtection` is now configurable via `HostingProps` (previously on by
  default with no way to disable or tune `maxAge`), and the construct now
  rejects a `skewProtection.maxAge` that exceeds `storage.buildRetentionDays`
  with `InvalidSkewProtectionMaxAgeError` — a cookie that outlives the build
  prefix would pin returning viewers to a lifecycle-deleted build (403).
- `compute.timeout` public type widened to `Duration | number` to match the
  construct's existing coercion (the number form previously type-errored for TS
  callers despite working at runtime).
