/* eslint-disable no-restricted-syntax */
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  AmplifyHostingConstruct,
  AmplifyHostingConstructProps,
} from '@aws-amplify/hosting';
import { getAdapter } from '@aws-amplify/hosting/adapters';

/**
 * Vanilla CDK stack that uses AmplifyHostingConstruct directly for SSR hosting.
 * This proves the construct works in a pure CDK app — no Amplify CLI, no defineHosting().
 */
export class TestCdkProjectVanillaCdkSsrStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, scope.node.getContext('test-stack-name'), props);

    const projectDir = process.cwd();

    // Use the Next.js adapter to generate the deploy manifest from .open-next/ output
    const adapter = getAdapter('nextjs');
    const manifest = adapter(projectDir);

    const constructProps: AmplifyHostingConstructProps = {
      manifest,
    };

    const hosting = new AmplifyHostingConstruct(
      this,
      'Hosting',
      constructProps,
    );

    new cdk.CfnOutput(this, 'DistributionUrl', {
      value: hosting.distributionUrl,
      description: 'CloudFront distribution URL for the vanilla CDK SSR app',
    });
  }
}
