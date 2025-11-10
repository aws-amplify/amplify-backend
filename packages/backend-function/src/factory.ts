import { FunctionOutput } from '@aws-amplify/backend-output-schemas';
import {
  AmplifyUserError,
  CallerDirectoryExtractor,
  TagName,
} from '@aws-amplify/platform-core';
import {
  AmplifyResourceGroupName,
  BackendOutputStorageStrategy,
  BackendSecret,
  BackendSecretResolver,
  ConstructContainerEntryGenerator,
  ConstructFactory,
  ConstructFactoryGetInstanceProps,
  FunctionResources,
  GenerateContainerEntryProps,
  LogLevel,
  LogRetention,
  ResourceAccessAcceptor,
  ResourceAccessAcceptorFactory,
  ResourceNameValidator,
  ResourceProvider,
  StackProvider,
} from '@aws-amplify/plugin-types';
import { Duration, Size, Stack, Tags } from 'aws-cdk-lib';
import * as scheduler from 'aws-cdk-lib/aws-scheduler';
import * as targets from 'aws-cdk-lib/aws-scheduler-targets';
import {
  Architecture,
  CfnFunction,
  IFunction,
  ILayerVersion,
  LayerVersion,
  Runtime,
} from 'aws-cdk-lib/aws-lambda';
import {
  LogLevel as EsBuildLogLevel,
  NodejsFunction,
  OutputFormat,
} from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { EOL } from 'os';
import * as path from 'path';
import { FunctionEnvironmentTranslator } from './function_env_translator.js';
import { FunctionEnvironmentTypeGenerator } from './function_env_type_generator.js';
import { FunctionLayerArnParser } from './layer_parser.js';
import { convertLoggingOptionsToCDK } from './logging_options_parser.js';
import { convertFunctionSchedulesToScheduleExpressions } from './schedule_parser.js';
import {
  ProvidedFunctionFactory,
  ProvidedFunctionProps,
} from './provided_function_factory.js';
import { AmplifyFunctionBase } from './function_construct_base.js';
import { FunctionResourceAccessAcceptor } from './resource_access_acceptor.js';

export type AddEnvironmentFactory = {
  addEnvironment: (key: string, value: string | BackendSecret) => void;
};

export type CronScheduleExpression =
  | `${string} ${string} ${string} ${string} ${string}`
  | `${string} ${string} ${string} ${string} ${string} ${string}`;

export type ZonedCronSchedule = {
  cron: CronScheduleExpression;
  timezone: string;
};

export type CronSchedule = CronScheduleExpression | ZonedCronSchedule;

export type TimeIntervalExpression =
  | `every ${number}m`
  | `every ${number}h`
  | `every day`
  | `every week`
  | `every month`
  | `every year`;

export type ZonedTimeInterval = {
  rate: TimeIntervalExpression;
  timezone: string;
};

export type TimeInterval = ZonedTimeInterval | TimeIntervalExpression;

export type FunctionSchedule = TimeInterval | CronSchedule;

export type FunctionLogLevel = Extract<
  LogLevel,
  'info' | 'debug' | 'warn' | 'error' | 'fatal' | 'trace'
>;
export type FunctionLogRetention = LogRetention;

export function defineFunction(
  props?: FunctionProps,
): ConstructFactory<
  ResourceProvider<FunctionResources> &
    ResourceAccessAcceptorFactory &
    AddEnvironmentFactory &
    StackProvider
>;
export function defineFunction(
  provider: (scope: Construct) => IFunction,
  providerProps?: ProvidedFunctionProps,
): ConstructFactory<
  ResourceProvider<FunctionResources> &
    ResourceAccessAcceptorFactory &
    AddEnvironmentFactory &
    StackProvider
>;
/**
 * Entry point for defining a function in the Amplify ecosystem
 */
