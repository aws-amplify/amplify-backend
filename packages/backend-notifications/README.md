# @aws-amplify/backend-notifications

> **Preview:** this package is in preview / prerelease. Its API and generated
> resources may change in a future release.

An Amplify Gen2 backend factory (`defineNotifications`) that adds an
Amazon Connect Customer Profiles–backed **write API** (identify-user,
register-device, remove-device — for both authenticated and guest users, all
authorized with IAM/SigV4) and a **push-delivery** Lambda to your app. It
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
  write routes are authorized with IAM/SigV4, so callers sign requests with
  their Cognito Identity Pool credentials.
- For **guest** (unauthenticated) identification, your auth resource must allow
  unauthenticated (guest) access on its Cognito Identity Pool (see
  [guest support](#guest-unauthenticated-support) below).

## What it provisions

- A single `AmplifyProfile` Customer Profiles object type, keyed on the
  server-derived `principalId` (the Cognito Identity Pool `cognitoIdentityId`,
  populated for **both** authenticated and guest callers). There is no separate
  guest object type and no `MergeProfiles` — one principal maps to one profile.
- A dedicated **DynamoDB Devices table** as the authoritative device store (PK
  `deviceId`, GSI on `principalId`, native TTL). Devices live here, **not** in
  Customer Profiles.
- An HTTP API + write Lambda that find-or-creates the caller's profile and
  manages their devices, exposing three routes — all authorized with
  **IAM/SigV4** (`AWS_IAM`), no JWT authorizer:
  - `POST /identify-user` — find-or-create the caller's profile.
  - `POST /register-device` — register / re-home a device to the caller.
  - `POST /remove-device` — remove a device the caller owns.

  All three are callable with authenticated **or** unauthenticated (guest)
  Cognito Identity Pool credentials; the SigV4-verified `cognitoIdentityId`
  identifies the caller, so a guest is just an unauthenticated caller on the
  same routes.

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

Guests use the **same** IAM/SigV4 routes as authenticated users — there is no
separate guest route. An unauthenticated caller SigV4-signs `POST
/identify-user` (and `/register-device` / `/remove-device`) with its
unauthenticated Cognito Identity Pool credentials; API Gateway verifies the
signature and surfaces the `cognitoIdentityId`, which the Lambda uses as the
`principalId`. A guest therefore gets an ordinary `AmplifyProfile` keyed by that
principal — the same object type an authenticated caller gets.

Device ownership is authoritative in the DynamoDB Devices table: registering a
device is a last-writer-wins `UpdateItem` on the `deviceId`, so when the same
physical device is later registered under a different principal (e.g. after
sign-in) it is re-homed atomically and a campaign can never leak to a device now
owned by another principal.

The construct exposes the three routes' `execute-api:Invoke` ARNs as
`routeInvokeArns` (and as a stack output) so the app can grant them to the
Cognito Identity Pool **authenticated and unauthenticated** roles.

## Client configuration output

The API invoke endpoint and region are surfaced under the canonical
`notifications` section of `amplify_outputs.json`, at the fixed key
`amazon_connect` (the path amplify-js reads):

```json
{
  "notifications": {
    "amazon_connect": {
      "endpoint": "https://<api-id>.execute-api.<region>.amazonaws.com",
      "aws_region": "<region>"
    }
  }
}
```

Clients reach the routes by convention — `POST {endpoint}/identify-user`,
`POST {endpoint}/register-device`, and `POST {endpoint}/remove-device` — signing
each request with SigV4 (authenticated or guest Identity Pool credentials).

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
