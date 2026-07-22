---
'@aws-amplify/backend-notifications': minor
'@aws-amplify/client-config': minor
---

Add `@aws-amplify/backend-notifications`: Amazon Connect Customer Profiles-backed notifications for Amplify Gen 2. A `defineNotifications` factory + `AmplifyNotifications` construct replace the deprecated Pinpoint `identifyUser`/`UpdateEndpoint` flow with per-user Customer Profiles storage and device registration, and deliver mobile push through an Amazon Connect journey custom-action Lambda.

- Two modes: zero-config create-from-scratch (provisions a new Connect instance + Customer Profiles domain, wires Outbound Campaigns v2, the CTR store, and a message-templates knowledge base so Journeys work with no console setup) and attach-to-existing (`domainName` provided, additive registration only).
- Authenticated and guest (unauthenticated, IAM/SigV4 `POST /identify-user-guest`) support. Profiles are kept separate (no `MergeProfiles`). Device ownership is authoritative in a dedicated DynamoDB Devices table (PK `deviceId`, GSI on `profileId`, native TTL): registering/re-homing a device is a strongly-consistent last-writer-wins `UpdateItem` on the `deviceId` (overwriting the record IS the eviction), and push delivery enumerates a profile's devices via the GSI then gates each send on a strongly-consistent point read of the `deviceId` — so a physical device routes to exactly one profile at any instant with no eventual-consistency window (this eliminates the immediate-switch cross-user push leak). Guest profiles are reaped by a shorter TTL. The request option is `guestIdentityId`.
- Push channels for APNs and FCM are configured from Amplify `secret()`s; tokens the provider permanently rejects are pruned from the DynamoDB Devices table. `sanitizeInstanceAlias` is hardened against ReDoS.

The notifications endpoint + region are surfaced under the canonical `notifications.amazon_connect.{endpoint, aws_region}` section of `amplify_outputs.json` (the path Amplify JS reads), not `custom`. A new client-config v1.5 schema (`AWSAmplifyBackendOutputs`) adds the optional `notifications.amazon_connect` object and makes the Pinpoint fields optional so a notifications block may contain only `amazon_connect`; client-config v1.4 is unchanged.
