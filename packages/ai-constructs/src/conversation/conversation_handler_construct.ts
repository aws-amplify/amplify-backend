import {
  BackendOutputStorageStrategy,
  FunctionResources,
  ResourceProvider,
} from '@aws-amplify/plugin-types';
import { Duration, Stack, Tags } from 'aws-cdk-lib';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import {
  ApplicationLogLevel,
  CfnFunction,
  Code,
  Function,
  IFunction,
  Runtime as LambdaRuntime,
  LoggingFormat,
} from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import {
  CustomDataIdentifier,
  DataProtectionPolicy,
  LogGroup,
  RetentionDays,
} from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import path from 'path';
import {
  AIConversationOutput,
  aiConversationOutputKey,
} from '@aws-amplify/backend-output-schemas';
import { AiModelArnGeneratorConstruct } from '../ai-model/ai_model_arn_generator_construct';
import type { AiModelConfig } from '../ai-model/ai_model_types';

const resourcesRoot = path.normalize(path.join(__dirname, 'runtime'));
const defaultHandlerFilePath = path.join(
  resourcesRoot,
  'default_handler_bundled',
);

export type ConversationHandlerFunctionProps = {
  entry?: string;
  models: Array<{
    modelId: string;
    crossRegionInference?: boolean;
    region?: string;
  }>;
  /**
   * An amount of memory (RAM) to allocate to the function between 128 and 10240 MB.
   * Must be a whole number.
   * Default is 512MB.
   */
  memoryMB?: number;

  /**
   * An amount of time in seconds between 1 second and 15 minutes.
   * Must be a whole number.
   * Default is 60 seconds.
   */
  timeoutSeconds?: number;

  logging?: {
    level?: ApplicationLogLevel;
    retention?: RetentionDays;
  };

  /**
   * @internal
   */
  outputStorageStrategy?: BackendOutputStorageStrategy<AIConversationOutput>;
};

// Event is a protocol between AppSync and Lambda handler. Therefore, X.Y subset of semver is enough.
// Typing this as 1.X so that major version changes are caught by compiler if consumer of this construct inspects
// event version.
export type ConversationTurnEventVersion = `1.${number}`;

/**
 * Conversation Handler Function CDK construct.
 * This construct deploys resources that integrate conversation routes
 * defined in data schema with AI models available in AWS Bedrock. I.e.
 * 1. AWS Lambda function that handles conversation turn events.
 *    With Amplify provided implementation by default and option to specify
 *    custom handler.
 * 2. AWS CloudWatch log group policy with appropriate data protection policies.
 * 3. AWS IAM policy that grants access to selected AWS Bedrock models.
 */
export class ConversationHandlerFunction
  extends Construct
  implements ResourceProvider<FunctionResources>
{
  static readonly eventVersion: ConversationTurnEventVersion = '1.0';
  resources: FunctionResources;

  /**
   * Creates Conversation Handler Function CDK construct.
   */
  constructor(
    scope: Construct,
    id: string,
    private readonly props: ConversationHandlerFunctionProps,
  ) {
    super(scope, id);

    if (this.props.entry && !path.isAbsolute(this.props.entry)) {
      throw new Error('Entry must be absolute path');
    }

    // Intentionally not using import from 'platform-core'
    // To not drag excessive amount of dependencies into construct layer.
    Tags.of(this).add('amplify:friendly-name', id);

    const commonHandlerProperties = {
      runtime: LambdaRuntime.NODEJS_20_X,
      timeout: Duration.seconds(this.resolveTimeout()),
      memorySize: this.resolveMemory(),
      loggingFormat: LoggingFormat.JSON,
      applicationLogLevelV2: this.props.logging?.level,
      logGroup: new LogGroup(this, 'conversationHandlerFunctionLogGroup', {
        retention: this.props.logging?.retention ?? RetentionDays.INFINITE,
        dataProtectionPolicy: new DataProtectionPolicy({
          identifiers: [
            new CustomDataIdentifier(
              'JWTToken',
              'ey[A-Za-z0-9-_=]+\\.[A-Za-z0-9-_=]+\\.?[A-Za-z0-9-_.+/=]*',
            ),
          ],
        }),
      }),
    };

    let conversationHandler: IFunction;
    if (this.props.entry) {
      // When custom entry is defined. Use NodejsFunction to bundle the handler.
      conversationHandler = new NodejsFunction(
        this,
        `conversationHandlerFunction`,
        {
          entry: this.props.entry,
          handler: 'handler',
          bundling: {
            // For custom entry we do bundle SDK as we can't control version customer is coding against.
            bundleAwsSDK: true,
          },
          ...commonHandlerProperties,
        },
      );
    } else {
      // Use default handler that is bundled by us at the package build time.
      conversationHandler = new Function(this, `conversationHandlerFunction`, {
        handler: 'index.handler',
        code: Code.fromAsset(defaultHandlerFilePath),
        ...commonHandlerProperties,
      });
    }

    if (this.props.models && this.props.models.length > 0) {
      const arnGenerator = new AiModelArnGeneratorConstruct(
        this,
        'AiModelArnGenerator',
      );

      const resolvedModelArns: string[] = this.props.models
        .map(
          (model): AiModelConfig => ({
            modelId: model.modelId,
            region: model.region ?? Stack.of(this).region,
            crossRegionInference: Boolean(model.crossRegionInference),
          }),
        )
        .flatMap((cfg) => arnGenerator.generateArns(cfg));

      const modelArns = Array.from(new Set(resolvedModelArns));

      conversationHandler.addToRolePolicy(
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'bedrock:InvokeModel',
            'bedrock:InvokeModelWithResponseStream',
          ],
          resources: modelArns,
        }),
      );
    }

    this.resources = {
      lambda: conversationHandler,
      cfnResources: {
        cfnFunction: conversationHandler.node.findChild(
          'Resource',
        ) as CfnFunction,
      },
    };

    this.storeOutput(this.props.outputStorageStrategy);
  }

  /**
   * Append conversation handler to defined functions.
   */
  private storeOutput = (
    outputStorageStrategy:
      | BackendOutputStorageStrategy<AIConversationOutput>
      | undefined,
  ): void => {
    outputStorageStrategy?.appendToBackendOutputList(aiConversationOutputKey, {
      version: '1',
      payload: {
        definedConversationHandlers: this.resources.lambda.functionName,
      },
    });
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
        `memoryMB must be a whole number between ${memoryMin} and ${memoryMax} inclusive`,
      );
    }
    return this.props.memoryMB;
  };

  private resolveTimeout = () => {
    const timeoutMin = 1;
    const timeoutMax = 60 * 15; // 15 minutes in seconds
    const timeoutDefault = 60;
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
      throw new Error(
        `timeoutSeconds must be a whole number between ${timeoutMin} and ${timeoutMax} inclusive`,
      );
    }
    return this.props.timeoutSeconds;
  };
}

const isWholeNumberBetweenInclusive = (
  test: number,
  min: number,
  max: number,
) => min <= test && test <= max && test % 1 === 0;
