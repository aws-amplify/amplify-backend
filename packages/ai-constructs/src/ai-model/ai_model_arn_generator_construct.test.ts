import { describe, it } from 'node:test';
import assert from 'node:assert';
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { AiModelArnGeneratorConstruct } from './ai_model_arn_generator_construct';
import { TEST_MODEL_IDS } from './test-assets';

void describe('AiModelArnGeneratorConstruct', () => {
  const { FOUNDATION } = TEST_MODEL_IDS;

  const createStack = () => {
    const app = new App();
    return new Stack(app, 'TestStack');
  };

  void describe('constructor', () => {
    void it('creates construct with default id', () => {
      const stack = createStack();
      const construct = new AiModelArnGeneratorConstruct(stack);

      assert.ok(construct);
      assert.strictEqual(construct.node.id, 'AmplifyAiModelArnGenerator');
    });

    void it('creates construct with custom id', () => {
      const stack = createStack();
      const construct = new AiModelArnGeneratorConstruct(stack, 'CustomId');

      assert.ok(construct);
      assert.strictEqual(construct.node.id, 'CustomId');
    });

    void it('creates Lambda function', () => {
      const stack = createStack();
      new AiModelArnGeneratorConstruct(stack);

      const template = Template.fromStack(stack);

      // Should create Lambda function
      template.hasResourceProperties('AWS::Lambda::Function', {
        Runtime: 'nodejs20.x',
        Timeout: 30,
        MemorySize: 128,
        Description:
          'Resolve Amazon Bedrock AI model ARNs based on region and cross-region inference settings',
      });
    });
  });

  void describe('generateArns', () => {
    void it('returns array of ARN tokens', () => {
      const stack = createStack();
      const construct = new AiModelArnGeneratorConstruct(stack);

      const modelConfig = {
        modelId: FOUNDATION,
        region: 'us-east-1',
        crossRegionInference: false,
      };

      const arns = construct.generateArns(modelConfig);

      assert.ok(Array.isArray(arns));
      assert.strictEqual(arns.length, 1);
    });

    void it('returns array when generating ARNs', () => {
      const stack = createStack();
      const construct = new AiModelArnGeneratorConstruct(stack);

      const modelConfig = {
        modelId: FOUNDATION,
        region: 'us-east-1',
        crossRegionInference: false,
      };

      const arns = construct.generateArns(modelConfig);

      assert.ok(Array.isArray(arns));
      assert.strictEqual(arns.length, 1);
    });

    void it('returns different arrays for different calls', () => {
      const stack = createStack();
      const construct = new AiModelArnGeneratorConstruct(stack);

      const arns1 = construct.generateArns({
        modelId: FOUNDATION,
        region: 'us-east-1',
        crossRegionInference: false,
      });

      const arns2 = construct.generateArns({
        modelId: FOUNDATION,
        region: 'us-west-2',
        crossRegionInference: true,
      });

      assert.ok(Array.isArray(arns1));
      assert.ok(Array.isArray(arns2));
      assert.notStrictEqual(arns1, arns2);
    });
  });
});
