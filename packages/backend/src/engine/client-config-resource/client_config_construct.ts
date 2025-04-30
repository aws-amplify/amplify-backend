import { Construct } from 'constructs';
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime as LambdaRuntime } from 'aws-cdk-lib/aws-lambda';
import { CustomResource, Duration, Stack } from 'aws-cdk-lib';
import { fileURLToPath } from 'node:url';
import path from 'path';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { AmplifyClientConfigCustomResourceProps } from './lambda/client_config_resource_handler_types.js';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
const resourcesRoot = path.normalize(path.join(dirname, 'lambda'));
const linkerLambdaFilePath = path.join(
  resourcesRoot,
  'client_config_resource_handler.js',
);

/**
 * Type of the backend custom CFN resource.
 */
const RESOURCE_TYPE = 'Custom::AmplifyClientConfigResource';

/**
 * TODO
 */
export class AmplifyClientConfigConstruct extends Construct {
  /**
   * Creates Amplify Console linker construct.
   */
  constructor(scope: Construct, targetStack: Stack) {
    super(scope, 'AmplifyClientConfig');

    // I wasn't able to make this work...
    // It either complains about crypto (ESM)
    // or throws
    const lambda = new NodejsFunction(this, 'CustomResourceLambda', {
      runtime: LambdaRuntime.NODEJS_20_X,
      timeout: Duration.seconds(10),
      entry: linkerLambdaFilePath,
      handler: 'handler',
      memorySize: 1024,
      bundling: {
        externalModules: [],
        format: OutputFormat.ESM,
      },
    });

    // linkerLambda.grantPrincipal.addToPrincipalPolicy(
    //   new iam.PolicyStatement({
    //     effect: iam.Effect.ALLOW,
    //     actions: ['amplify:GetBranch', 'amplify:UpdateBranch'],
    //     resources: [
    //       `arn:aws:amplify:*:*:apps/${backendIdentifier.namespace}/branches/${backendIdentifier.name}`,
    //     ],
    //   }),
    // );

    const customResourceProvider = new Provider(
      this,
      'CustomResourceProvider',
      {
        onEventHandler: lambda,
      },
    );

    const customResourceProps: AmplifyClientConfigCustomResourceProps = {
      stackName: targetStack.stackName,
      stackId: targetStack.stackId,
      poke: Date.now(),
    };

    new CustomResource(this, 'CustomResource', {
      serviceToken: customResourceProvider.serviceToken,
      properties: customResourceProps,
      resourceType: RESOURCE_TYPE,
    });
  }
}
