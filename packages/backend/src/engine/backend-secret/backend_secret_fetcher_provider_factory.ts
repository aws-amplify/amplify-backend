import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { UniqueBackendIdentifier } from '@aws-amplify/platform-core';
import { Duration } from 'aws-cdk-lib';
import * as path from 'path';
import { Runtime as LambdaRuntime } from 'aws-cdk-lib/aws-lambda';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { fileURLToPath } from 'url';
import { SecretClient } from '@aws-amplify/backend-secret';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
const resourcesRoot = path.normalize(path.join(dirname, 'lambda'));
const backendSecretLambdaFilePath = path.join(
  resourcesRoot,
  'backend_secret_fetcher.js'
);

/**
 * The factory to create secret-fetcher provider.
 */
export class BackendSecretFetcherProviderFactory {
  /**
   * Creates a secret-fetcher provider factory.
   */
  constructor(private readonly secretClient: SecretClient) {}

  /**
   * Returns a resource provider if it exists in the input scope. Otherwise,
   * creates a new provider.
   */
  getOrCreateInstance = (
    scope: Construct,
    providerId: string,
    backendIdentifier: UniqueBackendIdentifier
  ) => {
    const provider = scope.node.tryFindChild(providerId) as Provider;
    if (provider) {
      return provider;
    }

    const secretLambda = new NodejsFunction(scope, `${providerId}Lambda`, {
      runtime: LambdaRuntime.NODEJS_18_X,
      timeout: Duration.seconds(10),
      entry: backendSecretLambdaFilePath,
      handler: 'handler',
    });

    this.secretClient.grantPermission(secretLambda, backendIdentifier, ['GET']);

    return new Provider(scope, providerId, {
      onEventHandler: secretLambda,
    });
  };
}
