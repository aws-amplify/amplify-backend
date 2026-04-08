---
'@aws-amplify/backend-storage': minor
'@aws-amplify/backend': minor
---

Add optional `removalPolicy` prop to `defineStorage()` to support production bucket retention. Sandbox deployments always use DESTROY.
