---
'@aws-amplify/hosting': patch
---

Accept OpenNext's native `aws-apigw-streaming` wrapper in
`validateUserOpenNextConfig`. The validator previously required
`wrapper: 'aws-lambda-streaming'` and rejected a user config that adopted the
upstream native API Gateway streaming wrapper (the better long-term option).
Either wrapper is now accepted, so users aren't forced onto the community
wrapper the adapter monkeypatches.
