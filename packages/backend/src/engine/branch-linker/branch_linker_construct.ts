import { Construct } from 'constructs';
import { BranchBackendIdentifier } from '@aws-amplify/platform-core';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime as LambdaRuntime } from 'aws-cdk-lib/aws-lambda';
import { CustomResource, Duration } from 'aws-cdk-lib';
import { fileURLToPath } from 'url';
import path from 'path';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { AmplifyBranchLinkerCustomResourceProps } from './lambda/branch_linker_types.js';
import * as iam from 'aws-cdk-lib/aws-iam';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
const resourcesRoot = path.normalize(path.join(dirname, 'lambda'));
const linkerLambdaFilePath = path.join(resourcesRoot, 'branch_linker.js');

/**
 * Type of the backend custom CFN resource.
 */
const LINKER_RESOURCE_TYPE = 'Custom::AmplifyBranchLinkerResource';

/**
 * Adds a custom resources that links and un-links branch deployments
 * to Amplify Console.
 */
export class AmplifyBranchLinkerConstruct extends Construct {
  /**
   * Creates Amplify Console linker construct.
   */
  constructor(scope: Construct, backendIdentifier: BranchBackendIdentifier) {
    super(scope, 'AmplifyBranchLinker');

    const linkerLambda = new NodejsFunction(this, 'CustomResourceLambda', {
      runtime: LambdaRuntime.NODEJS_18_X,
      timeout: Duration.seconds(10),
      entry: linkerLambdaFilePath,
      handler: 'handler',
    });

    linkerLambda.grantPrincipal.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['amplify:GetBranch', 'amplify:UpdateBranch'],
        resources: [
          `arn:aws:amplify:*:*:apps/${backendIdentifier.backendId}/branches/${backendIdentifier.disambiguator}`,
        ],
      })
    );

    const customResourceProvider = new Provider(
      this,
      'CustomResourceProvider',
      {
        onEventHandler: linkerLambda,
      }
    );

    const customResourceProps: AmplifyBranchLinkerCustomResourceProps = {
      backendId: backendIdentifier.backendId,
      branchName: backendIdentifier.disambiguator,
    };

    new CustomResource(this, 'CustomResource', {
      serviceToken: customResourceProvider.serviceToken,
      properties: customResourceProps,
      resourceType: LINKER_RESOURCE_TYPE,
    });
  }
}
