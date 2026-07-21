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
import { Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { customOutputKey } from '@aws-amplify/backend-output-schemas';
import { AmplifyUserError } from '@aws-amplify/platform-core';
import { AmplifyNotifications } from './construct.js';
import { NotificationsFactoryProps } from './types.js';
import { OUTPUT_KEY } from './constants.js';

/**
 * Generates the {@link AmplifyNotifications} construct in the resolved stack,
 * granting the app's Cognito Identity Pool roles access to the SigV4 API routes.
 */
class NotificationsGenerator implements ConstructContainerEntryGenerator {
  readonly resourceGroupName: string = 'notifications';

  constructor(private readonly props: NotificationsFactoryProps) {}

  generateContainerEntry = ({
    scope,
    backendSecretResolver,
  }: GenerateContainerEntryProps): AmplifyNotifications => {
    const props = this.props;
    // Create-only knobs (instanceAlias / expirationDays) exist only on the
    // create-from-scratch branch of the discriminated union (domainName absent).
    const createOnly =
      props.domainName === undefined
        ? {
            instanceAlias: props.instanceAlias,
            expirationDays: props.expirationDays,
          }
        : {};
    return new AmplifyNotifications(scope, 'notifications', {
      // `domainName` omitted => create-from-scratch (default); provided => attach.
      domainName: props.domainName,
      ...createOnly,
      // Resolve the optional push-channel secret material (Amplify `secret()`) to
      // deploy-time CFN tokens here — the construct stays framework-agnostic and
      // receives only plain strings. Mirrors how `defineAuth` resolves external
      // provider secrets in `translate_auth_props`.
      apnsChannel: props.apns
        ? {
            tokenKey: backendSecretResolver
              .resolveSecret(props.apns.tokenKey)
              .unsafeUnwrap(),
            tokenKeyId: props.apns.tokenKeyId,
            teamId: props.apns.teamId,
            bundleId: props.apns.bundleId,
            sandbox: props.apns.sandbox,
          }
        : undefined,
      fcmChannel: props.fcm
        ? {
            serviceJson: backendSecretResolver
              .resolveSecret(props.fcm.serviceJson)
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

    // Resolve THIS app's auth resource (Cognito Identity Pool roles). The auth
    // factory instance exposes `getResourceAccessAcceptor` (implemented by
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
      this.generator = new NotificationsGenerator(this.props);
    }
    const notifications = constructContainer.getOrCompute(
      this.generator,
    ) as AmplifyNotifications;

    // Grant the Cognito Identity Pool authenticated AND unauthenticated roles
    // permission to invoke the IAM/SigV4-authorized write routes, so identify /
    // register / remove "just work" for both signed-in and guest callers with no
    // app-level IAM grant. (A guest is simply an unauthenticated identityId on
    // the same SigV4 endpoints.)
    if (!this.guestInvokeGranted) {
      this.grantRouteInvoke(authResources, notifications);
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
   * Grants the Identity Pool authenticated AND unauthenticated roles
   * `execute-api:Invoke` on the three SigV4 write routes.
   *
   * CRITICAL — dependency direction: the {@link Policy} objects are created in
   * the NOTIFICATIONS construct scope (grantor stack) and attached to the roles
   * via the auth `ResourceAccessAcceptor` (`policy.attachToRole`). This keeps
   * the single nested-stack edge notifications -> auth. Using
   * `role.addToPrincipalPolicy(...)` instead would create the policy in the AUTH
   * stack referencing this API's ARN, adding an auth -> notifications edge and a
   * circular nested-stack dependency. This mirrors how `defineStorage` grants
   * the auth/unauth roles bucket access.
   */
  private grantRouteInvoke = (
    authResources: ResourceAccessAcceptorFactory<AuthRoleName>,
    notifications: AmplifyNotifications,
  ): void => {
    const roles: AuthRoleName[] = [
      'authenticatedUserIamRole',
      'unauthenticatedUserIamRole',
    ];
    for (const roleName of roles) {
      const acceptor = authResources.getResourceAccessAcceptor(roleName);
      const invokePolicy = new Policy(
        notifications,
        `WriteRouteInvokePolicy-${roleName}`,
        {
          statements: [
            new PolicyStatement({
              actions: ['execute-api:Invoke'],
              resources: notifications.routeInvokeArns,
            }),
          ],
        },
      );
      acceptor.acceptResourceAccess(invokePolicy, []);
    }
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
        // `notifications.amazon_connect`, the exact path
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
 * your Amplify backend. It registers the AmplifyProfile object type, a DynamoDB
 * device store, a least-privilege write Lambda behind a SigV4-authorized HTTP
 * API, and the push-delivery Lambda (invoked by a
 * Connect Journey Custom-action) with a minimal AWS End User Messaging
 * application. The invoke endpoint / region are
 * surfaced under `notifications.amazon_connect` in
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
