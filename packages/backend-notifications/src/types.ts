import { BackendSecret } from '@aws-amplify/plugin-types';

/**
 * APNs (Apple Push Notification service) channel configuration, using APNs
 * **token** authentication (a `.p8` signing key). The sensitive `.p8` key
 * material is supplied via an Amplify `secret()`; the non-secret identifiers are
 * plain props. Provide this to enable the APNs channel on the created End User
 * Messaging (Pinpoint) application.
 * @example
 * import { secret } from '@aws-amplify/backend';
 *
 * defineNotifications({
 *   apns: {
 *     keySecret: secret('APNS_SIGNING_KEY'), // contents of the AuthKey_XXXX.p8
 *     keyId: 'ABC123DEFG',
 *     teamId: 'DEF456GHIJ',
 *     bundleId: 'com.example.app',
 *   },
 * });
 */
export type ApnsChannelProps = {
  /**
   * Amplify `secret()` holding the APNs token signing key — the full contents
   * of the `AuthKey_<keyId>.p8` file downloaded from the Apple Developer portal.
   * Resolved at deploy time and written to the APNs channel's token key; never
   * stored in the CloudFormation template as plain text.
   */
  keySecret: BackendSecret;

  /** The 10-character key identifier assigned to your APNs signing key. */
  keyId: string;

  /**
   * The 10-character identifier assigned to your Apple Developer account team.
   */
  teamId: string;

  /** The bundle identifier assigned to your iOS app. */
  bundleId: string;

  /**
   * Configure the APNs **sandbox** channel (for development builds signed with a
   * development provisioning profile) instead of the production APNs channel.
   * Toggling this on an already-deployed stack REPLACES the APNs channel resource
   * (production `AWS::Pinpoint::APNSChannel` and sandbox
   * `AWS::Pinpoint::APNSSandboxChannel` are distinct CFN resource types), so the
   * application briefly has no configured APNs channel during the swap — treat a
   * flip on a live stack as a destructive change.
   * @default false
   */
  sandbox?: boolean;
};

/**
 * FCM (Firebase Cloud Messaging) / GCM channel configuration, using **FCM HTTP
 * v1** authentication. Google deprecated the legacy server-key (`ApiKey`) API,
 * so this models the current v1 path: a Google service-account JSON credential,
 * supplied via an Amplify `secret()`. Provide this to enable the GCM/FCM channel
 * on the created End User Messaging (Pinpoint) application.
 * @example
 * import { secret } from '@aws-amplify/backend';
 *
 * defineNotifications({
 *   fcm: {
 *     credentialsSecret: secret('FCM_SERVICE_ACCOUNT_JSON'),
 *   },
 * });
 */
export type FcmChannelProps = {
  /**
   * Amplify `secret()` holding the FCM HTTP v1 credential — the full contents of
   * the Google service-account JSON downloaded from the Firebase console.
   * Resolved at deploy time and written to the GCM channel's `ServiceJson` with
   * `DefaultAuthenticationMethod = TOKEN`; never stored in the CloudFormation
   * template as plain text.
   */
  credentialsSecret: BackendSecret;
};

/**
 * Properties accepted by {@link defineNotifications}.
 *
 * All properties are optional: calling `defineNotifications()` with no arguments
 * is the zero-config default that creates a new Amazon Connect instance +
 * Customer Profiles domain from scratch and wires the notifications resources
 * into it.
 */
export type NotificationsFactoryProps = {
  /**
   * Name of an EXISTING Amazon Connect Customer Profiles domain to attach to —
   * e.g. the domain Amazon Connect auto-creates (`amazon-connect-<instance>`)
   * when Customer Profiles is enabled on your instance.
   *
   * OMIT this (the default) to CREATE FROM SCRATCH: the resource provisions a
   * brand-new Connect instance AND a brand-new Customer Profiles domain (with
   * generated, stable names) and registers the AmplifyProfile object type into
   * that new domain — no pre-existing
   * Connect setup required. (Device records live in a DynamoDB table, not in
   * Customer Profiles.)
   *
   * When PROVIDED, the resource ATTACHES: it registers the object types INTO
   * this existing domain additively and never creates an instance or a domain.
   */
  domainName?: string;

  /**
   * CREATE mode only: override the auto-generated Amazon Connect instance alias.
   * Ignored when `domainName` is provided (attach mode). When omitted, a
   * deterministic-yet-unique alias is derived from the app so it is stable
   * across deploy/delete and unique per app.
   */
  instanceAlias?: string;

  /**
   * Profile / object-type expiration in days.
   * @default 366
   */
  expirationDays?: number;

  /**
   * OPTIONAL APNs (Apple) push-channel configuration. When provided, the APNs
   * channel is enabled on the created End User Messaging (Pinpoint) application
   * using token (`.p8`) authentication, with the key material sourced from an
   * Amplify `secret()`. When omitted, the APNs channel is left unset
   * (unchanged behavior) — the application is created but no channel is enabled.
   */
  apns?: ApnsChannelProps;

  /**
   * OPTIONAL FCM/GCM (Android) push-channel configuration. When provided, the
   * GCM channel is enabled on the created End User Messaging (Pinpoint)
   * application using FCM HTTP v1 authentication, with the service-account
   * credential sourced from an Amplify `secret()`. When omitted, the GCM channel
   * is left unset (unchanged behavior).
   */
  fcm?: FcmChannelProps;
};
