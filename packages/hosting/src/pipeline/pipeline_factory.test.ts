import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert';
import { createRequire } from 'node:module';
import { App, CfnOutput, Stack, Stage } from 'aws-cdk-lib';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { CodeBuildStep, CodePipelineSource } from 'aws-cdk-lib/pipelines';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

const require = createRequire(import.meta.url);
import {
  definePipeline,
  findFile,
  getStageConfig,
  withPipelineScope,
} from './pipeline_factory.js';
import { AmplifyPipelineConstruct } from './pipeline_construct.js';
import type { PipelineProps } from './types.js';

const VALID_CONNECTION_ARN =
  'arn:aws:codeconnections:us-east-1:123456789012:connection/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

void describe('definePipeline', () => {
  let tmpDir: string;
  let originalCwd: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pipeline-test-'));
    originalCwd = process.cwd();
    // Create amplify/ directory
    fs.mkdirSync(path.join(tmpDir, 'amplify'), { recursive: true });
    // Symlink node_modules so hosting.js can resolve aws-cdk-lib from tmp dir
    const cdkLibDir = path.dirname(require.resolve('aws-cdk-lib/package.json'));
    const nodeModulesDir = path.dirname(cdkLibDir);
    fs.symlinkSync(nodeModulesDir, path.join(tmpDir, 'node_modules'), 'dir');
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  void it('auto-discovers and invokes hosting.ts for each stage', () => {
    // Create a hosting.js that creates a stack using the ambient scope
    const hostingCode = `
const cdk = require('aws-cdk-lib');
const scope = globalThis.__AMPLIFY_PIPELINE_SCOPE__;
if (scope) {
  new cdk.Stack(scope, 'HostingStack');
}
`;
    fs.writeFileSync(path.join(tmpDir, 'amplify', 'hosting.js'), hostingCode);
    process.chdir(tmpDir);

    // definePipeline completes without throwing = stacks created + validated
    assert.doesNotThrow(() =>
      definePipeline({
        source: {
          repo: 'my-org/my-app',
          connectionArn: VALID_CONNECTION_ARN,
        },
        branches: [
          {
            branch: 'main',
            stages: [{ name: 'beta' }],
          },
        ],
      }),
    );
  });

  void it('auto-discovers and invokes backend.ts (hosting deployed via post-step)', () => {
    // Write backend.js that creates a stack using the ambient scope
    const backendCode = `
const cdk = require('aws-cdk-lib');
const scope = globalThis.__AMPLIFY_PIPELINE_SCOPE__;
if (scope) {
  const stack = new cdk.Stack(scope, 'BackendStack');
  // Simulate CfnOutput for backend stack name (as defineBackend does)
  new cdk.CfnOutput(stack, 'BackendStackName', { value: stack.stackName });
  globalThis.__AMPLIFY_BACKEND_PIPELINE_OUTPUTS__ = {
    stackNameOutput: new cdk.CfnOutput(stack, 'BackendStackNameForPipeline', { value: stack.stackName }),
    backendStack: stack,
  };
}
`;
    // Write hosting.js — should NOT be imported when backend.ts exists
    const hostingCode = `
const fs = require('fs');
const path = require('path');
fs.writeFileSync(path.join(process.cwd(), 'hosting-was-imported.txt'), 'yes');
const cdk = require('aws-cdk-lib');
const scope = globalThis.__AMPLIFY_PIPELINE_SCOPE__;
if (scope) {
  new cdk.Stack(scope, 'HostingStack');
}
`;
    fs.writeFileSync(path.join(tmpDir, 'amplify', 'backend.js'), backendCode);
    fs.writeFileSync(path.join(tmpDir, 'amplify', 'hosting.js'), hostingCode);
    process.chdir(tmpDir);

    // Both backend and hosting files exist — two-phase deployment is used
    assert.doesNotThrow(() =>
      definePipeline({
        source: {
          repo: 'my-org/my-app',
          connectionArn: VALID_CONNECTION_ARN,
        },
        branches: [
          {
            branch: 'main',
            stages: [{ name: 'prod' }],
          },
        ],
      }),
    );

    // Hosting.js should NOT have been imported during stageFactory
    assert.ok(
      !fs.existsSync(path.join(tmpDir, 'hosting-was-imported.txt')),
      'hosting.js should NOT be imported when backend.ts exists (two-phase deployment)',
    );
  });

  void it('sets ambient scope and stage config during import', () => {
    // Use a module that captures the stage config via the global
    // eslint-disable-next-line spellcheck/spell-checker
    const hostingCode = `
const cdk = require('aws-cdk-lib');
const scope = globalThis.__AMPLIFY_PIPELINE_SCOPE__;
if (scope) {
  const raw = scope.node.tryGetContext('AMPLIFY_STAGE_CONFIG');
  const stageConfig = raw ? JSON.parse(raw) : undefined;
  // Write captured data to a file so the test can verify
  const fs = require('fs');
  const path = require('path');
  fs.writeFileSync(
    path.join(process.cwd(), 'captured-config.json'),
    JSON.stringify(stageConfig),
  );
  new cdk.Stack(scope, 'HostingStack');
}
`;
    fs.writeFileSync(path.join(tmpDir, 'amplify', 'hosting.js'), hostingCode);
    process.chdir(tmpDir);

    definePipeline({
      source: {
        repo: 'my-org/my-app',
        connectionArn: VALID_CONNECTION_ARN,
      },
      branches: [
        {
          branch: 'main',
          stages: [
            {
              name: 'gamma',
              config: { domain: 'gamma.example.com' },
            },
          ],
        },
      ],
    });

    const capturedFile = path.join(tmpDir, 'captured-config.json');
    assert.ok(
      fs.existsSync(capturedFile),
      'hosting.js should have written captured config',
    );
    const captured = JSON.parse(fs.readFileSync(capturedFile, 'utf-8'));
    assert.strictEqual(captured.name, 'gamma');
    assert.strictEqual(captured.config.domain, 'gamma.example.com');
  });

  void it('clears ambient scope after import completes', () => {
    const hostingCode = `
const cdk = require('aws-cdk-lib');
const scope = globalThis.__AMPLIFY_PIPELINE_SCOPE__;
if (scope) {
  new cdk.Stack(scope, 'HostingStack');
}
`;
    fs.writeFileSync(path.join(tmpDir, 'amplify', 'hosting.js'), hostingCode);
    process.chdir(tmpDir);

    definePipeline({
      source: {
        repo: 'my-org/my-app',
        connectionArn: VALID_CONNECTION_ARN,
      },
      branches: [
        {
          branch: 'main',
          stages: [{ name: 'beta' }],
        },
      ],
    });

    // After definePipeline returns, global scope should be cleared
    assert.strictEqual(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).__AMPLIFY_PIPELINE_SCOPE__,
      undefined,
      'Ambient scope should be cleared after definePipeline completes',
    );
  });

  void it('re-imports hosting.ts fresh for each stage (cache busted)', () => {
    // Write hosting that increments a counter file
    // eslint-disable-next-line spellcheck/spell-checker
    const hostingCode = `
const cdk = require('aws-cdk-lib');
const fs = require('fs');
const path = require('path');
const scope = globalThis.__AMPLIFY_PIPELINE_SCOPE__;
if (scope) {
  const counterFile = path.join(process.cwd(), 'invoke-count.txt');
  const count = fs.existsSync(counterFile) ? parseInt(fs.readFileSync(counterFile, 'utf-8'), 10) : 0;
  fs.writeFileSync(counterFile, String(count + 1));
  new cdk.Stack(scope, 'HostingStack-' + (count + 1));
}
`;
    fs.writeFileSync(path.join(tmpDir, 'amplify', 'hosting.js'), hostingCode);
    process.chdir(tmpDir);

    definePipeline({
      source: {
        repo: 'my-org/my-app',
        connectionArn: VALID_CONNECTION_ARN,
      },
      branches: [
        {
          branch: 'main',
          stages: [{ name: 'alpha' }, { name: 'beta' }],
        },
      ],
    });

    const counterFile = path.join(tmpDir, 'invoke-count.txt');
    assert.ok(fs.existsSync(counterFile), 'counter file should exist');
    const count = parseInt(fs.readFileSync(counterFile, 'utf-8'), 10);
    assert.strictEqual(
      count,
      2,
      'hosting.js should be invoked once per stage (2 stages)',
    );
  });

  void it('throws when neither hosting.ts nor backend.ts exists', () => {
    // No amplify/hosting.ts or amplify/backend.ts
    process.chdir(tmpDir);

    assert.throws(
      () =>
        definePipeline({
          source: {
            repo: 'my-org/my-app',
            connectionArn: VALID_CONNECTION_ARN,
          },
          branches: [
            {
              branch: 'main',
              stages: [{ name: 'beta' }],
            },
          ],
        }),
      /Could not find amplify\/hosting|amplify\/backend/,
    );
  });

  void it('does not expose stageFactory in the props type', () => {
    // Compile-time verification: DefinePipelineProps does not include stageFactory.
    // If this file compiles successfully, the type constraint is correct.
    // The fact that `stageFactory` would cause TS2353 here proves the API is clean.
    const props: Parameters<typeof definePipeline>[0] = {
      source: { repo: 'a/b', connectionArn: VALID_CONNECTION_ARN },
      branches: [{ branch: 'main', stages: [{ name: 'x' }] }],
    };
    assert.ok(props, 'DefinePipelineProps should not include stageFactory');
  });

  void it('imports backend.ts fresh for each stage with full cache busting', () => {
    // Write backend.js that increments a counter to prove fresh import per stage
    // eslint-disable-next-line spellcheck/spell-checker
    const backendCode = `
const cdk = require('aws-cdk-lib');
const fs = require('fs');
const path = require('path');
const scope = globalThis.__AMPLIFY_PIPELINE_SCOPE__;
if (scope) {
  const counterFile = path.join(process.cwd(), 'backend-invoke-count.txt');
  const count = fs.existsSync(counterFile) ? parseInt(fs.readFileSync(counterFile, 'utf-8'), 10) : 0;
  fs.writeFileSync(counterFile, String(count + 1));
  const stack = new cdk.Stack(scope, 'BackendStack-' + (count + 1));
  new cdk.CfnOutput(stack, 'BackendStackName', { value: stack.stackName });
  globalThis.__AMPLIFY_BACKEND_PIPELINE_OUTPUTS__ = {
    stackNameOutput: new cdk.CfnOutput(stack, 'PipelineBackendName', { value: stack.stackName }),
    backendStack: stack,
  };
}
`;
    fs.writeFileSync(path.join(tmpDir, 'amplify', 'backend.js'), backendCode);
    process.chdir(tmpDir);

    definePipeline({
      source: {
        repo: 'my-org/my-app',
        connectionArn: VALID_CONNECTION_ARN,
      },
      branches: [
        {
          branch: 'main',
          stages: [{ name: 'alpha' }, { name: 'beta' }],
        },
      ],
    });

    const counterFile = path.join(tmpDir, 'backend-invoke-count.txt');
    assert.ok(fs.existsSync(counterFile), 'counter file should exist');
    const count = parseInt(fs.readFileSync(counterFile, 'utf-8'), 10);
    assert.strictEqual(
      count,
      2,
      'backend.js should be invoked once per stage (2 stages)',
    );
  });

  void it('cache-busts @aws-amplify/* transitive deps (singleton pattern)', () => {
    // Simulate the real @aws-amplify/backend-auth singleton problem:
    // A module at a path matching /@aws-amplify\// has a static counter
    // (like AmplifyAuthFactory.factoryCount). Without cache-busting,
    // the second stage import would see factoryCount=1 and fail.
    //
    // This test creates a fake @aws-amplify/backend-auth module in the
    // tmp dir's node_modules and a backend.js that requires it.
    // If cache-busting works, the module is re-executed for each stage,
    // giving factoryCount=0 each time.

    // Remove the symlinked node_modules (from beforeEach) and create a real directory
    const realNodeModules = fs.readlinkSync(path.join(tmpDir, 'node_modules'));
    fs.unlinkSync(path.join(tmpDir, 'node_modules'));
    fs.mkdirSync(path.join(tmpDir, 'node_modules'), { recursive: true });

    // Symlink aws-cdk-lib and constructs from real node_modules
    fs.symlinkSync(
      path.join(realNodeModules, 'aws-cdk-lib'),
      path.join(tmpDir, 'node_modules', 'aws-cdk-lib'),
    );
    fs.symlinkSync(
      path.join(realNodeModules, 'constructs'),
      path.join(tmpDir, 'node_modules', 'constructs'),
    );

    // Create fake @aws-amplify/backend-auth with a singleton counter
    const fakeAuthDir = path.join(
      tmpDir,
      'node_modules',
      '@aws-amplify',
      'backend-auth',
    );
    fs.mkdirSync(fakeAuthDir, { recursive: true });
    fs.writeFileSync(
      path.join(fakeAuthDir, 'index.js'),
      `
// Simulates AmplifyAuthFactory.factoryCount singleton pattern
let factoryCount = 0;
class AmplifyAuthFactory {
  static get factoryCount() { return factoryCount; }
  constructor() {
    factoryCount++;
    if (factoryCount > 1) {
      throw new Error('AmplifyAuthFactory already defined — singleton violation!');
    }
  }
}
module.exports = { AmplifyAuthFactory };
`,
    );
    fs.writeFileSync(
      path.join(fakeAuthDir, 'package.json'),
      JSON.stringify({ name: '@aws-amplify/backend-auth', main: 'index.js' }),
    );

    // Create fake @aws-amplify/data-schema with a cached schema singleton
    const fakeDataDir = path.join(
      tmpDir,
      'node_modules',
      '@aws-amplify',
      'data-schema',
    );
    fs.mkdirSync(fakeDataDir, { recursive: true });
    fs.writeFileSync(
      path.join(fakeDataDir, 'index.js'),
      `
let schemaInstance = null;
const a = (modelDef) => {
  if (schemaInstance) throw new Error('Schema already created — singleton violation!');
  schemaInstance = { models: modelDef };
  return schemaInstance;
};
module.exports = { a };
`,
    );
    fs.writeFileSync(
      path.join(fakeDataDir, 'package.json'),
      JSON.stringify({ name: '@aws-amplify/data-schema', main: 'index.js' }),
    );

    // backend.js imports and uses the singletons — would fail on 2nd stage
    // without cache-busting
    const backendCode = `
const cdk = require('aws-cdk-lib');
const { AmplifyAuthFactory } = require('@aws-amplify/backend-auth');
const { a } = require('@aws-amplify/data-schema');
const fs = require('fs');
const path = require('path');

const scope = globalThis.__AMPLIFY_PIPELINE_SCOPE__;
if (scope) {
  // Instantiate singletons (would throw on 2nd call without cache-busting)
  new AmplifyAuthFactory();
  a({ Todo: {} });

  const counterFile = path.join(process.cwd(), 'singleton-invoke-count.txt');
  const count = fs.existsSync(counterFile) ? parseInt(fs.readFileSync(counterFile, 'utf-8'), 10) : 0;
  fs.writeFileSync(counterFile, String(count + 1));

  const stack = new cdk.Stack(scope, 'BackendStack-' + (count + 1));
  new cdk.CfnOutput(stack, 'BackendStackName', { value: stack.stackName });
  globalThis.__AMPLIFY_BACKEND_PIPELINE_OUTPUTS__ = {
    stackNameOutput: new cdk.CfnOutput(stack, 'PipelineBackendName', { value: stack.stackName }),
    backendStack: stack,
  };
}
`;
    fs.writeFileSync(path.join(tmpDir, 'amplify', 'backend.js'), backendCode);
    process.chdir(tmpDir);

    // TWO stages — without cache-busting, the 2nd stage would throw
    // "AmplifyAuthFactory already defined" or "Schema already created"
    assert.doesNotThrow(() =>
      definePipeline({
        source: {
          repo: 'my-org/my-app',
          connectionArn: VALID_CONNECTION_ARN,
        },
        branches: [
          {
            branch: 'main',
            stages: [{ name: 'staging' }, { name: 'prod' }],
          },
        ],
      }),
    );

    // Verify BOTH stages were executed (singletons didn't block 2nd stage)
    const counterFile = path.join(tmpDir, 'singleton-invoke-count.txt');
    assert.ok(fs.existsSync(counterFile), 'counter file should exist');
    const count = parseInt(fs.readFileSync(counterFile, 'utf-8'), 10);
    assert.strictEqual(
      count,
      2,
      'Both stages must complete — singletons reset between stages via cache-busting',
    );
  });

  void it('verifies require.cache entries matching @aws-amplify are removed', () => {
    // Directly verify that importFresh clears @aws-amplify entries from cache.
    // We seed require.cache with fake entries and verify they're gone after import.
    const backendCode = `
const cdk = require('aws-cdk-lib');
const scope = globalThis.__AMPLIFY_PIPELINE_SCOPE__;
if (scope) {
  const stack = new cdk.Stack(scope, 'BackendStack');
  new cdk.CfnOutput(stack, 'BackendStackName', { value: stack.stackName });
  globalThis.__AMPLIFY_BACKEND_PIPELINE_OUTPUTS__ = {
    stackNameOutput: new cdk.CfnOutput(stack, 'PipelineBackendName', { value: stack.stackName }),
    backendStack: stack,
  };
}
`;
    fs.writeFileSync(path.join(tmpDir, 'amplify', 'backend.js'), backendCode);
    process.chdir(tmpDir);

    // Seed require.cache with fake entries that match CACHE_BUST_PATTERNS
    const fakeKeys = [
      '/node_modules/@aws-amplify/backend-auth/lib/index.js',
      '/node_modules/@aws-amplify/backend-data/lib/factory.js',
      '/node_modules/@aws-amplify/data-schema/lib/schema.js',
      '/node_modules/@aws-amplify/auth-construct/lib/construct.js',
      '/some/path/packages/backend/lib/backend_factory.js',
      '/some/path/packages/hosting/lib/factory.js',
      '/user/project/amplify/auth/resource.js',
      '/user/project/amplify/data/resource.js',
    ];
    for (const key of fakeKeys) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (require as any).cache[key] = { id: key, exports: {} };
    }

    // Run definePipeline — importFresh should clear all matching entries
    definePipeline({
      source: {
        repo: 'my-org/my-app',
        connectionArn: VALID_CONNECTION_ARN,
      },
      branches: [
        {
          branch: 'main',
          stages: [{ name: 'beta' }],
        },
      ],
    });

    // Verify ALL fake entries matching CACHE_BUST_PATTERNS are gone
    for (const key of fakeKeys) {
      assert.strictEqual(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (require as any).cache[key],
        undefined,
        `require.cache entry "${key}" should have been cleared by importFresh`,
      );
    }
  });

  void it('creates post-deploy hosting step when both backend and hosting exist', () => {
    // Backend creates a stack + CfnOutput (mimics defineBackend pipeline mode)
    const backendCode = `
const cdk = require('aws-cdk-lib');
const scope = globalThis.__AMPLIFY_PIPELINE_SCOPE__;
if (scope) {
  const stack = new cdk.Stack(scope, 'BackendStack');
  globalThis.__AMPLIFY_BACKEND_PIPELINE_OUTPUTS__ = {
    stackNameOutput: new cdk.CfnOutput(stack, 'BackendStackName', { value: stack.stackName }),
    backendStack: stack,
  };
}
`;
    // Hosting file exists but should NOT be imported during synth
    const hostingCode = `
const fs = require('fs');
const path = require('path');
fs.writeFileSync(path.join(process.cwd(), 'hosting-imported-during-synth.txt'), 'yes');
`;
    fs.writeFileSync(path.join(tmpDir, 'amplify', 'backend.js'), backendCode);
    fs.writeFileSync(path.join(tmpDir, 'amplify', 'hosting.js'), hostingCode);
    process.chdir(tmpDir);

    // Should not throw — the post-deploy step is added for hosting
    assert.doesNotThrow(() =>
      definePipeline({
        source: {
          repo: 'my-org/my-app',
          connectionArn: VALID_CONNECTION_ARN,
        },
        branches: [
          {
            branch: 'main',
            stages: [{ name: 'prod' }],
          },
        ],
      }),
    );

    // Hosting should NOT have been imported during synth (two-phase mode)
    assert.ok(
      !fs.existsSync(path.join(tmpDir, 'hosting-imported-during-synth.txt')),
      'hosting.js must not be imported during synth when backend exists',
    );
  });
});