// This is the "implementation overload", it's not visible in public api.
// We have to use function notation instead of arrow notation.
// Arrow notation does not support overloads.
// eslint-disable-next-line no-restricted-syntax
export function defineFunction(
  propsOrProvider: FunctionProps | ((scope: Construct) => IFunction) = {},
  providerProps?: ProvidedFunctionProps,
): unknown {
  if (propsOrProvider && typeof propsOrProvider === 'function') {
    return new ProvidedFunctionFactory(propsOrProvider, providerProps);
  }
  return new FunctionFactory(propsOrProvider, new Error().stack);
}

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
   * Default is 512MB.
   */
  memoryMB?: number;

  /**
   * The size of the function's /tmp directory in MB.
   * Must be a whole number.
   * @default 512
   */
  ephemeralStorageSizeMB?: number;

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

  /**
   * The architecture of the target platform for the lambda environment.
   * Defaults to X86_64.
   */
  architecture?: FunctionArchitecture;

  /**
   * A time interval string to periodically run the function.
   * This can be either a string of `"every <positive whole number><m (minute) or h (hour)>"`, `"every day|week|month|year"` or cron expression.
   * Defaults to no scheduling for the function.
   * @example
   * schedule: "every 5m"
   * @example
   * schedule: "every week"
   * @example
   * schedule: "0 9 ? * 2 *" // every Monday at 9am
   */
  schedule?: FunctionSchedule | FunctionSchedule[];

  /**
   * Attach Lambda layers to a function
   * - A Lambda layer is represented by an object of key/value pair where the key is the module name that is exported from your layer and the value is the ARN of the layer. The key (module name) is used to externalize the module dependency so it doesn't get bundled with your lambda function
   * - Maximum of 5 layers can be attached to a function and must be in the same region as the function.
   * @example
   * layers: {
   *    "@aws-lambda-powertools/logger": "arn:aws:lambda:<current-region>:094274105915:layer:AWSLambdaPowertoolsTypeScriptV2:11"
   * },
   * or
   * @example
   * layers: {
   *    "Sharp": "SharpLayer:1"
   * },
   * @see [Amplify documentation for Lambda layers](https://docs.amplify.aws/react/build-a-backend/functions/add-lambda-layers)
   * @see [AWS documentation for Lambda layers](https://docs.aws.amazon.com/lambda/latest/dg/chapter-layers.html)
   */
  layers?: Record<string, string>;

  /*
   * Options for bundling the function code.
   */
  bundling?: FunctionBundlingOptions;

  /**
   * Group the function with existing Amplify resources or separate the function into its own group.
   * @default 'function' // grouping with other Amplify functions
   * @example
   * resourceGroupName: 'auth' // to group an auth trigger with an auth resource
   */
  resourceGroupName?: AmplifyResourceGroupName;

  logging?: FunctionLoggingOptions;
};

export type FunctionBundlingOptions = {
  /**
   * Whether to minify the function code.
   *
   * Defaults to true.
   */
  minify?: boolean;
};

