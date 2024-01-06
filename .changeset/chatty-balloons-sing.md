---
'@aws-amplify/platform-core': minor
---

Sanitize invalid characters when constructing SSM parameter paths.
Uses the same convention that is used for sanitizing stack names.

**NOTE:** Any secrets created before this change will no longer be found.
Recreate sandbox secrets using `npx amplify sandbox secret set` and recreate branch secrets in the Amplify console.
