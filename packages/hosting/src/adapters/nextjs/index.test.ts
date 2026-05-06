import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { adapt, readOpenNextOutput } from './index.js';
import { OpenNextOutput } from './types.js';

/**
 * Create a minimal OpenNext output structure for testing.
 */
const createMinimalOpenNextOutput = (overrides?: Partial<OpenNextOutput>): OpenNextOutput => ({
  edgeFunctions: {},
  origins: {
    s3: {
      type: 's3',
      originPath: '_assets',
      copy: [
        { from: '.open-next/assets', to: '_assets', cached: true, versionedSubDir: '_next' },
      ],
    },
    default: {
      type: 'function',
      handler: 'index.handler',
      bundle: '.open-next/server-functions/default',
      streaming: false,
      wrapper: 'aws-lambda',
      converter: 'aws-apigw-v2',
      queue: 'sqs',
      incrementalCache: 's3',
      tagCache: 'dynamodb',
    },
    imageOptimizer: {
      type: 'function',
      handler: 'index.handler',
      bundle: '.open-next/image-optimization-function',
      streaming: false,
      wrapper: 'aws-lambda',
      converter: 'aws-apigw-v2',
      imageLoader: 's3',
    },
  },
  behaviors: [
    { pattern: '_next/image*', origin: 'imageOptimizer' },
    { pattern: '_next/data/*', origin: 'default' },
    { pattern: '*', origin: 'default' },
    { pattern: '_next/static/*', origin: 's3' },
    { pattern: 'favicon.ico', origin: 's3' },
  ],
  ...overrides,
});

