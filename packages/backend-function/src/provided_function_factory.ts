import {
  AmplifyFunction,
  AmplifyResourceGroupName,
  BackendOutputStorageStrategy,
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
import { Tags } from 'aws-cdk-lib';
import { AmplifyUserError, TagName } from '@aws-amplify/platform-core';
import { AmplifyFunctionBase } from './function_construct_base.js';
import { FunctionResourceAccessAcceptor } from './resource_access_acceptor.js';

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
    private readonly props?: ProvidedFunctionProps
  ) {}

  /**
   * Creates a function instance.
   */
  getInstance(props: ConstructFactoryGetInstanceProps): AmplifyFunction {
    if (!this.generator) {
      this.generator = new ProvidedFunctionGenerator(
        this.functionProvider,
        props.outputStorageStrategy,
        this.props
      );
    }
    return props.constructContainer.getOrCompute(
      this.generator
    ) as AmplifyFunction;
  }
}

class ProvidedFunctionGenerator implements ConstructContainerEntryGenerator {
  readonly resourceGroupName: AmplifyResourceGroupName;

  constructor(
    private readonly functionProvider: (scope: Construct) => IFunction,
    private readonly outputStorageStrategy: BackendOutputStorageStrategy<FunctionOutput>,
    props?: ProvidedFunctionProps
  ) {
    this.resourceGroupName = props?.resourceGroupName ?? 'function';
  }

  generateContainerEntry = ({ scope }: GenerateContainerEntryProps) => {
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
          e
        );
      } else {
        throw new AmplifyUserError(
          'CustomFunctionProviderError',
          {
            message: e instanceof Error ? e.message : JSON.stringify(e),
            resolution:
              "Ensure that callback passed to 'defineFunction' executes without error. See https://docs.amplify.aws/react/build-a-backend/functions/custom-functions for more details.",
          },
          e instanceof Error ? e : undefined
        );
      }
    }
    return new ProvidedAmplifyFunction(
      scope,
      `${providedFunction.node.id}-provided`,
      this.outputStorageStrategy,
      providedFunction
    );
  };
}

class ProvidedAmplifyFunction extends AmplifyFunctionBase {
  readonly resources: FunctionResources;
  constructor(
    scope: Construct,
    id: string,
    outputStorageStrategy: BackendOutputStorageStrategy<FunctionOutput>,
    providedFunction: IFunction
  ) {
    super(scope, id, outputStorageStrategy);

    const cfnFunction = providedFunction.node.findChild(
      'Resource'
    ) as CfnFunction;

    Tags.of(cfnFunction).add(TagName.FRIENDLY_NAME, providedFunction.node.id);

    this.resources = {
      lambda: providedFunction,
      cfnResources: {
        cfnFunction,
      },
    };

    this.storeOutput();
  }

  getResourceAccessAcceptor = (): ResourceAccessAcceptor =>
    new FunctionResourceAccessAcceptor(this);
}
