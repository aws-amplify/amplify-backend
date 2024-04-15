import {
  BackendOutputStorageStrategy,
  BackendSecret,
  BackendSecretResolver,
  ConstructContainerEntryGenerator,
  ConstructFactory,
  ConstructFactoryGetInstanceProps,
  FunctionResources,
  GenerateContainerEntryProps,
  ResourceAccessAcceptorFactory,
  ResourceProvider,
  SsmEnvironmentEntry,
} from '@aws-amplify/plugin-types';
import { Construct } from 'constructs';
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';
import { getCallerDirectory } from './get_caller_directory.js';
import { Duration, Stack } from 'aws-cdk-lib';
import { CfnFunction, Runtime } from 'aws-cdk-lib/aws-lambda';
import { createRequire } from 'module';
import { FunctionEnvironmentTranslator } from './function_env_translator.js';
import { Policy } from 'aws-cdk-lib/aws-iam';
import { readFileSync } from 'fs';
import { EOL } from 'os';
import {
  FunctionOutput,
  functionOutputKey,
} from '@aws-amplify/backend-output-schemas';
import { FunctionEnvironmentTypeGenerator } from './function_env_type_generator.js';
import { AttributionMetadataStorage } from '@aws-amplify/backend-output-storage';
import { fileURLToPath } from 'url';
import { AmplifyUserError } from '@aws-amplify/platform-core';

const functionStackType = 'function-Lambda';

/**
 * Entry point for defining a function in the Amplify ecosystem
 */
export const defineFunction = (
  props: FunctionProps = {}
): ConstructFactory<
  ResourceProvider<FunctionResources> & ResourceAccessAcceptorFactory
> => new FunctionFactory(props, new Error().stack);

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
    outputStorageStrategy,
  }: ConstructFactoryGetInstanceProps): AmplifyFunction => {
    if (!this.generator) {
      this.generator = new FunctionGenerator(
        this.hydrateDefaults(),
        outputStorageStrategy
      );
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
    const memoryDefault = 512;
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

  constructor(
    private readonly props: HydratedFunctionProps,
    private readonly outputStorageStrategy: BackendOutputStorageStrategy<FunctionOutput>
  ) {}

  generateContainerEntry = ({
    scope,
    backendSecretResolver,
  }: GenerateContainerEntryProps) => {
    return new AmplifyFunction(
      scope,
      this.props.name,
      this.props,
      backendSecretResolver,
      this.outputStorageStrategy
    );
  };
}

class AmplifyFunction
  extends Construct
  implements ResourceProvider<FunctionResources>, ResourceAccessAcceptorFactory
{
  readonly resources: FunctionResources;
  private readonly functionEnvironmentTranslator: FunctionEnvironmentTranslator;
  constructor(
    scope: Construct,
    id: string,
    props: HydratedFunctionProps,
    backendSecretResolver: BackendSecretResolver,
    outputStorageStrategy: BackendOutputStorageStrategy<FunctionOutput>
  ) {
    super(scope, id);

    const runtime = nodeVersionMap[props.runtime];

    const require = createRequire(import.meta.url);

    const shims =
      runtime === Runtime.NODEJS_16_X
        ? []
        : [require.resolve('./lambda-shims/cjs_shim')];

    const ssmResolverFile =
      runtime === Runtime.NODEJS_16_X
        ? require.resolve('./lambda-shims/resolve_ssm_params_sdk_v2') // use aws cdk v2 in node 16
        : require.resolve('./lambda-shims/resolve_ssm_params');

    const invokeSsmResolverFile = require.resolve(
      './lambda-shims/invoke_ssm_shim'
    );

    /**
     * This code concatenates the contents of the ssm resolver and invoker into a single line that can be used as the esbuild banner content
     * This banner is responsible for resolving the customer's SSM parameters at runtime
     */
    const bannerCode = readFileSync(ssmResolverFile, 'utf-8')
      .concat(readFileSync(invokeSsmResolverFile, 'utf-8'))
      .split(new RegExp(`${EOL}|\n|\r`, 'g'))
      .map((line) => line.replace(/\/\/.*$/, '')) // strip out inline comments because the banner is going to be flattened into a single line
      .join('');

    const functionEnvironmentTypeGenerator =
      new FunctionEnvironmentTypeGenerator(id);

    // esbuild runs as part of the NodejsFunction constructor, so we eagerly generate the process env shim without types so it can be included in the function bundle.
    // This will be overwritten with the typed file at the end of synthesis
    functionEnvironmentTypeGenerator.generateProcessEnvShim();

    let functionLambda;
    try {
      functionLambda = new NodejsFunction(scope, `${id}-lambda`, {
        entry: props.entry,
        timeout: Duration.seconds(props.timeoutSeconds),
        memorySize: props.memoryMB,
        runtime: nodeVersionMap[props.runtime],
        bundling: {
          format: OutputFormat.ESM,
          banner: bannerCode,
          inject: shims,
          loader: {
            '.node': 'file',
          },
        },
      });
    } catch (error) {
      throw new AmplifyUserError(
        'NodeJSFunctionConstructInitializationError',
        {
          message: 'Failed to instantiate nodejs function construct',
          resolution: 'See the underlying error message for more details.',
        },
        error as Error
      );
    }

    this.functionEnvironmentTranslator = new FunctionEnvironmentTranslator(
      functionLambda,
      props.environment,
      backendSecretResolver,
      functionEnvironmentTypeGenerator
    );

    this.resources = {
      lambda: functionLambda,
      cfnResources: {
        cfnFunction: functionLambda.node.findChild('Resource') as CfnFunction,
      },
    };

    this.storeOutput(outputStorageStrategy);

    new AttributionMetadataStorage().storeAttributionMetadata(
      Stack.of(this),
      functionStackType,
      fileURLToPath(new URL('../package.json', import.meta.url))
    );
  }

  getResourceAccessAcceptor = () => ({
    identifier: `${this.node.id}LambdaResourceAccessAcceptor`,
    acceptResourceAccess: (
      policy: Policy,
      ssmEnvironmentEntries: SsmEnvironmentEntry[]
    ) => {
      const role = this.resources.lambda.role;
      if (!role) {
        // This should never happen since we are using the Function L2 construct
        throw new Error(
          'No execution role found to attach lambda permissions to'
        );
      }
      policy.attachToRole(role);
      ssmEnvironmentEntries.forEach(({ name, path }) => {
        this.functionEnvironmentTranslator.addSsmEnvironmentEntry(name, path);
      });
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
