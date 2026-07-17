---
'@aws-amplify/backend-notifications': minor
'@aws-amplify/client-config': minor
---

Add `@aws-amplify/backend-notifications`: Amazon Connect Customer Profiles-backed notifications for Amplify Gen 2. A `defineNotifications` factory + `AmplifyNotifications` construct replace the deprecated Pinpoint `identifyUser`/`UpdateEndpoint` flow with per-user Customer Profiles storage and device registration, and deliver mobile push through an Amazon Connect journey custom-action Lambda.

- Two modes: zero-config create-from-scratch (provisions a new Connect instance + Customer Profiles domain, wires Outbound Campaigns v2, the CTR store, and a message-templates knowledge base so Journeys work with no console setup) and attach-to-existing (`domainName` provided, additive registration only).
- Authenticated and guest (unauthenticated, IAM/SigV4 `POST /identify-user-guest`) support. Profiles are kept separate (no `MergeProfiles`); on sign-in a device is re-homed onto the authenticated profile via token-matched eviction so a physical device lives on exactly one profile, and guest profiles are reaped by a shorter TTL. The request option is `guestIdentityId`.
- Push channels for APNs and FCM are configured from Amplify `secret()`s; tokens the provider permanently rejects are pruned from Customer Profiles. `sanitizeInstanceAlias` is hardened against ReDoS.

The notifications endpoint + region are surfaced under the canonical `notifications.amazon_connect_customer_profiles.{endpoint, aws_region}` section of `amplify_outputs.json` (the path Amplify JS reads), not `custom`. The client-config v1.4 schema (`AWSAmplifyBackendOutputs`) adds the optional `notifications.amazon_connect_customer_profiles` object and allows a notifications block containing only `amazon_connect_customer_profiles` (the three Pinpoint fields are required only for a Pinpoint-shaped block).
