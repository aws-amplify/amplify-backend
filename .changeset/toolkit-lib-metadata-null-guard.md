---
'@aws-amplify/backend-deployer': patch
---

Map the `@aws-cdk/toolkit-lib` `countAssemblyResults` crash (`TypeError: Cannot convert undefined or null to object` when a synthesized stack has no metadata) to a fault instead of a misleading backend `SyntaxError`.
