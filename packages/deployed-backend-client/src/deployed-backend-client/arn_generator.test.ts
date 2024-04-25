import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ArnGenerator } from './arn_generator.js';

void describe('arn generator', () => {
  const mockResourceSummaryBase = {
    PhysicalResourceId: 'MOCK_PhysicalResourceId',
  };
  const arnGenerator = new ArnGenerator();

  void it('skips unsupported resources', () => {
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

  void it('returns undefined if PhysicalResourceId is undefined', () => {
    const arn = arnGenerator.generateArn({
      PhysicalResourceId: undefined,
      ResourceType: 'something',
    });
    assert.equal(arn, undefined);
  });

  void it('returns physicalResourceId verbatim if it is already an ARN', () => {
    const arn = arnGenerator.generateArn({
      ResourceType: 'something',
      PhysicalResourceId:
        'arn:aws:unsupported-service:us-east-1:000000:unsupported-resource',
    });

    assert.equal(
      arn,
      'arn:aws:unsupported-service:us-east-1:000000:unsupported-resource'
    );
  });

  void it('returns undefined if region or account ID are needed and not specified', () => {
    const arn = arnGenerator.generateArn({
      ...mockResourceSummaryBase,
      ResourceType: 'something',
    });
    assert.equal(arn, undefined);
  });

  void it('generates user pool arn', () => {
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

  void it('generates identity pool arn', () => {
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

  void it('generates iam role arn', () => {
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

  void it('generates DynamoDB table arn', () => {
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

  void it('generates s3 bucket arn', () => {
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

  void it('generates lambda function arn', () => {
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
