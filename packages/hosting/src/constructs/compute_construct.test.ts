import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { App, Duration, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { ComputeConstruct } from './compute_construct.js';
import { HostingError } from '../hosting_error.js';
import { ComputeResource } from '../manifest/types.js';

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

const defaultComputeResource: ComputeResource = {
  name: 'default',
  runtime: 'nodejs20.x',
  entrypoint: 'run.sh',
};

// ================================================================
// ComputeConstruct — isolated unit tests
// ================================================================

void describe('ComputeConstruct', () => {
  let tmpDir: string;
  let computeBasePath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'compute-construct-test-'));
    computeBasePath = tmpDir;
    const defaultDir = path.join(computeBasePath, 'default');
    fs.mkdirSync(defaultDir, { recursive: true });
    fs.writeFileSync(
      path.join(defaultDir, 'run.sh'),
      '#!/bin/bash\nexec node server.js',
    );
    fs.writeFileSync(path.join(defaultDir, 'server.js'), '// server stub');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // ---- Lambda defaults ----

  void describe('Lambda defaults', () => {
    void it('creates Lambda with NODEJS_20_X runtime and run.sh handler', () => {
      const stack = createStack();
      const bucket = new Bucket(stack, 'Bucket');
      new ComputeConstruct(stack, 'Compute', {
        computeResource: defaultComputeResource,
        computeBasePath,
        bucket,
      });
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::Lambda::Function', {
        Runtime: 'nodejs20.x',
        Handler: 'run.sh',
      });
    });

    void it('sets default memorySize to 512 MB', () => {
      const stack = createStack();
      const bucket = new Bucket(stack, 'Bucket');
      new ComputeConstruct(stack, 'Compute', {
        computeResource: defaultComputeResource,
        computeBasePath,
        bucket,
      });
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::Lambda::Function', {
        MemorySize: 512,
      });
    });

    void it('sets default timeout to 30 seconds', () => {
      const stack = createStack();
      const bucket = new Bucket(stack, 'Bucket');
      new ComputeConstruct(stack, 'Compute', {
        computeResource: defaultComputeResource,
        computeBasePath,
        bucket,
      });
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::Lambda::Function', {
        Timeout: 30,
      });
    });

    void it('sets environment variables for Lambda Web Adapter', () => {
      const stack = createStack();
      const bucket = new Bucket(stack, 'Bucket');
      new ComputeConstruct(stack, 'Compute', {
        computeResource: defaultComputeResource,
        computeBasePath,
        bucket,
      });
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: Match.objectLike({
            AWS_LAMBDA_EXEC_WRAPPER: '/opt/bootstrap',
            AWS_LWA_INVOKE_MODE: 'response_stream',
            PORT: '3000',
          }),
        },
      });
    });
  });

  // ---- Custom overrides ----

  void describe('custom overrides', () => {
    void it('overrides memorySize', () => {
      const stack = createStack();
      const bucket = new Bucket(stack, 'Bucket');
      new ComputeConstruct(stack, 'Compute', {
        computeResource: defaultComputeResource,
        computeBasePath,
        bucket,
        memorySize: 1024,
      });
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::Lambda::Function', {
        MemorySize: 1024,
      });
    });

    void it('overrides timeout', () => {
      const stack = createStack();
      const bucket = new Bucket(stack, 'Bucket');
      new ComputeConstruct(stack, 'Compute', {
        computeResource: defaultComputeResource,
        computeBasePath,
        bucket,
        timeout: Duration.seconds(60),
      });
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::Lambda::Function', {
        Timeout: 60,
      });
    });

    void it('sets reservedConcurrency when provided', () => {
      const stack = createStack();
      const bucket = new Bucket(stack, 'Bucket');
      new ComputeConstruct(stack, 'Compute', {
        computeResource: defaultComputeResource,
        computeBasePath,
        bucket,
        reservedConcurrency: 10,
      });
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::Lambda::Function', {
        ReservedConcurrentExecutions: 10,
      });
    });

    void it('uses custom webAdapterVersion in layer ARN', () => {
      const stack = createStack();
      const bucket = new Bucket(stack, 'Bucket');
      new ComputeConstruct(stack, 'Compute', {
        computeResource: defaultComputeResource,
        computeBasePath,
        bucket,
        webAdapterVersion: 25,
      });
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::Lambda::Function', {
        Layers: Match.arrayWith([
          Match.objectLike({
            // Layer ARN should end with :25
            'Fn::Join': Match.anyValue(),
          }),
        ]),
      });

      // Verify the layer version in the full template
      const functions = template.findResources('AWS::Lambda::Function');
      const fn = Object.values(functions)[0] as Record<
        string,
        Record<string, unknown>
      >;
      const layers = fn.Properties.Layers as unknown[];
      const layerStr = JSON.stringify(layers);
      assert.ok(
        layerStr.includes(':25') ||
          layerStr.includes("'25'") ||
          layerStr.includes('"25"'),
        `Layer ARN should include version 25, got: ${layerStr}`,
      );
    });
  });

  // ---- Function URL ----

  void describe('Function URL', () => {
    void it('creates Function URL with IAM auth', () => {
      const stack = createStack();
      const bucket = new Bucket(stack, 'Bucket');
      new ComputeConstruct(stack, 'Compute', {
        computeResource: defaultComputeResource,
        computeBasePath,
        bucket,
      });
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::Lambda::Url', {
        AuthType: 'AWS_IAM',
      });
    });

    void it('creates Function URL with RESPONSE_STREAM invoke mode', () => {
      const stack = createStack();
      const bucket = new Bucket(stack, 'Bucket');
      new ComputeConstruct(stack, 'Compute', {
        computeResource: defaultComputeResource,
        computeBasePath,
        bucket,
      });
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::Lambda::Url', {
        InvokeMode: 'RESPONSE_STREAM',
      });
    });
  });

  // ---- Web Adapter layer ----

  void describe('Web Adapter layer', () => {
    void it('includes default version 22 in layer ARN', () => {
      const stack = createStack();
      const bucket = new Bucket(stack, 'Bucket');
      new ComputeConstruct(stack, 'Compute', {
        computeResource: defaultComputeResource,
        computeBasePath,
        bucket,
      });
      const template = Template.fromStack(stack);

      const functions = template.findResources('AWS::Lambda::Function');
      const fn = Object.values(functions)[0] as Record<
        string,
        Record<string, unknown>
      >;
      const layers = fn.Properties.Layers as unknown[];
      const layerStr = JSON.stringify(layers);
      assert.ok(
        layerStr.includes(':22') ||
          layerStr.includes("'22'") ||
          layerStr.includes('"22"'),
        `Layer ARN should include default version 22, got: ${layerStr}`,
      );
    });

    void it('includes Lambda Web Adapter account 753240598075 in layer ARN', () => {
      const stack = createStack();
      const bucket = new Bucket(stack, 'Bucket');
      new ComputeConstruct(stack, 'Compute', {
        computeResource: defaultComputeResource,
        computeBasePath,
        bucket,
      });
      const template = Template.fromStack(stack);

      const functions = template.findResources('AWS::Lambda::Function');
      const fn = Object.values(functions)[0] as Record<
        string,
        Record<string, unknown>
      >;
      const layers = fn.Properties.Layers as unknown[];
      const layerStr = JSON.stringify(layers);
      assert.ok(
        layerStr.includes('753240598075'),
        `Layer ARN should include account 753240598075, got: ${layerStr}`,
      );
    });
  });

  // ---- IAM role ----

  void describe('IAM role', () => {
    void it('has AWSLambdaBasicExecutionRole managed policy', () => {
      const stack = createStack();
      const bucket = new Bucket(stack, 'Bucket');
      new ComputeConstruct(stack, 'Compute', {
        computeResource: defaultComputeResource,
        computeBasePath,
        bucket,
      });
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::IAM::Role', {
        ManagedPolicyArns: Match.arrayWith([
          Match.objectLike({
            'Fn::Join': Match.arrayWith([
              Match.arrayWith([
                Match.stringLikeRegexp('AWSLambdaBasicExecutionRole'),
              ]),
            ]),
          }),
        ]),
      });
    });

    void it('has lambda.amazonaws.com as trusted service', () => {
      const stack = createStack();
      const bucket = new Bucket(stack, 'Bucket');
      new ComputeConstruct(stack, 'Compute', {
        computeResource: defaultComputeResource,
        computeBasePath,
        bucket,
      });
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: Match.objectLike({
          Statement: Match.arrayWith([
            Match.objectLike({
              Principal: { Service: 'lambda.amazonaws.com' },
            }),
          ]),
        }),
      });
    });
  });

  // ---- Region validation ----

  void describe('region validation', () => {
    void it('throws HostingError for unsupported region', () => {
      assert.throws(
        () => {
          const stack = createEnvStack('eu-south-2', '123456789012');
          const bucket = new Bucket(stack, 'Bucket');
          new ComputeConstruct(stack, 'Compute', {
            computeResource: defaultComputeResource,
            computeBasePath,
            bucket,
          });
        },
        (err: unknown) => {
          assert.ok(err instanceof HostingError);
          assert.strictEqual(err.name, 'UnsupportedRegionError');
          assert.ok(err.resolution);
          return true;
        },
      );
    });

    void it('succeeds for supported region (us-east-1)', () => {
      const stack = createEnvStack('us-east-1', '123456789012');
      const bucket = new Bucket(stack, 'Bucket');
      const compute = new ComputeConstruct(stack, 'Compute', {
        computeResource: defaultComputeResource,
        computeBasePath,
        bucket,
      });
      assert.ok(compute.function, 'Should create Lambda function');
    });

    void it('bypasses region check with skipRegionValidation', () => {
      const stack = createEnvStack('eu-south-2', '123456789012');
      const bucket = new Bucket(stack, 'Bucket');
      const compute = new ComputeConstruct(stack, 'Compute', {
        computeResource: defaultComputeResource,
        computeBasePath,
        bucket,
        skipRegionValidation: true,
      });
      assert.ok(
        compute.function,
        'Should create Lambda function despite unsupported region',
      );
    });

    void it('skips validation when region is an unresolved token', () => {
      // Stack without explicit env → region is a token
      const stack = createStack();
      const bucket = new Bucket(stack, 'Bucket');
      const compute = new ComputeConstruct(stack, 'Compute', {
        computeResource: defaultComputeResource,
        computeBasePath,
        bucket,
      });
      assert.ok(
        compute.function,
        'Should create Lambda function for token region',
      );
    });
  });

  // ---- Construct exports ----

  void describe('construct exports', () => {
    void it('exposes function and functionUrl', () => {
      const stack = createStack();
      const bucket = new Bucket(stack, 'Bucket');
      const compute = new ComputeConstruct(stack, 'Compute', {
        computeResource: defaultComputeResource,
        computeBasePath,
        bucket,
      });

      assert.ok(compute.function, 'Should expose function');
      assert.ok(compute.functionUrl, 'Should expose functionUrl');
    });
  });
});
