import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { CloudFormationCustomResourceEvent } from 'aws-lambda';
import { AmplifyAiModelArnGeneratorResourceEventHandler } from './ai_model_arn_generator';
import { MockAiModelPropsResolver, TEST_MODEL_IDS } from '../test-assets';
import { AiModelConfig } from '../ai_model_types';

void describe('AmplifyAiModelArnGeneratorResourceEventHandler', () => {
  const { FOUNDATION, INF_PROFILE_US, NO_CRI_MODEL } = TEST_MODEL_IDS;

  const createCreateEvent = (
    modelConfig: AiModelConfig = {
      modelId: FOUNDATION,
      region: 'us-east-1',
      crossRegionInference: false,
    },
  ) => ({
    RequestType: 'Create' as const,
    RequestId: 'test-request-id',
    LogicalResourceId: 'test-logical-id',
    StackId: 'test-stack-id',
    ResponseURL: 'https://test.com',
    ResourceType: 'Custom::AmplifyAiModelArnGenerator',
    ResourceProperties: { modelConfig, ServiceToken: 'test-token' },
    ServiceToken: 'test-token',
  });

  const createUpdateEvent = (
    modelConfig: AiModelConfig = {
      modelId: FOUNDATION,
      region: 'us-east-1',
      crossRegionInference: false,
    },
  ) => ({
    RequestType: 'Update' as const,
    RequestId: 'test-request-id',
    LogicalResourceId: 'test-logical-id',
    StackId: 'test-stack-id',
    ResponseURL: 'https://test.com',
    ResourceType: 'Custom::AmplifyAiModelArnGenerator',
    ResourceProperties: { modelConfig, ServiceToken: 'test-token' },
    OldResourceProperties: { modelConfig, ServiceToken: 'test-token' },
    ServiceToken: 'test-token',
    PhysicalResourceId: 'test-physical-id',
  });

  const createDeleteEvent = () => ({
    RequestType: 'Delete' as const,
    RequestId: 'test-request-id',
    LogicalResourceId: 'test-logical-id',
    StackId: 'test-stack-id',
    ResponseURL: 'https://test.com',
    ResourceType: 'Custom::AmplifyAiModelArnGenerator',
    ResourceProperties: { modelConfig: {}, ServiceToken: 'test-token' },
    ServiceToken: 'test-token',
    PhysicalResourceId: 'test-physical-id',
  });

  void describe('handleCustomResourceEvent', () => {
    void it('handles Create request with foundation model', async () => {
      const handler = new AmplifyAiModelArnGeneratorResourceEventHandler(
        new MockAiModelPropsResolver(),
      );
      const event = createCreateEvent();
      const result = await handler.handleCustomResourceEvent(event);

      assert.strictEqual(result.Status, 'SUCCESS');
      assert.strictEqual(result.RequestId, 'test-request-id');
      assert.strictEqual(
        result.Data?.modelArns,
        `arn:aws:bedrock:us-east-1::foundation-model/${FOUNDATION}`,
      );
    });

    void it('handles Create request with inference profile', async () => {
      const handler = new AmplifyAiModelArnGeneratorResourceEventHandler(
        new MockAiModelPropsResolver(),
      );
      const event = createCreateEvent({
        modelId: FOUNDATION,
        region: 'us-east-2', // requires CRI
        crossRegionInference: false,
      });
      const result = await handler.handleCustomResourceEvent(event);

      const expectedArns = [
        `arn:aws:bedrock:us-east-2:*:inference-profile/${INF_PROFILE_US}`,
        `arn:aws:bedrock:us-east-1::foundation-model/${FOUNDATION}`,
        `arn:aws:bedrock:us-west-2::foundation-model/${FOUNDATION}`,
      ].join(',');

      assert.strictEqual(result.Status, 'SUCCESS');
      assert.strictEqual(result.Data?.modelArns, expectedArns);
    });

    void it('handles Update request', async () => {
      const handler = new AmplifyAiModelArnGeneratorResourceEventHandler(
        new MockAiModelPropsResolver(),
      );
      const event = createUpdateEvent();
      const result = await handler.handleCustomResourceEvent(event);

      assert.strictEqual(result.Status, 'SUCCESS');
      assert.strictEqual(result.RequestId, 'test-request-id');
      assert.ok(result.Data?.modelArns);
    });

    void it('handles Delete request', async () => {
      const handler = new AmplifyAiModelArnGeneratorResourceEventHandler(
        new MockAiModelPropsResolver(),
      );
      const event = createDeleteEvent();
      const result = await handler.handleCustomResourceEvent(event);

      assert.strictEqual(result.Status, 'SUCCESS');
      assert.strictEqual(result.PhysicalResourceId, 'test-physical-id');
      assert.strictEqual(result.Data, undefined);
    });

    void it('throws for unsupported request type', async () => {
      const handler = new AmplifyAiModelArnGeneratorResourceEventHandler(
        new MockAiModelPropsResolver(),
      );
      const event = {
        ...createCreateEvent(),
        RequestType: 'Invalid',
      } as unknown as CloudFormationCustomResourceEvent;

      await assert.rejects(
        () => handler.handleCustomResourceEvent(event),
        /Unsupported request type: Invalid/,
      );
    });

    void it('handles errors gracefully', async () => {
      const mockResolver = {
        resolveModelId: () => {
          throw new Error('Test error');
        },
      } as unknown as MockAiModelPropsResolver;
      const handler = new AmplifyAiModelArnGeneratorResourceEventHandler(
        mockResolver,
      );
      const event = createCreateEvent();

      await assert.rejects(
        () => handler.handleCustomResourceEvent(event),
        /Test error/,
      );
    });
  });

  void describe('generateModelArns', () => {
    void it('generates foundation model ARN for non-inference profile', async () => {
      const handler = new AmplifyAiModelArnGeneratorResourceEventHandler(
        new MockAiModelPropsResolver(),
      );
      const event = createCreateEvent({
        modelId: FOUNDATION,
        region: 'us-west-2',
        crossRegionInference: false,
      });
      const result = await handler.handleCustomResourceEvent(event);

      assert.strictEqual(
        result.Data?.modelArns,
        `arn:aws:bedrock:us-west-2::foundation-model/${FOUNDATION}`,
      );
    });

    void it('generates inference profile and foundation model ARNs', async () => {
      const handler = new AmplifyAiModelArnGeneratorResourceEventHandler(
        new MockAiModelPropsResolver(),
      );
      const event = createCreateEvent({
        modelId: FOUNDATION,
        region: 'us-west-2',
        crossRegionInference: true,
      });
      const result = await handler.handleCustomResourceEvent(event);

      const expectedArns = [
        `arn:aws:bedrock:us-west-2:*:inference-profile/${INF_PROFILE_US}`,
        `arn:aws:bedrock:us-east-1::foundation-model/${FOUNDATION}`,
        `arn:aws:bedrock:us-west-2::foundation-model/${FOUNDATION}`,
      ].join(',');

      assert.strictEqual(result.Data?.modelArns, expectedArns);
    });

    void it('handles model with no CRI support', async () => {
      const handler = new AmplifyAiModelArnGeneratorResourceEventHandler(
        new MockAiModelPropsResolver(),
      );
      const event = createCreateEvent({
        modelId: NO_CRI_MODEL,
        region: 'us-east-1',
        crossRegionInference: true,
      });
      const result = await handler.handleCustomResourceEvent(event);

      assert.strictEqual(
        result.Data?.modelArns,
        `arn:aws:bedrock:us-east-1::foundation-model/${NO_CRI_MODEL}`,
      );
    });
  });

  void describe('generatePhysicalResourceId', () => {
    void it('generates consistent physical resource ID', async () => {
      const handler = new AmplifyAiModelArnGeneratorResourceEventHandler(
        new MockAiModelPropsResolver(),
      );
      const modelConfig = {
        modelId: 'testModelId1',
        region: 'us-west-2',
        crossRegionInference: true,
      };
      const event = createCreateEvent(modelConfig);
      const result = await handler.handleCustomResourceEvent(event);

      assert.strictEqual(
        result.PhysicalResourceId,
        'ai-model-arns-testModelId1-us-west-2-true',
      );
    });

    void it('generates different IDs for different configs', async () => {
      const handler = new AmplifyAiModelArnGeneratorResourceEventHandler(
        new MockAiModelPropsResolver(),
      );

      const event1 = createCreateEvent({
        modelId: 'testModelId1',
        region: 'us-east-1',
        crossRegionInference: false,
      });
      const event2 = createCreateEvent({
        modelId: 'testModelId2',
        region: 'us-west-2',
        crossRegionInference: true,
      });

      const result1 = await handler.handleCustomResourceEvent(event1);
      const result2 = await handler.handleCustomResourceEvent(event2);

      assert.notStrictEqual(
        result1.PhysicalResourceId,
        result2.PhysicalResourceId,
      );
    });
  });

  void describe('edge cases', () => {
    void it('handles Delete with missing PhysicalResourceId', async () => {
      const handler = new AmplifyAiModelArnGeneratorResourceEventHandler(
        new MockAiModelPropsResolver(),
      );
      const event = {
        ...createDeleteEvent(),
        PhysicalResourceId: undefined as unknown as string,
      };
      const result = await handler.handleCustomResourceEvent(event);

      assert.strictEqual(result.Status, 'SUCCESS');
      assert.strictEqual(result.PhysicalResourceId, 'ai-model-arns-deleted');
    });

    void it('logs processing information', async () => {
      const consoleSpy = mock.method(console, 'info');
      const handler = new AmplifyAiModelArnGeneratorResourceEventHandler(
        new MockAiModelPropsResolver(),
      );
      const event = createCreateEvent();

      await handler.handleCustomResourceEvent(event);

      assert.strictEqual(consoleSpy.mock.callCount(), 1);
      consoleSpy.mock.restore();
    });

    void it('logs errors on failure', async () => {
      const consoleSpy = mock.method(console, 'error');
      const mockResolver = {
        resolveModelId: () => {
          throw new Error('Test error');
        },
      } as unknown as MockAiModelPropsResolver;
      const handler = new AmplifyAiModelArnGeneratorResourceEventHandler(
        mockResolver,
      );
      const event = createCreateEvent();

      await assert.rejects(() => handler.handleCustomResourceEvent(event));

      assert.strictEqual(consoleSpy.mock.callCount(), 1);
      consoleSpy.mock.restore();
    });
  });
});
