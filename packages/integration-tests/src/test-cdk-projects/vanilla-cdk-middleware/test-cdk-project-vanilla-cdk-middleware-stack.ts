/* eslint-disable no-restricted-syntax */
import * as cdk from 'aws-cdk-lib';
import * as path from 'path';
import { Construct } from 'constructs';
import {
  AmplifyHostingConstruct,
  AmplifyHostingConstructProps,
  DeployManifest,
} from '@aws-amplify/hosting';

/**
 * CDK stack that deploys a hosting construct WITH middleware.
 *
 * Middleware redirects /protected → /login when no auth-token cookie is present.
 * Used by the e2e test to verify Lambda@Edge middleware works at the CDN level.
 */
export class TestCdkProjectVanillaCdkMiddlewareStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, scope.node.getContext('test-stack-name') ?? id, props);

    const staticDir = path.join(__dirname, 'static-assets');
    const serverBundleDir = path.join(__dirname, 'server-bundle');
    const middlewareBundleDir = path.join(__dirname, 'middleware-bundle');

    const manifest: DeployManifest = {
      version: 1,
      compute: {
        default: {
          type: 'handler',
          bundle: serverBundleDir,
          handler: 'index.handler',
          placement: 'regional',
          streaming: true,
          runtime: 'nodejs20.x',
        },
      },
      staticAssets: { directory: staticDir },
      routes: [
        { pattern: '/_next/static/*', target: 'static' },
        { pattern: '/*', target: 'default' },
      ],
      middleware: {
        bundle: middlewareBundleDir,
        handler: 'index.handler',
        matchers: ['/*'],
      },
      buildId: 'middleware-e2e-1',
    };

    const constructProps: AmplifyHostingConstructProps = {
      manifest,
      skipRegionValidation: true,
    };

    const hosting = new AmplifyHostingConstruct(
      this,
      'Hosting',
      constructProps,
    );

    new cdk.CfnOutput(this, 'DistributionUrl', {
      value: hosting.distributionUrl,
      description: 'CloudFront distribution URL for middleware e2e test',
    });
  }
}
