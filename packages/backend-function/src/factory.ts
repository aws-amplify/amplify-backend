import {
  ConstructContainerEntryGenerator,
  ConstructFactory,
  ConstructFactoryGetInstanceProps,
} from '@aws-amplify/plugin-types';
import {
  AmplifyFunction,
  AmplifyFunctionProps,
} from '@aws-amplify/function-construct';
import { Construct } from 'constructs';
import { execaCommandSync } from 'execa';
import * as path from 'path';

export type AmplifyFunctionFactoryProps = AmplifyFunctionProps & {
  name: string;
  buildCommand?: string;
};

/**
 * Create Lambda functions in the context of an Amplify backend definition
 */
export class AmplifyFunctionFactory
  implements ConstructFactory<AmplifyFunction>
{
  private generator: ConstructContainerEntryGenerator;
  private readonly importLocation: string;
  /**
   * Create a new AmplifyFunctionFactory
   */
  constructor(private readonly props: AmplifyFunctionFactoryProps) {
    this.importLocation = this.getImportLocation(new Error().stack);
    if (!path.isAbsolute(props.codeLocation)) {
      props.codeLocation = path.resolve(
        this.importLocation,
        props.codeLocation
      );
    }
  }

  /**
   * Creates an instance of AmplifyFunction within the provided Amplify context
   */
  getInstance({
    constructContainer,
  }: ConstructFactoryGetInstanceProps): AmplifyFunction {
    if (!this.generator) {
      this.generator = new AmplifyFunctionGenerator(
        this.props,
        this.importLocation
      );
    }
    return constructContainer.getOrCompute(this.generator) as AmplifyFunction;
  }

  /**
   * Extracts the file location where this class is imported. This is used as the base path for relative code locations
   */
  private getImportLocation(stack?: string): string {
    const unresolvedImportLocationError = new Error(
      'Could not determine import path to construct absolute code path from relative path. Consider using an absolute path instead.'
    );
    if (!stack) {
      throw unresolvedImportLocationError;
    }
    const stacktraceLines =
      stack
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.startsWith('at')) || [];
    if (stacktraceLines.length < 2) {
      throw unresolvedImportLocationError;
    }
    const stackTraceImportLine = stacktraceLines[1]; // the first entry is the file where the error was initialized (our code). The second entry is where the customer called our code which is what we are interested in
    // the line is something like `at <anonymous> (/some/path/to/file.ts:3:21)`
    // this regex pulls out the file path, ie `/some/path/to/file.ts`
    const extractFilePathFromStackTraceLine = /\((?<filepath>[^:]*):.*\)/;
    const match = stackTraceImportLine.match(extractFilePathFromStackTraceLine);
    if (!match?.groups?.filepath) {
      throw unresolvedImportLocationError;
    }
    return path.dirname(match.groups.filepath);
  }
}

class AmplifyFunctionGenerator implements ConstructContainerEntryGenerator {
  readonly resourceGroupName = 'function';

  constructor(
    private readonly props: AmplifyFunctionFactoryProps,
    private readonly importLocation: string
  ) {}

  generateContainerEntry(scope: Construct) {
    if (this.props.buildCommand) {
      execaCommandSync(this.props.buildCommand, {
        stdio: 'inherit',
        cwd: this.importLocation,
      });
    }
    return new AmplifyFunction(scope, this.props.name, this.props);
  }
}

/**
 * Alias for AmplifyFunctionFactory
 */
export const Func = AmplifyFunctionFactory;