void describe('adapt (Next.js adapter with OpenNext)', () => {
  let tmpDir: string;
  let projectDir: string;
  let openNextDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nextjs-adapter-'));
    projectDir = tmpDir;
    openNextDir = path.join(tmpDir, '.open-next');
    fs.mkdirSync(openNextDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const writeOpenNextOutput = (output: OpenNextOutput) => {
    fs.writeFileSync(
      path.join(openNextDir, 'open-next.output.json'),
      JSON.stringify(output),
    );
  };

  void it('generates a valid manifest from OpenNext output', () => {
    const output = createMinimalOpenNextOutput();
    writeOpenNextOutput(output);

    const result = adapt({
      projectDir,
      skipBuild: true,
      writeToDisk: false,
    });

    assert.ok(result.manifest);
    assert.strictEqual(result.manifest.version, 2);
    assert.strictEqual(result.manifest.framework.name, 'nextjs');
    assert.ok(Array.isArray(result.manifest.routes));
    assert.ok(result.manifest.routes.length > 0);
    assert.ok(Array.isArray(result.manifest.serverFunctions));
    assert.ok(result.manifest.serverFunctions.length > 0);
  });

  void it('writes manifest to disk by default', () => {
    writeOpenNextOutput(createMinimalOpenNextOutput());

    const result = adapt({
      projectDir,
      skipBuild: true,
    });

    assert.ok(result.manifestPath);
    assert.ok(fs.existsSync(result.manifestPath!));

    const written = JSON.parse(fs.readFileSync(result.manifestPath!, 'utf-8'));
    const roundTripped = JSON.parse(JSON.stringify(result.manifest));
    assert.deepStrictEqual(written, roundTripped);
  });

  void it('writes manifest to custom output directory', () => {
    writeOpenNextOutput(createMinimalOpenNextOutput());
    const customOutput = path.join(tmpDir, 'custom-output');

    const result = adapt({
      projectDir,
      skipBuild: true,
      outputDir: customOutput,
    });

    assert.ok(result.manifestPath);
    assert.ok(result.manifestPath!.startsWith(customOutput));
    assert.ok(fs.existsSync(result.manifestPath!));
  });

  void it('does not write to disk when writeToDisk=false', () => {
    writeOpenNextOutput(createMinimalOpenNextOutput());

    const result = adapt({
      projectDir,
      skipBuild: true,
      writeToDisk: false,
    });

    assert.ok(result.manifest);
    assert.strictEqual(result.manifestPath, undefined);

    const hostingDir = path.join(projectDir, '.amplify-hosting');
    assert.ok(!fs.existsSync(hostingDir));
  });

  void it('throws when project directory does not exist', () => {
    assert.throws(
      () => adapt({ projectDir: path.join(tmpDir, 'nonexistent'), skipBuild: true }),
      (err: Error) => {
        assert.ok(err.message.includes('not found'));
        return true;
      },
    );
  });

  void it('throws when OpenNext output is missing', () => {
    // No open-next.output.json written
    fs.rmSync(openNextDir, { recursive: true, force: true });

    assert.throws(
      () => adapt({ projectDir, skipBuild: true }),
      (err: Error) => {
        assert.ok(err.message.includes('OpenNext output not found'));
        return true;
      },
    );
  });

  void it('manifest has correct structure for L3 construct consumption', () => {
    writeOpenNextOutput(createMinimalOpenNextOutput());

    const result = adapt({ projectDir, skipBuild: true, writeToDisk: false });
    const m = result.manifest;

    assert.strictEqual(m.version, 2);
    assert.ok(Array.isArray(m.routes));
    assert.ok(m.staticAssets);
    assert.ok(m.staticAssets.baseDir);
    assert.ok(Array.isArray(m.serverFunctions));
    assert.ok(m.serverFunctions.length > 0);
    assert.ok(m.framework);
    assert.strictEqual(m.framework.name, 'nextjs');

    const fn = m.serverFunctions[0];
    assert.ok(fn.name);
    assert.ok(fn.handler);
    assert.ok(fn.runtime);

    for (const route of m.routes) {
      assert.ok(route.path.startsWith('/'), `Route ${route.path} must start with /`);
      assert.ok(['static', 'ssr', 'isr', 'api'].includes(route.type));
    }
  });

  void it('includes cache config when incremental cache is enabled', () => {
    writeOpenNextOutput(createMinimalOpenNextOutput());

    const result = adapt({ projectDir, skipBuild: true, writeToDisk: false });

    assert.ok(result.manifest.cache, 'Should have cache config');
    assert.strictEqual(result.manifest.cache!.enabled, true);
    assert.strictEqual(result.manifest.cache!.storage, 's3+dynamodb');
    assert.strictEqual(result.manifest.cache!.tagTracking, true);
  });

  void it('does not include cache when incremental cache is disabled', () => {
    const output = createMinimalOpenNextOutput({
      additionalProps: {
        disableIncrementalCache: true,
        disableTagCache: true,
      },
    });
    writeOpenNextOutput(output);

    const result = adapt({ projectDir, skipBuild: true, writeToDisk: false });
    assert.strictEqual(result.manifest.cache, undefined);
  });

  void it('includes image optimization function', () => {
    writeOpenNextOutput(createMinimalOpenNextOutput());

    const result = adapt({ projectDir, skipBuild: true, writeToDisk: false });

    assert.ok(result.manifest.imageOptimization);
    assert.strictEqual(result.manifest.imageOptimization!.enabled, true);

    const imgFn = result.manifest.serverFunctions.find((f) => f.name === 'image-optimizer');
    assert.ok(imgFn, 'Should have image-optimizer server function');
    assert.strictEqual(imgFn.memorySize, 1024);
  });

  void it('includes middleware when present in edge functions', () => {
    const output = createMinimalOpenNextOutput({
      edgeFunctions: {
        middleware: {
          handler: 'handler.handler',
          bundle: '.open-next/middleware',
          pathResolver: 'pattern-env',
        },
      },
    });
    writeOpenNextOutput(output);

    const result = adapt({ projectDir, skipBuild: true, writeToDisk: false });

    assert.ok(result.manifest.middleware);
    assert.strictEqual(result.manifest.middleware!.src, '.open-next/middleware');
  });

  void it('detects Next.js version from node_modules', () => {
    writeOpenNextOutput(createMinimalOpenNextOutput());

    const nextPkgDir = path.join(projectDir, 'node_modules', 'next');
    fs.mkdirSync(nextPkgDir, { recursive: true });
    fs.writeFileSync(
      path.join(nextPkgDir, 'package.json'),
      JSON.stringify({ name: 'next', version: '16.2.0' }),
    );

    const result = adapt({ projectDir, skipBuild: true, writeToDisk: false });

    assert.strictEqual(result.manifest.framework.version, '16.2.0');
    assert.strictEqual(result.manifest.serverFunctions[0].runtime, 'nodejs22.x');
  });

  void it('handles split functions (multiple origins)', () => {
    const output = createMinimalOpenNextOutput();
    (output.origins as Record<string, unknown>)['apiFunction'] = {
      type: 'function',
      handler: 'index.handler',
      bundle: '.open-next/server-functions/apiFunction',
      streaming: false,
      wrapper: 'aws-lambda',
      converter: 'aws-apigw-v2',
      queue: 'sqs',
      incrementalCache: 's3',
      tagCache: 'dynamodb',
    };
    output.behaviors.unshift({
      pattern: 'api/*',
      origin: 'apiFunction',
    });
    writeOpenNextOutput(output);

    const result = adapt({ projectDir, skipBuild: true, writeToDisk: false });

    const apiFn = result.manifest.serverFunctions.find((f) => f.name === 'apiFunction');
    assert.ok(apiFn, 'Should have apiFunction server function');
    assert.strictEqual(apiFn.srcDir, '.open-next/server-functions/apiFunction');

    const apiRoute = result.manifest.routes.find((r) => r.path === '/api/*');
    assert.ok(apiRoute, 'Should have /api/* route');
    assert.strictEqual(apiRoute.functionName, 'apiFunction');
  });

  void it('defaults output to .amplify-hosting/', () => {
    writeOpenNextOutput(createMinimalOpenNextOutput());

    const result = adapt({ projectDir, skipBuild: true });

    const expectedDir = path.join(projectDir, '.amplify-hosting');
    assert.ok(result.manifestPath!.startsWith(expectedDir));
  });

  void it('includes build ID when .next/BUILD_ID exists', () => {
    writeOpenNextOutput(createMinimalOpenNextOutput());

    const dotNextDir = path.join(projectDir, '.next');
    fs.mkdirSync(dotNextDir, { recursive: true });
    fs.writeFileSync(path.join(dotNextDir, 'BUILD_ID'), 'abc123def');

    const result = adapt({ projectDir, skipBuild: true, writeToDisk: false });

    assert.strictEqual(result.manifest.buildId, 'abc123def');
  });

  void it('routes S3 behaviors as static', () => {
    writeOpenNextOutput(createMinimalOpenNextOutput());

    const result = adapt({ projectDir, skipBuild: true, writeToDisk: false });

    const staticRoute = result.manifest.routes.find((r) => r.path === '/_next/static/*');
    assert.ok(staticRoute, 'Should have /_next/static/* route');
    assert.strictEqual(staticRoute.type, 'static');
    assert.strictEqual(staticRoute.cacheControl, 'public, max-age=31536000, immutable');
  });
});

void describe('readOpenNextOutput', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'opennext-output-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  void it('reads and parses a valid output file', () => {
    const output = createMinimalOpenNextOutput();
    fs.writeFileSync(
      path.join(tmpDir, 'open-next.output.json'),
      JSON.stringify(output),
    );

    const result = readOpenNextOutput(tmpDir);
    assert.deepStrictEqual(result.origins.s3.type, 's3');
    assert.ok(result.behaviors.length > 0);
  });

  void it('throws for missing output file', () => {
    assert.throws(
      () => readOpenNextOutput(tmpDir),
      (err: Error) => {
        assert.ok(err.message.includes('OpenNext output not found'));
        return true;
      },
    );
  });

  void it('throws for invalid JSON', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'open-next.output.json'),
      'not valid json {{{',
    );

    assert.throws(
      () => readOpenNextOutput(tmpDir),
      (err: Error) => {
        assert.ok(err.message.includes('Failed to parse'));
        return true;
      },
    );
  });
});
