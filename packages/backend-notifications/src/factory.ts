import {
  AuthResources,
  BackendOutputEntry,
  BackendOutputStorageStrategy,
  ConstructContainerEntryGenerator,
  ConstructFactory,
  ConstructFactoryGetInstanceProps,
  GenerateContainerEntryProps,
  ReferenceAuthResources,
  ResourceProvider,
} from '@aws-amplify/plugin-types';
import { Stack } from 'aws-cdk-lib';
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

  constructor(private readonly props: NotificationsFactoryProps) {}

  getInstance = (
    getInstanceProps: ConstructFactoryGetInstanceProps,
  ): AmplifyNotifications => {
    const { constructContainer, outputStorageStrategy } = getInstanceProps;

    // Resolve THIS app's auth resource (Cognito user pool + client) so the JWT
    // authorizer trusts only tokens issued by this backend.
    const authResources = constructContainer
      .getConstructFactory<
        ResourceProvider<AuthResources | ReferenceAuthResources>
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

    // Surface the endpoint / region to the client via a custom backend output
    // (written once, even though getInstance is a memoized singleton lookup).
    if (!this.outputStored) {
      this.storeOutput(outputStorageStrategy, notifications);
      this.outputStored = true;
    }

    return notifications;
  };

  private storeOutput = (
    outputStorageStrategy: BackendOutputStorageStrategy<BackendOutputEntry>,
    notifications: AmplifyNotifications,
  ): void => {
    outputStorageStrategy.addBackendOutputEntry(customOutputKey, {
      version: '1',
      payload: {
        // Serialized `Partial<ClientConfig>` — surfaced under `custom` in
        // `amplify_outputs.json`, matching `backend.addOutput({ custom })`.
        customOutputs: JSON.stringify({
          custom: {
            [OUTPUT_KEY]: {
              endpoint: notifications.apiEndpoint,
              region: notifications.stack.region,
              // The Customer Profiles domain the object types live in — the
              // generated name in create mode, or the attached name. Surfaced so
              // clients / verification can address the exact domain in use.
              domainName: notifications.domainName,
            },
          },
        }),
      },
    });
  };
}

/**
 * Include an Amazon Connect Customer Profiles-backed notifications resource in
 * your Amplify backend. It registers the AmplifyProfile / AmplifyDevice object
 * types, a least-privilege identify-user Lambda + a JWT-authorized HTTP API, and
 * the push-delivery Lambda (invoked by a Connect Journey Custom-action) with a
 * minimal AWS End User Messaging application. The invoke endpoint / region /
 * domain name are surfaced under `custom.CustomerProfiles` in
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
 * @example
 * import { defineBackend } from '@aws-amplify/backend';
 * import { defineNotifications } from '@aws-amplify/backend-notifications';
 * import { auth } from './auth/resource';
 *
 * defineBackend({
 *   auth,
 *   // Zero-config: creates a Connect instance + Customer Profiles domain:
 *   notifications: defineNotifications(),
 *   // ...or attach to an existing domain:
 *   // notifications: defineNotifications({ domainName: 'amazon-connect-amplify' }),
 * });
 */
export const defineNotifications = (
  props: NotificationsFactoryProps = {},
): ConstructFactory<AmplifyNotifications> =>
  new AmplifyNotificationsFactory(props);
