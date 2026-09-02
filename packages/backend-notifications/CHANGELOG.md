# @aws-amplify/backend-notifications

## 2.0.0

### Major Changes

- 8456adc: Guarantee `defineNotifications` operates only against a Customer Profiles domain with Identity Resolution (profile merging) disabled.
  - Create-from-scratch mode provisions the Customer Profiles domain with automatic (`Matching`) and rule-based (`RuleBasedMatching`) matching disabled.
  - Attach mode validates the target domain at deploy time and fails the deployment with an actionable message when Identity Resolution is enabled.
  - The `identify-user` API verifies at request time that the attached domain has Identity Resolution disabled, returning an error when it is enabled (short-lived per-domain cache; fails closed when the domain's configuration cannot be confirmed).

  Impact: a deployment that attaches to — or a running app whose attached domain has — Identity Resolution enabled will be rejected. Attach `defineNotifications` to a dedicated Customer Profiles domain with Identity Resolution disabled.

### Patch Changes

- 9db547a: chore: raise aws-cdk-lib floor to ^2.254.0

  Bump the `aws-cdk-lib` peer dependency floor from `^2.234.1` to `^2.254.0`
  across all packages. This picks up the upstream fix for a crash during asset
  fingerprinting on Windows with newer Node.js releases, where `fs.openSync` was
  called with `O_SYNC | O_DSYNC` and failed with `EINVAL`. The fix shipped in
  `aws-cdk-lib` 2.254.0.

- Updated dependencies [9db547a]
- Updated dependencies [4ee0260]
  - @aws-amplify/platform-core@1.11.2
  - @aws-amplify/plugin-types@1.12.3

## 1.0.0

### Major Changes

- 3f331c5: Add `defineNotifications`, a backend construct for push notifications backed by Amazon Connect Customer Profiles.

  It provisions a SigV4/IAM-authenticated HTTP API with three routes — `POST /identify-user`, `POST /register-device`, and `POST /remove-device` — callable by authenticated and guest Cognito Identity Pool identities; a Customer Profiles object type keyed on the caller's identity; a DynamoDB device store with single-owner semantics and TTL that backs cross-user-safe push delivery; and an Amazon Connect journey push-delivery Lambda. It can attach to an existing Customer Profiles domain or create one, and surfaces its endpoint under `notifications.amazon_connect` in the generated client configuration.

### Patch Changes

- a922d94: Document the shipped `defineNotifications` surface in the package README: attach and create modes, `apns` / `fcm` channel props supplied with `secret()`, the three IAM/SigV4 write routes, and the `notifications.amazon_connect` client-config output.
- 4ed07e4: Annotate notifications route-path properties with explicit string types.
- Updated dependencies [4849fad]
  - @aws-amplify/plugin-types@1.12.2
