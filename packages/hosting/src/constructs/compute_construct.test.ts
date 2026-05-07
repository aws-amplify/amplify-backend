import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { App, Duration, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
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

let tmpDir: string;

const createBundleDir = (): string => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'compute-construct-test-'));
  fs.writeFileSync(
    path.join(tmpDir, 'index.mjs'),
    'export const handler = async () => {};',
  );
  return tmpDir;
};

const handlerResource = (bundle: string): ComputeResource => ({
  type: 'handler',
  bundle,
  handler: 'index.handler',
  placement: 'regional',
  streaming: true,
  runtime: 'nodejs20.x',
});

const httpServerResource = (bundle: string): ComputeResource => ({
  type: 'http-server',
  bundle,
  entrypoint: 'server.js',
  port: 3000,
  placement: 'regional',
  streaming: false,
  runtime: 'nodejs20.x',
});

const edgeResource = (bundle: string): ComputeResource => ({
  type: 'edge',
  bundle,
  handler: 'index.handler',
  placement: 'global',
  streaming: false,
  runtime: 'nodejs20.x',
});

// ================================================================
// ComputeConstruct — unit tests
// ================================================================

void describe('ComputeConstruct', () => {
  afterEach(() => {
    if (tmpDir) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  // ---- Handler type ----

  void describe('handler compute type', () => {
    void it('creates Lambda with handler directly (no Web Adapter)', () => {
      const bundle = createBundleDir();
      const stack = createStack();

      new ComputeConstruct(stack, 'Compute', {
        name: 'default',
        computeResource: handlerResource(bundle),
      });
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::Lambda::Function', {
        Runtime: 'nodejs20.x',
        Handler: 'index.handler',
      });

      // Should NOT have Web Adapter environment variables
      const functions = template.findResources('AWS::Lambda::Function');
      const fn = Object.values(functions)[0] as Record<
        string,
        Record<string, unknown>
      >;
      const env =
        (fn.Properties.Environment as Record<string, Record<string, string>>)
          ?.Variables ?? {};
      assert.strictEqual(env['AWS_LAMBDA_EXEC_WRAPPER'], undefined);
    });

    void it('sets default memorySize to 1024 MB', () => {
      const bundle = createBundleDir();
      const stack = createStack();

      new ComputeConstruct(stack, 'Compute', {
        name: 'default',
        computeResource: handlerResource(bundle),
      });
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::Lambda::Function', {
        MemorySize: 1024,
      });
    });

    void it('sets default timeout to 30 seconds', () => {
      const bundle = createBundleDir();
      const stack = createStack();

      new ComputeConstruct(stack, 'Compute', {
        name: 'default',
        computeResource: handlerResource(bundle),
      });
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::Lambda::Function', {
        Timeout: 30,
      });
    });

    void it('creates Function URL with RESPONSE_STREAM invoke mode for streaming', () => {
      const bundle = createBundleDir();
      const stack = createStack();

      new ComputeConstruct(stack, 'Compute', {
        name: 'default',
        computeResource: handlerResource(bundle),
      });
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::Lambda::Url', {
        AuthType: 'AWS_IAM',
        InvokeMode: 'RESPONSE_STREAM',
      });
    });
  });

  // ---- HTTP Server type ----

  void describe('http-server compute type', () => {
    void it('creates Lambda with Web Adapter layer', () => {
      const bundle = createBundleDir();
      fs.writeFileSync(path.join(bundle, 'server.js'), '// server');
      const stack = createStack();

      new ComputeConstruct(stack, 'Compute', {
        name: 'default',
        computeResource: httpServerResource(bundle),
      });
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::Lambda::Function', {
        Handler: 'server.js',
        Environment: {
          Variables: Match.objectLike({
            AWS_LAMBDA_EXEC_WRAPPER: '/opt/bootstrap',
            AWS_LWA_INVOKE_MODE: 'response_stream',
            PORT: '3000',
          }),
        },
      });
    });

    void it('includes Lambda Web Adapter layer', () => {
      const bundle = createBundleDir();
      fs.writeFileSync(path.join(bundle, 'server.js'), '// server');
      const stack = createStack();

      new ComputeConstruct(stack, 'Compute', {
        name: 'default',
        computeResource: httpServerResource(bundle),
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

    void it('throws UnsupportedRegionError for unsupported region', () => {
      const bundle = createBundleDir();
      fs.writeFileSync(path.join(bundle, 'server.js'), '// server');

      assert.throws(
        () => {
          const stack = createEnvStack('eu-south-2', '123456789012');
          new ComputeConstruct(stack, 'Compute', {
            name: 'default',
            computeResource: httpServerResource(bundle),
          });
        },
        (err: unknown) => {
          assert.ok(err instanceof HostingError);
          assert.strictEqual(err.name, 'UnsupportedRegionError');
          return true;
        },
      );
    });

    void it('bypasses region check with skipRegionValidation', () => {
      const bundle = createBundleDir();
      fs.writeFileSync(path.join(bundle, 'server.js'), '// server');
      const stack = createEnvStack('eu-south-2', '123456789012');

      const compute = new ComputeConstruct(stack, 'Compute', {
        name: 'default',
        computeResource: httpServerResource(bundle),
        skipRegionValidation: true,
      });
      assert.ok(compute.function);
    });
  });

  // ---- Edge type ----

  void describe('edge compute type', () => {
    void it('creates Lambda for edge functions', () => {
      const bundle = createBundleDir();
      const stack = createStack();

      new ComputeConstruct(stack, 'Compute', {
        name: 'default',
        computeResource: edgeResource(bundle),
      });
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::Lambda::Function', {
        Runtime: 'nodejs20.x',
        Handler: 'index.handler',
      });
    });

    void it('caps timeout at 30 seconds for edge', () => {
      const bundle = createBundleDir();
      const stack = createStack();

      new ComputeConstruct(stack, 'Compute', {
        name: 'default',
        computeResource: { ...edgeResource(bundle), timeout: 60 },
      });
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::Lambda::Function', {
        Timeout: 30,
      });
    });
  });

  // ---- Custom overrides ----

  void describe('custom overrides', () => {
    void it('overrides memorySize', () => {
      const bundle = createBundleDir();
      const stack = createStack();

      new ComputeConstruct(stack, 'Compute', {
        name: 'default',
        computeResource: handlerResource(bundle),
        memorySize: 1024,
      });
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::Lambda::Function', {
        MemorySize: 1024,
      });
    });

    void it('overrides timeout', () => {
      const bundle = createBundleDir();
      const stack = createStack();

      new ComputeConstruct(stack, 'Compute', {
        name: 'default',
        computeResource: handlerResource(bundle),
        timeout: Duration.seconds(60),
      });
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::Lambda::Function', {
        Timeout: 60,
      });
    });

    void it('sets reservedConcurrency when provided', () => {
      const bundle = createBundleDir();
      const stack = createStack();

      new ComputeConstruct(stack, 'Compute', {
        name: 'default',
        computeResource: handlerResource(bundle),
        reservedConcurrency: 10,
      });
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::Lambda::Function', {
        ReservedConcurrentExecutions: 10,
      });
    });
  });

  // ---- IAM role ----

  void describe('IAM role', () => {
    void it('has AWSLambdaBasicExecutionRole managed policy', () => {
      const bundle = createBundleDir();
      const stack = createStack();

      new ComputeConstruct(stack, 'Compute', {
        name: 'default',
        computeResource: handlerResource(bundle),
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
  });

  // ---- Log retention ----

  void describe('logRetention', () => {
    void it('uses custom logRetention when provided', () => {
      const bundle = createBundleDir();
      const stack = createStack();

      new ComputeConstruct(stack, 'Compute', {
        name: 'default',
        computeResource: handlerResource(bundle),
        logRetention: RetentionDays.ONE_MONTH,
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('Custom::LogRetention', {
        RetentionInDays: 30,
      });
    });

    void it('defaults to TWO_WEEKS when logRetention is not set', () => {
      const bundle = createBundleDir();
      const stack = createStack();

      new ComputeConstruct(stack, 'Compute', {
        name: 'default',
        computeResource: handlerResource(bundle),
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('Custom::LogRetention', {
        RetentionInDays: 14,
      });
    });
  });
});
