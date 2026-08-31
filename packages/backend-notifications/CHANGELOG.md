# @aws-amplify/backend-notifications

## 1.0.0

### Major Changes

- 3f331c5: Add `defineNotifications`, a backend construct for push notifications backed by Amazon Connect Customer Profiles.

  It provisions a SigV4/IAM-authenticated HTTP API with three routes — `POST /identify-user`, `POST /register-device`, and `POST /remove-device` — callable by authenticated and guest Cognito Identity Pool identities; a Customer Profiles object type keyed on the caller's identity; a DynamoDB device store with single-owner semantics and TTL that backs cross-user-safe push delivery; and an Amazon Connect journey push-delivery Lambda. It can attach to an existing Customer Profiles domain or create one, and surfaces its endpoint under `notifications.amazon_connect` in the generated client configuration.

### Patch Changes

- a922d94: Document the shipped `defineNotifications` surface in the package README: attach and create modes, `apns` / `fcm` channel props supplied with `secret()`, the three IAM/SigV4 write routes, and the `notifications.amazon_connect` client-config output.
- 4ed07e4: Annotate notifications route-path properties with explicit string types.
- Updated dependencies [4849fad]
  - @aws-amplify/plugin-types@1.12.2
