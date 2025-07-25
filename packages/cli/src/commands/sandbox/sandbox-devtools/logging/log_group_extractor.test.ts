import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getLogGroupName } from './log_group_extractor.js';

void describe('getLogGroupName function', () => {
  void it('returns correct log group name for Lambda functions', () => {
    const resourceType = 'AWS::Lambda::Function';
    const resourceId = 'my-lambda-function';
    assert.strictEqual(
      getLogGroupName(resourceType, resourceId),
      '/aws/lambda/my-lambda-function',
    );
  });

  void it('returns correct log group name for API Gateway', () => {
    const resourceType = 'AWS::ApiGateway::RestApi';
    const resourceId = 'abc123def';
    assert.strictEqual(
      getLogGroupName(resourceType, resourceId),
      // eslint-disable-next-line spellcheck/spell-checker
      'API-Gateway-Execution-Logs_abc123def',
    );
  });

  void it('returns correct log group name for AppSync APIs', () => {
    const resourceType = 'AWS::AppSync::GraphQLApi';
    // eslint-disable-next-line spellcheck/spell-checker
    const resourceId = 'xyz789';
    assert.strictEqual(
      getLogGroupName(resourceType, resourceId),
      // eslint-disable-next-line spellcheck/spell-checker
      '/aws/appsync/apis/xyz789',
    );
  });

  void it('returns null for unsupported resource types', () => {
    const resourceType = 'AWS::S3::Bucket';
    const resourceId = 'my-bucket';

    const result = getLogGroupName(resourceType, resourceId);

    assert.strictEqual(result, null);
  });

  void it('handles resource IDs with special characters', () => {
    const resourceType = 'AWS::Lambda::Function';
    const resourceId = 'my-function-with-special/chars';
    assert.strictEqual(
      getLogGroupName(resourceType, resourceId),
      '/aws/lambda/my-function-with-special/chars',
    );
  });

  void it('handles resource IDs with ARN format', () => {
    const resourceType = 'AWS::Lambda::Function';
    const resourceId =
      'arn:aws:lambda:us-west-2:123456789012:function:my-function';
    assert.strictEqual(
      getLogGroupName(resourceType, resourceId),
      '/aws/lambda/arn:aws:lambda:us-west-2:123456789012:function:my-function',
    );
  });
});