export type FunctionLoggingOptions = (
  | {
      format: 'json';
      level?: FunctionLogLevel;
    }
  | {
      format?: 'text';
    }
) & {
  retention?: FunctionLogRetention;
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
    private readonly callerStack?: string,
  ) {}

  /**
   * Creates an instance of AmplifyFunction within the provided Amplify context
   */
  getInstance = ({
    constructContainer,
    outputStorageStrategy,
    resourceNameValidator,
  }: ConstructFactoryGetInstanceProps): AmplifyFunction => {
    if (!this.generator) {
      this.generator = new FunctionGenerator(
        this.hydrateDefaults(resourceNameValidator),
        outputStorageStrategy,
      );
    }
    return constructContainer.getOrCompute(this.generator) as AmplifyFunction;
  };

  private hydrateDefaults = (
    resourceNameValidator?: ResourceNameValidator,
  ): HydratedFunctionProps => {
    const name = this.resolveName();
    resourceNameValidator?.validate(name);

    return {
      name,
      entry: this.resolveEntry(),
      timeoutSeconds: this.resolveTimeout(),
      memoryMB: this.resolveMemory(),
      ephemeralStorageSizeMB: this.resolveEphemeralStorageSize(),
      environment: this.resolveEnvironment(),
      runtime: this.resolveRuntime(),
      architecture: this.resolveArchitecture(),
      schedule: this.resolveSchedule(),
      bundling: this.resolveBundling(),
      layers: this.props.layers ?? {},
      resourceGroupName: this.props.resourceGroupName ?? 'function',
      logging: this.props.logging ?? {},
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
    return path.basename(
      new CallerDirectoryExtractor(this.callerStack).extract(),
    );
  };

  private resolveEntry = () => {
    // if entry is not set, default to handler.ts
    if (!this.props.entry) {
      return path.join(
        new CallerDirectoryExtractor(this.callerStack).extract(),
        'handler.ts',
      );
    }

    // if entry is absolute use that
    if (path.isAbsolute(this.props.entry)) {
      return this.props.entry;
    }

    // if entry is relative, compute with respect to the caller directory
    return path.join(
      new CallerDirectoryExtractor(this.callerStack).extract(),
      this.props.entry,
    );
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
        timeoutMax,
      )
    ) {
      throw new AmplifyUserError('InvalidTimeoutError', {
        message: `Invalid function timeout of ${this.props.timeoutSeconds}`,
        resolution: `timeoutSeconds must be a whole number between ${timeoutMin} and ${timeoutMax} inclusive`,
      });
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
      throw new AmplifyUserError('InvalidMemoryMBError', {
        message: `Invalid function memoryMB of ${this.props.memoryMB}`,
        resolution: `memoryMB must be a whole number between ${memoryMin} and ${memoryMax} inclusive`,
      });
    }
    return this.props.memoryMB;
  };

  private resolveEphemeralStorageSize = () => {
    const ephemeralStorageSizeMin = 512;
    const ephemeralStorageSizeMax = 10240;
    const ephemeralStorageSizeDefault = 512;
    if (this.props.ephemeralStorageSizeMB === undefined) {
      return ephemeralStorageSizeDefault;
    }
    if (
      !isWholeNumberBetweenInclusive(
        this.props.ephemeralStorageSizeMB,
        ephemeralStorageSizeMin,
        ephemeralStorageSizeMax,
      )
    ) {
      throw new AmplifyUserError('InvalidEphemeralStorageSizeMBError', {
        message: `Invalid function ephemeralStorageSizeMB of ${this.props.ephemeralStorageSizeMB}`,
        resolution: `ephemeralStorageSizeMB must be a whole number between ${ephemeralStorageSizeMin} and ${ephemeralStorageSizeMax} inclusive`,
      });
    }
    return this.props.ephemeralStorageSizeMB;
  };

  private resolveEnvironment = () => {
    if (this.props.environment === undefined) {
      return {};
    }

    const invalidKeys: string[] = [];

    Object.keys(this.props.environment).forEach((key) => {
      // validate using key pattern from https://docs.aws.amazon.com/lambda/latest/api/API_Environment.html
      if (!key.match(/^[a-zA-Z]([a-zA-Z0-9_])+$/)) {
        invalidKeys.push(key);
      }
    });

    if (invalidKeys.length > 0) {
      throw new AmplifyUserError('InvalidEnvironmentKeyError', {
        message: `Invalid function environment key(s): ${invalidKeys.join(
          ', ',
        )}`,
        resolution:
          'Environment keys must match [a-zA-Z]([a-zA-Z0-9_])+ and be at least 2 characters',
      });
    }

    return this.props.environment;
  };

  private resolveRuntime = () => {
    const runtimeDefault = 20;

    // if runtime is not set, default to the oldest LTS
    if (!this.props.runtime) {
      return runtimeDefault;
    }

    if (!(this.props.runtime in nodeVersionMap)) {
      throw new AmplifyUserError('InvalidRuntimeError', {
        message: `Invalid function runtime of ${this.props.runtime}`,
        resolution: `runtime must be one of the following: ${Object.keys(
          nodeVersionMap,
        ).join(', ')}`,
      });
    }

    return this.props.runtime;
  };

  private resolveArchitecture = () => {
    const architectureDefault = 'x86_64';

    if (!this.props.architecture) {
      return architectureDefault;
    }

    if (!(this.props.architecture in architectureMap)) {
      throw new AmplifyUserError('InvalidArchitectureError', {
        message: `Invalid function architecture of ${this.props.architecture}`,
        resolution: `architecture must be one of the following: ${Object.keys(
          architectureMap,
        ).join(', ')}`,
      });
    }

    return this.props.architecture;
  };

  private resolveSchedule = () => {
    if (!this.props.schedule) {
      return [];
    }

    return this.props.schedule;
  };

  private resolveBundling = () => {
    const bundlingDefault = {
      format: OutputFormat.ESM,
      bundleAwsSDK: true,
      loader: {
        '.node': 'file',
      },
      minify: true,
      sourceMap: true,
    };

    return {
      ...bundlingDefault,
      minify: this.resolveMinify(this.props.bundling),
    };
  };

  private resolveMinify = (bundling?: FunctionBundlingOptions) => {
    return bundling?.minify === undefined ? true : bundling.minify;
  };
}

type HydratedFunctionProps = Required<FunctionProps>;

class FunctionGenerator implements ConstructContainerEntryGenerator {
  readonly resourceGroupName: AmplifyResourceGroupName;

  constructor(
    private readonly props: HydratedFunctionProps,
    private readonly outputStorageStrategy: BackendOutputStorageStrategy<FunctionOutput>,
  ) {
    this.resourceGroupName = props.resourceGroupName;
  }

  generateContainerEntry = ({
    scope,
    backendSecretResolver,
  }: GenerateContainerEntryProps) => {
    // Move layer resolution here where we have access to scope
    const parser = new FunctionLayerArnParser(
      Stack.of(scope).region,
      Stack.of(scope).account,
    );
    const resolvedLayerArns = parser.parseLayers(
      this.props.layers ?? {},
      this.props.name,
    );

    // resolve layers to LayerVersion objects for the NodejsFunction constructor
    const resolvedLayers = Object.entries(resolvedLayerArns).map(([key, arn]) =>
      LayerVersion.fromLayerVersionArn(
        scope,
        `${this.props.name}-${key}-layer`,
        arn,
      ),
    );

    return new AmplifyFunction(
      scope,
      this.props.name,
      { ...this.props, resolvedLayers },
      backendSecretResolver,
      this.outputStorageStrategy,
    );
  };
}

