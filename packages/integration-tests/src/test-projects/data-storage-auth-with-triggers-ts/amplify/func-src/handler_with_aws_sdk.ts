// Import handful of SDKs we're using in tests.
import {
  BedrockRuntimeClient,
  ConverseCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { CognitoIdentityClient } from '@aws-sdk/client-cognito-identity';
import { IAMClient } from '@aws-sdk/client-iam';
import { S3Client } from '@aws-sdk/client-s3';

/**
 * This function asserts that customer can import and use AWS SDK packages.
 * I.e. asserts that the bundling AWS SDK does break functions.
 */
export const handler = async () => {
  new BedrockRuntimeClient();
  new ConverseCommand({
    messages: [],
    modelId: 'testModel',
  });
  new CloudFormationClient();
  new CognitoIdentityClient();
  new IAMClient();
  new S3Client();
  return 'It is working';
};
