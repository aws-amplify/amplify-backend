---
'@aws-amplify/backend-notifications': minor
---

chore(backend-notifications): raise the `aws-cdk-lib` peer floor to `^2.257.0`

Aligns backend-notifications with the workspace-wide `aws-cdk-lib` floor so a single
CDK version resolves across all packages that co-install (required for the
`test_with_baseline_dependencies` job to pin one version). Raising a peer floor can
require consumers to bump `aws-cdk-lib`, so it is released as a minor.
