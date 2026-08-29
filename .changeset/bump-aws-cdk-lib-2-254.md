---
'@aws-amplify/backend-output-storage': patch
'@aws-amplify/backend-notifications': patch
'@aws-amplify/backend-function': patch
'@aws-amplify/backend-deployer': patch
'@aws-amplify/auth-construct': patch
'@aws-amplify/backend-storage': patch
'@aws-amplify/ai-constructs': patch
'@aws-amplify/platform-core': patch
'@aws-amplify/plugin-types': patch
'@aws-amplify/backend-data': patch
'@aws-amplify/backend-auth': patch
'@aws-amplify/backend-cli': patch
'@aws-amplify/backend-ai': patch
'@aws-amplify/backend': patch
---

chore: raise aws-cdk-lib floor to ^2.254.0

Bump the `aws-cdk-lib` peer dependency floor from `^2.234.1` to `^2.254.0`
across all packages. This picks up the upstream fix for a crash during asset
fingerprinting on Windows with newer Node.js releases, where `fs.openSync` was
called with `O_SYNC | O_DSYNC` and failed with `EINVAL`. The fix shipped in
`aws-cdk-lib` 2.254.0.
