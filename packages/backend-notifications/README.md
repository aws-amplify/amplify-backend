# @aws-amplify/backend-notifications

> **Preview:** this package is in preview / prerelease. Its API and generated
> resources may change in a future release.

An Amplify Gen2 backend factory (`defineNotifications`) that adds an
Amazon Connect Customer Profiles–backed **identify-user** API (for both
authenticated and guest users) and a **push-delivery** Lambda to your app. It
replaces the deprecated Pinpoint `identifyUser` / `UpdateEndpoint` flow with
per-user Customer Profiles storage plus device registration.

## Installation

```bash
npm i @aws-amplify/backend-notifications
```

It has peer dependencies on `aws-cdk-lib` (`^2.234.1`) and `constructs`
(`^10.0.0`), which an Amplify Gen2 project already provides via
`@aws-amplify/backend`.

## Prerequisites

- An Amplify Gen2 backend defined with `defineBackend`.
- An **`auth` resource** (Cognito) in that backend. `defineNotifications`
  throws a `NotificationsMissingAuthError` if no auth resource is present — the
  HTTP API's JWT authorizer is bound to your app's Cognito user pool.
- For **guest** (unauthenticated) identification, your auth resource must allow
  unauthenticated (guest) access on its Cognito Identity Pool (see
  [guest support](#guest-unauthenticated-support) below).

## What it provisions

- Three Customer Profiles object types:
  - `AmplifyProfile` — an authenticated person profile, keyed by the verified
    Cognito `sub`.
  - `AmplifyGuestProfile` — a guest profile, keyed by the unauthenticated
    Cognito Identity Pool `identityId`.
  - `AmplifyDevice` — a device object (keyed by a stable `deviceId`).
- An HTTP API + `identify-user` Lambda that find-or-creates the caller's profile
  and registers their device, exposing two routes:
  - `POST /identify-user` — authenticated, authorized by a **Cognito user-pool
    JWT** authorizer.
  - `POST /identify-user-guest` — guest, authorized by **IAM/SigV4** (callable
    with unauthenticated Cognito Identity Pool credentials).
- A push-delivery Lambda (a Connect **Journey Custom-action** target) plus a
  minimal **AWS End User Messaging (Pinpoint)** application, so Connect can
  deliver mobile push through `SendMessages`.

## Modes

`defineNotifications` operates in one of two modes, chosen by whether you pass
`domainName`:

### Create-from-scratch (default — no `domainName`)

Calling `defineNotifications()` with no `domainName` is the zero-config default.
It provisions, from scratch and with generated stable names:

- a new Amazon Connect instance (`CONNECT_MANAGED`) and a new Customer Profiles
  domain, with the object types registered into it;
- an automatic **Outbound Campaigns v2** association of the new domain with the
  new instance (via a Lambda-backed CDK custom resource at deploy time), so
  Connect Journeys can target these profiles;
- a **message-templates knowledge base** associated with the instance, so push
  templates are authorable in the Amazon Connect console.

No pre-existing Connect setup is required.

### Attach (`domainName` provided)

Passing an existing `domainName` **attaches** to that Customer Profiles domain:
it registers the object types into the domain additively and never creates a
Connect instance or a domain. It does not touch the domain's other integrations
(CTR, Outbound Campaigns) or its Identity Resolution setting. Associating a
pre-existing domain with Outbound Campaigns remains your responsibility.

## Usage

### Zero-config (create from scratch)

```ts
import { defineBackend } from '@aws-amplify/backend';
import { defineNotifications } from '@aws-amplify/backend-notifications';
import { auth } from './auth/resource';

defineBackend({
  auth,
  // Creates a new Connect instance + Customer Profiles domain and wires
  // everything up — no pre-existing Connect setup required.
  notifications: defineNotifications(),
});
```

### Attach to an existing Customer Profiles domain

```ts
import { defineBackend } from '@aws-amplify/backend';
import { defineNotifications } from '@aws-amplify/backend-notifications';
import { auth } from './auth/resource';

defineBackend({
  auth,
  notifications: defineNotifications({
    // OPTIONAL: attach to an EXISTING Customer Profiles domain — e.g. the
    // domain Amazon Connect auto-creates for your instance. Omit to create
    // from scratch (the default above).
    domainName: 'amazon-connect-amplify',
    // OPTIONAL: object-type record expiration in days (default 366).
    // expirationDays: 366,
  }),
});
```

`domainName` is **optional**: omit it for the create-from-scratch default, or
provide it to attach to an existing domain. All properties of
`defineNotifications` are optional; an `auth` resource, however, is required.

### Guest (unauthenticated) support

Guests register through the IAM/SigV4 `POST /identify-user-guest` route using
unauthenticated Cognito Identity Pool credentials, creating an
`AmplifyGuestProfile` (keyed by the Identity Pool `identityId`) plus their
device. Guest and authenticated profiles are kept **separate** — there is no
Customer Profiles `MergeProfiles`. When the user later signs in and re-registers
the same device on the authenticated `POST /identify-user` route, that device is
re-homed onto the authenticated profile by a token-matched `DeleteProfileObject`
eviction, so a physical device ends up on exactly one profile. The guest profile
is not merged; it is reaped automatically by its shorter TTL
(`guestExpirationDays`).

The construct exposes the guest route's `execute-api:Invoke` ARN as
`guestRouteInvokeArn` (and as a stack output) so the app can grant it to the
Cognito Identity Pool **unauthenticated** role.

## Client configuration output

The API invoke endpoint and region are surfaced under the canonical
`notifications` section of `amplify_outputs.json`, at the fixed key
`amazon_connect_customer_profiles` (the path amplify-js reads):

```json
{
  "notifications": {
    "amazon_connect_customer_profiles": {
      "endpoint": "https://<api-id>.execute-api.<region>.amazonaws.com",
      "aws_region": "<region>"
    }
  }
}
```

Clients reach the routes by convention — `POST {endpoint}/identify-user`
(authenticated) and `POST {endpoint}/identify-user-guest` (guest).

## Enabling push channels (APNS / GCM)

The APNS (Apple) and GCM/FCM (Android) channels require **platform credentials
that are secrets** (an APNS `.p8` token signing key, or an FCM service-account
JSON). There are two ways to enable them.

### Option A — declarative, via Amplify `secret()` (recommended)

Pass an optional `apns` and/or `fcm` config to `defineNotifications`. The secret
key material is supplied with Amplify's `secret()` and resolved at deploy time —
it is never written into the CloudFormation template as plain text (it flows
through the same secret custom-resource token Amplify uses for external-auth
provider secrets in `defineAuth`). Non-secret identifiers are plain props.

First store the secrets:

```bash
npx ampx sandbox secret set APNS_SIGNING_KEY      # paste the AuthKey_XXXX.p8 contents
npx ampx sandbox secret set FCM_SERVICE_ACCOUNT_JSON  # paste the service-account JSON
```

Then wire them into the resource:

```ts
import { defineBackend, secret } from '@aws-amplify/backend';
import { defineNotifications } from '@aws-amplify/backend-notifications';
import { auth } from './auth/resource';

defineBackend({
  auth,
  notifications: defineNotifications({
    domainName: 'amazon-connect-amplify',
    // APNs token (.p8) auth. Set `sandbox: true` for development builds.
    apns: {
      keySecret: secret('APNS_SIGNING_KEY'),
      keyId: 'ABC123DEFG',
      teamId: 'DEF456GHIJ',
      bundleId: 'com.example.app',
    },
    // FCM HTTP v1 (Google deprecated the legacy server key). The credential is
    // the service-account JSON; the construct sets DefaultAuthenticationMethod=TOKEN.
    fcm: {
      credentialsSecret: secret('FCM_SERVICE_ACCOUNT_JSON'),
    },
  }),
});
```

When `apns`/`fcm` are omitted the channels are left unset (the End User
Messaging application is still created, but no channel is enabled) — unchanged
behavior.

> Note: `SendMessages` will only deliver once a channel is enabled **and** the
> credentials are valid for a real Apple/Google project. A placeholder/dummy
> secret enables the channel-configuration path but will not deliver to a device.

### Option B — enable the channels yourself after deploy

If you prefer to keep credentials entirely out of the backend definition, omit
`apns`/`fcm` and enable the channels on the created application with **your own
credentials**, via the console or CLI:

- **Console:** AWS End User Messaging → your application → **Push notifications**
  → enable APNS and/or FCM and upload your credentials.
- **CLI (FCM/GCM):**

  ```bash
  aws pinpoint update-gcm-channel \
    --application-id <APP_ID> \
    --gcm-channel-request 'Enabled=true,DefaultAuthenticationMethod=TOKEN,ServiceJson=<FCM_SERVICE_ACCOUNT_JSON>'
  ```

- **CLI (APNS):**

  ```bash
  aws pinpoint update-apns-channel \
    --application-id <APP_ID> \
    --apns-channel-request 'Enabled=true,TokenKey=<KEY>,TokenKeyId=<KEY_ID>,TeamId=<TEAM_ID>,BundleId=<BUNDLE_ID>'
  ```

The application id is exported by the construct as `eumApplicationId` (and via
the `PushHandlerFunctionArn` / stack outputs for wiring the Journey
Custom-action).

## Known limitations

- **At-least-once push delivery (no dedup yet).** The push-delivery Lambda
  reports a per-profile `retryable` flag so Amazon Connect can retry a transient
  failure. Those retries are **not** de-duplicated: the per-item
  `IdempotencyToken` that Connect sends on each batch entry is captured (and
  surfaced for logging) but is not yet used to suppress a duplicate send, so a
  retried profile may receive the same push notification more than once.
  Idempotent de-duplication is a planned follow-up.
- **Create-from-scratch resources are destroyed on stack deletion.** In
  create-from-scratch mode the Connect instance and Customer Profiles domain are
  provisioned with the default `RemovalPolicy.DESTROY`, so deleting the stack
  destroys them and **all stored profile data is lost**. Use attach mode with a
  pre-existing domain if you need the data to outlive the stack.
