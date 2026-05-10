import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { CfnOutput, NestedStack, Stack } from 'aws-cdk-lib';
import { CDKContextKey } from '@aws-amplify/platform-core';
import { HostingResult, defineHosting } from './factory.js';
import { DeployManifest } from './manifest/types.js';

/**
 * Set CDK context values that defineHosting reads via `new App()`.
 */
const setHostingContext = (overrides: Record<string, string> = {}) => {
  const context: Record<string, string> = {
    [CDKContextKey.BACKEND_NAMESPACE]: 'test-namespace',
    [CDKContextKey.BACKEND_NAME]: 'hosting',
    [CDKContextKey.DEPLOYMENT_TYPE]: 'standalone',
    ...overrides,
  };
  process.env.CDK_CONTEXT_JSON = JSON.stringify(context);
};

const clearHostingContext = () => {
  delete process.env.CDK_CONTEXT_JSON;
};

/**
 * Minimal SPA manifest for testing.
 */
const minimalSpaManifest = (staticDir: string): DeployManifest => ({
  version: 1,
  compute: {},
  staticAssets: { directory: staticDir },
  routes: [{ pattern: '/*', target: 'static' }],
  buildId: 'test-build-1',
});

/**
 * Create a temporary project directory with static assets.
 */
const createTestProjectDir = (): string => {
  const tmpDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'hosting-factory-test-'),
  );
  const staticDir = path.join(tmpDir, '.amplify-hosting', 'static');
  fs.mkdirSync(staticDir, { recursive: true });
  fs.writeFileSync(path.join(staticDir, 'index.html'), '<html></html>');

  // Also create a dist/ with index.html for the SPA adapter
  const distDir = path.join(tmpDir, 'dist');
  fs.mkdirSync(distDir, { recursive: true });
  fs.writeFileSync(path.join(distDir, 'index.html'), '<html></html>');

  return tmpDir;
};

/**
 * A custom adapter that returns a pre-built manifest.
 */
const testAdapter = (projectDir: string): DeployManifest => {
  const staticDir = path.join(projectDir, '.amplify-hosting', 'static');
  if (!fs.existsSync(staticDir)) {
    fs.mkdirSync(staticDir, { recursive: true });
    fs.writeFileSync(path.join(staticDir, 'index.html'), '<html></html>');
  }
  return minimalSpaManifest(staticDir);
};

/**
 * Call defineHosting() with a prepared project directory.
 */
const createHostingResult = (projectDir: string): HostingResult => {
  const originalCwd = process.cwd;
  process.cwd = () => projectDir;
  try {
    return defineHosting({
      framework: 'spa',
      customAdapter: testAdapter,
    });
  } finally {
    process.cwd = originalCwd;
  }
};

void describe('defineHosting', () => {
  const savedAccount = process.env.CDK_DEFAULT_ACCOUNT;
  const savedRegion = process.env.CDK_DEFAULT_REGION;

  beforeEach(() => {
    clearHostingContext();
    process.removeAllListeners('message');
  });

  afterEach(() => {
    if (savedAccount !== undefined) {
      process.env.CDK_DEFAULT_ACCOUNT = savedAccount;
    } else {
      delete process.env.CDK_DEFAULT_ACCOUNT;
    }
    if (savedRegion !== undefined) {
      process.env.CDK_DEFAULT_REGION = savedRegion;
    } else {
      delete process.env.CDK_DEFAULT_REGION;
    }
  });

  void it('throws when CDK context is missing', () => {
    process.env.CDK_CONTEXT_JSON = JSON.stringify({});
    assert.throws(
      () => defineHosting({ framework: 'spa' }),
      (err: Error) => {
        const isContextError =
          err.message.includes('CDK context value is not a string') ||
          err.message.includes('No context value present for');
        assert.ok(
          isContextError,
          `Expected context error, got: ${err.message}`,
        );
        return true;
      },
    );
  });

  void it('rejects invalid deployment type', () => {
    setHostingContext({ [CDKContextKey.DEPLOYMENT_TYPE]: 'invalid' });
    assert.throws(
      () => defineHosting({ framework: 'spa' }),
      (err: Error) => {
        assert.ok(err.message.includes('CDK context value is not in'));
        return true;
      },
    );
  });

  void it('sets stack env when domain is configured', () => {
    setHostingContext();
    process.env.CDK_DEFAULT_ACCOUNT = '123456789012';
    process.env.CDK_DEFAULT_REGION = 'us-west-2';

    assert.throws(
      () =>
        defineHosting({
          framework: 'spa',
          domain: { domainName: 'app.example.com', hostedZone: 'example.com' },
        }),
      (err: Error) => {
        assert.ok(
          !err.message.includes('account/region are not specified'),
          `Stack env should be set when domain is configured: ${err.message}`,
        );
        return true;
      },
    );
  });
});

