---
'@aws-amplify/hosting': patch
---

fix(hosting): fix 6 bugs found in agent-driven bug bash

- Fix HTML caching: index.html no longer cached immutably (separate BucketDeployment with no-cache)
- Fix SPA fallback: 403 error response added for S3+OAC (returns index.html instead of AccessDenied)
- Fix compression: verified compress:true on all CloudFront behaviors
- Fix compute.environment: wire user-provided env vars to Lambda function
- Fix config.json caching: add short TTL to prevent stale config
- Fix Response Headers Policy: default to managed SECURITY_HEADERS policy (zero quota usage)
