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
import { DEFAULT_OUTPUT_KEY } from './constants.js';

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
      domainName: this.props.domainName,
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
    const outputKey = this.props.outputKey ?? DEFAULT_OUTPUT_KEY;
    outputStorageStrategy.addBackendOutputEntry(customOutputKey, {
      version: '1',
      payload: {
        // Serialized `Partial<ClientConfig>` — surfaced under `custom` in
        // `amplify_outputs.json`, matching `backend.addOutput({ custom })`.
        customOutputs: JSON.stringify({
          custom: {
            [outputKey]: {
              endpoint: notifications.apiEndpoint,
              region: notifications.stack.region,
            },
          },
        }),
      },
    });
  };
}

/**
 * Include an Amazon Connect Customer Profiles-backed notifications resource in
 * your Amplify backend. It provisions a Customer Profiles domain, the
 * AmplifyProfile / AmplifyDevice object types, a least-privilege identify-user
 * Lambda, and an HTTP API whose Cognito JWT authorizer is wired to this app's
 * user pool. The invoke endpoint / region are surfaced under `custom` in
 * `amplify_outputs.json`.
 * @example
 * import { defineBackend } from '@aws-amplify/backend';
 * import { defineNotifications } from '@aws-amplify/backend-notifications';
 * import { auth } from './auth/resource';
 *
 * defineBackend({
 *   auth,
 *   notifications: defineNotifications({ domainName: 'MyAppProfiles' }),
 * });
 */
export const defineNotifications = (
  props: NotificationsFactoryProps = {},
): ConstructFactory<AmplifyNotifications> =>
  new AmplifyNotificationsFactory(props);
