import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime as LambdaRuntime } from 'aws-cdk-lib/aws-lambda';
import { CustomResource, Duration, Fn } from 'aws-cdk-lib';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { resolve } from 'path';
import { AiModelConfig } from './ai_model_types';

/**
 * Custom resource type identifier.
 */
const AI_MODEL_ARN_GENERATOR_RESOURCE_TYPE =
  'Custom::AmplifyAiModelArnGenerator';

const DEFAULT_LAMBDA_TIMEOUT_SECONDS = 30;
const DEFAULT_LAMBDA_MEMORY_SIZE = 128;
const DEFAULT_LOG_RETENTION_DAYS = RetentionDays.TWO_WEEKS;

/**
 * CDK construct that generates AI model ARNs using a custom resource.
 * Handles both foundation models and inference profiles based on configuration.
 */
export class AiModelArnGeneratorConstruct extends Construct {
  private readonly provider: Provider;
  private resourceCounter = 0;

  /**
   * Creates a new AI model ARN generator construct.
   */
  constructor(scope: Construct, id = 'AmplifyAiModelArnGenerator') {
    super(scope, id);

    const entryPath = resolve(__dirname, 'lambda', 'ai_model_arn_generator.js');

    const onEvent = new NodejsFunction(this, 'AiModelArnGeneratorLambda', {
      runtime: LambdaRuntime.NODEJS_20_X,
      timeout: Duration.seconds(DEFAULT_LAMBDA_TIMEOUT_SECONDS),
      entry: entryPath,
      handler: 'handler',
      description:
        'Resolve Amazon Bedrock AI model ARNs based on region and cross-region inference settings',
      memorySize: DEFAULT_LAMBDA_MEMORY_SIZE,
      logRetention: DEFAULT_LOG_RETENTION_DAYS,
      bundling: {
        // Include deps to avoid relying on Lambda layer versions.
        externalModules: [],
      },
    });

    this.provider = new Provider(this, 'AiModelArnGeneratorProvider', {
      onEventHandler: onEvent,
      logRetention: DEFAULT_LOG_RETENTION_DAYS,
    });
  }

  /**
   * Generates model ARNs based on the provided configuration.
   * Returns CloudFormation tokens that resolve to an array of ARN strings.
   */
  public generateArns(modelConfig: AiModelConfig): string[] {
    this.resourceCounter += 1;
    const resourceId = `AiModelArnsResource${this.resourceCounter}`;

    const resource = new CustomResource(this, resourceId, {
      serviceToken: this.provider.serviceToken,
      resourceType: AI_MODEL_ARN_GENERATOR_RESOURCE_TYPE,
      properties: {
        modelConfig,
      },
    });

    return Fn.split(',', resource.getAtt('modelArns').toString());
  }
}
