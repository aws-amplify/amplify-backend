---
'@aws-amplify/backend-deployer': patch
'@aws-amplify/plugin-types': patch
---

fix: bump `@aws-cdk/toolkit-lib` to 1.40.0 so hotswap fallback deployments stay in STANDARD mode

`@aws-cdk/toolkit-lib` 1.32.0 forced `express: true` whenever a `hotswap`
deployment fell back to a full deployment, so every `ampx sandbox` deploy that
could not be hotswapped was sent to CloudFormation with
`DeploymentConfig.Mode=EXPRESS` even though `--express` was not passed. Express
mode is opt-in, and the override also relaxed the rollback and replacement
checks of the fallback deployment.

The override was reverted upstream in `@aws-cdk/toolkit-lib` 1.38.1
(aws/aws-cdk-cli#1801). Bumping to 1.40.0 restores the intended behavior:
`--express` is honored when passed, and a hotswap fallback deploys in STANDARD
mode otherwise.
