---
'@aws-amplify/backend-notifications': minor
'@aws-amplify/client-config': minor
---

Add `defineNotifications`, a backend construct for push notifications backed by Amazon Connect Customer Profiles.

It provisions a SigV4/IAM-authenticated HTTP API with three routes — `POST /identify-user`, `POST /register-device`, and `POST /remove-device` — callable by authenticated and guest Cognito Identity Pool identities; a Customer Profiles object type keyed on the caller's identity; a DynamoDB device store with single-owner semantics and TTL that backs cross-user-safe push delivery; and an Amazon Connect journey push-delivery Lambda. It can attach to an existing Customer Profiles domain or create one, and surfaces its endpoint under `notifications.amazon_connect` in the generated client configuration.
