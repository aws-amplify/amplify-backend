---
'@aws-amplify/hosting': patch
---

fix(hosting): upgrade `@aws-blocks/hosting` to `^0.1.5`

Bumps the vendored `@aws-blocks/hosting` construct from `0.1.4` to `0.1.5`, which
fixes the CloudFront `InvalidRequest` failure on compute/SSR deployments. `0.1.4`
attached the AWS-managed `ALL_VIEWER_EXCEPT_HOST_HEADER` origin request policy to
CloudFront behaviors whose origin is S3 (the default behavior and edge-route
behaviors), which CloudFront rejects — "S3 Origins can only use the following
managed request policies: CORS-CustomOrigin, CORS-S3Origin,
UserAgentRefererHeaders" — rolling back Nuxt/Astro/vanilla-CDK SSR distributions
at create time. `0.1.5` replaces it with a synthesized custom origin request
policy (all viewer data except `Host`) on both S3-origin behaviors; the sentinel
behaviors (custom/function-URL origins) keep the managed policy.
