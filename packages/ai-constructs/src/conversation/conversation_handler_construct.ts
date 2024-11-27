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
import { TagName } from '@aws-amplify/platform-core';
import {
  AIConversationOutput,
  aiConversationOutputKey,
} from '@aws-amplify/backend-output-schemas';

const resourcesRoot = path.normalize(path.join(__dirname, 'runtime'));
const defaultHandlerFilePath = path.join(resourcesRoot, 'default_handler.js');

export type ConversationHandlerFunctionProps = {
  entry?: string;
  models: Array<{
    modelId: string;
    region?: string;
  }>;
  /**
   * An amount of memory (RAM) to allocate to the function between 128 and 10240 MB.
   * Must be a whole number.
   * Default is 512MB.
   */
  memoryMB?: number;

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
    private readonly props: ConversationHandlerFunctionProps
  ) {
    super(scope, id);

    if (this.props.entry && !path.isAbsolute(this.props.entry)) {
      throw new Error('Entry must be absolute path');
    }

    Tags.of(this).add(TagName.FRIENDLY_NAME, id);

    const conversationHandler = new NodejsFunction(
      this,
      `conversationHandlerFunction`,
      {
        runtime: LambdaRuntime.NODEJS_18_X,
        timeout: Duration.seconds(60),
        entry: this.props.entry ?? defaultHandlerFilePath,
        handler: 'handler',
        memorySize: this.resolveMemory(),
        bundling: {
          // Do not bundle SDK if conversation handler is using our default implementation which is
          // compatible with Lambda provided SDK.
          // For custom entry we do bundle SDK as we can't control version customer is coding against.
          bundleAwsSDK: !!this.props.entry,
        },
        loggingFormat: LoggingFormat.JSON,
        applicationLogLevelV2: this.props.logging?.level,
        logGroup: new LogGroup(this, 'conversationHandlerFunctionLogGroup', {
          retention: this.props.logging?.retention ?? RetentionDays.INFINITE,
          dataProtectionPolicy: new DataProtectionPolicy({
            identifiers: [
              new CustomDataIdentifier(
                'JWTToken',
                'ey[A-Za-z0-9-_=]+\\.[A-Za-z0-9-_=]+\\.?[A-Za-z0-9-_.+/=]*'
              ),
            ],
          }),
        }),
      }
    );

    if (this.props.models && this.props.models.length > 0) {
      const resources = this.props.models.map(
        (model) =>
          `arn:aws:bedrock:${
            model.region ?? Stack.of(this).region
          }::foundation-model/${model.modelId}`
      );
      conversationHandler.addToRolePolicy(
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'bedrock:InvokeModel',
            'bedrock:InvokeModelWithResponseStream',
          ],
          resources,
        })
      );
    }

    this.resources = {
      lambda: conversationHandler,
      cfnResources: {
        cfnFunction: conversationHandler.node.findChild(
          'Resource'
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
      | undefined
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
        `memoryMB must be a whole number between ${memoryMin} and ${memoryMax} inclusive`
      );
    }
    return this.props.memoryMB;
  };
}

const isWholeNumberBetweenInclusive = (
  test: number,
  min: number,
  max: number
) => min <= test && test <= max && test % 1 === 0;
