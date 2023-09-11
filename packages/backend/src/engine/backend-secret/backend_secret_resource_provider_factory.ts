import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { UniqueBackendIdentifier } from '@aws-amplify/plugin-types';
import { Duration } from 'aws-cdk-lib';
import * as path from 'path';
import { Runtime as LambdaRuntime } from 'aws-cdk-lib/aws-lambda';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { fileURLToPath } from 'url';
import { Secret, SecretActionType } from '@aws-amplify/backend-secret';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
const resourcesRoot = path.normalize(path.join(dirname, 'resources'));
const backendSecretLambdaFilePath = path.join(
  resourcesRoot,
  'backend_secret.lambda.js'
);

/**
 * The factory to create backend secret resource.
 */
export class BackendSecretResourceProviderFactory {
  /**
   * Creates a secret resource provider factory.
   */
  constructor(private readonly secretClient: Secret) {}

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
      timeout: Duration.minutes(10),
      entry: backendSecretLambdaFilePath,
      handler: 'handler',
    });

    secretLambda.role?.addToPrincipalPolicy(
      this.secretClient.getIAMPolicyStatement(backendIdentifier, [
        SecretActionType.GET,
      ])
    );

    return new Provider(scope, providerId, {
      onEventHandler: secretLambda,
    });
  };
}
