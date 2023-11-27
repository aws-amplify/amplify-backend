import {
  ConstructContainerEntryGenerator,
  ConstructFactory,
  ConstructFactoryGetInstanceProps,
  FunctionResources,
  ResourceProvider,
} from '@aws-amplify/plugin-types';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';
import { getCallerDirectory } from './get_caller_directory.js';

/**
 * Entry point for defining a function in the Amplify ecosystem
 */
export const defineFunction = (props: FunctionFactoryProps = {}) =>
  new FunctionFactory(props, new Error().stack);

export type FunctionFactoryProps = {
  /**
   * A name for the function.
   * Defaults to the basename of the entry path if specified.
   * If no entry is specified, defaults to the directory name in which this function is defined.
   *
   * Example:
   * If entry is `./scheduled-db-backup.ts` the name will default to "scheduled-db-backup"
   * If entry is not set and the function is defined in `amplify/functions/db-backup/resource.ts` the name will default to "db-backup"
   */
  name?: string;
  /**
   * The path to the file that contains the function entry point.
   * If this is a relative path, it is computed relative to the file where this function is defined
   *
   * Defaults to './handler.js'
   */
  entry?: string;
};

/**
 * Create Lambda functions in the context of an Amplify backend definition
 */
export class FunctionFactory implements ConstructFactory<AmplifyFunction> {
  private generator: ConstructContainerEntryGenerator;
  /**
   * Create a new AmplifyFunctionFactory
   */
  constructor(
    private readonly props: FunctionFactoryProps,
    private readonly callerStack?: string
  ) {}

  /**
   * Creates an instance of AmplifyFunction within the provided Amplify context
   */
  getInstance = ({
    constructContainer,
  }: ConstructFactoryGetInstanceProps): AmplifyFunction => {
    if (!this.generator) {
      this.generator = new FunctionGenerator(this.hydrateDefaults());
    }
    return constructContainer.getOrCompute(this.generator) as AmplifyFunction;
  };

  private hydrateDefaults = (): HydratedFunctionProps => {
    return {
      name: this.resolveName(),
      entry: this.resolveEntry(),
    };
  };

  private resolveName = () => {
    // If name is set explicitly, use that
    if (this.props.name) {
      return this.props.name;
    }
    // If entry is set, use the basename of the entry path
    if (this.props.entry) {
      return path.parse(this.props.entry).name;
    }

    // Otherwise, use the directory name where the function is defined
    return path.basename(getCallerDirectory(this.callerStack));
  };

  private resolveEntry = () => {
    // if entry is not set, default to handler.js
    if (!this.props.entry) {
      return path.join(getCallerDirectory(this.callerStack), 'handler.js');
    }

    // if entry is absolute use that
    if (path.isAbsolute(this.props.entry)) {
      return this.props.entry;
    }

    // if entry is relative, compute with respect to the caller directory
    return path.join(getCallerDirectory(this.callerStack), this.props.entry);
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
    this.resources = {
      lambda: new NodejsFunction(scope, `${id}-lambda`, {
        entry: props.entry,
      }),
    };
  }
}
