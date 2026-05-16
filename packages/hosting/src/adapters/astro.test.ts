/**
 * Unit tests for the Astro adapter. We don't run a real `astro build` —
 * instead we pre-populate `dist/` with the shape Astro would produce
 * and mock `child_process.execFileSync` to be a no-op. The tests focus
 * on:
 *
 *   1. The bridge install/cleanup lifecycle.
 *   2. The translation from `dist/` to a DeployManifest.
 *   3. Detection from package.json deps.
 *
 * We do not test the `serverEntrypoint` / `setAdapter` mechanics — that
 * was validated end-to-end via the spike at /tmp/astro-spike during
 * adapter development, and is exercised on every live deploy.
 */
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { astroAdapter, isAstroProject } from './astro.js';
import { deployManifestSchema } from '../manifest/schema.js';

// Direct require to get the real module (not __importStar wrapper)
// so mock.method can replace the property on the shared module singleton.
/* eslint-disable @typescript-eslint/no-require-imports */
const childProcessModule =
  require('child_process') as typeof import('child_process');
/* eslint-enable @typescript-eslint/no-require-imports */

const writeMinimalAstroOutput = (projectDir: string): void => {
  const distServer = path.join(projectDir, 'dist', 'server');
  const distClient = path.join(projectDir, 'dist', 'client');
  fs.mkdirSync(distServer, { recursive: true });
  fs.mkdirSync(distClient, { recursive: true });
  // Astro's server bundle entry — we don't care about contents, only
  // that the file is present at the expected location.
  fs.writeFileSync(path.join(distServer, 'entry.mjs'), '// astro entry');
};

const writeUserConfig = (
  projectDir: string,
  contents = "import { defineConfig } from 'astro/config';\nexport default defineConfig({ output: 'server' });\n",
): void => {
  fs.writeFileSync(path.join(projectDir, 'astro.config.mjs'), contents);
};

