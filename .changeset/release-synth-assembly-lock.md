---
'@aws-amplify/backend-deployer': patch
---

Release the synthesized cloud assembly when type checks fail, so a later sandbox deployment no longer fails with MultipleSandboxInstancesError against its own PID
