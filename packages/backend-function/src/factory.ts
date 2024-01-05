import {
  BackendSecret,
  BackendSecretResolver,
  ConstructContainerEntryGenerator,
  ConstructFactory,
  ConstructFactoryGetInstanceProps,
  FunctionResources,
  ResourceProvider,
} from '@aws-amplify/plugin-types';
import { Construct } from 'constructs';
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';
import { getCallerDirectory } from './get_caller_directory.js';
import { Duration, Stack } from 'aws-cdk-lib';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import fs from 'fs';
import { createRequire } from 'module';

/**
 * Entry point for defining a function in the Amplify ecosystem
 */
export const defineFunction = (
  props: FunctionProps = {}
): ConstructFactory<ResourceProvider<FunctionResources>> =>
  new FunctionFactory(props, new Error().stack);

export type FunctionProps = {
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
   * Defaults to './handler.ts'
   */
  entry?: string;

  /**
   * An amount of time in seconds between 1 second and 15 minutes.
   * Must be a whole number.
   * Default is 3 seconds.
   */
  timeoutSeconds?: number;

  /**
   * An amount of memory (RAM) to allocate to the function between 128 and 10240 MB.
   * Must be a whole number.
   * Default is 128MB.
   */
  memoryMB?: number;

  /**
   * Environment variables that will be available during function execution
   */
  environment?: Record<string, string | BackendSecret>;

  /**
   * Node runtime version for the lambda environment.
   *
   * Defaults to the oldest NodeJS LTS version. See https://nodejs.org/en/about/previous-releases
   */
  runtime?: NodeVersion;
};

/**
 * Create Lambda functions in the context of an Amplify backend definition
 */
class FunctionFactory implements ConstructFactory<AmplifyFunction> {
  private generator: ConstructContainerEntryGenerator;
  /**
   * Create a new AmplifyFunctionFactory
   */
  constructor(
    private readonly props: FunctionProps,
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
      timeoutSeconds: this.resolveTimeout(),
      memoryMB: this.resolveMemory(),
      environment: this.props.environment ?? {},
      runtime: this.resolveRuntime(),
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
    // if entry is not set, default to handler.ts
    if (!this.props.entry) {
      return path.join(getCallerDirectory(this.callerStack), 'handler.ts');
    }

    // if entry is absolute use that
    if (path.isAbsolute(this.props.entry)) {
      return this.props.entry;
    }

    // if entry is relative, compute with respect to the caller directory
    return path.join(getCallerDirectory(this.callerStack), this.props.entry);
  };

  private resolveTimeout = () => {
    const timeoutMin = 1;
    const timeoutMax = 60 * 15; // 15 minutes in seconds
    const timeoutDefault = 3;
    if (this.props.timeoutSeconds === undefined) {
      return timeoutDefault;
    }

    if (
      !isWholeNumberBetweenInclusive(
        this.props.timeoutSeconds,
        timeoutMin,
        timeoutMax
      )
    ) {
      throw new Error(
        `timeoutSeconds must be a whole number between ${timeoutMin} and ${timeoutMax} inclusive`
      );
    }
    return this.props.timeoutSeconds;
  };

  private resolveMemory = () => {
    const memoryMin = 128;
    const memoryMax = 10240;
    const memoryDefault = memoryMin;
    if (this.props.memoryMB === undefined) {
      return memoryDefault;
    }
    if (
      !isWholeNumberBetweenInclusive(this.props.memoryMB, memoryMin, memoryMax)
    ) {
      throw new Error(
        `memoryMB must be a whole number between ${memoryMin} and ${memoryMax} inclusive`
      );
    }
    return this.props.memoryMB;
  };

  private resolveRuntime = () => {
    const runtimeDefault = 18;

    // if runtime is not set, default to the oldest LTS
    if (!this.props.runtime) {
      return runtimeDefault;
    }

    if (!(this.props.runtime in nodeVersionMap)) {
      throw new Error(
        `runtime must be one of the following: ${Object.keys(
          nodeVersionMap
        ).join(', ')}`
      );
    }

    return this.props.runtime;
  };
}

type HydratedFunctionProps = Required<FunctionProps>;

