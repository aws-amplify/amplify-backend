# @aws-amplify/backend-notifications

An Amplify Gen2 backend factory (`defineNotifications`) that adds an
Amazon Connect Customer Profiles–backed **identify-user** API and a
**push-delivery** Lambda to your app.

It provisions:

- Two Customer Profiles object types — `AmplifyProfile` and `AmplifyDevice` —
  registered **into an existing Customer Profiles domain** (attach mode).
- A JWT-authorized HTTP API + `identify-user` Lambda that find-or-creates a
  person profile (keyed by the verified Cognito `sub`) and registers the
  caller's device.
- A push-delivery Lambda (a Connect **Journey Custom-action** target) plus a
  minimal **AWS End User Messaging (Pinpoint)** application, so Connect can
  deliver mobile push through `SendMessages`.

## Usage

```ts
import { defineBackend } from '@aws-amplify/backend';
import { defineNotifications } from '@aws-amplify/backend-notifications';
import { auth } from './auth/resource';

defineBackend({
  auth,
  notifications: defineNotifications({
    // REQUIRED: the existing Customer Profiles domain to attach to — e.g. the
    // domain Amazon Connect auto-created for your instance.
    domainName: 'amazon-connect-amplify',
    // OPTIONAL: object-type record expiration in days (default 366).
    // expirationDays: 366,
  }),
});
```

`domainName` is **required** (an `AmplifyUserError` is thrown if it is missing).
The construct never creates a Customer Profiles domain and never touches the
domain's other integrations (CTR, Outbound Campaigns) or its Identity
Resolution setting — the two object types are purely additive.

The backend endpoint is surfaced under the fixed custom-output key
`CustomerProfiles`.

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
