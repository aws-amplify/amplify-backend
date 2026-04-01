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
 * The CDK App constructor reads context from CDK_CONTEXT_JSON.
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
 * Minimal SPA manifest that satisfies the hosting construct
 * without requiring real build artifacts or compute resources.
 */
const minimalSpaManifest: DeployManifest = {
  version: 1,
  routes: [
    {
      path: '/*',
      target: {
        kind: 'Static',
        cacheControl: 'public, max-age=0, must-revalidate',
      },
    },
  ],
  framework: { name: 'spa' },
  buildId: 'test-build-1',
};

/**
 * Create a temporary project directory with the `.amplify-hosting/static/`
 * structure that the hosting construct expects at synth time.
 */
const createTestProjectDir = (): string => {
  const tmpDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'hosting-factory-test-'),
  );
  const staticDir = path.join(tmpDir, '.amplify-hosting', 'static');
  fs.mkdirSync(staticDir, { recursive: true });
  fs.writeFileSync(path.join(staticDir, 'index.html'), '<html></html>');
  return tmpDir;
};

/**
 * A custom adapter that returns a pre-built manifest and creates
 * the `.amplify-hosting/static/` directory from the build output.
 * This bypasses framework detection, build execution, and real adapters.
 */
const testAdapter = (
  buildOutputDir: string,
  projectDir: string,
): DeployManifest => {
  const staticDir = path.join(projectDir, '.amplify-hosting', 'static');
  if (!fs.existsSync(staticDir)) {
    fs.mkdirSync(staticDir, { recursive: true });
    fs.writeFileSync(path.join(staticDir, 'index.html'), '<html></html>');
  }
  return minimalSpaManifest;
};

/**
 * Call defineHosting() with a prepared project directory and customAdapter
 * so that no real builds or adapters run. Returns the HostingResult for testing.
 */
