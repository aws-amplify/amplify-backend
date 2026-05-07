import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import { AmplifyHostingConstruct } from './hosting_construct.js';
import { DeployManifest } from '../manifest/types.js';

// ---- Test helpers ----

const createStack = (): Stack => {
  const app = new App();
  return new Stack(app, 'TestStack');
};

const createEnvStack = (
  region = 'us-east-1',
  account = '123456789012',
): Stack => {
  const app = new App();
  return new Stack(app, 'TestStack', { env: { account, region } });
};

// ================================================================
// Standalone CDK usage (no Amplify CLI)
// ================================================================

void describe('Standalone CDK usage (no Amplify CLI)', () => {
  let tmpDir: string;
  let staticDir: string;
  let bundleDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hosting-standalone-test-'));
    staticDir = path.join(tmpDir, 'static');
    bundleDir = path.join(tmpDir, 'bundle');

    fs.mkdirSync(staticDir, { recursive: true });
    fs.writeFileSync(path.join(staticDir, 'index.html'), '<html></html>');

    fs.mkdirSync(bundleDir, { recursive: true });
    fs.writeFileSync(
      path.join(bundleDir, 'index.mjs'),
      'export const handler = async () => {};',
    );
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const spaManifest: DeployManifest = {
    version: 1,
    compute: {},
    staticAssets: { directory: '' }, // will be replaced
    routes: [{ pattern: '/*', target: 'static' }],
    buildId: 'standalone-spa-1',
  };

  const makeSpaManifest = (): DeployManifest => ({
    ...spaManifest,
    staticAssets: { directory: staticDir },
  });

  const makeSsrManifest = (): DeployManifest => ({
    version: 1,
    compute: {
      default: {
        type: 'handler',
        bundle: bundleDir,
        handler: 'index.handler',
        placement: 'regional',
        streaming: true,
        runtime: 'nodejs20.x',
      },
    },
    staticAssets: { directory: staticDir },
    routes: [
      { pattern: '/_next/static/*', target: 'static' },
      { pattern: '/favicon.ico', target: 'static' },
      { pattern: '/*', target: 'default' },
    ],
    buildId: 'standalone-ssr-1',
  });

  // ---- SPA hosting ----

  void describe('SPA hosting', () => {
    void it('synthesizes a valid CloudFormation template', () => {
      const stack = createStack();
      new AmplifyHostingConstruct(stack, 'Hosting', {
        manifest: makeSpaManifest(),
      });

      const template = Template.fromStack(stack);
      template.resourceCountIs('AWS::CloudFront::Distribution', 1);
      const buckets = template.findResources('AWS::S3::Bucket');
      assert.ok(Object.keys(buckets).length >= 1);
    });

    void it('creates S3 bucket with correct security settings', () => {
      const stack = createStack();
      new AmplifyHostingConstruct(stack, 'Hosting', {
        manifest: makeSpaManifest(),
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::S3::Bucket', {
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: true,
          BlockPublicPolicy: true,
          IgnorePublicAcls: true,
          RestrictPublicBuckets: true,
        },
      });
    });

    void it('creates CloudFront distribution with HTTPS redirect', () => {
      const stack = createStack();
      new AmplifyHostingConstruct(stack, 'Hosting', {
        manifest: makeSpaManifest(),
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties(
        'AWS::CloudFront::Distribution',
        Match.objectLike({
          DistributionConfig: Match.objectLike({
            DefaultCacheBehavior: Match.objectLike({
              ViewerProtocolPolicy: 'redirect-to-https',
            }),
          }),
        }),
      );
    });

    void it('handles SPA 404 routing to index.html', () => {
      const stack = createStack();
      new AmplifyHostingConstruct(stack, 'Hosting', {
        manifest: makeSpaManifest(),
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties(
        'AWS::CloudFront::Distribution',
        Match.objectLike({
          DistributionConfig: Match.objectLike({
            CustomErrorResponses: Match.arrayWith([
              Match.objectLike({
                ErrorCode: 403,
                ResponseCode: 200,
              }),
              Match.objectLike({
                ErrorCode: 404,
                ResponseCode: 200,
              }),
            ]),
          }),
        }),
      );
    });
  });

  // ---- SSR hosting ----

  void describe('SSR hosting', () => {
    void it('creates Lambda function for handler type (no Web Adapter)', () => {
      const stack = createStack();
      new AmplifyHostingConstruct(stack, 'Hosting', {
        manifest: makeSsrManifest(),
        skipRegionValidation: true,
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Lambda::Function', {
        Runtime: 'nodejs20.x',
        Handler: 'index.handler',
      });
    });

    void it('creates Function URL with IAM auth and streaming', () => {
      const stack = createStack();
      new AmplifyHostingConstruct(stack, 'Hosting', {
        manifest: makeSsrManifest(),
        skipRegionValidation: true,
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Lambda::Url', {
        AuthType: 'AWS_IAM',
        InvokeMode: 'RESPONSE_STREAM',
      });
    });

    void it('creates error page deployment for SSR', () => {
      const stack = createStack();
      new AmplifyHostingConstruct(stack, 'Hosting', {
        manifest: makeSsrManifest(),
        skipRegionValidation: true,
      });

      const template = Template.fromStack(stack);
      const deployments = template.findResources('Custom::CDKBucketDeployment');
      assert.ok(
        Object.keys(deployments).length >= 2,
        'Should have at least 2 BucketDeployments (assets + error page)',
      );
    });

    void it('provisions cache infrastructure when manifest declares cache', () => {
      const stack = createStack();
      const manifest = {
        ...makeSsrManifest(),
        cache: {
          computeResource: 'default',
          tagRevalidation: true,
          revalidationQueue: true,
        },
      };

      const construct = new AmplifyHostingConstruct(stack, 'Hosting', {
        manifest,
        skipRegionValidation: true,
      });

      assert.ok(construct.cacheBucket);
      assert.ok(construct.cacheTable);
      assert.ok(construct.revalidationQueue);

      const template = Template.fromStack(stack);
      template.resourceCountIs('AWS::DynamoDB::Table', 1);
      template.resourceCountIs('AWS::SQS::Queue', 1);
    });
  });

  // ---- Custom domain ----

  void describe('Custom domain', () => {
    void it('accepts pre-created certificate (BYO cert)', () => {
      const stack = createEnvStack();
      const byoCert = Certificate.fromCertificateArn(
        stack,
        'ImportedCert',
        'arn:aws:acm:us-east-1:123456789012:certificate/abc-123',
      );

      const construct = new AmplifyHostingConstruct(stack, 'Hosting', {
        manifest: makeSpaManifest(),
        domain: {
          domainName: 'www.example.com',
          hostedZone: 'example.com',
          certificate: byoCert,
        },
      });

      assert.ok(construct.certificate);
      const template = Template.fromStack(stack);
      template.hasResourceProperties(
        'AWS::CloudFront::Distribution',
        Match.objectLike({
          DistributionConfig: Match.objectLike({
            Aliases: ['www.example.com'],
          }),
        }),
      );
    });

    void it('creates A and AAAA records', () => {
      const stack = createEnvStack();
      const byoCert = Certificate.fromCertificateArn(
        stack,
        'ImportedCert',
        'arn:aws:acm:us-east-1:123456789012:certificate/abc-123',
      );

      new AmplifyHostingConstruct(stack, 'Hosting', {
        manifest: makeSpaManifest(),
        domain: {
          domainName: 'www.example.com',
          hostedZone: 'example.com',
          certificate: byoCert,
        },
      });

      const template = Template.fromStack(stack);
      const records = template.findResources('AWS::Route53::RecordSet');
      const recordTypes = Object.values(records).map(
        (r) => (r as Record<string, Record<string, unknown>>).Properties?.Type,
      );
      assert.ok(recordTypes.includes('A'));
      assert.ok(recordTypes.includes('AAAA'));
    });
  });

  // ---- WAF ----

  void describe('WAF', () => {
    void it('creates WebACL when waf.enabled is true', () => {
      const stack = createStack();
      const construct = new AmplifyHostingConstruct(stack, 'Hosting', {
        manifest: makeSpaManifest(),
        waf: { enabled: true },
      });

      assert.ok(construct.webAcl);
      const template = Template.fromStack(stack);
      template.hasResourceProperties(
        'AWS::WAFv2::WebACL',
        Match.objectLike({
          Scope: 'CLOUDFRONT',
        }),
      );
    });

    void it('does not create WebACL when waf is not configured', () => {
      const stack = createStack();
      const construct = new AmplifyHostingConstruct(stack, 'Hosting', {
        manifest: makeSpaManifest(),
      });

      assert.strictEqual(construct.webAcl, undefined);
      const template = Template.fromStack(stack);
      template.resourceCountIs('AWS::WAFv2::WebACL', 0);
    });
  });

  // ---- Construct exports ----

  void describe('construct exports', () => {
    void it('exposes distribution, bucket, and resources on the construct', () => {
      const stack = createStack();
      const construct = new AmplifyHostingConstruct(stack, 'Hosting', {
        manifest: makeSpaManifest(),
      });

      assert.ok(construct.bucket);
      assert.ok(construct.distribution);
      assert.ok(construct.distributionUrl.startsWith('https://'));
    });

    void it('exposes compute functions for SSR mode', () => {
      const stack = createStack();
      const construct = new AmplifyHostingConstruct(stack, 'Hosting', {
        manifest: makeSsrManifest(),
        skipRegionValidation: true,
      });

      assert.ok(construct.computeFunctions.has('default'));
      assert.ok(construct.computeFunctionUrls.has('default'));
    });
  });
});
