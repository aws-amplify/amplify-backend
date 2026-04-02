/* eslint-disable no-restricted-syntax */
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  AmplifyHostingConstruct,
  AmplifyHostingConstructProps,
} from '@aws-amplify/hosting';
import { getAdapter } from '@aws-amplify/hosting/adapters';
import path from 'path';

/**
 * Vanilla CDK stack that uses AmplifyHostingConstruct directly for SPA hosting.
 * This proves the construct works in a pure CDK app — no Amplify CLI, no defineHosting().
 */
export class TestCdkProjectVanillaCdkSpaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, scope.node.getContext('test-stack-name'), props);

    const projectDir = process.cwd();
    const buildOutputDir = path.join(projectDir, 'static-site');

    // Use the SPA adapter directly to generate the deploy manifest
    const adapter = getAdapter('spa');
    const manifest = adapter(buildOutputDir, projectDir);

    // The adapter writes to .amplify-hosting/static/ — point the construct there
    const hostingDir = path.join(projectDir, '.amplify-hosting');
    const staticAssetPath = path.join(hostingDir, 'static');

    const constructProps: AmplifyHostingConstructProps = {
      manifest,
      staticAssetPath,
    };

    const hosting = new AmplifyHostingConstruct(
      this,
      'Hosting',
      constructProps,
    );

    new cdk.CfnOutput(this, 'DistributionUrl', {
      value: hosting.distributionUrl,
      description: 'CloudFront distribution URL for the vanilla CDK SPA',
    });
  }
}
