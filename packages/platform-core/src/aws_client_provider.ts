import { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import { S3Client } from '@aws-sdk/client-s3';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';

export type AWSClientsOverrideClientOptions = {
  s3Client: S3Client;
  amplifyClient: AmplifyClient;
  cloudformationClient: CloudFormationClient;
};

export type AWSClientsCredentialsOptions = {
  credentials: AwsCredentialIdentityProvider;
};

export type AWSClientsOptions =
  | AWSClientsOverrideClientOptions
  | AWSClientsCredentialsOptions;

/**
 * Instantiates AWSClientProvider
 */
export class AWSClientProvider {
  private readonly s3Client: S3Client | undefined;
  private readonly amplifyClient: AmplifyClient | undefined;
  private readonly cloudformationClient: CloudFormationClient | undefined;
  private readonly credentials: AwsCredentialIdentityProvider | undefined;

  /**
   * Instantiates AWSClientProvider
   */
  constructor(awsClientOptions?: AWSClientsOptions) {
    this.s3Client =
      awsClientOptions && 's3Client' in awsClientOptions
        ? awsClientOptions.s3Client
        : undefined;
    this.amplifyClient =
      awsClientOptions && 'amplifyClient' in awsClientOptions
        ? awsClientOptions.amplifyClient
        : undefined;
    this.cloudformationClient =
      awsClientOptions && 'cloudformationClient' in awsClientOptions
        ? awsClientOptions.cloudformationClient
        : undefined;
    this.credentials =
      awsClientOptions && 'credentials' in awsClientOptions
        ? awsClientOptions.credentials
        : undefined;
  }

  /**
   * Provides an s3Client
   */
  getS3Client() {
    if (this.s3Client) return this.s3Client;
    if (this.credentials)
      return new S3Client({ credentials: this.credentials });
    return new S3Client({ credentials: fromNodeProviderChain() });
  }

  /**
   * Provides an amplifyClient
   */
  getAmplifyClient() {
    if (this.amplifyClient) return this.amplifyClient;
    if (this.credentials)
      return new AmplifyClient({ credentials: this.credentials });
    return new AmplifyClient({ credentials: fromNodeProviderChain() });
  }

  /**
   * Provides an cloudformationClient
   */
  getCloudFormationClient() {
    if (this.cloudformationClient) return this.cloudformationClient;
    if (this.credentials)
      return new CloudFormationClient({ credentials: this.credentials });
    return new CloudFormationClient({ credentials: fromNodeProviderChain() });
  }
}
