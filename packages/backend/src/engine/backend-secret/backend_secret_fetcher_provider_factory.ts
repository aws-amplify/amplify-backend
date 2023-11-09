import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Duration } from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';
import { Runtime as LambdaRuntime } from 'aws-cdk-lib/aws-lambda';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { fileURLToPath } from 'url';
import { BackendIdentifier } from '@aws-amplify/plugin-types';

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
   * Returns a resource provider if it exists in the input scope. Otherwise,
   * creates a new provider.
   */
  getOrCreateInstance = (
    scope: Construct,
    providerId: string,
    backendIdentifier: BackendIdentifier
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

    secretLambda.grantPrincipal.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['ssm:GetParameter'],
        resources: [
          `arn:aws:ssm:*:*:parameter/amplify/${backendIdentifier.namespace}/${backendIdentifier.name}/*`,
          `arn:aws:ssm:*:*:parameter/amplify/shared/${backendIdentifier.namespace}/*`,
        ],
      })
    );

    return new Provider(scope, providerId, {
      onEventHandler: secretLambda,
    });
  };
}
