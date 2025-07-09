import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  type ResourceWithFriendlyName,
  canProvideConsoleLink,
  getAwsConsoleUrl,
  isGlobalService,
} from './resource_console_functions.js';

// Test resources
const testResources: ResourceWithFriendlyName[] = [
  {
    logicalResourceId: 'amplifyLambdaFunction123ABC45',
    physicalResourceId: 'test-lambda-function',
    resourceType: 'AWS::Lambda::Function',
    resourceStatus: 'DEPLOYED',
    friendlyName: 'Lambda Function',
  },
  {
    logicalResourceId: 'amplifyDynamoDBTable123ABC45',
    physicalResourceId: 'test-table',
    resourceType: 'AWS::DynamoDB::Table',
    resourceStatus: 'DEPLOYED',
    friendlyName: 'DynamoDB Table',
  },
  {
    logicalResourceId: 'amplifyS3Bucket123ABC45',
    physicalResourceId: 'test-bucket',
    resourceType: 'AWS::S3::Bucket',
    resourceStatus: 'DEPLOYED',
    friendlyName: 'S3 Bucket',
  },
  {
    logicalResourceId: 'amplifyIAMRole123ABC45',
    physicalResourceId: 'test-role',
    resourceType: 'AWS::IAM::Role',
    resourceStatus: 'DEPLOYED',
    friendlyName: 'IAM Role',
  },
  {
    logicalResourceId: 'amplifyUnsupportedResource123ABC45',
    physicalResourceId: 'test-unsupported',
    resourceType: 'AWS::Unsupported::Type',
    resourceStatus: 'DEPLOYED',
    friendlyName: 'Unsupported Resource',
  },
  {
    logicalResourceId: 'amplifyFailedResource123ABC45',
    physicalResourceId: 'test-failed',
    resourceType: 'AWS::IAM::Role',
    resourceStatus: 'FAILED',
    friendlyName: 'Failed Resource',
  },
];

void describe('canProvideConsoleLink function', () => {
  void it('returns true for supported resource types with DEPLOYED status', () => {
    assert.strictEqual(
      canProvideConsoleLink('AWS::Lambda::Function', 'DEPLOYED'),
      true,
    );
    assert.strictEqual(
      canProvideConsoleLink('AWS::S3::Bucket', 'DEPLOYED'),
      true,
    );
    assert.strictEqual(
      canProvideConsoleLink('AWS::IAM::Role', 'DEPLOYED'),
      true,
    );
  });

  void it('returns false for unsupported resource types', () => {
    assert.strictEqual(
      canProvideConsoleLink('AWS::Unsupported::Type', 'DEPLOYED'),
      false,
    );
  });

  void it('returns false for non-deployed resources', () => {
    assert.strictEqual(
      canProvideConsoleLink('AWS::Lambda::Function', 'CREATE_IN_PROGRESS'),
      false,
    );
    assert.strictEqual(
      canProvideConsoleLink('AWS::Lambda::Function', 'DELETED'),
      false,
    );
  });

  void it('handles all supported resource types', () => {
    const supportedTypes = [
      'AWS::Lambda::Function',
      'AWS::Lambda::LayerVersion',
      'AWS::S3::Bucket',
      'AWS::IAM::Role',
      'AWS::Cognito::UserPool',
      'AWS::Cognito::UserPoolGroup',
      'AWS::Cognito::IdentityPool',
      'AWS::AppSync::GraphQLApi',
      'AWS::AppSync::DataSource',
      'AWS::AppSync::FunctionConfiguration',
      'AWS::AppSync::Resolver',
      'AWS::AppSync::ApiKey',
      'AWS::StepFunctions::StateMachine',
      'Custom::AmplifyDynamoDBTable',
    ];

    for (const resourceType of supportedTypes) {
      assert.strictEqual(
        canProvideConsoleLink(resourceType, 'DEPLOYED'),
        true,
        `Expected ${resourceType} to be supported`,
      );
    }
  });

  void it('returns false for commented out resource types', () => {
    const commentedOutTypes = [
      'AWS::DynamoDB::Table',
      'AWS::ApiGateway::RestApi',
      'AWS::CloudWatch::Alarm',
      'AWS::SecretsManager::Secret',
      'AWS::Logs::LogGroup',
    ];

    for (const resourceType of commentedOutTypes) {
      assert.strictEqual(
        canProvideConsoleLink(resourceType, 'DEPLOYED'),
        false,
        `Expected ${resourceType} to be unsupported`,
      );
    }
  });
});

