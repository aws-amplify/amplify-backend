---
'@aws-amplify/hosting': patch
---

fix(hosting): fix bugs from agent-driven bug bash

- Fix SPA deep-link fallback: moved from custom error responses to viewer-request function (only rewrites extensionless paths, not assets)
- Fix SPA fallback in skew protection: spaFallback option passed to both CF functions
- Fix SSR cache: configurable `cdn.ssrDefaultTtl` prop (defaults to 0 for backward compat)
- Fix APIGW bypass: origin verification via Referer header + resource policy
- Fix Response Headers Policy quota: default to managed SECURITY_HEADERS policy
- Fix HTML caching: separate BucketDeployment with no-cache for HTML files
- Fix config.json caching: noCachePaths manifest extension
- Enable access logging by default (new S3 log bucket)
- Add `cdn.webAclArn` prop for BYO WAF integration
- Fix image-opt 500 error caching: ttl=0 on error responses
- Add `compute.environment` prop for user-provided Lambda env vars
