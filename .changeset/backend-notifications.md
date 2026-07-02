---
'@aws-amplify/backend-notifications': minor
---

Add `@aws-amplify/backend-notifications` package with a `defineNotifications` factory that provisions an Amazon Connect Customer Profiles-backed notifications resource (Customer Profiles domain, AmplifyProfile/AmplifyDevice object types, a least-privilege identify-user Lambda, and an HTTP API whose Cognito JWT authorizer is wired to the app's user pool) for Gen2 backends, replacing the deprecated Pinpoint `identifyUser`/`UpdateEndpoint` flow without custom CDK.
