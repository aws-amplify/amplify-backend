import { BackendParameter } from '@aws-amplify/plugin-types';
import { Construct } from 'constructs';
import { CustomResource, SecretValue, Duration } from 'aws-cdk-lib';
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
const backendParameterLambdaFilePath = path.join(
  resourcesRoot,
  'backend_parameter.lambda.js'
);

/**
 * Resolves a backend parameter by creating a custom CFN resource to fetch values from ParameterStore
 */
export class BackendParameterImpl implements BackendParameter {
  /**
   * The name and version of the parameter to fetch
   */
  constructor(private readonly name: string) {}
  /**
   * Get a reference to the value within a CDK scope
   */
  resolve(
    scope: Construct,
    backendId: string,
    branchName: string
  ): SecretValue {
    const paramCustomResourceId = `${this.name}ParameterFetcherResouce`;

    // If there is already a custom resource to fetch this parameter, reuse it.
    const existingResource = scope.node.tryFindChild(
      paramCustomResourceId
    ) as CustomResource;
    if (existingResource) {
      const val = existingResource.getAtt('paramValue').toString();
      return SecretValue.unsafePlainText(val); // not unsafe since 'val' is a cdk token.
    }

    const parameterFunc = new NodejsFunction(
      scope,
      `${this.name}ParameterFetcher`,
      {
        runtime: LambdaRuntime.NODEJS_18_X,
        timeout: Duration.minutes(10),
        entry: backendParameterLambdaFilePath,
        handler: 'handler',
      }
    );

    parameterFunc.role?.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['ssm:GetParameter'],
        resources: ['*'],
      })
    );

    const provider = new Provider(
      scope,
      `${this.name}ParameterFetcherResouceProvider`,
      {
        onEventHandler: parameterFunc,
      }
    );

    const parameterResource = new CustomResource(scope, paramCustomResourceId, {
      serviceToken: provider.serviceToken,
      properties: {
        backendId,
        branchName,
        parameterName: this.name,
        noop: uuidv4(), // just so it can be triggered on every deployment.
      },
      resourceType: `Custom::ParameterFetcherResouce`,
    });

    const val = parameterResource.getAtt('paramValue').toString();
    return SecretValue.unsafePlainText(val); // not unsafe since 'val' is a cdk token.
  }
}
