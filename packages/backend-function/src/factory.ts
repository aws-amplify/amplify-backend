import {
  FunctionOutput,
  functionOutputKey,
} from '@aws-amplify/backend-output-schemas';
import { AttributionMetadataStorage } from '@aws-amplify/backend-output-storage';
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
  ResourceAccessAcceptorFactory,
  ResourceNameValidator,
  ResourceProvider,
  SsmEnvironmentEntry,
  StackProvider,
} from '@aws-amplify/plugin-types';
import { Duration, Stack, Tags } from 'aws-cdk-lib';
import { Rule } from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import { Policy } from 'aws-cdk-lib/aws-iam';
import {
  CfnFunction,
  ILayerVersion,
  LayerVersion,
  Runtime,
} from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'node:url';
import { EOL } from 'os';
import * as path from 'path';
import { FunctionEnvironmentTranslator } from './function_env_translator.js';
import { FunctionEnvironmentTypeGenerator } from './function_env_type_generator.js';
import { FunctionLayerArnParser } from './layer_parser.js';
import { convertFunctionSchedulesToRuleSchedules } from './schedule_parser.js';
import { convertLoggingOptionsToCDK } from './logging_options_parser.js';

const functionStackType = 'function-Lambda';

export type AddEnvironmentFactory = {
  addEnvironment: (key: string, value: string | BackendSecret) => void;
};

export type CronSchedule =
  | `${string} ${string} ${string} ${string} ${string}`
  | `${string} ${string} ${string} ${string} ${string} ${string}`;
export type TimeInterval =
  | `every ${number}m`
  | `every ${number}h`
  | `every day`
  | `every week`
  | `every month`
  | `every year`;
export type FunctionSchedule = TimeInterval | CronSchedule;

export type FunctionLogLevel = LogLevel;
export type FunctionLogRetention = LogRetention;

/**
 * Entry point for defining a function in the Amplify ecosystem
 */