void describe('isGlobalService function', () => {
  void it('returns true for IAM service', () => {
    assert.strictEqual(isGlobalService('iam'), true);
  });

  void it('returns true for CloudFront service', () => {
    // eslint-disable-next-line spellcheck/spell-checker
    assert.strictEqual(isGlobalService('cloudfront'), true);
  });

  void it('returns true for Route53 service', () => {
    assert.strictEqual(isGlobalService('route53'), true);
  });

  void it('returns false for regional services', () => {
    assert.strictEqual(isGlobalService('lambda'), false);
    assert.strictEqual(isGlobalService('dynamodb'), false);
    assert.strictEqual(isGlobalService('s3'), false);
  });

  void it('handles case insensitivity', () => {
    assert.strictEqual(isGlobalService('IAM'), true);
    assert.strictEqual(isGlobalService('CloudFront'), true);
    assert.strictEqual(isGlobalService('Route53'), true);
  });

  void it('handles empty string', () => {
    assert.strictEqual(isGlobalService(''), false);
  });

  void it('handles undefined service', () => {
    assert.strictEqual(isGlobalService(undefined as unknown as string), false);
  });
});

void describe('getAwsConsoleUrl function', () => {
  const testRegion = 'us-west-2';

  void it('returns null when region is not available', () => {
    assert.strictEqual(getAwsConsoleUrl(testResources[0], null), null);
  });

  void it('returns null when physical ID is not available', () => {
    const resourceWithoutPhysicalId = {
      ...testResources[0],
      physicalResourceId: '',
    };
    assert.strictEqual(
      getAwsConsoleUrl(resourceWithoutPhysicalId, testRegion),
      null,
    );
  });

  void it('returns null for unsupported resource types', () => {
    assert.strictEqual(getAwsConsoleUrl(testResources[4], testRegion), null);
  });

  void it('generates correct URL for Lambda function', () => {
    const url = getAwsConsoleUrl(testResources[0], testRegion);
    assert.strictEqual(
      url,
      `https://${testRegion}.console.aws.amazon.com/lambda/home?region=${testRegion}#/functions/test-lambda-function`,
    );
  });

  void it('generates correct URL for S3 bucket', () => {
    const url = getAwsConsoleUrl(testResources[2], testRegion);
    assert.strictEqual(
      url,
      `https://${testRegion}.console.aws.amazon.com/s3/buckets/test-bucket?region=${testRegion}`,
    );
  });

  void it('generates correct URL for IAM role (global service)', () => {
    const url = getAwsConsoleUrl(testResources[3], testRegion);
    assert.strictEqual(
      url,
      `https://${testRegion}.console.aws.amazon.com/iam/home#/roles/details/test-role?section=permissions`,
    );
  });

  void it('extracts function name from ARN for Lambda resources', () => {
    const lambdaWithArn = {
      ...testResources[0],
      physicalResourceId:
        'arn:aws:lambda:us-west-2:123456789012:function:my-function',
    };
    const url = getAwsConsoleUrl(lambdaWithArn, testRegion);
    assert.strictEqual(
      url,
      `https://${testRegion}.console.aws.amazon.com/lambda/home?region=${testRegion}#/functions/my-function`,
    );
  });

  void it('extracts user pool ID from ARN for Cognito resources', () => {
    const cognitoResource = {
      logicalResourceId: 'amplifyUserPool123ABC45',
      physicalResourceId:
        'arn:aws:cognito-idp:us-west-2:123456789012:userpool/us-west-2_hello',
      resourceType: 'AWS::Cognito::UserPool',
      resourceStatus: 'DEPLOYED',
      friendlyName: 'User Pool',
    };
    const url = getAwsConsoleUrl(cognitoResource, testRegion);
    assert.strictEqual(
      url,
      `https://${testRegion}.console.aws.amazon.com/cognito/v2/idp/user-pools/us-west-2_hello/users?region=${testRegion}`,
    );
  });

  void it('handles resources with special characters in physical ID', () => {
    const resourceWithSpecialChars = {
      ...testResources[2],
      physicalResourceId: 'my-bucket-with-special/chars+and&symbols',
    };
    const url = getAwsConsoleUrl(resourceWithSpecialChars, testRegion);
    assert.strictEqual(
      url,
      `https://${testRegion}.console.aws.amazon.com/s3/buckets/${encodeURIComponent('my-bucket-with-special/chars+and&symbols')}?region=${testRegion}`,
    );
  });

  void it('returns null for resources with non-DEPLOYED status', () => {
    const url = getAwsConsoleUrl(testResources[5], testRegion);
    assert.strictEqual(url, null);
  });
});