class FunctionGenerator implements ConstructContainerEntryGenerator {
  readonly resourceGroupName = 'function';

  constructor(private readonly props: HydratedFunctionProps) {}

  generateContainerEntry = (
    scope: Construct,
    backendSecretResolver: BackendSecretResolver
  ) => {
    return new AmplifyFunction(
      scope,
      this.props.name,
      this.props,
      backendSecretResolver
    );
  };
}

class AmplifyFunction
  extends Construct
  implements ResourceProvider<FunctionResources>
{
  readonly resources: FunctionResources;
  constructor(
    scope: Construct,
    id: string,
    props: HydratedFunctionProps,
    backendSecretResolver: BackendSecretResolver
  ) {
    super(scope, id);
    const functionEnvironmentTranslator = new FunctionEnvironmentTranslator(
      scope,
      props['environment'],
      backendSecretResolver
    );
    const environmentRecord =
      functionEnvironmentTranslator.getEnvironmentRecord();
    const secretPolicyStatement =
      functionEnvironmentTranslator.getSecretPolicyStatement();

    const require = createRequire(import.meta.url);
    const bannerCodeFile = require.resolve('./resolve_secret_banner');
    const bannerCode = fs
      .readFileSync(bannerCodeFile, 'utf-8')
      .replaceAll('\n', '')
      .replaceAll('\r', '')
      .split('//#')[0]; // remove source map

    const functionLambda = new NodejsFunction(scope, `${id}-lambda`, {
      entry: props.entry,
      environment: environmentRecord as { [key: string]: string }, // for some reason TS can't figure out that this is the same as Record<string, string>
      timeout: Duration.seconds(props.timeoutSeconds),
      memorySize: props.memoryMB,
      runtime: nodeVersionMap[props.runtime],
      bundling: {
        banner: bannerCode,
        format: OutputFormat.ESM,
      },
    });

    if (secretPolicyStatement) {
      functionLambda.grantPrincipal.addToPrincipalPolicy(secretPolicyStatement);
    }

    this.resources = {
      lambda: functionLambda,
    };
  }
}

const isWholeNumberBetweenInclusive = (
  test: number,
  min: number,
  max: number
) => min <= test && test <= max && test % 1 === 0;

export type NodeVersion = 16 | 18 | 20;

const nodeVersionMap: Record<NodeVersion, Runtime> = {
  16: Runtime.NODEJS_16_X,
  18: Runtime.NODEJS_18_X,
  20: Runtime.NODEJS_20_X,
};

class FunctionEnvironmentTranslator {
  private secretPaths: string[] = [];
  private environmentRecord: Record<string, string> = {};

  constructor(
    private readonly scope: Construct,
    private readonly functionEnvironmentProp: HydratedFunctionProps['environment'],
    private readonly backendSecretResolver: BackendSecretResolver
  ) {
    const secretPlaceholderText = '<value will be resolved during runtime>';
    const amplifySecretPaths = 'AMPLIFY_SECRET_PATHS';
    const secretPathEnvVars: Record<string, string> = {};

    for (const [key, value] of Object.entries(this.functionEnvironmentProp)) {
      if (key === amplifySecretPaths) {
        throw new Error(
          `${amplifySecretPaths} is a reserved environment variable name`
        );
      }
      if (typeof value !== 'string') {
        const secretPath = this.backendSecretResolver.resolvePath(value);
        this.environmentRecord[key] = secretPlaceholderText;
        secretPathEnvVars[key] = secretPath;
        this.secretPaths.push(secretPath);
      } else {
        this.environmentRecord[key] = value;
      }
    }

    this.environmentRecord[amplifySecretPaths] =
      JSON.stringify(secretPathEnvVars);
  }

  getEnvironmentRecord = () => {
    return this.environmentRecord;
  };

  getSecretPolicyStatement = (): iam.PolicyStatement | undefined => {
    if (this.secretPaths.length === 0) {
      return;
    }

    const resourceArns = this.secretPaths.map(
      (path) =>
        `arn:aws:ssm:${Stack.of(this.scope).region}:${
          Stack.of(this.scope).account
        }:parameter${path}`
    );

    return new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['ssm:GetParameters'],
      resources: resourceArns,
    });
  };
}