export const defineFunction = (
  props: FunctionProps = {}
): ConstructFactory<
  ResourceProvider<FunctionResources> &
    ResourceAccessAcceptorFactory &
    AddEnvironmentFactory &
    StackProvider
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
   * Default is 512MB.
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
    private readonly callerStack?: string
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
        outputStorageStrategy
      );
    }
    return constructContainer.getOrCompute(this.generator) as AmplifyFunction;
  };

  private hydrateDefaults = (
    resourceNameValidator?: ResourceNameValidator
  ): HydratedFunctionProps => {
    const name = this.resolveName();
    resourceNameValidator?.validate(name);
    const parser = new FunctionLayerArnParser();
    const layers = parser.parseLayers(this.props.layers ?? {}, name);
    return {
      name,
      entry: this.resolveEntry(),
      timeoutSeconds: this.resolveTimeout(),
      memoryMB: this.resolveMemory(),
      environment: this.resolveEnvironment(),
      runtime: this.resolveRuntime(),
      schedule: this.resolveSchedule(),
      bundling: this.resolveBundling(),
      layers,
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
      new CallerDirectoryExtractor(this.callerStack).extract()
    );
  };

  private resolveEntry = () => {
    // if entry is not set, default to handler.ts
    if (!this.props.entry) {
      return path.join(
        new CallerDirectoryExtractor(this.callerStack).extract(),
        'handler.ts'
      );
    }

    // if entry is absolute use that
    if (path.isAbsolute(this.props.entry)) {
      return this.props.entry;
    }

    // if entry is relative, compute with respect to the caller directory
    return path.join(
      new CallerDirectoryExtractor(this.callerStack).extract(),
      this.props.entry
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
        timeoutMax
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
          ', '
        )}`,
        resolution:
          'Environment keys must match [a-zA-Z]([a-zA-Z0-9_])+ and be at least 2 characters',
      });
    }

    return this.props.environment;
  };

  private resolveRuntime = () => {
    const runtimeDefault = 18;

    // if runtime is not set, default to the oldest LTS
    if (!this.props.runtime) {
      return runtimeDefault;
    }

    if (!(this.props.runtime in nodeVersionMap)) {
      throw new AmplifyUserError('InvalidRuntimeError', {
        message: `Invalid function runtime of ${this.props.runtime}`,
        resolution: `runtime must be one of the following: ${Object.keys(
          nodeVersionMap
        ).join(', ')}`,
      });
    }

    return this.props.runtime;
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
    private readonly outputStorageStrategy: BackendOutputStorageStrategy<FunctionOutput>
  ) {
    this.resourceGroupName = props.resourceGroupName;
  }

  generateContainerEntry = ({
    scope,
    backendSecretResolver,
  }: GenerateContainerEntryProps) => {
    // resolve layers to LayerVersion objects for the NodejsFunction constructor using the scope.
    const resolvedLayers = Object.entries(this.props.layers).map(([key, arn]) =>
      LayerVersion.fromLayerVersionArn(
        scope,
        `${this.props.name}-${key}-layer`,
        arn
      )
    );

    return new AmplifyFunction(
      scope,
      this.props.name,
      { ...this.props, resolvedLayers },
      backendSecretResolver,
      this.outputStorageStrategy
    );
  };
}

class AmplifyFunction
  extends Construct
  implements
    ResourceProvider<FunctionResources>,
    ResourceAccessAcceptorFactory,
    AddEnvironmentFactory
{
  readonly resources: FunctionResources;
  readonly stack: Stack;
  private readonly functionEnvironmentTranslator: FunctionEnvironmentTranslator;
  constructor(
    scope: Construct,
    id: string,
    props: HydratedFunctionProps & { resolvedLayers: ILayerVersion[] },
    backendSecretResolver: BackendSecretResolver,
    outputStorageStrategy: BackendOutputStorageStrategy<FunctionOutput>
  ) {
    super(scope, id);

    this.stack = Stack.of(scope);

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

    let functionLambda: NodejsFunction;
    const cdkLoggingOptions = convertLoggingOptionsToCDK(props.logging);
    try {
      functionLambda = new NodejsFunction(scope, `${id}-lambda`, {
        entry: props.entry,
        timeout: Duration.seconds(props.timeoutSeconds),
        memorySize: props.memoryMB,
        runtime: nodeVersionMap[props.runtime],
        layers: props.resolvedLayers,
        bundling: {
          ...props.bundling,
          banner: bannerCode,
          inject: shims,
          externalModules: Object.keys(props.layers),
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
        error as Error
      );
    }

    try {
      const schedules = convertFunctionSchedulesToRuleSchedules(
        functionLambda,
        props.schedule
      );
      const lambdaTarget = new targets.LambdaFunction(functionLambda);

      schedules.forEach((schedule, index) => {
        // Lambda name will be prepended to rule id, so only using index here for uniqueness
        const rule = new Rule(functionLambda, `schedule${index}`, {
          schedule,
        });

        rule.addTarget(lambdaTarget);
      });
    } catch (error) {
      throw new AmplifyUserError(
        'FunctionScheduleInitializationError',
        {
          message: 'Failed to instantiate schedule for nodejs function',
          resolution: 'See the underlying error message for more details.',
        },
        error as Error
      );
    }

    Tags.of(functionLambda).add(TagName.FRIENDLY_NAME, id);

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

  addEnvironment = (key: string, value: string | BackendSecret) => {
    this.functionEnvironmentTranslator.addEnvironmentEntry(key, value);
  };

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

export type NodeVersion = 16 | 18 | 20 | 22;

const nodeVersionMap: Record<NodeVersion, Runtime> = {
  16: Runtime.NODEJS_16_X,
  18: Runtime.NODEJS_18_X,
  20: Runtime.NODEJS_20_X,
  22: Runtime.NODEJS_22_X,
};