void describe('createStack', () => {
  let projectDir: string;

  const savedAccount = process.env.CDK_DEFAULT_ACCOUNT;
  const savedRegion = process.env.CDK_DEFAULT_REGION;

  beforeEach(() => {
    clearHostingContext();
    setHostingContext();
    process.removeAllListeners('message');
    projectDir = createTestProjectDir();
  });

  afterEach(() => {
    fs.rmSync(projectDir, { recursive: true, force: true });
    if (savedAccount !== undefined) {
      process.env.CDK_DEFAULT_ACCOUNT = savedAccount;
    } else {
      delete process.env.CDK_DEFAULT_ACCOUNT;
    }
    if (savedRegion !== undefined) {
      process.env.CDK_DEFAULT_REGION = savedRegion;
    } else {
      delete process.env.CDK_DEFAULT_REGION;
    }
  });

  void it('returns a NestedStack under the root stack', () => {
    const result = createHostingResult(projectDir);
    const customStack = result.createStack('custom');

    assert.ok(customStack instanceof Stack);
    assert.ok(customStack instanceof NestedStack);

    const rootStack = result.stack;
    const childConstructIds = rootStack.node.findAll().map((c) => c.node.id);
    assert.ok(childConstructIds.includes('custom'));
  });

  void it('throws when creating a stack with a duplicate name', () => {
    const result = createHostingResult(projectDir);
    result.createStack('foo');

    assert.throws(
      () => result.createStack('foo'),
      (err: Error) => {
        assert.ok(err.message.includes('foo'));
        assert.ok(err.message.includes('already been created'));
        return true;
      },
    );
  });

  void it('creates independent stacks with different names', () => {
    const result = createHostingResult(projectDir);
    const stackA = result.createStack('alpha');
    const stackB = result.createStack('beta');

    assert.ok(stackA instanceof NestedStack);
    assert.ok(stackB instanceof NestedStack);
    assert.notStrictEqual(stackA, stackB);
    assert.strictEqual(stackA.node.id, 'alpha');
    assert.strictEqual(stackB.node.id, 'beta');
  });
});

void describe('createStack integration', () => {
  let projectDir: string;

  beforeEach(() => {
    clearHostingContext();
    setHostingContext();
    process.removeAllListeners('message');
    projectDir = createTestProjectDir();
  });

  afterEach(() => {
    fs.rmSync(projectDir, { recursive: true, force: true });
  });

  void it('custom stack resources appear in CDK synth output', () => {
    const result = createHostingResult(projectDir);
    const monitoringStack = result.createStack('monitoring');

    new CfnOutput(monitoringStack, 'TestOutput', {
      value: 'hello-from-monitoring',
      description: 'Test output in custom stack',
    });

    const app = result.stack.node.root;
    const assembly = (app as import('aws-cdk-lib').App).synth({
      errorOnDuplicateSynth: false,
    });

    const rootArtifact = assembly.stacks.find(
      (s) => s.stackName === result.stack.stackName,
    );
    assert.ok(rootArtifact);

    const rootTemplate = rootArtifact!.template;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const cfnResources = rootTemplate.Resources as Record<
      string,
      Record<string, unknown>
    >;
    const nestedStackResources = Object.entries(cfnResources).filter(
      ([, v]) => v.Type === 'AWS::CloudFormation::Stack',
    );

    const monitoringEntry = nestedStackResources.find(([key]) =>
      key.startsWith('monitoring'),
    );
    assert.ok(
      monitoringEntry,
      'root template should contain monitoring nested stack',
    );
  });
});