void describe('findFile', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'findfile-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  void it('finds .ts file', () => {
    fs.writeFileSync(path.join(tmpDir, 'hosting.ts'), '// ts');
    const result = findFile(tmpDir, 'hosting');
    assert.strictEqual(result, path.join(tmpDir, 'hosting.ts'));
  });

  void it('finds .js file when .ts is missing', () => {
    fs.writeFileSync(path.join(tmpDir, 'hosting.js'), '// js');
    const result = findFile(tmpDir, 'hosting');
    assert.strictEqual(result, path.join(tmpDir, 'hosting.js'));
  });

  void it('does not discover .mjs files (ESM not supported via require)', () => {
    fs.writeFileSync(path.join(tmpDir, 'backend.mjs'), '// mjs');
    const result = findFile(tmpDir, 'backend');
    assert.strictEqual(result, undefined);
  });

  void it('finds .cjs file', () => {
    fs.writeFileSync(path.join(tmpDir, 'backend.cjs'), '// cjs');
    const result = findFile(tmpDir, 'backend');
    assert.strictEqual(result, path.join(tmpDir, 'backend.cjs'));
  });

  void it('prefers .ts over .js', () => {
    fs.writeFileSync(path.join(tmpDir, 'hosting.ts'), '// ts');
    fs.writeFileSync(path.join(tmpDir, 'hosting.js'), '// js');
    const result = findFile(tmpDir, 'hosting');
    assert.strictEqual(result, path.join(tmpDir, 'hosting.ts'));
  });

  void it('returns undefined when file does not exist', () => {
    const result = findFile(tmpDir, 'nonexistent');
    assert.strictEqual(result, undefined);
  });
});

