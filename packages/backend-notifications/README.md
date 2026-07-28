# @aws-amplify/backend-notifications

> **Preview:** this package is in preview / prerelease. Its API and generated
> resources may change in a future release.

`defineNotifications` is an Amplify Gen2 backend factory that gives your app an
Amazon Connect Customer Profiles–backed write API for user identification and
mobile-device registration, plus a push-delivery Lambda that Amazon Connect
journeys invoke to send mobile push notifications.

## Installation

```bash
npm i @aws-amplify/backend-notifications
```

It has peer dependencies on `aws-cdk-lib` (`^2.234.1`) and `constructs`
(`^10.0.0`), which an Amplify Gen2 project already provides via
`@aws-amplify/backend`.

## Prerequisites

- An Amplify Gen2 backend defined with `defineBackend`.
- An **`auth` resource** (`defineAuth`) in that backend, so a Cognito Identity
  Pool is available: the write routes are authorized with IAM/SigV4 and callers
  sign requests with their Identity Pool credentials. `defineNotifications`
  throws a `NotificationsMissingAuthError` when the backend has no auth
  resource.
- To identify **guest** callers, enable unauthenticated (guest) access on the
  auth resource's Identity Pool.
- To enable push channels, store the platform credentials as Amplify secrets
  (`npx ampx sandbox secret set ...`) and reference them with `secret()` — an
  APNs `.p8` token signing key for Apple, an FCM service-account JSON for
  Android.

## What it provisions

- An `AmplifyProfile` Customer Profiles object type, keyed on the
  server-derived `principalId` — the Cognito Identity Pool `identityId`, which
  is populated for both authenticated and guest callers.
- A **DynamoDB devices table** as the device store: partition key `deviceId`, a
  global secondary index on `principalId`, and native TTL expiry.
- An HTTP API and write Lambda exposing three routes, all authorized with
  **IAM/SigV4** and callable with authenticated or guest Identity Pool
  credentials:
  - `POST /identify-user` — find-or-create the caller's profile.
  - `POST /register-device` — register a device to the caller.
  - `POST /remove-device` — remove a device the caller owns.
- A **push-delivery Lambda** that serves as the target of an Amazon Connect
  journey custom action, together with an AWS End User Messaging (Pinpoint)
  application through which push messages are delivered.
- Optional APNs and GCM/FCM channel configuration on that application, when
  `apns` / `fcm` are supplied.

The factory grants `execute-api:Invoke` on the three routes to the Identity
Pool's authenticated and unauthenticated roles, so identify, register and
remove work for signed-in and guest callers with no extra IAM wiring. The
construct also exposes those route ARNs as `routeInvokeArns`.

## Modes

`defineNotifications` accepts a discriminated union of props, selected by
whether you pass `domainName`.

### Create mode (`domainName` omitted)

`defineNotifications()` is the zero-config default. It provisions, with
generated stable names:

- a new Amazon Connect instance (`CONNECT_MANAGED`) and a new Customer Profiles
  domain, with the object type registered into it;
- an Outbound Campaigns v2 association between the new domain and the new
  instance (via a Lambda-backed CDK custom resource at deploy time), so Connect
  journeys can target these profiles;
- a message-templates knowledge base associated with the instance, so push
  templates are authorable in the Amazon Connect console.

Create mode accepts two extra props:

- `instanceAlias?: string` — override the generated Connect instance alias.
- `expirationDays?: number` — object-type record expiration in days
  (default `366`).

Create-mode resources use the default `RemovalPolicy.DESTROY`, so deleting the
stack deletes the Connect instance, the Customer Profiles domain, and the
profile data stored in it.

### Attach mode (`domainName` provided)

Passing `domainName` attaches to that existing Customer Profiles domain — for
example the `amazon-connect-<instance>` domain Amazon Connect creates when
Customer Profiles is enabled on your instance. The object type is registered
into the domain additively; the domain's own integrations (CTR, Outbound
Campaigns) and Identity Resolution setting are left as they are, and
associating a pre-existing domain with Outbound Campaigns stays under your
control. `instanceAlias` and `expirationDays` apply to create mode, so they are
not part of attach-mode props.