void describe('astroAdapter', () => {
  let projectDir: string;

  beforeEach(() => {
    projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hosting-astro-test-'));
    writeUserConfig(projectDir);
  });

  afterEach(() => {
    mock.restoreAll();
    fs.rmSync(projectDir, { recursive: true, force: true });
  });

  void it('bridge flow: writes config-bridge.mjs and installs @astrojs/node, then cleans up', () => {
    let observedBridgeFiles: string[] = [];
    let npmInstallCalled = false;
    mock.method(childProcessModule, 'execFileSync', (...args: unknown[]) => {
      const argv = args[1] as string[];
      // First call is `npm install --no-save … @astrojs/node@^10`.
      if (argv?.includes('@astrojs/node@^10')) {
        npmInstallCalled = true;
        return Buffer.from('');
      }
      // Second call is the build itself.
      const bridgeDir = path.join(projectDir, '.amplify', 'astro');
      observedBridgeFiles = fs.existsSync(bridgeDir)
        ? fs.readdirSync(bridgeDir).sort()
        : [];
      writeMinimalAstroOutput(projectDir);
      return Buffer.from('');
    });

    astroAdapter({ projectDir });

    assert.ok(npmInstallCalled, '@astrojs/node should be installed --no-save');
    assert.deepStrictEqual(observedBridgeFiles, ['config-bridge.mjs']);
    // Cleanup ran — bridge dir AND .amplify dir are gone (we created both).
    assert.ok(!fs.existsSync(path.join(projectDir, '.amplify', 'astro')));
    assert.ok(!fs.existsSync(path.join(projectDir, '.amplify')));
  });

  void it('config-bridge sets @astrojs/node as the adapter', () => {
    let bridgeContents = '';
    mock.method(childProcessModule, 'execFileSync', (...args: unknown[]) => {
      const argv = args[1] as string[];
      if (argv?.includes('@astrojs/node@^10')) return Buffer.from('');
      // Snapshot bridge contents at build time.
      const bridgePath = path.join(
        projectDir,
        '.amplify',
        'astro',
        'config-bridge.mjs',
      );
      if (fs.existsSync(bridgePath)) {
        bridgeContents = fs.readFileSync(bridgePath, 'utf-8');
      }
      writeMinimalAstroOutput(projectDir);
      return Buffer.from('');
    });

    astroAdapter({ projectDir });

    assert.match(bridgeContents, /from '@astrojs\/node'/);
    assert.match(bridgeContents, /node\(\{ mode: 'standalone' \}\)/);
    assert.match(bridgeContents, /noExternal:\s*true/);
  });

  void it('skip-bridge flow when user has @astrojs/node in their config', () => {
    writeUserConfig(
      projectDir,
      `import node from '@astrojs/node';
       export default { output: 'server', adapter: node({ mode: 'standalone' }) };`,
    );

    let bridgeDirExistedDuringBuild = false;
    let installRan = false;
    mock.method(childProcessModule, 'execFileSync', (...args: unknown[]) => {
      const argv = args[1] as string[];
      if (argv?.includes('@astrojs/node@^10')) {
        installRan = true;
        return Buffer.from('');
      }
      bridgeDirExistedDuringBuild = fs.existsSync(
        path.join(projectDir, '.amplify', 'astro'),
      );
      writeMinimalAstroOutput(projectDir);
      return Buffer.from('');
    });

    const manifest = astroAdapter({ projectDir });

    assert.strictEqual(
      bridgeDirExistedDuringBuild,
      false,
      'bridge dir must NOT be created when user has @astrojs/node configured',
    );
    assert.strictEqual(
      installRan,
      false,
      'must not install @astrojs/node when user already has it',
    );
    assert.strictEqual(
      manifest.compute.default.entrypoint,
      path.posix.join('server', 'run.sh'),
    );
  });

  void it('throws AstroOutputNotFoundError when dist/server is missing', () => {
    mock.method(childProcessModule, 'execFileSync', () => Buffer.from(''));

    assert.throws(
      () => astroAdapter({ projectDir }),
      (err: Error) => err.name === 'AstroOutputNotFoundError',
    );
  });

  void it('cleans bridge files even when build fails', () => {
    mock.method(childProcessModule, 'execFileSync', () => {
      throw new Error('synthetic build failure');
    });

    assert.throws(() => astroAdapter({ projectDir }));
    assert.ok(
      !fs.existsSync(path.join(projectDir, '.amplify')),
      'cleanup must run on build failure',
    );
  });

  void it('preserves a pre-existing .amplify dir during cleanup', () => {
    // Pre-existing .amplify dir with unrelated content the user owns.
    fs.mkdirSync(path.join(projectDir, '.amplify'), { recursive: true });
    fs.writeFileSync(
      path.join(projectDir, '.amplify', 'user-file.txt'),
      'do not delete me',
    );

    mock.method(childProcessModule, 'execFileSync', () => {
      writeMinimalAstroOutput(projectDir);
      return Buffer.from('');
    });

    astroAdapter({ projectDir });

    assert.ok(
      fs.existsSync(path.join(projectDir, '.amplify', 'user-file.txt')),
      'user-owned file must survive cleanup',
    );
    assert.ok(!fs.existsSync(path.join(projectDir, '.amplify', 'astro')));
  });

  void it('emits prerendered subtree routes from dist/client/', () => {
    mock.method(childProcessModule, 'execFileSync', () => {
      writeMinimalAstroOutput(projectDir);
      const aboutDir = path.join(projectDir, 'dist', 'client', 'about');
      fs.mkdirSync(aboutDir, { recursive: true });
      fs.writeFileSync(path.join(aboutDir, 'index.html'), '<html>about</html>');
      // Astro's hashed bundles live under _astro/.
      fs.mkdirSync(path.join(projectDir, 'dist', 'client', '_astro'), {
        recursive: true,
      });
      return Buffer.from('');
    });

    const manifest = astroAdapter({ projectDir });
    const patterns = manifest.routes.map((r) => r.pattern);
    assert.ok(patterns.includes('/about/*'));
    assert.ok(patterns.includes('/_astro/*'));
    // Catch-all is always last.
    assert.strictEqual(patterns[patterns.length - 1], '/*');
    assert.strictEqual(
      manifest.routes[manifest.routes.length - 1].target,
      'default',
    );
  });

  void it('manifest bundle is dist/ so client/ ships next to server/ in the Lambda zip', () => {
    mock.method(childProcessModule, 'execFileSync', () => {
      writeMinimalAstroOutput(projectDir);
      return Buffer.from('');
    });

    const manifest = astroAdapter({ projectDir });

    // bundle: must be dist/ (parent of server/) so that when the L3
    // unzips into /var/task/, the layout matches what @astrojs/node's
    // resolveClientDir walks for: /var/task/server/entry.mjs +
    // /var/task/client/.
    assert.strictEqual(
      manifest.compute.default.bundle,
      path.join(projectDir, 'dist'),
    );
    assert.strictEqual(
      manifest.compute.default.entrypoint,
      path.posix.join('server', 'run.sh'),
    );
  });

  void it('copies amplify_outputs.json into dist/server/ when present', () => {
    fs.writeFileSync(
      path.join(projectDir, 'amplify_outputs.json'),
      '{"auth":{"user_pool_id":"us-east-1_test"}}',
    );

    mock.method(childProcessModule, 'execFileSync', () => {
      writeMinimalAstroOutput(projectDir);
      return Buffer.from('');
    });

    astroAdapter({ projectDir });

    const dest = path.join(
      projectDir,
      'dist',
      'server',
      'amplify_outputs.json',
    );
    assert.ok(fs.existsSync(dest));
    assert.ok(fs.readFileSync(dest, 'utf-8').includes('us-east-1_test'));
  });

  void it('emits a manifest that passes deployManifestSchema', () => {
    mock.method(childProcessModule, 'execFileSync', () => {
      writeMinimalAstroOutput(projectDir);
      return Buffer.from('');
    });

    const manifest = astroAdapter({ projectDir });
    const result = deployManifestSchema.safeParse(manifest);
    assert.ok(
      result.success,
      `manifest failed schema validation: ${
        result.success ? '' : JSON.stringify(result.error.issues)
      }`,
    );
  });
});

void describe('isAstroProject', () => {
  void it('returns true when "astro" is in deps', () => {
    assert.strictEqual(isAstroProject({ astro: '^6.0.0' }), true);
  });

  void it('returns false when astro is absent', () => {
    assert.strictEqual(isAstroProject({ next: '^15.0.0' }), false);
    assert.strictEqual(isAstroProject({}), false);
  });
});
