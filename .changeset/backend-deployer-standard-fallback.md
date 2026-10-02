---
'@aws-amplify/backend-deployer': patch
---

Keep the sandbox hotswap fallback on CloudFormation standard mode with rollback enabled.

Bump `@aws-cdk/toolkit-lib` to `^1.38.1` and set `rollback: true` on sandbox
deploys. A prior toolkit-lib version sent the sandbox hotswap fallback deploy to
CloudFormation in express mode with rollback disabled, so a transient resource
failure left the sandbox stack in `UPDATE_FAILED` with no automatic recovery.
