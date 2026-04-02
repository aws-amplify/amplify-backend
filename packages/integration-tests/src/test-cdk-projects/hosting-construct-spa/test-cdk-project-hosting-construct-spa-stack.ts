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
 * CDK stack that uses AmplifyHostingConstruct directly (no defineHosting/ampx).
 * This proves the construct works as a standalone L3 for SPA hosting.
 *
 * Usage:
 *   cdk deploy --app "npx tsx bin/app.ts" --require-approval never
 */
export class TestCdkProjectHostingConstructSpaStack extends cdk.Stack {
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
      description: 'CloudFront distribution URL for the SPA',
    });
  }
}