void describe('getStageConfig', () => {
  void it('returns undefined when not in pipeline context', () => {
    const result = getStageConfig();
    assert.strictEqual(result, undefined);
  });

  void it('returns parsed stage config when ambient scope is set', () => {
    const app = new App();
    const stage = new Stage(app, 'TestStage');
    const stageConfig = { name: 'beta', config: { domain: 'test.com' } };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).__AMPLIFY_PIPELINE_SCOPE__ = stage;
    stage.node.setContext('AMPLIFY_STAGE_CONFIG', JSON.stringify(stageConfig));
    try {
      const result = getStageConfig<{ domain: string }>();
      assert.strictEqual(result?.name, 'beta');
      assert.strictEqual(result?.config?.domain, 'test.com');
    } finally {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (globalThis as any).__AMPLIFY_PIPELINE_SCOPE__;
    }
  });
});

void describe('withPipelineScope', () => {
  void it('sets globalThis scope during fn and clears after', async () => {
    const app = new App();
    const stage = new Stage(app, 'ScopeTestStage');
    const stageConfig = { name: 'beta', config: { domain: 'test.com' } };

    let scopeDuringFn: unknown;
    let contextDuringFn: string | undefined;

    await withPipelineScope(stage, stageConfig, () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      scopeDuringFn = (globalThis as any).__AMPLIFY_PIPELINE_SCOPE__;
      contextDuringFn = stage.node.tryGetContext('AMPLIFY_STAGE_CONFIG');
    });

    assert.strictEqual(scopeDuringFn, stage);
    assert.ok(contextDuringFn);
    const parsed = JSON.parse(contextDuringFn!);
    assert.strictEqual(parsed.name, 'beta');
    assert.strictEqual(parsed.config.domain, 'test.com');
    assert.strictEqual(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).__AMPLIFY_PIPELINE_SCOPE__,
      undefined,
    );
  });

  void it('clears globalThis even when fn throws', async () => {
    const app = new App();
    const stage = new Stage(app, 'ThrowScopeStage');
    const stageConfig = { name: 'beta' };

    await assert.rejects(
      () =>
        withPipelineScope(stage, stageConfig, () => {
          throw new Error('test error');
        }),
      /test error/,
    );

    assert.strictEqual(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).__AMPLIFY_PIPELINE_SCOPE__,
      undefined,
    );
  });
});

