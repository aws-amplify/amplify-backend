---
'@aws-amplify/deployed-backend-client': patch
'@aws-amplify/auth-construct': patch
'@aws-amplify/client-config': patch
---

When retrieving stack outputs, if a stack output is undefined and emptry string will be used to construct the output.
