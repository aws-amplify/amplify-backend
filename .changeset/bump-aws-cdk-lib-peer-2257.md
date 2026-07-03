---
'@aws-amplify/ai-constructs': patch
'@aws-amplify/auth-construct': patch
'@aws-amplify/backend-ai': patch
'@aws-amplify/backend-auth': patch
'@aws-amplify/backend-data': patch
'@aws-amplify/backend-deployer': patch
'@aws-amplify/backend-function': patch
'@aws-amplify/backend-output-storage': patch
'@aws-amplify/backend-storage': patch
'@aws-amplify/backend': patch
'@aws-amplify/backend-cli': patch
'@aws-amplify/platform-core': patch
'@aws-amplify/plugin-types': patch
---

chore: raise `aws-cdk-lib` peer floor to `^2.257.0`

Align every backend package's `aws-cdk-lib` peer range with
`@aws-blocks/pipeline` (and `@aws-blocks/hosting`), which require
`^2.257.0`. Keeping the whole workspace on a single floor avoids a
baseline-dependency resolution conflict where one package pinned to
`2.234.1` and another to `2.257.0` could not share a single hoisted
`aws-cdk-lib`.
