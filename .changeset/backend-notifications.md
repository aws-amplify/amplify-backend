---
'@aws-amplify/backend-notifications': minor
---

Add `@aws-amplify/backend-notifications` package with a `defineNotifications` factory that provisions an Amazon Connect Customer Profiles-backed notifications resource for Gen2 backends, replacing the deprecated Pinpoint `identifyUser`/`UpdateEndpoint` flow without custom CDK.

By default the construct **attaches to an existing Customer Profiles domain** (the domain Amazon Connect auto-creates when Customer Profiles is enabled): it registers the `AmplifyProfile`/`AmplifyDevice` object types into the supplied `domainName` without creating an `AWS::CustomerProfiles::Domain` and without touching the domain's existing CTR/Campaign object types. Pass `createDomain: true` for a greenfield deployment where the factory provisions a new domain instead. The identify-user Lambda's `profile:*` permissions are scoped to the target domain ARN and its object-types ARN, and its HTTP API's Cognito JWT authorizer is wired to the app's user pool.

Also adds an optional push-delivery Lambda (enabled via `push: true`) that Amazon Connect invokes from a Journey Custom-action to deliver mobile push over End User Messaging: it looks up a profile's `AmplifyDevice` objects, sends messages, and prunes stale device tokens. The Lambda grants `lambda:InvokeFunction` to the `connect.amazonaws.com` and `connect-campaigns.amazonaws.com` service principals (scoped to the deploying account to guard against the confused-deputy problem) and exports its ARN as a stack output.
