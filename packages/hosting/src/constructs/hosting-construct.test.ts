import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { App, Stack } from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { AmplifyHostingConstruct } from './hosting-construct.js';
import { DeployManifest } from '../manifest/types.js';

void describe('AmplifyHostingConstruct — CDK synthesis', () => {
  let tmpDir: string;
  let staticDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'hosting-integration-test-'),
    );
    staticDir = path.join(tmpDir, 'static');
    fs.mkdirSync(staticDir, { recursive: true });
    fs.writeFileSync(path.join(staticDir, 'index.html'), '<html></html>');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const createStack = (): Stack => {
    const app = new App();
    return new Stack(app, 'TestStack');
  };

  void it('synthesizes S3 bucket with BlockPublicAccess', () => {
    const stack = createStack();
    const manifest: DeployManifest = {
      version: 1,
      routes: [{ path: '/*', target: { kind: 'Static' } }],
      framework: { name: 'spa' },
      buildId: 'test-build-1',
    };

    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest,
      staticAssetPath: staticDir,
    });

    const template = Template.fromStack(stack);

    // S3 bucket exists with BlockPublicAccess
    template.hasResourceProperties('AWS::S3::Bucket', {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
      VersioningConfiguration: {
        Status: 'Enabled',
      },
    });
  });

  void it('synthesizes CloudFront distribution', () => {
    const stack = createStack();
    const manifest: DeployManifest = {
      version: 1,
      routes: [{ path: '/*', target: { kind: 'Static' } }],
      framework: { name: 'spa' },
      buildId: 'test-build-2',
    };

    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest,
      staticAssetPath: staticDir,
    });

    const template = Template.fromStack(stack);

    // CloudFront distribution exists
    template.hasResourceProperties(
      'AWS::CloudFront::Distribution',
      Match.objectLike({
        DistributionConfig: Match.objectLike({
          DefaultRootObject: 'index.html',
          HttpVersion: 'http2and3',
        }),
      }),
    );
  });

  void it('synthesizes Origin Access Control (OAC)', () => {
    const stack = createStack();
    const manifest: DeployManifest = {
      version: 1,
      routes: [{ path: '/*', target: { kind: 'Static' } }],
      framework: { name: 'spa' },
      buildId: 'test-build-3',
    };

    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest,
      staticAssetPath: staticDir,
    });

    const template = Template.fromStack(stack);

    // OAC resource exists (not OAI)
    template.hasResourceProperties(
      'AWS::CloudFront::OriginAccessControl',
      Match.objectLike({
        OriginAccessControlConfig: Match.objectLike({
          OriginAccessControlOriginType: 's3',
          SigningBehavior: 'always',
          SigningProtocol: 'sigv4',
        }),
      }),
    );
  });

  void it('synthesizes CloudFront Function for Build ID rewriting', () => {
    const stack = createStack();
    const buildId = 'atomic-test-42';
    const manifest: DeployManifest = {
      version: 1,
      routes: [{ path: '/*', target: { kind: 'Static' } }],
      framework: { name: 'spa' },
      buildId,
    };

    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest,
      staticAssetPath: staticDir,
    });

    const template = Template.fromStack(stack);

    // CloudFront Function exists with Build ID in code
    template.hasResourceProperties(
      'AWS::CloudFront::Function',
      Match.objectLike({
        FunctionCode: Match.stringLikeRegexp(`builds/${buildId}`),
      }),
    );
  });

  void it('synthesizes SPA error responses (403 → index.html)', () => {
    const stack = createStack();
    const manifest: DeployManifest = {
      version: 1,
      routes: [{ path: '/*', target: { kind: 'Static' } }],
      framework: { name: 'spa' },
      buildId: 'test-build-4',
    };

    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest,
      staticAssetPath: staticDir,
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
              ResponsePagePath: '/index.html',
            }),
            Match.objectLike({
              ErrorCode: 404,
              ResponseCode: 200,
              ResponsePagePath: '/index.html',
            }),
          ]),
        }),
      }),
    );
  });

  void it('does NOT have public bucket policy', () => {
    const stack = createStack();
    const manifest: DeployManifest = {
      version: 1,
      routes: [{ path: '/*', target: { kind: 'Static' } }],
      framework: { name: 'spa' },
      buildId: 'test-build-5',
    };

    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest,
      staticAssetPath: staticDir,
    });

    const template = Template.fromStack(stack);

    // Get all bucket policies and ensure none grant public access
    const bucketPolicies = template.findResources('AWS::S3::BucketPolicy');
    for (const [, policy] of Object.entries(bucketPolicies)) {
      const policyDoc = (policy as Record<string, Record<string, unknown>>)
        .Properties?.PolicyDocument as Record<string, unknown[]> | undefined;
      if (policyDoc?.Statement) {
        for (const statement of policyDoc.Statement) {
          const stmtObj = statement as Record<string, unknown>;
          // No statement should grant access to "*" principal with allow effect
          if (stmtObj.Effect === 'Allow' && stmtObj.Principal === '*') {
            assert.fail(
              'Bucket policy should not grant public access to "*"',
            );
          }
        }
      }
    }
  });

  void it('does NOT create ACM/Route53 resources when no domain configured', () => {
    const stack = createStack();
    const manifest: DeployManifest = {
      version: 1,
      routes: [{ path: '/*', target: { kind: 'Static' } }],
      framework: { name: 'spa' },
      buildId: 'test-build-6',
    };

    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest,
      staticAssetPath: staticDir,
    });

    const template = Template.fromStack(stack);

    // No ACM certificate
    const acmCerts = template.findResources(
      'AWS::CertificateManager::Certificate',
    );
    assert.strictEqual(
      Object.keys(acmCerts).length,
      0,
      'Should have no ACM certificates without domain config',
    );

    // No Route53 records
    const records = template.findResources('AWS::Route53::RecordSet');
    assert.strictEqual(
      Object.keys(records).length,
      0,
      'Should have no Route53 records without domain config',
    );
  });

  void it('outputs the distribution URL', () => {
    const stack = createStack();
    const manifest: DeployManifest = {
      version: 1,
      routes: [{ path: '/*', target: { kind: 'Static' } }],
      framework: { name: 'spa' },
      buildId: 'test-build-7',
    };

    const construct = new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest,
      staticAssetPath: staticDir,
    });

    assert.ok(construct.distributionUrl.startsWith('https://'));
  });

  void it('exposes hosting resources', () => {
    const stack = createStack();
    const manifest: DeployManifest = {
      version: 1,
      routes: [{ path: '/*', target: { kind: 'Static' } }],
      framework: { name: 'spa' },
      buildId: 'test-build-8',
    };

    const construct = new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest,
      staticAssetPath: staticDir,
    });

    const resources = construct.getResources();
    assert.ok(resources.bucket);
    assert.ok(resources.distribution);
    assert.ok(resources.distributionUrl);
  });
});
