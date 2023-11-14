import {
  ConstructContainerEntryGenerator,
  ConstructFactory,
  ConstructFactoryGetInstanceProps,
  FunctionResources,
  ResourceProvider,
} from '@aws-amplify/plugin-types';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';

/**
 * Entry point for defining a function in the Amplify ecosystem
 */
export const defineFunction = (props: FunctionFactoryProps) =>
  new FunctionFactory(props);

export type FunctionFactoryProps = {
  /**
   * A name for the function that is used to disambiguate it from other functions in the project.
   * Defaults to the directory name in which this function is defined
   */
  name?: string;
  /**
   * The name of the function from the source code that is executed in the cloud
   * Defaults to "handler"
   */
  handler?: string;
  /**
   * The name of the file that contains the handler, relative to the location where `defineFunction` is called
   * Defaults to "./handler.ts"
   */
  relativeSourcePath?: string;
};

/**
 * Create Lambda functions in the context of an Amplify backend definition
 */
export class FunctionFactory implements ConstructFactory<AmplifyFunction> {
  private readonly placeholderDefaultName = 'placeholder-name';
  private generator: ConstructContainerEntryGenerator;
  /**
   * Create a new AmplifyFunctionFactory
   */
  constructor(private readonly props: FunctionFactoryProps) {}

  /**
   * Creates an instance of AmplifyFunction within the provided Amplify context
   */
  getInstance = ({
    constructContainer,
  }: ConstructFactoryGetInstanceProps): AmplifyFunction => {
    if (!this.generator) {
      this.generator = new FunctionGenerator(this.hydrateDefaults(this.props));
    }
    return constructContainer.getOrCompute(this.generator) as AmplifyFunction;
  };

  private hydrateDefaults = (
    props: FunctionFactoryProps
  ): HydratedFunctionProps => {
    return {
      name: props.name ?? this.placeholderDefaultName,
      handler: props.handler ?? 'handler',
      relativeSourcePath: props.relativeSourcePath ?? './handler.ts',
    };
  };
}

type HydratedFunctionProps = Required<FunctionFactoryProps>;

class FunctionGenerator implements ConstructContainerEntryGenerator {
  readonly resourceGroupName = 'function';

  constructor(private readonly props: HydratedFunctionProps) {}

  generateContainerEntry = (scope: Construct) => {
    return new AmplifyFunction(scope, this.props.name, this.props);
  };
}

class AmplifyFunction
  extends Construct
  implements ResourceProvider<FunctionResources>
{
  readonly resources: FunctionResources;
  constructor(scope: Construct, id: string, props: HydratedFunctionProps) {
    super(scope, id);
    const lambda = new NodejsFunction(scope, `${id}-lambda`, {
      handler: props.handler,
      entry: props.relativeSourcePath,
    });
    this.resources.lambda = lambda;
  }
}
