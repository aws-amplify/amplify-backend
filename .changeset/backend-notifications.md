---
'@aws-amplify/backend-notifications': minor
---

Add `@aws-amplify/backend-notifications` package: Amazon Connect Customer Profiles-backed notifications for Amplify Gen2. Provides a `defineNotifications` factory that replaces the deprecated Pinpoint `identifyUser`/`UpdateEndpoint` flow with per-user Customer Profiles storage plus device registration, and delivers mobile push through an Amazon Connect journey custom-action Lambda. Guest (unauthenticated) users are supported out of the box: an IAM/SigV4 `POST /identify-user-guest` route lets pre-login devices register against an `AmplifyGuestProfile`, and signing in folds the guest profile (and its devices) into the authenticated profile via a merge.
