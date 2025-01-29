import { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import { DeployedBackendIdentifier } from './index.js';
import { DefaultBackendOutputClient } from './backend_output_client.js';
import { UnifiedBackendOutput } from '@aws-amplify/backend-output-schemas';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import { AWSClientProvider } from '@aws-amplify/plugin-types';

export enum BackendOutputClientErrorType {
  METADATA_RETRIEVAL_ERROR = 'MetadataRetrievalError',
  NO_OUTPUTS_FOUND = 'NoOutputsFound',
  DEPLOYMENT_IN_PROGRESS = 'DeploymentInProgress',
  NO_STACK_FOUND = 'NoStackFound',
  CREDENTIALS_ERROR = 'CredentialsError',
  ACCESS_DENIED = 'AccessDenied',
  NO_APP_FOUND_ERROR = 'NoAppFoundError',
}
/**
 * Error type for BackendOutputClientError
 */
export class BackendOutputClientError extends Error {
  public code: BackendOutputClientErrorType;

  /**
   * Constructor for BackendOutputClientError
   */
  constructor(
    code: BackendOutputClientErrorType,
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.code = code;
  }

  /**
   * This function is a type predicate for BackendOutputClientError.
   * See https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates.
   *
   * Checks if error is an BackendOutputClientError by inspecting if required properties are set.
   * This is recommended instead of instanceof operator.
   * The instance of operator does not work as expected if BackendOutputClientError class is loaded
   * from multiple sources, for example when package manager decides to not de-duplicate dependencies.
   * See https://github.com/nodejs/node/issues/17943.
   */
  static isBackendOutputClientError = (
    error: unknown
  ): error is BackendOutputClientError => {
    return (
      error instanceof Error &&
      'code' in error &&
      typeof error.code === 'string' &&
      (Object.values(BackendOutputClientErrorType) as unknown[]).includes(
        error.code
      ) &&
      typeof error.message === 'string'
    );
  };
}

/**
 * Defines BackendOutputClient
 */
export type BackendOutputClient = {
  readonly getOutput: (
    backendIdentifier: DeployedBackendIdentifier
  ) => Promise<UnifiedBackendOutput>;
};

export type BackendOutputClientOptions = {
  cloudFormationClient: CloudFormationClient;
  amplifyClient: AmplifyClient;
};

export type BackendOutputCredentialsOptions = {
  credentials: AwsCredentialIdentityProvider;
};

export type BackendOutputClientFactoryOptions =
  | BackendOutputClientOptions
  | BackendOutputCredentialsOptions;
/**
 * Factory to create a backend metadata reader
 */
export class BackendOutputClientFactory {
  /**
   * Returns a single instance of BackendOutputClient
   */
  static getInstance = (
    awsClientProvider?: AWSClientProvider<{
      getAmplifyClient: AmplifyClient;
      getCloudFormationClient: CloudFormationClient;
    }>
  ): BackendOutputClient => {
    return new DefaultBackendOutputClient(
      awsClientProvider?.getCloudFormationClient() ??
        new CloudFormationClient(),
      awsClientProvider?.getAmplifyClient() ?? new AmplifyClient()
    );
  };
}
