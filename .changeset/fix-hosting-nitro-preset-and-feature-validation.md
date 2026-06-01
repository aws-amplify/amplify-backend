---
'@aws-amplify/hosting': patch
---

Throw at adapter time on unsupported Nitro preset (anything outside aws-lambda, aws-lambda-streaming, node-server, node), `experimental.websocket: true`, and non-empty `scheduledTasks` — all three previously produced a deployable bundle that broke silently at runtime.
