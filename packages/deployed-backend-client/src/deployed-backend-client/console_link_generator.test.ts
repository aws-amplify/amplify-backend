import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ConsoleLinkGenerator } from './console_link_generator.js';

void describe('console link generator', () => {
  const mockResourceSummaryBase = {
    PhysicalResourceId: 'MOCK_PhysicalResourceId',
    LogicalResourceId:
      'arn:aws:{service}:{region}:{account}:stack/apiStack/{additionalFields}',
    ResourceStatus: 'CREATE_COMPLETE',
    ResourceStatusReason: undefined,
    LastUpdatedTimestamp: new Date(1),
  };
  const consoleLinkGenerator = new ConsoleLinkGenerator();

  void it('skips unsupported resources', async () => {
    const link = consoleLinkGenerator.generateLink(
      {
        ...mockResourceSummaryBase,
        ResourceType: 'AWS::UNSUPPORTED_RESOURCE::UNSUPPORTED_RESOURCE',
      },
      'us-east-1'
    );

    assert.equal(link, undefined);
  });

  void it('generates user pool link', async () => {
    const link = consoleLinkGenerator.generateLink(
      {
        ...mockResourceSummaryBase,
        ResourceType: 'AWS::Cognito::UserPool',
      },
      'us-east-1'
    );

    assert.equal(
      link,
      'https://us-east-1.console.aws.amazon.com/cognito/v2/idp/user-pools/MOCK_PhysicalResourceId/users?region=us-east-1'
    );
  });

  void it('generates identity pool link', async () => {
    const link = consoleLinkGenerator.generateLink(
      {
        ...mockResourceSummaryBase,
        ResourceType: 'AWS::Cognito::IdentityPool',
      },
      'us-east-1'
    );

    assert.equal(
      link,
      'https://us-east-1.console.aws.amazon.com/cognito/v2/identity/identity-pools/MOCK_PhysicalResourceId/user-statistics?region=us-east-1'
    );
  });

  void it('generates iam role link', async () => {
    const link = consoleLinkGenerator.generateLink(
      {
        ...mockResourceSummaryBase,
        ResourceType: 'AWS::IAM::Role',
      },
      'us-east-1'
    );

    assert.equal(
      link,
      'https://us-east-1.console.aws.amazon.com/iamv2/home?region=us-east-1#/roles/details/MOCK_PhysicalResourceId?section=permissions'
    );
  });

  void it('generates DynamoDB table link', async () => {
    const link = consoleLinkGenerator.generateLink(
      {
        ...mockResourceSummaryBase,
        ResourceType: 'AWS::DynamoDB::Table',
      },
      'us-east-1'
    );

    assert.equal(
      link,
      'https://us-east-1.console.aws.amazon.com/dynamodbv2/home?region=us-east-1#table?name=MOCK_PhysicalResourceId'
    );
  });

  void it('generates s3 bucket link', async () => {
    const link = consoleLinkGenerator.generateLink(
      {
        ...mockResourceSummaryBase,
        ResourceType: 'AWS::S3::Bucket',
      },
      'us-east-1'
    );

    assert.equal(
      link,
      'https://us-east-1.console.aws.amazon.com/s3/home?region=us-east-1&bucket=MOCK_PhysicalResourceId'
    );
  });

  void it('generates lambda function link', async () => {
    const link = consoleLinkGenerator.generateLink(
      {
        ...mockResourceSummaryBase,
        ResourceType: 'AWS::Lambda::Function',
      },
      'us-east-1'
    );

    assert.equal(
      link,
      'https://us-east-1.console.aws.amazon.com/lambda/home?region=us-east-1#functions/MOCK_PhysicalResourceId'
    );
  });
});
