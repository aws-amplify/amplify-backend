---
'@aws-amplify/backend-storage': minor
'@aws-amplify/backend': minor
---

Add optional keepOnDelete prop to defineStorage() to support production bucket retention. Defaults to false (destroy) for backward compatibility. Sandbox deployments always delete the bucket regardless of this setting.