class AmplifyFunction
  extends AmplifyFunctionBase
  implements AddEnvironmentFactory
{
  readonly resources: FunctionResources;
  private readonly functionEnvironmentTranslator: FunctionEnvironmentTranslator;
  constructor(
    scope: Construct,
    id: string,
    props: HydratedFunctionProps & { resolvedLayers: ILayerVersion[] },
    backendSecretResolver: BackendSecretResolver,
    outputStorageStrategy: BackendOutputStorageStrategy<FunctionOutput>,
  ) {
    super(scope, id, outputStorageStrategy);

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
      './lambda-shims/invoke_ssm_shim',
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

    let functionLambda: NodejsFunction;
    const cdkLoggingOptions = convertLoggingOptionsToCDK(props.logging);
    try {
      functionLambda = new NodejsFunction(scope, `${id}-lambda`, {
        entry: props.entry,
        timeout: Duration.seconds(props.timeoutSeconds),
        memorySize: props.memoryMB,
        architecture: architectureMap[props.architecture],
        ephemeralStorageSize: Size.mebibytes(props.ephemeralStorageSizeMB),
        runtime: nodeVersionMap[props.runtime],
        layers: props.resolvedLayers,
        bundling: {
          ...props.bundling,
          banner: bannerCode,
          inject: shims,
          externalModules: Object.keys(props.layers),
          logLevel: EsBuildLogLevel.ERROR,
        },
        logRetention: cdkLoggingOptions.retention,
        applicationLogLevelV2: cdkLoggingOptions.level,
        loggingFormat: cdkLoggingOptions.format,
      });
    } catch (error) {
      // If the error is from ES Bundler which is executed as a child process by CDK,
      // then the error from CDK contains the command that was executed along with the exit status.
      // Wrapping it here  would cause the cdk_deployer to re-throw this wrapped exception
      // instead of scraping the stderr for actual ESBuild error.
      if (
        error instanceof Error &&
        error.message.match(/Failed to bundle asset.*exited with status/)
      ) {
        throw error;
      }
      throw new AmplifyUserError(
        'NodeJSFunctionConstructInitializationError',
        {
          message: 'Failed to instantiate nodejs function construct',
          resolution:
            'See the underlying error message for more details. Use `--debug` for additional debugging information.',
        },
        error as Error,
      );
    }

    try {
      const expressions = convertFunctionSchedulesToScheduleExpressions(
        functionLambda,
        props.schedule,
      );

      const lambdaTarget = new targets.LambdaInvoke(functionLambda);

      expressions.forEach((expression, index) => {
        // Lambda name will be prepended to schedule id, so only using index here for uniqueness
        new scheduler.Schedule(functionLambda, `schedule-${index}`, {
          schedule: expression,
          target: lambdaTarget,
        });
      });
    } catch (error) {
      throw new AmplifyUserError(
        'FunctionScheduleInitializationError',
        {
          message: 'Failed to instantiate schedule for nodejs function',
          resolution: 'See the underlying error message for more details.',
        },
        error as Error,
      );
    }

    Tags.of(functionLambda).add(TagName.FRIENDLY_NAME, id);

    this.functionEnvironmentTranslator = new FunctionEnvironmentTranslator(
      functionLambda,
      props.environment,
      backendSecretResolver,
      functionEnvironmentTypeGenerator,
    );

    this.resources = {
      lambda: functionLambda,
      cfnResources: {
        cfnFunction: functionLambda.node.findChild('Resource') as CfnFunction,
      },
    };

    this.storeOutput();
  }

  addEnvironment = (key: string, value: string | BackendSecret) => {
    this.functionEnvironmentTranslator.addEnvironmentEntry(key, value);
  };

  getResourceAccessAcceptor = (): ResourceAccessAcceptor =>
    new FunctionResourceAccessAcceptor(
      this,
      this.functionEnvironmentTranslator,
    );
}

const isWholeNumberBetweenInclusive = (
  test: number,
  min: number,
  max: number,
) => min <= test && test <= max && test % 1 === 0;

export type NodeVersion = 16 | 18 | 20 | 22;

const nodeVersionMap: Record<NodeVersion, Runtime> = {
  16: Runtime.NODEJS_16_X,
  18: Runtime.NODEJS_18_X,
  20: Runtime.NODEJS_20_X,
  22: Runtime.NODEJS_22_X,
};

export type FunctionArchitecture = 'x86_64' | 'arm64';

const architectureMap: Record<FunctionArchitecture, Architecture> = {
  arm64: Architecture.ARM_64,
  x86_64: Architecture.X86_64,
};
