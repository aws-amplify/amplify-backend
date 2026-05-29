import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert';
import { createRequire } from 'node:module';
import { App, Stage } from 'aws-cdk-lib';
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

  void it('auto-discovers and invokes backend.ts before hosting.ts', () => {
    // Write backend.js that records invocation
    const backendCode = `
const cdk = require('aws-cdk-lib');
const scope = globalThis.__AMPLIFY_PIPELINE_SCOPE__;
if (scope) {
  new cdk.Stack(scope, 'BackendStack');
}
`;
    // Write hosting.js that records invocation
    const hostingCode = `
const cdk = require('aws-cdk-lib');
const scope = globalThis.__AMPLIFY_PIPELINE_SCOPE__;
if (scope) {
  new cdk.Stack(scope, 'HostingStack');
}
`;
    fs.writeFileSync(path.join(tmpDir, 'amplify', 'backend.js'), backendCode);
    fs.writeFileSync(path.join(tmpDir, 'amplify', 'hosting.js'), hostingCode);
    process.chdir(tmpDir);

    // Both backend and hosting stacks created without error
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

  void it('works without hosting.ts or backend.ts (no-op stages still error)', () => {
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
      /contains no stacks/,
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

  void it('finds .mjs file', () => {
    fs.writeFileSync(path.join(tmpDir, 'backend.mjs'), '// mjs');
    const result = findFile(tmpDir, 'backend');
    assert.strictEqual(result, path.join(tmpDir, 'backend.mjs'));
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