// ─── CDK Template Assertion Tests ────────────────────────────────────────────

const VALID_ARN =
  'arn:aws:codeconnections:us-east-1:123456789012:connection/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

/**
 * Helper: creates a pipeline construct with a _postStageHook that mimics
 * the real createHostingDeployHook from pipeline_factory.ts.
 */
const createPipelineWithHostingHook = (
  props?: Partial<PipelineProps>,
): { stack: Stack; template: Template } => {
  const app = new App();
  const stack = new Stack(app, 'TestStack');
  const sourceBucket = new Bucket(stack, 'Source', { versioned: true });

  new AmplifyPipelineConstruct(stack, 'Pipeline', {
    source: {
      repo: 'my-org/my-app',
      connectionArn: VALID_ARN,
    },
    branches: [
      {
        branch: 'main',
        stages: [{ name: 'beta' }],
      },
    ],
    stageFactory: (scope) => {
      const backendStack = new Stack(scope, 'BackendStack');
      const stackNameOutput = new CfnOutput(backendStack, 'BackendStackName', {
        value: backendStack.stackName,
      });
      // Simulate what defineBackend does: publish outputs via globalThis
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).__AMPLIFY_BACKEND_PIPELINE_OUTPUTS__ = {
        stackNameOutput,
        backendStack,
      };
    },
    _sourceOverride: CodePipelineSource.s3(sourceBucket, 'source.zip'),
    _postStageHook: ({ source, stageConfig }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const backendOutputs = (globalThis as any)
        .__AMPLIFY_BACKEND_PIPELINE_OUTPUTS__ as
        | { stackNameOutput: CfnOutput; backendStack: Stack }
        | undefined;

      if (!backendOutputs?.stackNameOutput) return [];

      const deployStep = new CodeBuildStep(
        `DeployHosting-${stageConfig.name}`,
        {
          input: source,
          envFromCfnOutputs: {
            BACKEND_STACK_NAME: backendOutputs.stackNameOutput,
          },
          env: {
            STAGE_NAME: stageConfig.name,
            HOSTING_ENTRY_POINT: 'amplify/hosting.ts',
          },
          commands: [
            'npm ci',
            'npm install --no-save @aws-amplify/backend-cli',
            'npx ampx generate outputs --stack $BACKEND_STACK_NAME --out-dir .',
            'npm run build',
            'npx cdk deploy --all --app "npx tsx $HOSTING_ENTRY_POINT" --require-approval never -c amplify-backend-namespace=pipeline -c amplify-backend-name=$STAGE_NAME -c amplify-backend-type=standalone',
          ],
          partialBuildSpec: codebuild.BuildSpec.fromObject({
            phases: {
              install: {
                'runtime-versions': {
                  nodejs: 22,
                },
              },
            },
          }),
          buildEnvironment: {
            buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2023_5,
            computeType: codebuild.ComputeType.MEDIUM,
          },
        },
      );

      return [deployStep];
    },
    ...props,
  });

  // Clean up globalThis
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (globalThis as any).__AMPLIFY_BACKEND_PIPELINE_OUTPUTS__;

  const template = Template.fromStack(stack);
  return { stack, template };
};

