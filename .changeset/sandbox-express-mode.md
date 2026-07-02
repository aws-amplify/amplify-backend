---
'@aws-amplify/backend-cli': minor
'@aws-amplify/sandbox': minor
'@aws-amplify/backend-deployer': minor
'@aws-amplify/cli-core': patch
---

Add opt-in `ampx sandbox --express` flag that enables CloudFormation/CDK Express mode for faster sandbox deployments. When a deployment completes with resources still stabilizing, the Express Mode warning (e.g. `Stack deployed using Express Mode. Resources still stabilizing: ...`) is surfaced in the sandbox output. Bumps `@aws-cdk/toolkit-lib` to `1.32.0` and `@aws-sdk/client-cloudformation` to `^3.1078.0` (the version that adds the `DeploymentConfig` Express mode field to the CloudFormation request; older SDK versions silently drop it).
