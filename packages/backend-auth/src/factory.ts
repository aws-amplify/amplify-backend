import { AmplifyAuth, AuthProps } from '@aws-amplify/auth-construct-alpha';
import { Construct } from 'constructs';
import {
  AuthResources,
  ConstructContainerEntryGenerator,
  ConstructFactory,
  ConstructFactoryGetInstanceProps,
  FunctionResources,
  ResourceProvider,
} from '@aws-amplify/plugin-types';
import { UserPoolOperation } from 'aws-cdk-lib/aws-cognito';

export type TriggerEvent =
  | 'createAuthChallenge'
  | 'customEmailSender'
  | 'customMessage'
  | 'customSmsSender'
  | 'defineAuthChallenge'
  | 'postAuthentication'
  | 'postConfirmation'
  | 'preAuthentication'
  | 'preSignUp'
  | 'preTokenGeneration'
  | 'userMigration'
  | 'verifyAuthChallengeResponse';

export type TriggerConfig = {
  triggers?: Record<
    TriggerEvent,
    ConstructFactory<ResourceProvider<FunctionResources>>
  >;
};

export type AmplifyAuthFactoryProps = AuthProps & TriggerConfig;

/**
 * Singleton factory for AmplifyAuth that can be used in Amplify project files
 */
export class AmplifyAuthFactory
  implements ConstructFactory<AmplifyAuth & ResourceProvider<AuthResources>>
{
  readonly provides = 'AuthResources';
  private generator: ConstructContainerEntryGenerator;
  private readonly importStack: string | undefined;

  /**
   * Set the properties that will be used to initialize AmplifyAuth
   */
  constructor(private readonly props: AmplifyAuthFactoryProps) {
    // capture the import stack in the ctor because this is what customers call in the backend definition code
    this.importStack = new Error().stack;
  }

  /**
   * Get a singleton instance of AmplifyAuth
   */
  getInstance = (
    getInstanceProps: ConstructFactoryGetInstanceProps
  ): AmplifyAuth => {
    const { constructContainer, importPathVerifier } = getInstanceProps;
    importPathVerifier?.verify(
      this.importStack,
      'auth',
      'Amplify Auth must be defined in an "auth.ts" file'
    );
    if (!this.generator) {
      this.generator = new AmplifyAuthGenerator(this.props, getInstanceProps);
    }
    return constructContainer.getOrCompute(this.generator) as AmplifyAuth;
  };
}

class AmplifyAuthGenerator implements ConstructContainerEntryGenerator {
  readonly resourceGroupName = 'auth';
  private readonly defaultName = 'amplifyAuth';

  constructor(
    private readonly props: AmplifyAuthFactoryProps,
    private readonly getInstanceProps: ConstructFactoryGetInstanceProps
  ) {}

  generateContainerEntry = (scope: Construct) => {
    const authConstruct = new AmplifyAuth(scope, this.defaultName, this.props);
    authConstruct.storeOutput(this.getInstanceProps.outputStorageStrategy);
    Object.entries(this.props.triggers || {}).forEach(
      ([triggerEvent, handlerFactory]) => {
        authConstruct.addTrigger(
          UserPoolOperation.of(triggerEvent),
          handlerFactory.getInstance(this.getInstanceProps).resources.lambda
        );
      }
    );
    return authConstruct;
  };
}

/**
 * Alias for AmplifyAuthFactory
 */
export const Auth = AmplifyAuthFactory;
