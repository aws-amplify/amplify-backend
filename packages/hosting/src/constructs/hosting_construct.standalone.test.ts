import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import { AmplifyHostingConstruct } from './hosting_construct.js';
import { HostingError } from '../hosting_error.js';
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

const spaManifest: DeployManifest = {
  version: 1,
  routes: [{ path: '/*', target: { kind: 'Static' } }],
  framework: { name: 'spa' },
  buildId: 'standalone-spa-1',
};

const ssrManifest: DeployManifest = {
  version: 1,
  routes: [
    {
      path: '/_next/static/*',
      target: {
        kind: 'Static',
        cacheControl: 'public, max-age=31536000, immutable',
      },
    },
    {
      path: '/favicon.ico',
      target: { kind: 'Static' },
    },
    {
      path: '/*',
      target: { kind: 'Compute', src: 'default' },
    },
  ],
  computeResources: [
    { name: 'default', runtime: 'nodejs20.x', entrypoint: 'run.sh' },
  ],
  framework: { name: 'nextjs', version: '15.0.0' },
  buildId: 'standalone-ssr-1',
};

// ================================================================
// Standalone CDK usage (no Amplify CLI)
// ================================================================

void describe('Standalone CDK usage (no Amplify CLI)', () => {
  let tmpDir: string;
  let staticDir: string;
  let computeDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hosting-standalone-test-'));
    staticDir = path.join(tmpDir, 'static');
    computeDir = path.join(tmpDir, 'compute');

    // SPA static assets
    fs.mkdirSync(staticDir, { recursive: true });
    fs.writeFileSync(path.join(staticDir, 'index.html'), '<html></html>');

    // SSR compute assets
    const defaultDir = path.join(computeDir, 'default');
    fs.mkdirSync(defaultDir, { recursive: true });
    fs.writeFileSync(
      path.join(defaultDir, 'server.js'),
      'require("http").createServer().listen(3000)',
    );
    fs.writeFileSync(
      path.join(defaultDir, 'run.sh'),
      '#!/bin/bash\nexec node server.js',
    );
    fs.writeFileSync(
      path.join(defaultDir, 'index.js'),
      'exports.handler = async () => ({ statusCode: 502 });',
    );
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // ---- SPA hosting ----

  void describe('SPA hosting', () => {
    void it('synthesizes a valid CloudFormation template', () => {
      const stack = createStack();
      new AmplifyHostingConstruct(stack, 'Hosting', {
        manifest: spaManifest,
        staticAssetPath: staticDir,
      });

      const template = Template.fromStack(stack);
      template.resourceCountIs('AWS::CloudFront::Distribution', 1);
      // At least one S3 bucket (hosting + possibly CDK BucketDeployment helper)
      const buckets = template.findResources('AWS::S3::Bucket');
      assert.ok(
        Object.keys(buckets).length >= 1,
        'Should have at least one S3 bucket',
      );
    });

    void it('creates S3 bucket with correct security settings', () => {
      const stack = createStack();
      new AmplifyHostingConstruct(stack, 'Hosting', {
        manifest: spaManifest,
        staticAssetPath: staticDir,
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::S3::Bucket', {
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: true,
          BlockPublicPolicy: true,
          IgnorePublicAcls: true,
          RestrictPublicBuckets: true,
        },
        BucketEncryption: Match.objectLike({
          ServerSideEncryptionConfiguration: Match.anyValue(),
        }),
      });
    });

    void it('creates CloudFront distribution with HTTPS redirect', () => {
      const stack = createStack();
      new AmplifyHostingConstruct(stack, 'Hosting', {
        manifest: spaManifest,
        staticAssetPath: staticDir,
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

    void it('creates security headers policy with CSP', () => {
      const stack = createStack();
      new AmplifyHostingConstruct(stack, 'Hosting', {
        manifest: spaManifest,
        staticAssetPath: staticDir,
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties(
        'AWS::CloudFront::ResponseHeadersPolicy',
        Match.objectLike({
          ResponseHeadersPolicyConfig: Match.objectLike({
            SecurityHeadersConfig: Match.objectLike({
              ContentSecurityPolicy: Match.objectLike({
                ContentSecurityPolicy:
                  Match.stringLikeRegexp("default-src 'self'"),
              }),
            }),
          }),
        }),
      );
    });

    void it('handles SPA 404 routing to index.html', () => {
      const stack = createStack();
      new AmplifyHostingConstruct(stack, 'Hosting', {
        manifest: spaManifest,
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
                ResponsePagePath: `/builds/${spaManifest.buildId}/index.html`,
              }),
              Match.objectLike({
                ErrorCode: 404,
                ResponseCode: 200,
                ResponsePagePath: `/builds/${spaManifest.buildId}/index.html`,
              }),
            ]),
          }),
        }),
      );
    });
  });

  // ---- SSR hosting ----

  void describe('SSR hosting', () => {
    void it('creates Lambda function with Web Adapter layer', () => {
      const stack = createStack();
      new AmplifyHostingConstruct(stack, 'Hosting', {
        manifest: ssrManifest,
        staticAssetPath: staticDir,
        computeBasePath: computeDir,
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Lambda::Function', {
        Runtime: 'nodejs20.x',
        Handler: 'run.sh',
        Layers: Match.anyValue(),
        Environment: {
          Variables: Match.objectLike({
            AWS_LAMBDA_EXEC_WRAPPER: '/opt/bootstrap',
          }),
        },
      });
    });

    void it('creates Function URL with IAM auth', () => {
      const stack = createStack();
      new AmplifyHostingConstruct(stack, 'Hosting', {
        manifest: ssrManifest,
        staticAssetPath: staticDir,
        computeBasePath: computeDir,
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Lambda::Url', {
        AuthType: 'AWS_IAM',
        InvokeMode: 'RESPONSE_STREAM',
      });
    });

    void it('creates correct OAC permission for Lambda (validates Critical #2 fix)', () => {
      const stack = createStack();
      new AmplifyHostingConstruct(stack, 'Hosting', {
        manifest: ssrManifest,
        staticAssetPath: staticDir,
        computeBasePath: computeDir,
      });

      const template = Template.fromStack(stack);

      // Should have InvokeFunctionUrl permission with correct FunctionName
      const permissions = template.findResources('AWS::Lambda::Permission');
      const invokeFnUrlPerms = Object.entries(permissions).filter(
        ([, perm]) => {
          const props = (perm as Record<string, Record<string, unknown>>)
            .Properties;
          return props?.Action === 'lambda:InvokeFunctionUrl';
        },
      );

      assert.ok(
        invokeFnUrlPerms.length > 0,
        'Should have at least one lambda:InvokeFunctionUrl permission',
      );

      // FunctionName should reference the SSR function ARN (not Function URL)
      for (const [, perm] of invokeFnUrlPerms) {
        const props = (perm as Record<string, Record<string, unknown>>)
          .Properties;
        const fnName = props?.FunctionName as Record<string, unknown>;
        const getAtt = fnName?.['Fn::GetAtt'] as string[] | undefined;
        assert.ok(
          getAtt && getAtt[1] === 'Arn',
          'FunctionName should use Fn::GetAtt with Arn',
        );
        assert.ok(
          getAtt[0].includes('SsrFunction'),
          `FunctionName should reference SsrFunction, got: ${getAtt[0]}`,
        );
      }

      // Should also have CloudFrontOACInvokeFunction
      const oacPerms = Object.entries(permissions).filter(([key]) =>
        key.includes('CloudFrontOACInvokeFunction'),
      );
      assert.ok(
        oacPerms.length > 0,
        'Should have CloudFrontOACInvokeFunction permission',
      );
    });

    void it('deploys error page via Source.data (no temp files) — validates Critical #1 fix', () => {
      const stack = createStack();
      new AmplifyHostingConstruct(stack, 'Hosting', {
        manifest: ssrManifest,
        staticAssetPath: staticDir,
        computeBasePath: computeDir,
      });

      const template = Template.fromStack(stack);

      // The error page deployment creates a Custom::CDKBucketDeployment
      const deployments = template.findResources('Custom::CDKBucketDeployment');
      assert.ok(
        Object.keys(deployments).length >= 2,
        'Should have at least 2 BucketDeployments (assets + error page)',
      );

      // Verify 5xx error responses reference _error.html
      template.hasResourceProperties(
        'AWS::CloudFront::Distribution',
        Match.objectLike({
          DistributionConfig: Match.objectLike({
            CustomErrorResponses: Match.arrayWith([
              Match.objectLike({
                ErrorCode: 502,
                ResponsePagePath: `/builds/${ssrManifest.buildId}/_error.html`,
              }),
            ]),
          }),
        }),
      );
    });
  });

  // ---- Custom domain ----

  void describe('Custom domain', () => {
    void it('accepts pre-created certificate (BYO cert) — validates Critical #3 fix', () => {
      const stack = createEnvStack();

      // Import an existing certificate by ARN (simulates BYO cert)
      const byoCert = Certificate.fromCertificateArn(
        stack,
        'ImportedCert',
        'arn:aws:acm:us-east-1:123456789012:certificate/abc-123',
      );

      const construct = new AmplifyHostingConstruct(stack, 'Hosting', {
        manifest: spaManifest,
        staticAssetPath: staticDir,
        domain: {
          domainName: 'www.example.com',
          hostedZone: 'example.com',
          certificate: byoCert,
        },
      });

      assert.ok(construct.certificate, 'Should have certificate set');

      const template = Template.fromStack(stack);

      // When BYO cert is used, no DnsValidatedCertificate custom resource should be created
      const customResources = template.findResources(
        'AWS::CloudFormation::CustomResource',
      );
      const certResources = Object.entries(customResources).filter(([, r]) => {
        const props = (r as Record<string, Record<string, unknown>>).Properties;
        return props?.DomainName === 'www.example.com';
      });
      assert.strictEqual(
        certResources.length,
        0,
        'Should NOT create DnsValidatedCertificate when BYO cert is provided',
      );

      // CloudFront should still have the domain alias
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
        manifest: spaManifest,
        staticAssetPath: staticDir,
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
      assert.ok(recordTypes.includes('A'), 'Should have an A record');
      assert.ok(recordTypes.includes('AAAA'), 'Should have an AAAA record');
    });
  });

  // ---- WAF ----

  void describe('WAF', () => {
    void it('creates WebACL when waf.enabled is true', () => {
      const stack = createStack();
      const construct = new AmplifyHostingConstruct(stack, 'Hosting', {
        manifest: spaManifest,
        staticAssetPath: staticDir,
        waf: { enabled: true },
      });

      assert.ok(construct.webAcl, 'Should create WebACL');

      const template = Template.fromStack(stack);
      template.hasResourceProperties(
        'AWS::WAFv2::WebACL',
        Match.objectLike({
          Scope: 'CLOUDFRONT',
          DefaultAction: { Allow: {} },
        }),
      );
    });

    void it('does not create WebACL when waf is not configured', () => {
      const stack = createStack();
      const construct = new AmplifyHostingConstruct(stack, 'Hosting', {
        manifest: spaManifest,
        staticAssetPath: staticDir,
      });

      assert.strictEqual(
        construct.webAcl,
        undefined,
        'Should not create WebACL',
      );

      const template = Template.fromStack(stack);
      template.resourceCountIs('AWS::WAFv2::WebACL', 0);
    });
  });

  // ---- Construct exports ----

  void describe('construct exports', () => {
    void it('exposes distribution, bucket, and resources on the construct', () => {
      const stack = createStack();
      const construct = new AmplifyHostingConstruct(stack, 'Hosting', {
        manifest: spaManifest,
        staticAssetPath: staticDir,
      });

      assert.ok(construct.bucket, 'Should expose bucket');
      assert.ok(construct.distribution, 'Should expose distribution');
      assert.ok(
        construct.distributionUrl.startsWith('https://'),
        'distributionUrl should start with https://',
      );

      const resources = construct.getResources();
      assert.ok(resources.bucket, 'Resources should include bucket');
      assert.ok(
        resources.distribution,
        'Resources should include distribution',
      );
      assert.ok(
        resources.distributionUrl,
        'Resources should include distributionUrl',
      );
    });

    void it('exposes ssrFunction and functionUrl for SSR mode', () => {
      const stack = createStack();
      const construct = new AmplifyHostingConstruct(stack, 'Hosting', {
        manifest: ssrManifest,
        staticAssetPath: staticDir,
        computeBasePath: computeDir,
      });

      assert.ok(construct.ssrFunction, 'SSR should expose ssrFunction');
      assert.ok(construct.functionUrl, 'SSR should expose functionUrl');
    });

    void it('does not expose ssrFunction for SPA mode', () => {
      const stack = createStack();
      const construct = new AmplifyHostingConstruct(stack, 'Hosting', {
        manifest: spaManifest,
        staticAssetPath: staticDir,
      });

      assert.strictEqual(construct.ssrFunction, undefined);
      assert.strictEqual(construct.functionUrl, undefined);
    });
  });

  // ---- Error handling ----

  void describe('error handling', () => {
    void it('throws HostingError (not AmplifyUserError) on invalid build ID', () => {
      assert.throws(
        () => {
          const stack = createStack();
          const manifest: DeployManifest = {
            ...spaManifest,
            buildId: 'invalid build id with spaces!!',
          };
          new AmplifyHostingConstruct(stack, 'Hosting', {
            manifest,
            staticAssetPath: staticDir,
          });
        },
        (err: unknown) => {
          assert.ok(err instanceof HostingError);
          assert.strictEqual(err.name, 'InvalidBuildIdError');
          assert.ok(err.resolution);
          return true;
        },
      );
    });

    void it('throws HostingError on invalid domain config', () => {
      const stack = createEnvStack();
      assert.throws(
        () =>
          new AmplifyHostingConstruct(stack, 'Hosting', {
            manifest: spaManifest,
            staticAssetPath: staticDir,
            domain: {
              domainName: 'app.other.com',
              hostedZone: 'example.com',
            },
          }),
        (err: unknown) => {
          assert.ok(err instanceof HostingError);
          assert.strictEqual(err.name, 'InvalidDomainConfigError');
          return true;
        },
      );
    });

    void it('throws HostingError on WAF rate limit below minimum', () => {
      assert.throws(
        () => {
          const stack = createStack();
          new AmplifyHostingConstruct(stack, 'Hosting', {
            manifest: spaManifest,
            staticAssetPath: staticDir,
            waf: { enabled: true, rateLimit: 50 },
          });
        },
        (err: unknown) => {
          assert.ok(err instanceof HostingError);
          assert.strictEqual(err.name, 'InvalidWafConfigError');
          return true;
        },
      );
    });

    void it('throws HostingError on missing computeBasePath for SSR', () => {
      assert.throws(
        () => {
          const stack = createStack();
          new AmplifyHostingConstruct(stack, 'Hosting', {
            manifest: ssrManifest,
            staticAssetPath: staticDir,
            // computeBasePath intentionally omitted
          });
        },
        (err: unknown) => {
          assert.ok(err instanceof HostingError);
          assert.strictEqual(err.name, 'MissingComputeBasePathError');
          return true;
        },
      );
    });

    void it('throws UnsupportedRegionError for SSR in unsupported region', () => {
      assert.throws(
        () => {
          const stack = createEnvStack('eu-south-2', '123456789012');
          new AmplifyHostingConstruct(stack, 'Hosting', {
            manifest: ssrManifest,
            staticAssetPath: staticDir,
            computeBasePath: computeDir,
          });
        },
        (err: unknown) => {
          assert.ok(err instanceof HostingError);
          assert.strictEqual(err.name, 'UnsupportedRegionError');
          assert.ok(
            err.message.includes('eu-south-2'),
            'Error message should mention the unsupported region',
          );
          assert.ok(err.resolution);
          return true;
        },
      );
    });

    void it('throws InvalidCertificateRegionError for BYO cert not in us-east-1', () => {
      const stack = createEnvStack();
      const wrongRegionCert = Certificate.fromCertificateArn(
        stack,
        'WrongRegionCert',
        'arn:aws:acm:eu-west-1:123456789012:certificate/wrong-region',
      );

      assert.throws(
        () =>
          new AmplifyHostingConstruct(stack, 'Hosting', {
            manifest: spaManifest,
            staticAssetPath: staticDir,
            domain: {
              domainName: 'www.example.com',
              hostedZone: 'example.com',
              certificate: wrongRegionCert,
            },
          }),
        (err: unknown) => {
          assert.ok(err instanceof HostingError);
          assert.strictEqual(err.name, 'InvalidCertificateRegionError');
          assert.ok(
            err.message.includes('eu-west-1'),
            'Error message should mention the incorrect region',
          );
          assert.ok(err.resolution.includes('us-east-1'));
          return true;
        },
      );
    });
  });

  // ---- OAC fallback branch ----

  void describe('OAC fallback branch', () => {
    void it('OAC patch succeeds — no explicit fallback permission needed', () => {
      // When CDK auto-generates the CfnPermission for lambda:InvokeFunctionUrl,
      // the construct patches it in-place. Verify the patch succeeded by
      // checking FunctionName points to SsrFunction (not the FunctionUrl).
      // The fallback construct ID 'CloudFrontLambdaUrlPermission' should NOT
      // appear because the patch succeeded.
      const stack = createStack();
      new AmplifyHostingConstruct(stack, 'Hosting', {
        manifest: ssrManifest,
        staticAssetPath: staticDir,
        computeBasePath: computeDir,
      });

      const template = Template.fromStack(stack);
      const permissions = template.findResources('AWS::Lambda::Permission');

      // Find any permission keyed with the fallback construct ID
      const fallbackPerms = Object.keys(permissions).filter((key) =>
        key.includes('CloudFrontLambdaUrlPermission'),
      );
      assert.strictEqual(
        fallbackPerms.length,
        0,
        'Fallback permission should NOT be created when patch succeeds',
      );

      // The patched permission should have correct FunctionName
      const patchedPerms = Object.entries(permissions).filter(([, perm]) => {
        const props = (perm as Record<string, Record<string, unknown>>)
          .Properties;
        return props?.Action === 'lambda:InvokeFunctionUrl';
      });
      assert.ok(
        patchedPerms.length > 0,
        'Patched InvokeFunctionUrl permission should exist',
      );
      for (const [, perm] of patchedPerms) {
        const props = (perm as Record<string, Record<string, unknown>>)
          .Properties;
        const fnName = props?.FunctionName as Record<string, unknown>;
        const getAtt = fnName?.['Fn::GetAtt'] as string[] | undefined;
        assert.ok(
          getAtt && getAtt[0].includes('SsrFunction'),
          'Patched FunctionName should reference SsrFunction',
        );
      }

      // The separate InvokeFunction permission should always be present
      const invokePerms = Object.entries(permissions).filter(([key]) =>
        key.includes('CloudFrontOACInvokeFunction'),
      );
      assert.ok(
        invokePerms.length > 0,
        'CloudFrontOACInvokeFunction should always be created for SSR',
      );
      for (const [, perm] of invokePerms) {
        const props = (perm as Record<string, Record<string, unknown>>)
          .Properties;
        assert.strictEqual(
          props?.Action,
          'lambda:InvokeFunction',
          'CloudFrontOACInvokeFunction should use lambda:InvokeFunction action',
        );
      }
    });
  });
});
