---
'@aws-amplify/storage-construct': major
---

Initial release of standalone AmplifyStorage construct package

- Create new `@aws-amplify/storage-construct` as standalone CDK L3 construct
- Migrate AmplifyStorage implementation with CDK-native triggers
- Add `grantAccess(auth, accessDefinition)` method for access control
- Add `StorageAccessDefinition` type for structured access configuration
- Support all S3 bucket features (CORS, versioning, SSL enforcement, auto-delete)
- Provide comprehensive TypeScript declarations and API documentation