## Usage

### Zero-config

```ts
import { defineBackend } from '@aws-amplify/backend';
import { defineNotifications } from '@aws-amplify/backend-notifications';
import { auth } from './auth/resource';

defineBackend({
  auth,
  notifications: defineNotifications(),
});
```

### Create mode with push channels

```ts
import { defineBackend, secret } from '@aws-amplify/backend';
import { defineNotifications } from '@aws-amplify/backend-notifications';
import { auth } from './auth/resource';

defineBackend({
  auth,
  notifications: defineNotifications({
    instanceAlias: 'my-app-connect',
    expirationDays: 366,
    apns: {
      tokenKey: secret('APNS_SIGNING_KEY'), // contents of AuthKey_XXXX.p8
      tokenKeyId: 'ABC123DEFG',
      teamId: 'DEF456GHIJ',
      bundleId: 'com.example.app',
      sandbox: false,
    },
    fcm: {
      serviceJson: secret('FCM_SERVICE_ACCOUNT_JSON'),
    },
  }),
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
    domainName: 'amazon-connect-amplify',
  }),
});
```

## Client configuration output

The API endpoint and region are surfaced under the `notifications` section of
`amplify_outputs.json` at the `amazon_connect` key (client-config schema
v1.5), which amplify-js reads:

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
`POST {endpoint}/register-device` and `POST {endpoint}/remove-device` — signing
each request with SigV4 using authenticated or guest Identity Pool credentials.

## Push channels

APNs uses token authentication: supply the `.p8` signing key through
`secret()` as `apns.tokenKey`, along with the plain `tokenKeyId`, `teamId` and
`bundleId` identifiers. Set `apns.sandbox: true` to configure the APNs sandbox
channel for development builds; flipping this value on a deployed stack
replaces the channel resource, since production and sandbox APNs channels are
distinct CloudFormation resource types.

FCM uses HTTP v1 authentication: supply the Google service-account JSON through
`secret()` as `fcm.serviceJson`, and the GCM channel is configured with
`DefaultAuthenticationMethod = TOKEN`.

Secret values are resolved at deploy time and are not written into the
CloudFormation template as plain text. When `apns` or `fcm` is omitted, that
channel is left unset and the End User Messaging application is still created,
so you can enable the channel yourself afterwards with your own credentials:

- **Console:** AWS End User Messaging → your application → **Push
  notifications** → enable APNs and/or FCM and upload your credentials.
- **CLI:**

  ```bash
  aws pinpoint update-gcm-channel \
    --application-id <APP_ID> \
    --gcm-channel-request 'Enabled=true,DefaultAuthenticationMethod=TOKEN,ServiceJson=<FCM_SERVICE_ACCOUNT_JSON>'

  aws pinpoint update-apns-channel \
    --application-id <APP_ID> \
    --apns-channel-request 'Enabled=true,TokenKey=<KEY>,TokenKeyId=<KEY_ID>,TeamId=<TEAM_ID>,BundleId=<BUNDLE_ID>'
  ```

Push delivery reaches a device once a channel is enabled with credentials valid
for a real Apple or Google project.

## Construct resources

`AmplifyNotifications` exposes the underlying CDK resources through
`resources` — `apiFunction`, `httpApi`, `profileObjectType`, `devicesTable`,
`pushFunction`, `pushApplication`, plus `apnsChannel` / `gcmChannel` when a
channel is configured and `connectInstance` / `profilesDomain` in create mode.
It also exposes `apiEndpoint`, `domainName`, `pushFunctionArn`,
`routeInvokeArns`, `createsResources`, the three route paths, and
`connectInstanceId` / `connectInstanceArn` in create mode.

## Known limitations

- **At-least-once push delivery.** The push-delivery Lambda reports a
  per-profile `retryable` flag so Amazon Connect can retry a transient failure.
  The per-item `IdempotencyToken` Connect sends on each batch entry is captured
  for logging, and de-duplication of retried sends is a planned follow-up, so a
  retried profile may receive the same push notification more than once.
