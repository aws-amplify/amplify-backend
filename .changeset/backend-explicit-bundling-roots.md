---
'@aws-amplify/backend': patch
---

Set explicit `projectRoot`/`depsLockFilePath` on internal `NodejsFunction` bundling so Lambda entry files shipped with this package are no longer resolved relative to the current working directory, which aws-cdk-lib 2.254 rejects with `PathNotUnderRoot`.
