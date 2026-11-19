---
'@aws-amplify/backend-function': patch
---

Unref the SSM parameter refresh interval injected into function bundles so it no longer keeps the event loop alive. This fixes Lambda response streaming handlers that never completed.
