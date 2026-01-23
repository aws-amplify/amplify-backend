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

const resourcesRoot = path.normalize(path.join(__dirname, 'runtime'));
const defaultHandlerFilePath = path.join(
  resourcesRoot,
  'default_handler_bundled',
);

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
      this.addBedrockModelPermissions(conversationHandler);
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

  /**
   * Adds IAM permissions for Bedrock models to the Lambda function.
   * Handles both regular foundation models and global cross-region inference profiles.
   *
   * For global inference profiles (modelId starts with "global."), this creates a three-part
   * IAM policy as required by AWS Bedrock:
   * 1. Access to the inference profile in the requesting region
   * 2. Access to the foundation model in the requesting region
   * 3. Access to the global foundation model (enables cross-region routing)
   * @see https://docs.aws.amazon.com/bedrock/latest/userguide/global-cross-region-inference.html
   */
  private addBedrockModelPermissions = (handler: IFunction): void => {
    const currentRegion = Stack.of(this).region;
    const currentAccount = Stack.of(this).account;
    const bedrockActions = [
      'bedrock:InvokeModel',
      'bedrock:InvokeModelWithResponseStream',
    ];

    const resourceGroups = this.categorizeModelResources(
      currentRegion,
      currentAccount,
    );

    // Add permissions for each resource group
    Object.values(resourceGroups).forEach((resources) => {
      if (resources.length > 0) {
        handler.addToRolePolicy(
          new PolicyStatement({
            effect: Effect.ALLOW,
            actions: bedrockActions,
            resources,
          }),
        );
      }
    });
  };

  /**
   * Categorizes model resources into different permission groups based on model type.
   * Returns an object with arrays of ARNs for each permission category.
   */
  private categorizeModelResources = (
    region: string,
    account: string,
  ): Record<string, string[]> => {
    const resources = {
      regularModels: [] as string[],
      globalInferenceProfiles: [] as string[],
      globalRegionalModels: [] as string[],
      globalCrossRegionModels: [] as string[],
    };

    this.props.models.forEach((model) => {
      if (this.isGlobalInferenceProfile(model.modelId)) {
        const foundationModelId = this.extractFoundationModelId(model.modelId);

        resources.globalInferenceProfiles.push(
          this.buildInferenceProfileArn(region, account, model.modelId),
        );
        resources.globalRegionalModels.push(
          this.buildFoundationModelArn(region, foundationModelId),
        );
        resources.globalCrossRegionModels.push(
          this.buildGlobalFoundationModelArn(foundationModelId),
        );
      } else {
        resources.regularModels.push(
          this.buildFoundationModelArn(model.region ?? region, model.modelId),
        );
      }
    });

    return resources;
  };

  private isGlobalInferenceProfile = (modelId: string): boolean =>
    modelId.startsWith('global.');

  private extractFoundationModelId = (inferenceProfileId: string): string =>
    inferenceProfileId.replace(/^global\./, '');

  private buildInferenceProfileArn = (
    region: string,
    account: string,
    profileId: string,
  ): string =>
    `arn:aws:bedrock:${region}:${account}:inference-profile/${profileId}`;

  private buildFoundationModelArn = (region: string, modelId: string): string =>
    `arn:aws:bedrock:${region}::foundation-model/${modelId}`;

  private buildGlobalFoundationModelArn = (modelId: string): string =>
    `arn:aws:bedrock:::foundation-model/${modelId}`;
}

const isWholeNumberBetweenInclusive = (
  test: number,
  min: number,
  max: number,
) => min <= test && test <= max && test % 1 === 0;
