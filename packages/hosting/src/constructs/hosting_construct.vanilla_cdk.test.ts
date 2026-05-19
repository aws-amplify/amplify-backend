import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { AmplifyHostingConstruct } from './hosting_construct.js';
import { DeployManifest } from '../manifest/types.js';

/**
 * These tests verify the construct works when used directly in vanilla CDK
 * (outside the Amplify backend system). This is the primary usage pattern for
 * kit-core (StarterKit) and any CDK user importing the construct directly.
 */
void describe('AmplifyHostingConstruct — vanilla CDK usage', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'hosting-vanilla-cdk-test-'),
    );
    fs.writeFileSync(path.join(tmpDir, 'index.html'), '<html></html>');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  void it('works as a standalone L3 construct in a regular CDK stack', () => {
    const app = new App();
    const stack = new Stack(app, 'MyStack');

    const manifest: DeployManifest = {
      version: 1,
      compute: {},
      staticAssets: { directory: tmpDir },
      routes: [{ pattern: '/*', target: 'static' }],
      buildId: 'vanilla-1',
    };

    const hosting = new AmplifyHostingConstruct(stack, 'Hosting', { manifest });

    assert.ok(hosting.bucket);
    assert.ok(hosting.distribution);
    assert.ok(hosting.distributionUrl);

    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::CloudFront::Distribution', 1);
    template.resourceCountIs('AWS::S3::Bucket', 1);
  });

  void it('works with SSR compute in a vanilla CDK stack', () => {
    const app = new App();
    const stack = new Stack(app, 'MyStack');
    const bundleDir = path.join(tmpDir, 'bundle');
    fs.mkdirSync(bundleDir, { recursive: true });
    fs.writeFileSync(
      path.join(bundleDir, 'index.mjs'),
      'export const handler = async () => {};',
    );

    const manifest: DeployManifest = {
      version: 1,
      compute: {
        default: {
          type: 'handler',
          bundle: bundleDir,
          handler: 'index.handler',
          placement: 'regional',
          streaming: true,
        },
      },
      staticAssets: { directory: tmpDir },
      routes: [
        { pattern: '/_next/static/*', target: 'static' },
        { pattern: '/*', target: 'default' },
      ],
      buildId: 'vanilla-ssr-1',
    };

    const hosting = new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest,
      skipRegionValidation: true,
    });

    assert.ok(hosting.computeFunctions.has('default'));
    assert.ok(hosting.computeFunctionUrls.has('default'));

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::Lambda::Function', {
      Handler: 'index.handler',
    });
    template.hasResourceProperties('AWS::Lambda::Url', {
      AuthType: 'AWS_IAM',
    });
  });

  void it('provisions cache infrastructure in vanilla CDK', () => {
    const app = new App();
    const stack = new Stack(app, 'MyStack');
    const bundleDir = path.join(tmpDir, 'bundle');
    fs.mkdirSync(bundleDir, { recursive: true });
    fs.writeFileSync(
      path.join(bundleDir, 'index.mjs'),
      'export const handler = async () => {};',
    );

    const manifest: DeployManifest = {
      version: 1,
      compute: {
        default: {
          type: 'handler',
          bundle: bundleDir,
          handler: 'index.handler',
          placement: 'regional',
        },
      },
      staticAssets: { directory: tmpDir },
      routes: [{ pattern: '/*', target: 'default' }],
      cache: {
        computeResource: 'default',
        tagRevalidation: true,
        revalidationQueue: true,
      },
      buildId: 'vanilla-cache-1',
    };

    const hosting = new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest,
      skipRegionValidation: true,
    });

    assert.ok(hosting.cacheBucket);
    assert.ok(hosting.cacheTable);
    assert.ok(hosting.revalidationQueue);

    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::DynamoDB::Table', 1);
    template.resourceCountIs('AWS::SQS::Queue', 2);
  });
});
