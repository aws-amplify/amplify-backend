---
'@aws-amplify/hosting': patch
---

fix(hosting): upgrade `@aws-blocks/hosting` and `@aws-blocks/pipeline` to `^0.2.0`

Bumps the vendored `@aws-blocks/hosting` construct from `0.1.10` to `0.2.0` and
`@aws-blocks/pipeline` from `0.1.1` to `0.2.0` (latest published) to pick up the
latest hosting construct fixes — notably retaining the CDKBucketDeployment custom
resources so a failing delete-time handler can no longer wedge stack teardown and
orphan the CloudFront distribution (the dangling-CloudFront leak on the SSR-adapter e2e).

0.2.0 reorganizes the `@aws-blocks/hosting` module map: the package `.` entry is
now the CDK-free value API (`secret`/`config`/`getSecret`/`getConfig`) and the
hosting/manifest types (`DeployManifest`, `RouteBehavior`, `HostingProps`, etc.)
moved to the `@aws-blocks/hosting/constructs` entry. The internal re-export shims
are repointed accordingly; the public `@aws-amplify/hosting` API is unchanged.
