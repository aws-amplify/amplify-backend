import {
  AmplifyFunction,
  AmplifyResourceGroupName,
  BackendOutputStorageStrategy,
  BackendSecret,
  BackendSecretResolver,
  ConstructContainerEntryGenerator,
  ConstructFactory,
  ConstructFactoryGetInstanceProps,
  FunctionResources,
  GenerateContainerEntryProps,
  ResourceAccessAcceptor,
} from '@aws-amplify/plugin-types';
import { Construct } from 'constructs';
import { CfnFunction, IFunction } from 'aws-cdk-lib/aws-lambda';
import { FunctionOutput } from '@aws-amplify/backend-output-schemas';
import { Lazy, Tags } from 'aws-cdk-lib';
import { AmplifyUserError, TagName } from '@aws-amplify/platform-core';
import { AmplifyFunctionBase } from './function_construct_base.js';
import { FunctionResourceAccessAcceptor } from './resource_access_acceptor.js';
import { SsmEnvVars } from './function_env_translator.js';
import { amplifySsmEnvConfigKey } from './constants.js';

export type ProvidedFunctionProps = {
  /**
   * Group the function with existing Amplify resources or separate the function into its own group.
   * @default 'function' // grouping with other Amplify functions
   * @example
   * resourceGroupName: 'auth' // to group an auth trigger with an auth resource
   */
  resourceGroupName?: AmplifyResourceGroupName;
};

/**
 * Adapts provided CDK function as Amplify function.
 */
export class ProvidedFunctionFactory
  implements ConstructFactory<AmplifyFunction>
{
  private generator: ConstructContainerEntryGenerator;

  /**
   * Creates provided function factory.
   */
  constructor(
    private readonly functionProvider: (scope: Construct) => IFunction,
    private readonly props?: ProvidedFunctionProps,
  ) {}

  /**
   * Creates a function instance.
   */
  getInstance(props: ConstructFactoryGetInstanceProps): AmplifyFunction {
    if (!this.generator) {
      this.generator = new ProvidedFunctionGenerator(
        this.functionProvider,
        props.outputStorageStrategy,
        this.props,
      );
    }
    return props.constructContainer.getOrCompute(
      this.generator,
    ) as AmplifyFunction;
  }
}

class ProvidedFunctionGenerator implements ConstructContainerEntryGenerator {
  readonly resourceGroupName: AmplifyResourceGroupName;

  constructor(
    private readonly functionProvider: (scope: Construct) => IFunction,
    private readonly outputStorageStrategy: BackendOutputStorageStrategy<FunctionOutput>,
    props?: ProvidedFunctionProps,
  ) {
    this.resourceGroupName = props?.resourceGroupName ?? 'function';
  }

  generateContainerEntry = ({
    scope,
    backendSecretResolver,
  }: GenerateContainerEntryProps) => {
    let providedFunction: IFunction;
    try {
      providedFunction = this.functionProvider(scope);
    } catch (e) {
      if (
        e instanceof Error &&
        (e.message.includes('docker exited with status 1') ||
          e.message.includes('docker ENOENT'))
      ) {
        throw new AmplifyUserError(
          'CustomFunctionProviderDockerError',
          {
            message: 'Failed to instantiate custom function provider',
            resolution:
              'See https://docs.amplify.aws/react/build-a-backend/functions/custom-functions for more details about current limitations and troubleshooting steps.',
          },
          e,
        );
      } else {
        throw new AmplifyUserError(
          'CustomFunctionProviderError',
          {
            message: 'Failed to instantiate custom function provider',
            resolution:
              'Check the definition of your custom function provided in `defineFunction` and refer to the logs for more information. See https://docs.amplify.aws/react/build-a-backend/functions/custom-functions for more details.',
          },
          e instanceof Error ? e : undefined,
        );
      }
    }
    return new ProvidedAmplifyFunction(
      scope,
      `${providedFunction.node.id}-provided`,
      this.outputStorageStrategy,
      providedFunction,
      backendSecretResolver,
    );
  };
}

class ProvidedAmplifyFunction extends AmplifyFunctionBase {
  readonly resources: FunctionResources;
  private readonly cfnFunction: CfnFunction;
  private readonly envVars: Record<string, string> = {};
  private readonly ssmEnvVars: SsmEnvVars = {};
  constructor(
    scope: Construct,
    id: string,
    outputStorageStrategy: BackendOutputStorageStrategy<FunctionOutput>,
    providedFunction: IFunction,
    private readonly backendSecretResolver: BackendSecretResolver,
  ) {
    super(scope, id, outputStorageStrategy);

    this.cfnFunction = providedFunction.node.findChild(
      'Resource',
    ) as CfnFunction;

    Tags.of(this.cfnFunction).add(
      TagName.FRIENDLY_NAME,
      providedFunction.node.id,
    );

    const currentEnvVars = this.cfnFunction.environment;

    this.cfnFunction.addPropertyOverride(
      'Environment.Variables',
      Lazy.any({
        produce: () => {
          if (
            currentEnvVars &&
            'variables' in currentEnvVars &&
            isStringRecord(currentEnvVars.variables)
          ) {
            return {
              ...currentEnvVars.variables,
              ...this.envVars,
              [amplifySsmEnvConfigKey]: JSON.stringify(this.ssmEnvVars),
            };
          }
          return {
            ...this.envVars,
            [amplifySsmEnvConfigKey]: JSON.stringify(this.ssmEnvVars),
          };
        },
      }),
    );

    this.resources = {
      lambda: providedFunction,
      cfnResources: {
        cfnFunction: this.cfnFunction,
      },
    };

    this.storeOutput();
  }

  addEnvironment = (key: string, value: string | BackendSecret) => {
    if (key === amplifySsmEnvConfigKey) {
      throw new Error(
        `${amplifySsmEnvConfigKey} is a reserved environment variable name`,
      );
    }
    if (typeof value === 'string') {
      this.envVars[key] = value;
    } else {
      this.envVars[key] = '<value will be resolved during runtime>';
      const { branchSecretPath, sharedSecretPath } =
        this.backendSecretResolver.resolvePath(value);
      this.ssmEnvVars[key] = {
        path: branchSecretPath,
        sharedPath: sharedSecretPath,
      };
    }
  };

  getResourceAccessAcceptor = (): ResourceAccessAcceptor =>
    new FunctionResourceAccessAcceptor(this);
}

const isStringRecord = (value: unknown): value is Record<string, string> => {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.keys(value).every(
      (key) => typeof (value as Record<string, unknown>)[key] === 'string',
    )
  );
};
