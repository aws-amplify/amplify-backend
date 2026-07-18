import {
  AuthResources,
  AuthRoleName,
  BackendOutputEntry,
  BackendOutputStorageStrategy,
  ConstructContainerEntryGenerator,
  ConstructFactory,
  ConstructFactoryGetInstanceProps,
  GenerateContainerEntryProps,
  ReferenceAuthResources,
  ResourceAccessAcceptorFactory,
  ResourceProvider,
} from '@aws-amplify/plugin-types';
import { Stack } from 'aws-cdk-lib';
import { Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { customOutputKey } from '@aws-amplify/backend-output-schemas';
import { AmplifyUserError } from '@aws-amplify/platform-core';
import { AmplifyNotifications } from './construct.js';
import { NotificationsFactoryProps } from './types.js';
import { OUTPUT_KEY } from './constants.js';

/**
 * Generates the {@link AmplifyNotifications} construct in the resolved stack,
 * wiring the HTTP API's JWT authorizer to the app's Cognito user pool.
 */
class NotificationsGenerator implements ConstructContainerEntryGenerator {
  readonly resourceGroupName: string = 'notifications';

  constructor(
    private readonly props: NotificationsFactoryProps,
    private readonly authResources: ResourceProvider<
      AuthResources | ReferenceAuthResources
    >,
  ) {}

  generateContainerEntry = ({
    scope,
    backendSecretResolver,
  }: GenerateContainerEntryProps): AmplifyNotifications => {
    const { userPool, userPoolClient } = this.authResources.resources;
    const region = Stack.of(scope).region;

    return new AmplifyNotifications(scope, 'notifications', {
      // Build the Cognito issuer / audience from THIS app's user pool so the
      // HTTP API JWT authorizer only trusts tokens minted by this backend.
      jwtIssuer: `https://cognito-idp.${region}.amazonaws.com/${userPool.userPoolId}`,
      jwtAudience: [userPoolClient.userPoolClientId],
      // `domainName` omitted => create-from-scratch (default); provided => attach.
      domainName: this.props.domainName,
      instanceAlias: this.props.instanceAlias,
      expirationDays: this.props.expirationDays,
      guestExpirationDays: this.props.guestExpirationDays,
      devicesTableRemovalPolicy: this.props.devicesTableRemovalPolicy,
      // Resolve the optional push-channel secret material (Amplify `secret()`) to
      // deploy-time CFN tokens here — the construct stays framework-agnostic and
      // receives only plain strings. Mirrors how `defineAuth` resolves external
      // provider secrets in `translate_auth_props`.
      apnsChannel: this.props.apns
        ? {
            tokenKey: backendSecretResolver
              .resolveSecret(this.props.apns.keySecret)
              .unsafeUnwrap(),
            keyId: this.props.apns.keyId,
            teamId: this.props.apns.teamId,
            bundleId: this.props.apns.bundleId,
            sandbox: this.props.apns.sandbox,
          }
        : undefined,
      fcmChannel: this.props.fcm
        ? {
            serviceJson: backendSecretResolver
              .resolveSecret(this.props.fcm.credentialsSecret)
              .unsafeUnwrap(),
          }
        : undefined,
    });
  };
}

/**
 * Singleton factory for the notifications backend, used in a Gen2
 * `defineBackend` definition.
 */
class AmplifyNotificationsFactory implements ConstructFactory<AmplifyNotifications> {
  private generator: ConstructContainerEntryGenerator | undefined;
  private outputStored = false;
  private guestInvokeGranted = false;

  constructor(private readonly props: NotificationsFactoryProps) {}

  getInstance = (
    getInstanceProps: ConstructFactoryGetInstanceProps,
  ): AmplifyNotifications => {
    const { constructContainer, outputStorageStrategy } = getInstanceProps;

    // Resolve THIS app's auth resource (Cognito user pool + client) so the JWT
    // authorizer trusts only tokens issued by this backend. The same auth
    // factory instance also exposes `getResourceAccessAcceptor` (implemented by
    // both owned and referenced auth), which is used below to grant the guest
    // route invoke permission without any app-level IAM wiring.
    const authResources = constructContainer
      .getConstructFactory<
        ResourceProvider<AuthResources | ReferenceAuthResources> &
          ResourceAccessAcceptorFactory<AuthRoleName>
      >('AuthResources')
      ?.getInstance(getInstanceProps);

    if (!authResources) {
      throw new AmplifyUserError('NotificationsMissingAuthError', {
        message:
          'defineNotifications requires an auth resource to be present in the backend.',
        resolution:
          'Add `auth` to your backend definition, e.g. `defineBackend({ auth, notifications })`.',
      });
    }

    if (!this.generator) {
      this.generator = new NotificationsGenerator(this.props, authResources);
    }
    const notifications = constructContainer.getOrCompute(
      this.generator,
    ) as AmplifyNotifications;

    // Grant the Cognito Identity Pool UNAUTHENTICATED role permission to invoke
    // the IAM/SigV4-authorized guest identify route, so guest identify "just
    // works" with no app-level IAM grant and no new public prop.
    if (!this.guestInvokeGranted) {
      this.grantGuestRouteInvoke(authResources, notifications);
      this.guestInvokeGranted = true;
    }

    // Surface the endpoint / region to the client under the canonical
    // `notifications` section (written once, even though getInstance is a
    // memoized singleton lookup).
    if (!this.outputStored) {
      this.storeOutput(outputStorageStrategy, notifications);
      this.outputStored = true;
    }

    return notifications;
  };

  /**
   * Grants the Identity Pool unauthenticated role `execute-api:Invoke` on the
   * guest identify route.
   *
   * CRITICAL — dependency direction: the {@link Policy} is created in the
   * NOTIFICATIONS construct scope (grantor stack) and attached to the unauth
   * role via the auth `ResourceAccessAcceptor` (`policy.attachToRole`). This
   * keeps the single nested-stack edge notifications -> auth (notifications
   * already depends on auth for the JWT issuer). Using
   * `unauthRole.addToPrincipalPolicy(...)` instead would create the policy in
   * the AUTH stack referencing this API's ARN, adding an auth -> notifications
   * edge and a circular nested-stack dependency. This mirrors how
   * `defineStorage` grants the auth/unauth roles bucket access.
   */
  private grantGuestRouteInvoke = (
    authResources: ResourceAccessAcceptorFactory<AuthRoleName>,
    notifications: AmplifyNotifications,
  ): void => {
    const unauthAcceptor = authResources.getResourceAccessAcceptor(
      'unauthenticatedUserIamRole',
    );
    const guestInvokePolicy = new Policy(
      notifications,
      'GuestIdentifyInvokePolicy',
      {
        statements: [
          new PolicyStatement({
            actions: ['execute-api:Invoke'],
            resources: [notifications.guestRouteInvokeArn],
          }),
        ],
      },
    );
    unauthAcceptor.acceptResourceAccess(guestInvokePolicy, []);
  };

  private storeOutput = (
    outputStorageStrategy: BackendOutputStorageStrategy<BackendOutputEntry>,
    notifications: AmplifyNotifications,
  ): void => {
    outputStorageStrategy.addBackendOutputEntry(customOutputKey, {
      version: '1',
      payload: {
        // Serialized `Partial<ClientConfig>` — surfaced under the canonical
        // `notifications` section of `amplify_outputs.json` at
        // `notifications.amazon_connect_customer_profiles`, the exact path
        // amplify-js reads in `parseAmplifyOutputs`. The custom-output key is
        // the generic conduit for contributing a typed `Partial<ClientConfig>`
        // (see `CustomClientConfigContributor`), so the payload is NOT confined
        // to the `custom` section.
        customOutputs: JSON.stringify({
          notifications: {
            [OUTPUT_KEY]: {
              endpoint: notifications.apiEndpoint,
              aws_region: notifications.stack.region,
            },
          },
        }),
      },
    });
  };
}

/**
 * Include an Amazon Connect Customer Profiles-backed notifications resource in
 * your Amplify backend. It registers the AmplifyProfile / AmplifyGuestProfile
 * object types, a DynamoDB device store, a least-privilege identify-user Lambda
 * + a JWT-authorized HTTP API, and the push-delivery Lambda (invoked by a
 * Connect Journey Custom-action) with a minimal AWS End User Messaging
 * application. The invoke endpoint / region are
 * surfaced under `notifications.amazon_connect_customer_profiles` in
 * `amplify_outputs.json`.
 *
 * By DEFAULT (no `domainName`) it CREATES FROM SCRATCH: a brand-new Amazon
 * Connect instance AND a brand-new Customer Profiles domain (generated, stable
 * names) are provisioned and the object types are registered into that new
 * domain — zero pre-existing Connect setup required, and Connect is fully hidden
 * from the caller.
 *
 * Provide `domainName` to ATTACH to an EXISTING Customer Profiles domain — e.g.
 * the domain Amazon Connect auto-creates for your instance — registering the
 * object types into it (additive), without creating an instance or a domain.
 *
 * Optionally provide `apns` and/or `fcm` to enable the corresponding push
 * channel on the created End User Messaging (Pinpoint) application. The
 * sensitive key material (APNs `.p8`, FCM service-account JSON) is supplied via
 * Amplify `secret()` and resolved at deploy time; non-secret identifiers are
 * plain props. Omit them to leave the channels not configured (unchanged
 * behavior).
 * @example
 * import { defineBackend } from '@aws-amplify/backend';
 * import { defineNotifications } from '@aws-amplify/backend-notifications';
 * import { auth } from './auth/resource';
 * import { secret } from '@aws-amplify/backend';
 *
 * defineBackend({
 *   auth,
 *   // Zero-config: creates a Connect instance + Customer Profiles domain:
 *   notifications: defineNotifications(),
 *   // ...or attach to an existing domain and enable push channels:
 *   // notifications: defineNotifications({
 *   //   domainName: 'amazon-connect-amplify',
 *   //   apns: {
 *   //     keySecret: secret('APNS_SIGNING_KEY'),
 *   //     keyId: 'ABC123DEFG',
 *   //     teamId: 'DEF456GHIJ',
 *   //     bundleId: 'com.example.app',
 *   //   },
 *   //   fcm: { credentialsSecret: secret('FCM_SERVICE_ACCOUNT_JSON') },
 *   // }),
 * });
 */
export const defineNotifications = (
  props: NotificationsFactoryProps = {},
): ConstructFactory<AmplifyNotifications> =>
  new AmplifyNotificationsFactory(props);