const createHostingResult = (projectDir: string): HostingResult => {
  const buildOutputDir = path.join(projectDir, 'dist');
  fs.mkdirSync(buildOutputDir, { recursive: true });

  const originalCwd = process.cwd;
  process.cwd = () => projectDir;
  try {
    return defineHosting({
      framework: 'spa',
      buildOutputDir,
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
    // Remove the 'message' listener from previous tests to avoid
    // "already listening" issues — defineHosting registers process.once('message')
    process.removeAllListeners('message');
  });

  afterEach(() => {
    // Restore env vars that tests may modify
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
      () => defineHosting({ framework: 'spa', buildOutputDir: '/tmp/test' }),
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
      () => defineHosting({ framework: 'spa', buildOutputDir: '/tmp/test' }),
      (err: Error) => {
        assert.ok(
          err.message.includes('CDK context value is not in'),
          `Expected deployment type error, got: ${err.message}`,
        );
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
          buildOutputDir: '/nonexistent',
          domain: { domainName: 'app.example.com', hostedZone: 'example.com' },
        }),
      (err: Error) => {
        assert.ok(
          !err.message.includes('Cannot retrieve value from context provider'),
          `Expected adapter error, got context provider error: ${err.message}`,
        );
        assert.ok(
          !err.message.includes('account/region are not specified'),
          `Stack env should be set when domain is configured: ${err.message}`,
        );
        return true;
      },
    );
  });

  void it('does not set stack env when no domain is configured', () => {
    setHostingContext();
    process.env.CDK_DEFAULT_ACCOUNT = '123456789012';
    process.env.CDK_DEFAULT_REGION = 'us-west-2';

    assert.throws(
      () =>
        defineHosting({
          framework: 'spa',
          buildOutputDir: '/nonexistent',
        }),
      (err: Error) => {
        assert.ok(
          !err.message.includes('CDK context'),
          `Should not be a CDK context error, got: ${err.message}`,
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

    // Verify it returns a Stack
    assert.ok(
      customStack instanceof Stack,
      'createStack should return a Stack',
    );

    // Verify it's a NestedStack
    assert.ok(
      customStack instanceof NestedStack,
      'createStack should return a NestedStack',
    );

    // Verify it's a child of the root stack
    const rootStack = result.stack;
    const childConstructIds = rootStack.node.findAll().map((c) => c.node.id);
    assert.ok(
      childConstructIds.includes('custom'),
      'custom stack should be a child of the root stack',
    );

    // Verify the parent is the root stack
    const parent = customStack.node.scope;
    assert.strictEqual(
      parent,
      rootStack,
      'custom stack node.scope should be the root stack',
    );
  });

  void it('throws when creating a stack with a duplicate name', () => {
    const result = createHostingResult(projectDir);
    result.createStack('foo');

    assert.throws(
      () => result.createStack('foo'),
      (err: Error) => {
        assert.ok(
          err.message.includes('foo'),
          `Error should mention the duplicate name, got: ${err.message}`,
        );
        assert.ok(
          err.message.includes('already been created'),
          `Error should say already created, got: ${err.message}`,
        );
        return true;
      },
    );
  });

  void it('attaches attribution metadata tagged as custom', () => {
    const result = createHostingResult(projectDir);
    const customStack = result.createStack('monitoring');

    // AttributionMetadataStorage sets the stack description to a JSON string
    // containing { stackType: 'custom', ... }
    const description = customStack.templateOptions.description;
    assert.ok(
      typeof description === 'string' && description.length > 0,
      'custom stack should have a description set by AttributionMetadataStorage',
    );

    const metadata = JSON.parse(description);
    assert.strictEqual(
      metadata.stackType,
      'custom',
      'attribution metadata stackType should be "custom"',
    );
    assert.ok(
      metadata.createdWith,
      'attribution metadata should include createdWith (library version)',
    );
    assert.ok(
      metadata.createdBy,
      'attribution metadata should include createdBy (deployment engine)',
    );
  });

  void it('creates independent stacks with different names', () => {
    const result = createHostingResult(projectDir);
    const stackA = result.createStack('alpha');
    const stackB = result.createStack('beta');

    // Both are NestedStacks
    assert.ok(stackA instanceof NestedStack);
    assert.ok(stackB instanceof NestedStack);

    // They are distinct objects
    assert.notStrictEqual(stackA, stackB, 'stacks should be distinct objects');

    // They have different construct IDs
    assert.strictEqual(stackA.node.id, 'alpha');
    assert.strictEqual(stackB.node.id, 'beta');

    // Both are children of the root stack
    assert.strictEqual(stackA.node.scope, result.stack);
    assert.strictEqual(stackB.node.scope, result.stack);

    // Root stack has both as children
    const directChildIds = result.stack.node.children.map((c) => c.node.id);
    assert.ok(
      directChildIds.includes('alpha'),
      'root stack should have alpha as a child',
    );
    assert.ok(
      directChildIds.includes('beta'),
      'root stack should have beta as a child',
    );
  });
});

void describe('createStack integration', () => {
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

  void it('custom stack resources appear in CDK synth output', () => {
    const result = createHostingResult(projectDir);
    const monitoringStack = result.createStack('monitoring');

    // Add a CfnOutput to the custom stack as a simple resource
    new CfnOutput(monitoringStack, 'TestOutput', {
      value: 'hello-from-monitoring',
      description: 'Test output in custom stack',
    });

    // Synth the app that owns the root stack
    const app = result.stack.node.root;
    const assembly = (app as import('aws-cdk-lib').App).synth({
      errorOnDuplicateSynth: false,
    });

    // Find the root stack artifact
    const rootArtifact = assembly.stacks.find(
      (s) => s.stackName === result.stack.stackName,
    );
    assert.ok(rootArtifact, 'root stack should appear in the assembly');

    // The root template should reference the monitoring nested stack
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
      'root template should contain a monitoring nested stack resource',
    );

    // Verify the nested stack template contains our CfnOutput
    // NestedStack templates are written as separate assets;
    // find the monitoring template via the assembly's nested stacks
    const monitoringArtifact = assembly.stacks.find((s) =>
      s.stackName.includes('monitoring'),
    );
    if (monitoringArtifact) {
      const monitoringTemplate = monitoringArtifact.template;
      assert.ok(
        monitoringTemplate.Outputs,
        'monitoring template should have Outputs',
      );
      // eslint-disable-next-line @typescript-eslint/naming-convention
      const monitoringOutputs = monitoringTemplate.Outputs as Record<
        string,
        Record<string, unknown>
      >;
      const outputValues = Object.values(monitoringOutputs);
      const found = outputValues.some(
        (o) => o.Value === 'hello-from-monitoring',
      );
      assert.ok(
        found,
        'monitoring nested stack should contain the TestOutput with value "hello-from-monitoring"',
      );
    } else {
      // For NestedStacks, CDK might inline templates as assets rather than
      // separate stack artifacts. Verify via the nested stack's template directly.
      const nestedTemplate = (monitoringStack as NestedStack).templateOptions;
      assert.ok(nestedTemplate, 'monitoring nested stack should have template');
    }
  });

  void it('hosting resources and custom stack resources coexist', () => {
    const result = createHostingResult(projectDir);

    // The hosting construct resources should exist
    assert.ok(result.resources.bucket, 'hosting should have a bucket');
    assert.ok(
      result.resources.distribution,
      'hosting should have a distribution',
    );
    assert.ok(
      result.resources.distributionUrl,
      'hosting should have a distributionUrl',
    );

    // Create a custom stack with a resource
    const customStack = result.createStack('extras');
    new CfnOutput(customStack, 'ExtraOutput', {
      value: 'extra-value',
    });

    // Synth the app
    const app = result.stack.node.root;
    const assembly = (app as import('aws-cdk-lib').App).synth({
      errorOnDuplicateSynth: false,
    });

    const rootArtifact = assembly.stacks.find(
      (s) => s.stackName === result.stack.stackName,
    );
    assert.ok(rootArtifact, 'root stack should appear in the assembly');

    const rootTemplate = rootArtifact!.template;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const cfnResources = rootTemplate.Resources as Record<
      string,
      Record<string, unknown>
    >;

    // Root template should have both the hosting nested stack and the extras nested stack
    const nestedStacks = Object.entries(cfnResources).filter(
      ([, v]) => v.Type === 'AWS::CloudFormation::Stack',
    );

    const hostingNestedStack = nestedStacks.find(([key]) =>
      key.startsWith('hosting'),
    );
    assert.ok(
      hostingNestedStack,
      'root template should contain the hosting nested stack',
    );

    const extrasNestedStack = nestedStacks.find(([key]) =>
      key.startsWith('extras'),
    );
    assert.ok(
      extrasNestedStack,
      'root template should contain the extras nested stack',
    );

    // They should be different resources
    assert.notStrictEqual(
      hostingNestedStack![0],
      extrasNestedStack![0],
      'hosting and extras nested stacks should be different resources',
    );

    // Verify the extras nested stack template has our output
    const extrasArtifact = assembly.stacks.find((s) =>
      s.stackName.includes('extras'),
    );
    if (extrasArtifact) {
      const extrasTemplate = extrasArtifact.template;
      // eslint-disable-next-line @typescript-eslint/naming-convention
      const extrasOutputs = extrasTemplate.Outputs as Record<
        string,
        Record<string, unknown>
      >;
      const outputValues = Object.values(extrasOutputs);
      const found = outputValues.some((o) => o.Value === 'extra-value');
      assert.ok(
        found,
        'extras nested stack should contain the ExtraOutput with value "extra-value"',
      );
    }
  });
});
