import { BackendParameter } from '@aws-amplify/plugin-types';
import { Construct } from 'constructs';
import { custom_resources, SecretValue } from 'aws-cdk-lib';

/**
 * Resolves a backend parameter by creating a custom CFN resource to fetch values from ParameterStore
 */
export class SSMBackendParameter implements BackendParameter {
  /**
   * The name and version of the parameter to fetch
   */
  constructor(private readonly name: string, private readonly version = 1) {}
  /**
   * Get a reference to the value within a CDK scope
   */
  resolve(
    scope: Construct,
    backendId: string,
    branchName: string
  ): SecretValue {
    // TODO: Implement actual a lambda custom resource to handle secret
    // inheritance/override for CI/CD.
    // https://github.com/aws-amplify/samsara-cli/issues/155
    const parameterFetcher = new custom_resources.AwsCustomResource(
      scope,
      `${this.name}Fetcher`,
      {
        // also called on create event
        onUpdate: {
          service: 'SSM',
          action: 'getParameter',
          parameters: {
            Name: `/amplify/${backendId}/${branchName}/${this.name}`,
            WithDecryption: true,
          },
          physicalResourceId: custom_resources.PhysicalResourceId.of(
            Date.now().toString()
          ),
        },
        policy: custom_resources.AwsCustomResourcePolicy.fromSdkCalls({
          resources: custom_resources.AwsCustomResourcePolicy.ANY_RESOURCE,
        }),
      }
    );
    // this is not actually unsafe in this case because the "plaintext" here is a CFN token to a parameter store value
    return SecretValue.unsafePlainText(
      parameterFetcher.getResponseField('Parameter.Value')
    );
  }
}
