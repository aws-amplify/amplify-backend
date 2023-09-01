import {
  BackendSecret,
  UniqueBackendIdentifier,
} from '@aws-amplify/plugin-types';
import { Construct } from 'constructs';
import { CustomResource, Duration, SecretValue } from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime as LambdaRuntime } from 'aws-cdk-lib/aws-lambda';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { fileURLToPath } from 'url';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
const resourcesRoot = path.normalize(path.join(dirname, 'resources'));
const backendSecretLambdaFilePath = path.join(
  resourcesRoot,
  'backend_secret.lambda.js'
);

const secretFetcherResourceProviderId = 'SecretFetcherResourceProvider';
const secretFetcherLambdaId = 'SecretFetcherLambda';

/**
 * Resolves a backend secret to a CFN token via a lambda-backed CFN custom resource.
 */
export class CfnTokenBackendSecret implements BackendSecret {
  /**
   * The name of the secret to fetch.
   */
  constructor(private readonly name: string) {}
  /**
   * Get a reference to the value within a CDK scope.
   */
  resolve = (
    scope: Construct,
    uniqueBackendIdentifier: UniqueBackendIdentifier
  ): SecretValue => {
    const secretCustomResourceId = `${this.name}SecretFetcherResource`;

    // If there is already a custom resource to fetch this specific secret, reuse it.
    const existingResource = scope.node.tryFindChild(
      secretCustomResourceId
    ) as CustomResource;

    if (existingResource) {
      const val = existingResource.getAtt('secretValue').toString();
      return SecretValue.unsafePlainText(val); // not unsafe since 'val' is a cdk token.
    }

    const provider = this.findOrCreateResourceProvider(scope);
    const secretResource = new CustomResource(scope, secretCustomResourceId, {
      serviceToken: provider.serviceToken,
      properties: {
        backendId: uniqueBackendIdentifier.backendId,
        branchName: uniqueBackendIdentifier.branchName,
        secretName: this.name,
        noop: uuidv4(), // just so it can be triggered on every deployment.
      },
      resourceType: `Custom::SecretFetcherResource`,
    });

    const val = secretResource.getAtt('secretValue').toString();
    return SecretValue.unsafePlainText(val); // not unsafe since 'val' is a cdk token.
  };

  /**
   * If there is already resource provider for secret, returns it. Else, creates one with a
   * lambda-backend custom resource handler.
   */
  findOrCreateResourceProvider = (scope: Construct): Provider => {
    const provider = scope.node.tryFindChild(
      secretFetcherResourceProviderId
    ) as Provider;

    if (provider) {
      return provider;
    }

    const secretLambda = new NodejsFunction(scope, secretFetcherLambdaId, {
      runtime: LambdaRuntime.NODEJS_18_X,
      timeout: Duration.minutes(10),
      entry: backendSecretLambdaFilePath,
      handler: 'handler',
    });

    secretLambda.role?.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['ssm:GetParameter'],
        resources: ['*'],
      })
    );

    return new Provider(scope, secretFetcherResourceProviderId, {
      onEventHandler: secretLambda,
    });
  };
}