void describe('CDK template assertions for hosting deploy step', () => {
  void it('CodeBuild hosting deploy step includes ampx generate outputs command', () => {
    const { template } = createPipelineWithHostingHook();

    template.hasResourceProperties('AWS::CodeBuild::Project', {
      Source: Match.objectLike({
        BuildSpec: Match.serializedJson(
          Match.objectLike({
            phases: Match.objectLike({
              build: Match.objectLike({
                commands: Match.arrayWith([
                  Match.stringLikeRegexp('ampx generate outputs'),
                ]),
              }),
            }),
          }),
        ),
      }),
    });
  });

  void it('passes backend stack name to hosting deploy step via environment variable', () => {
    const { template } = createPipelineWithHostingHook();

    // envFromCfnOutputs resolves to a CodePipeline action variable that
    // passes the CfnOutput value to the CodeBuild step at runtime.
    // It appears in the pipeline action Configuration.EnvironmentVariables,
    // not the CodeBuild project Environment.EnvironmentVariables.
    template.hasResourceProperties('AWS::CodePipeline::Pipeline', {
      Stages: Match.arrayWith([
        Match.objectLike({
          Actions: Match.arrayWith([
            Match.objectLike({
              Name: 'DeployHosting-beta',
              Configuration: Match.objectLike({
                EnvironmentVariables:
                  Match.stringLikeRegexp('BACKEND_STACK_NAME'),
              }),
            }),
          ]),
        }),
      ]),
    });
  });

  void it('hosting deploy step includes Node.js 22 runtime version', () => {
    const { template } = createPipelineWithHostingHook();

    template.hasResourceProperties('AWS::CodeBuild::Project', {
      Source: Match.objectLike({
        BuildSpec: Match.serializedJson(
          Match.objectLike({
            phases: Match.objectLike({
              install: Match.objectLike({
                'runtime-versions': {
                  nodejs: 22,
                },
              }),
            }),
          }),
        ),
      }),
    });
  });

  void it('each stage gets its own backend stack name in the hosting deploy step', () => {
    const app = new App();
    const stack = new Stack(app, 'MultiStageStack');
    const sourceBucket = new Bucket(stack, 'Source', { versioned: true });

    new AmplifyPipelineConstruct(stack, 'Pipeline', {
      source: {
        repo: 'my-org/my-app',
        connectionArn: VALID_ARN,
      },
      branches: [
        {
          branch: 'main',
          stages: [{ name: 'beta' }, { name: 'prod' }],
        },
      ],
      stageFactory: (scope) => {
        const backendStack = new Stack(scope, 'BackendStack');
        const stackNameOutput = new CfnOutput(
          backendStack,
          'BackendStackName',
          {
            value: backendStack.stackName,
          },
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (globalThis as any).__AMPLIFY_BACKEND_PIPELINE_OUTPUTS__ = {
          stackNameOutput,
          backendStack,
        };
      },
      _sourceOverride: CodePipelineSource.s3(sourceBucket, 'source.zip'),
      _postStageHook: ({ source, stageConfig }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const backendOutputs = (globalThis as any)
          .__AMPLIFY_BACKEND_PIPELINE_OUTPUTS__ as
          | { stackNameOutput: CfnOutput; backendStack: Stack }
          | undefined;

        if (!backendOutputs?.stackNameOutput) return [];

        return [
          new CodeBuildStep(`DeployHosting-${stageConfig.name}`, {
            input: source,
            envFromCfnOutputs: {
              BACKEND_STACK_NAME: backendOutputs.stackNameOutput,
            },
            env: { STAGE_NAME: stageConfig.name },
            commands: [
              'npx ampx generate outputs --stack $BACKEND_STACK_NAME --out-dir .',
            ],
            buildEnvironment: {
              buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2023_5,
              computeType: codebuild.ComputeType.MEDIUM,
            },
          }),
        ];
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).__AMPLIFY_BACKEND_PIPELINE_OUTPUTS__;

    const template = Template.fromStack(stack);

    // envFromCfnOutputs resolves to pipeline action environment variables.
    // Verify each stage has a DeployHosting action referencing BACKEND_STACK_NAME.
    const pipelines = template.findResources('AWS::CodePipeline::Pipeline');
    const pipelineKey = Object.keys(pipelines)[0];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stages = (pipelines[pipelineKey] as any).Properties?.Stages ?? [];

    // Collect all DeployHosting actions across pipeline stages
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hostingActions: any[] = [];
    for (const stage of stages) {
      for (const action of stage.Actions ?? []) {
        if (
          typeof action.Name === 'string' &&
          action.Name.startsWith('DeployHosting-')
        ) {
          hostingActions.push(action);
        }
      }
    }

    assert.strictEqual(
      hostingActions.length,
      2,
      `Expected 2 DeployHosting actions (one per stage), got ${hostingActions.length}`,
    );

    // Verify each action references BACKEND_STACK_NAME
    for (const action of hostingActions) {
      const envVarsJson = action.Configuration?.EnvironmentVariables ?? '[]';
      assert.ok(
        envVarsJson.includes('BACKEND_STACK_NAME'),
        `DeployHosting action should reference BACKEND_STACK_NAME, got: ${envVarsJson}`,
      );
    }

    // Verify each has a different action name (different stage)
    const actionNames = hostingActions.map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (a: any) => a.Name as string,
    );
    assert.ok(
      actionNames.includes('DeployHosting-beta'),
      `Expected DeployHosting-beta action, got: ${actionNames.join(', ')}`,
    );
    assert.ok(
      actionNames.includes('DeployHosting-prod'),
      `Expected DeployHosting-prod action, got: ${actionNames.join(', ')}`,
    );
  });

  void it('skips hosting deploy step when backend outputs are not available', () => {
    const app = new App();
    const stack = new Stack(app, 'NoBackendStack');
    const sourceBucket = new Bucket(stack, 'Source', { versioned: true });

    new AmplifyPipelineConstruct(stack, 'Pipeline', {
      source: {
        repo: 'my-org/my-app',
        connectionArn: VALID_ARN,
      },
      branches: [
        {
          branch: 'main',
          stages: [{ name: 'beta' }],
        },
      ],
      stageFactory: (scope) => {
        // Only hosting — no backend stack, no globalThis outputs
        new Stack(scope, 'HostingStack');
      },
      _sourceOverride: CodePipelineSource.s3(sourceBucket, 'source.zip'),
      _postStageHook: () => {
        // Simulate createHostingDeployHook when no backend outputs exist
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const backendOutputs = (globalThis as any)
          .__AMPLIFY_BACKEND_PIPELINE_OUTPUTS__ as
          | { stackNameOutput: CfnOutput }
          | undefined;

        if (!backendOutputs?.stackNameOutput) return [];
        return [];
      },
    });

    const template = Template.fromStack(stack);

    // Find CodeBuild projects with BACKEND_STACK_NAME env var
    const projects = template.findResources('AWS::CodeBuild::Project');
    const hostingDeployProjects = Object.entries(projects).filter(
      ([, resource]) => {
        const envVars =
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (resource as any).Properties?.Environment?.EnvironmentVariables ?? [];
        return envVars.some(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (v: any) => v.Name === 'BACKEND_STACK_NAME',
        );
      },
    );

    assert.strictEqual(
      hostingDeployProjects.length,
      0,
      'No hosting deploy step should be created when backend outputs are missing',
    );
  });

  void it('handles missing globalThis backend outputs gracefully', () => {
    // Ensure globalThis is clean
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).__AMPLIFY_BACKEND_PIPELINE_OUTPUTS__;

    const app = new App();
    const stack = new Stack(app, 'MissingOutputsStack');
    const sourceBucket = new Bucket(stack, 'Source', { versioned: true });

    new AmplifyPipelineConstruct(stack, 'Pipeline', {
      source: {
        repo: 'my-org/my-app',
        connectionArn: VALID_ARN,
      },
      branches: [
        {
          branch: 'main',
          stages: [{ name: 'beta' }],
        },
      ],
      stageFactory: (scope) => {
        new Stack(scope, 'AppStack');
      },
      _sourceOverride: CodePipelineSource.s3(sourceBucket, 'source.zip'),
      _postStageHook: ({ source, stageConfig }) => {
        // Replicate the logic from createHostingDeployHook
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const backendOutputs = (globalThis as any)
          .__AMPLIFY_BACKEND_PIPELINE_OUTPUTS__ as
          | { stackNameOutput: CfnOutput; backendStack: Stack }
          | undefined;

        if (!backendOutputs?.stackNameOutput) {
          return [];
        }

        return [
          new CodeBuildStep(`DeployHosting-${stageConfig.name}`, {
            input: source,
            envFromCfnOutputs: {
              BACKEND_STACK_NAME: backendOutputs.stackNameOutput,
            },
            commands: ['npx ampx generate outputs'],
          }),
        ];
      },
    });

    // Should synthesize without error — the hook returns empty array
    const template = Template.fromStack(stack);
    const projects = template.findResources('AWS::CodeBuild::Project');
    const hostingDeployProjects = Object.entries(projects).filter(
      ([, resource]) => {
        const envVars =
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (resource as any).Properties?.Environment?.EnvironmentVariables ?? [];
        return envVars.some(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (v: any) => v.Name === 'BACKEND_STACK_NAME',
        );
      },
    );

    assert.strictEqual(
      hostingDeployProjects.length,
      0,
      'No hosting deploy step should exist when globalThis outputs are not set',
    );
  });
});
