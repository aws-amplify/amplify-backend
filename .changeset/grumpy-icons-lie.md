---
'@aws-amplify/storage-construct': major
---

Breaking change: Add grantAccess method pattern to AmplifyStorage construct

- Replace constructor-based access control with method-based pattern
- Add `grantAccess(auth, accessDefinition)` method for post-construction access control
- Add `StorageAccessDefinition` type for structured access configuration
- Remove access prop from constructor (breaking change)
- Maintain all existing S3 bucket functionality
