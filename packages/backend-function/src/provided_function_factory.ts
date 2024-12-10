import {
  AmplifyFunction,
  AmplifyResourceGroupName,
  BackendOutputStorageStrategy,
  ConstructContainerEntryGenerator,
  ConstructFactory,
  ConstructFactoryGetInstanceProps,
  FunctionResources,
  GenerateContainerEntryProps,
  ResourceAccessAcceptorFactory,
  ResourceProvider,
} from '@aws-amplify/plugin-types';
import { Construct } from 'constructs';
import { CfnFunction, IFunction } from 'aws-cdk-lib/aws-lambda';
import {
  FunctionOutput,
  functionOutputKey,
} from '@aws-amplify/backend-output-schemas';
import { Stack, Tags } from 'aws-cdk-lib';
import { TagName } from '@aws-amplify/platform-core';
import { AttributionMetadataStorage } from '@aws-amplify/backend-output-storage';
import { fileURLToPath } from 'node:url';
import { Policy } from 'aws-cdk-lib/aws-iam';

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
    const providedFunction = this.functionProvider(scope);

    return new ProvidedAmplifyFunction(
      scope,
      `${providedFunction.functionName}-provided`,
      this.outputStorageStrategy,
      providedFunction
    );
  };
}

class ProvidedAmplifyFunction
  extends Construct
  implements ResourceProvider<FunctionResources>, ResourceAccessAcceptorFactory
{
  readonly resources: FunctionResources;
  readonly stack: Stack;
  constructor(
    scope: Construct,
    id: string,
    outputStorageStrategy: BackendOutputStorageStrategy<FunctionOutput>,
    providedFunction: IFunction
  ) {
    super(scope, id);

    this.stack = Stack.of(scope);

    const cfnFunction = providedFunction.node.findChild(
      'Resource'
    ) as CfnFunction;

    // TODO, this is causing circular dependency. And will prevent log streaming.
    // Perhaps friendly name should be in props instead.
    // Tags.of(cfnFunction).add(
    //   TagName.FRIENDLY_NAME,
    //   providedFunction.functionName
    // );

    this.resources = {
      lambda: providedFunction,
      cfnResources: {
        cfnFunction,
      },
    };

    this.storeOutput(outputStorageStrategy);

    new AttributionMetadataStorage().storeAttributionMetadata(
      Stack.of(this),
      'provided-function-Lambda',
      fileURLToPath(new URL('../package.json', import.meta.url))
    );
  }

  getResourceAccessAcceptor = () => ({
    identifier: `${this.node.id}LambdaResourceAccessAcceptor`,
    acceptResourceAccess: (policy: Policy) => {
      const role = this.resources.lambda.role;
      if (!role) {
        // This should never happen since we are using the Function L2 construct
        throw new Error(
          'No execution role found to attach lambda permissions to'
        );
      }
      policy.attachToRole(role);
    },
  });

  /**
   * Store storage outputs using provided strategy
   */
  private storeOutput = (
    outputStorageStrategy: BackendOutputStorageStrategy<FunctionOutput>
  ): void => {
    outputStorageStrategy.appendToBackendOutputList(functionOutputKey, {
      version: '1',
      payload: {
        definedFunctions: this.resources.lambda.functionName,
      },
    });
  };
}
