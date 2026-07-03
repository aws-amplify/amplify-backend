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

This construct creates the End User Messaging (Pinpoint) **application only**.
It does **not** configure the APNS (Apple) or GCM/FCM (Android) channels,
because those require **platform credentials that are secrets** (an APNS signing
key / certificate, or an FCM server key / service-account JSON). Baking those
into CloudFormation would leak secrets into template state.

After deploying, enable the channels you need on the created application using
**your own credentials**, via the console or CLI:

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
