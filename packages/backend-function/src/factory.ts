import {
  ConstructContainerEntryGenerator,
  ConstructFactory,
  ConstructFactoryGetInstanceProps,
} from '@aws-amplify/plugin-types';
import {
  AmplifyFunctionProps,
  AmplifyLambdaFunction,
} from '@aws-amplify/function-construct-alpha';
import { Construct } from 'constructs';
import { execaCommand } from 'execa';
import * as path from 'path';
import { getCallerDirectory } from './get_caller_directory.js';

export type AmplifyFunctionFactoryBaseProps = {
  /**
   * A name for the function that is used to disambiguate it from other functions in the project
   */
  name: string;
};

export type AmplifyFunctionFactoryBuildProps = AmplifyFunctionFactoryBaseProps &
  Omit<AmplifyFunctionProps, 'absoluteCodePath'> & {
    /**
     * The command to run that generates built function code.
     * This command is run from the directory where this factory is called
     */
    buildCommand: string;
    /**
     * The buildCommand is expected to place build artifacts at this location.
     * This path can be relative or absolute. If relative, the absolute path is calculated based on the directory where this factory is called
     */
    outDir: string;
  };

export type AmplifyFunctionFactoryFromDirProps =
  AmplifyFunctionFactoryBaseProps &
    Omit<AmplifyFunctionProps, 'absoluteCodePath'> & {
      /**
       * The location of the pre-built function code.
       * Can be a directory or a .zip file.
       * Can be a relative or absolute path. If relative, the absolute path is calculated based on the directory where this factory is called.
       */
      codePath: string;
    };

type AmplifyFunctionFactoryProps = AmplifyFunctionFactoryBaseProps &
  AmplifyFunctionProps;

/**
 * Create Lambda functions in the context of an Amplify backend definition
 */
export class AmplifyFunctionFactory
  implements ConstructFactory<AmplifyLambdaFunction>
{
  // execaCommand is assigned to a static prop so that it can be mocked in tests
  private static commandExecutor = execaCommand;

  private generator: ConstructContainerEntryGenerator;
  /**
   * Create a new AmplifyFunctionFactory
   */
  private constructor(private readonly props: AmplifyFunctionFactoryProps) {}

  /**
   * Create a function from a directory that contains pre-built code
   */
  static fromDir = (
    props: AmplifyFunctionFactoryFromDirProps
  ): AmplifyFunctionFactory => {
    const absoluteCodePath = path.isAbsolute(props.codePath)
      ? props.codePath
      : path.resolve(getCallerDirectory(new Error().stack), props.codePath);
    return new AmplifyFunctionFactory({
      name: props.name,
      absoluteCodePath,
      runtime: props.runtime,
      handler: props.handler,
    });
  };

  /**
   * Create a function by executing a build command that places build artifacts at a specified location
   *
   * TODO: Investigate long-term function building strategy: https://github.com/aws-amplify/amplify-backend/issues/92
   */
  static build = async (
    props: AmplifyFunctionFactoryBuildProps
  ): Promise<AmplifyFunctionFactory> => {
    const importPath = getCallerDirectory(new Error().stack);

    await AmplifyFunctionFactory.commandExecutor(props.buildCommand, {
      cwd: importPath,
      stdio: 'inherit',
      shell: 'bash',
    });

    const absoluteCodePath = path.isAbsolute(props.outDir)
      ? props.outDir
      : path.resolve(importPath, props.outDir);

    return new AmplifyFunctionFactory({
      name: props.name,
      absoluteCodePath,
      runtime: props.runtime,
      handler: props.handler,
    });
  };

  /**
   * Creates an instance of AmplifyFunction within the provided Amplify context
   */
  getInstance = ({
    constructContainer,
  }: ConstructFactoryGetInstanceProps): AmplifyLambdaFunction => {
    if (!this.generator) {
      this.generator = new AmplifyFunctionGenerator(this.props);
    }
    return constructContainer.getOrCompute(
      this.generator
    ) as AmplifyLambdaFunction;
  };
}

class AmplifyFunctionGenerator implements ConstructContainerEntryGenerator {
  readonly resourceGroupName = 'function';

  constructor(private readonly props: AmplifyFunctionFactoryProps) {}

  generateContainerEntry = (scope: Construct) => {
    return new AmplifyLambdaFunction(scope, this.props.name, this.props);
  };
}

/**
 * Alias for AmplifyFunctionFactory
 */
export const Func = AmplifyFunctionFactory;
