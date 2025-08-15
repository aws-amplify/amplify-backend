import {
  CloudFormationCustomResourceEvent,
  CloudFormationCustomResourceSuccessResponse,
} from 'aws-lambda';
import { AiModelPropsResolver } from '../runtime/ai_model_props_resolver';
import { AiModelConfig } from '../ai_model_types';

/**
 * CloudFormation custom resource handler for generating AI model ARNs.
 * Supports both foundation models and inference profiles.
 */
export class AmplifyAiModelArnGeneratorResourceEventHandler {
  /** Creates event handler for AI model ARN generator custom resource. */
  /**
   * Creates a new AI model ARN generator event handler.
   */
  constructor(
    private readonly aiModelPropsResolver: AiModelPropsResolver = new AiModelPropsResolver(),
  ) {}

  /**
   * Processes CloudFormation custom resource events for AI model ARN generation.
   */
  handleCustomResourceEvent = async (
    event: CloudFormationCustomResourceEvent,
  ): Promise<CloudFormationCustomResourceSuccessResponse> => {
    console.info(`Processing AI model ARN generation request`, {
      requestType: event.RequestType,
      requestId: event.RequestId,
      logicalResourceId: event.LogicalResourceId,
    });

    try {
      const requestType = event.RequestType;
      if (requestType === 'Create' || requestType === 'Update') {
        return this.onCreateOrUpdate(event);
      }
      if (requestType === 'Delete') {
        return this.onDelete(event);
      }
      throw new Error(`Unsupported request type: ${String(requestType)}`);
    } catch (error) {
      console.error(
        'Failed to process AI model ARN generation request:',
        error,
      );
      throw error;
    }
  };

  /**
   * Handles Create and Update events by generating model ARNs.
   */
  private onCreateOrUpdate(
    event: CloudFormationCustomResourceEvent,
  ): CloudFormationCustomResourceSuccessResponse {
    const modelConfig = event.ResourceProperties.modelConfig as AiModelConfig;

    const resolvedModelId =
      this.aiModelPropsResolver.resolveModelId(modelConfig);
    const modelArns = this.generateModelArns(
      resolvedModelId,
      modelConfig.region,
    );

    return {
      RequestId: event.RequestId,
      LogicalResourceId: event.LogicalResourceId,
      StackId: event.StackId,
      Status: 'SUCCESS',
      PhysicalResourceId: this.generatePhysicalResourceId(modelConfig),
      Data: {
        modelArns: modelArns.join(','),
      },
    };
  }

  /**
   * Handles Delete events by returning success response.
   */
  private onDelete(
    event: CloudFormationCustomResourceEvent,
  ): CloudFormationCustomResourceSuccessResponse {
    type DeleteEvent = CloudFormationCustomResourceEvent & {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      PhysicalResourceId: string;
    };
    const del = event as DeleteEvent;
    return {
      RequestId: event.RequestId,
      LogicalResourceId: event.LogicalResourceId,
      StackId: event.StackId,
      Status: 'SUCCESS',
      PhysicalResourceId: del.PhysicalResourceId || 'ai-model-arns-deleted',
    };
  }

  /**
   * Generates a unique physical resource ID for the custom resource.
   */
  private generatePhysicalResourceId(modelConfig: AiModelConfig): string {
    return `ai-model-arns-${modelConfig.modelId}-${modelConfig.region}-${modelConfig.crossRegionInference}`;
  }

  /**
   * Build ARNs for the resolved model ID:
   *  - If it's a foundation model ID → one foundation model ARN for the region.
   *  - If it's an inference profile ID → profile ARN + all supporting foundation model ARNs
   *    for the geography.
   */
  private generateModelArns(modelId: string, region: string): string[] {
    const isInferenceProfile =
      this.aiModelPropsResolver.isKnownInferenceProfile(modelId);

    const fmArn = (id: string, reg: string) =>
      `arn:aws:bedrock:${reg}::foundation-model/${id}`;
    const inferenceProfileArn = (id: string, reg: string) =>
      `arn:aws:bedrock:${reg}:*:inference-profile/${id}`;

    if (!isInferenceProfile) {
      return [fmArn(modelId, region)];
    }

    const foundationModelId =
      this.aiModelPropsResolver.getFoundationModelId(modelId);
    const geography = this.aiModelPropsResolver.getGeography(region);
    const supportedRegions =
      this.aiModelPropsResolver.getSupportedSourceRegions(
        foundationModelId,
        geography,
      );

    return [
      inferenceProfileArn(modelId, region),
      ...supportedRegions.map((r) => fmArn(foundationModelId, r)),
    ];
  }
}

const customResourceHandler =
  new AmplifyAiModelArnGeneratorResourceEventHandler();

/**
 * Lambda handler entry point for AI model ARN generation custom resource.
 */
export const handler = (
  event: CloudFormationCustomResourceEvent,
): Promise<CloudFormationCustomResourceSuccessResponse> => {
  return customResourceHandler.handleCustomResourceEvent(event);
};
