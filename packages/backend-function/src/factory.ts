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
import os from 'os';
import { fileURLToPath } from 'url';

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
    const functionProps: HydratedFunctionProps = {
      ...this.props,
      environment: translateEnvironmentProp(
        this.props.environment,
        backendSecretResolver
      ),
    };
    return new AmplifyFunction(scope, this.props.name, functionProps);
  };
}

class AmplifyFunction
  extends Construct
  implements ResourceProvider<FunctionResources>
{
  readonly resources: FunctionResources;
  constructor(scope: Construct, id: string, props: HydratedFunctionProps) {
    super(scope, id);
    const envVars = {
      ...props.environment,
      SECRET_PATH_ENV_VARS: process.env.SECRET_PATH_ENV_VARS,
    };
    let bannerCode;
    const hasSecrets = secretPaths.length > 0;

    if (hasSecrets) {
      const ext = import.meta.url.split('.').pop();
      const bannerCodeFile = fileURLToPath(
        new URL(
          `./resolve_secret_banner.${ext === 'ts' ? 'ts' : 'js'}`,
          import.meta.url
        )
      );
      bannerCode = fs
        .readFileSync(bannerCodeFile, 'utf-8')
        .replaceAll(os.EOL, '');
      bannerCode += 'await resolveSecretBanner(new SSM())';
    }

    const functionLambda = new NodejsFunction(scope, `${id}-lambda`, {
      entry: props.entry,
      environment: envVars as { [key: string]: string }, // for some reason TS can't figure out that this is the same as Record<string, string>
      timeout: Duration.seconds(props.timeoutSeconds),
      memorySize: props.memoryMB,
      runtime: nodeVersionMap[props.runtime],
      bundling: {
        banner: bannerCode,
        format: OutputFormat.ESM,
      },
    });

    if (hasSecrets) {
      const resourceArns = secretPaths.map(
        (path) =>
          `arn:aws:ssm:${Stack.of(scope).region}:${
            Stack.of(scope).account
          }:parameter${path}`
      );

      functionLambda.grantPrincipal.addToPrincipalPolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['ssm:GetParameters'],
          resources: resourceArns,
        })
      );
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

const secretPathSuffix = '_PATH';
const secretPlaceholderText = '<value will be resolved during runtime>';
const secretPaths: string[] = [];

const translateEnvironmentProp = (
  functionEnvironmentProp: HydratedFunctionProps['environment'],
  backendSecretResolver: BackendSecretResolver
): Record<string, string> => {
  const result: Record<string, string> = {};
  const secretPathEnvVars = [];

  for (const [key, value] of Object.entries(functionEnvironmentProp)) {
    if (typeof value !== 'string') {
      const secretPath = backendSecretResolver.resolveToPath(value);
      result[key + secretPathSuffix] = secretPath;
      result[key] = secretPlaceholderText;
      secretPathEnvVars.push(key + secretPathSuffix);
      secretPaths.push(secretPath);
    } else {
      result[key] = value;
    }
  }

  process.env.SECRET_PATH_ENV_VARS = secretPathEnvVars.join(',');

  return result;
};
