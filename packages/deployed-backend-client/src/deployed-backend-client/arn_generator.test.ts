import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ArnGenerator } from './arn_generator.js';
import { ResourceStatus } from '@aws-sdk/client-cloudformation';

void describe('arn generator', () => {
  const mockResourceSummaryBase = {
    PhysicalResourceId: 'MOCK_PhysicalResourceId',
    LogicalResourceId:
      'arn:aws:{service}:{region}:{account}:stack/apiStack/{additionalFields}',
    ResourceStatus: 'CREATE_COMPLETE' as ResourceStatus,
    ResourceStatusReason: undefined,
    LastUpdatedTimestamp: new Date(1),
  };
  const arnGenerator = new ArnGenerator();

  void it('skips unsupported resources', async () => {
    const arn = arnGenerator.generateArn(
      {
        ...mockResourceSummaryBase,
        ResourceType: 'AWS::UNSUPPORTED_RESOURCE::UNSUPPORTED_RESOURCE',
      },
      'us-east-1',
      '000000'
    );

    assert.equal(arn, undefined);
  });

  void it('uses any direct arn in a physicalResourceId', async () => {
    const arn = arnGenerator.generateArn(
      {
        ...mockResourceSummaryBase,
        ResourceType: 'AWS::UNSUPPORTED_RESOURCE::UNSUPPORTED_RESOURCE',
        PhysicalResourceId:
          'arn:aws:unsupported-service:us-east-1:000000:unsupported-resource',
      },
      'us-east-1',
      '000000'
    );

    assert.equal(
      arn,
      'arn:aws:unsupported-service:us-east-1:000000:unsupported-resource'
    );
  });

  void it('generates user pool arn', async () => {
    const arn = arnGenerator.generateArn(
      {
        ...mockResourceSummaryBase,
        ResourceType: 'AWS::Cognito::UserPool',
      },
      'us-east-1',
      '000000'
    );

    assert.equal(
      arn,
      'arn:aws:cognito-idp:us-east-1:000000:userpool/MOCK_PhysicalResourceId'
    );
  });

  void it('generates identity pool arn', async () => {
    const arn = arnGenerator.generateArn(
      {
        ...mockResourceSummaryBase,
        ResourceType: 'AWS::Cognito::IdentityPool',
      },
      'us-east-1',
      '000000'
    );

    assert.equal(
      arn,
      'arn:aws:cognito-identity:us-east-1:000000:identitypool/MOCK_PhysicalResourceId'
    );
  });

  void it('generates iam role arn', async () => {
    const arn = arnGenerator.generateArn(
      {
        ...mockResourceSummaryBase,
        ResourceType: 'AWS::IAM::Role',
      },
      'us-east-1',
      '000000'
    );

    assert.equal(
      arn,
      'arn:aws:iam:us-east-1:000000:role/MOCK_PhysicalResourceId'
    );
  });

  void it('generates DynamoDB table arn', async () => {
    const arn = arnGenerator.generateArn(
      {
        ...mockResourceSummaryBase,
        ResourceType: 'AWS::DynamoDB::Table',
      },
      'us-east-1',
      '000000'
    );

    assert.equal(
      arn,
      'arn:aws:dynamodb:us-east-1:000000:table/MOCK_PhysicalResourceId'
    );
  });

  void it('generates s3 bucket arn', async () => {
    const arn = arnGenerator.generateArn(
      {
        ...mockResourceSummaryBase,
        ResourceType: 'AWS::S3::Bucket',
      },
      'us-east-1',
      '000000'
    );

    assert.equal(arn, 'arn:aws:s3:::MOCK_PhysicalResourceId');
  });

  void it('generates lambda function arn', async () => {
    const arn = arnGenerator.generateArn(
      {
        ...mockResourceSummaryBase,
        ResourceType: 'AWS::Lambda::Function',
      },
      'us-east-1',
      '000000'
    );

    assert.equal(
      arn,
      'arn:aws:lambda:us-east-1:000000:function:MOCK_PhysicalResourceId'
    );
  });
});
