import { describe, it } from 'node:test';
import assert from 'node:assert';
import { AWSClientProvider } from './index';
import { S3Client } from '@aws-sdk/client-s3';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { AmplifyClient } from '@aws-sdk/client-amplify';

void describe('awsClientProvider', () => {
  void it('defaults to using fromNodeProviderChain', () => {
    const actual = new AWSClientProvider();
    assert.ok(actual.getS3Client() instanceof S3Client);
    assert.ok(actual.getAmplifyClient() instanceof AmplifyClient);
    assert.ok(actual.getCloudFormationClient() instanceof CloudFormationClient);
  });
  void it('can use passed in credentials', () => {
    const actual = new AWSClientProvider({
      credentials: fromNodeProviderChain(),
    });
    assert.ok(actual.getS3Client() instanceof S3Client);
    assert.ok(actual.getAmplifyClient() instanceof AmplifyClient);
    assert.ok(actual.getCloudFormationClient() instanceof CloudFormationClient);
  });
  void it('can use passed in clients', () => {
    const s3Client = new S3Client();
    const amplifyClient = new AmplifyClient();
    const cloudformationClient = new CloudFormationClient();
    const actual = new AWSClientProvider({
      s3Client,
      amplifyClient,
      cloudformationClient,
    });
    assert.ok(actual.getS3Client() === s3Client);
    assert.ok(actual.getAmplifyClient() === amplifyClient);
    assert.ok(actual.getCloudFormationClient() === cloudformationClient);
  });
});
