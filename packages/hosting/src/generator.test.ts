import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { App, Stack } from 'aws-cdk-lib';
import {
  BackendSecretResolver,
  GenerateContainerEntryProps,
  SsmEnvironmentEntriesGenerator,
  StableBackendIdentifiers,
} from '@aws-amplify/plugin-types';
import { AmplifyHostingGenerator } from './generator.js';
import { HostingProps } from './types.js';

/**
 * Create a CDK scope (Stack) with the given deployment type set on the App context.
 */
const createScope = (deploymentType: string): Stack => {
  const app = new App();
  app.node.setContext('amplify-backend-name', 'testEnvName');
  app.node.setContext('amplify-backend-namespace', 'testBackendId');
  app.node.setContext('amplify-backend-type', deploymentType);
  return new Stack(app);
};

/**
 * Build minimal GenerateContainerEntryProps for a given scope.
 * The generator only destructures `{ scope }`, so the other fields
 * are stubs that satisfy the type contract.
 */
const makeEntryProps = (scope: Stack): GenerateContainerEntryProps => ({
  scope,
  backendSecretResolver: {} as BackendSecretResolver,
  ssmEnvironmentEntriesGenerator: {} as SsmEnvironmentEntriesGenerator,
  stableBackendIdentifiers: {} as StableBackendIdentifiers,
});

/**
 * Create a generator with the given props.
 * getInstanceProps is unused by generateContainerEntry, so we pass a minimal stub.
 */
const createGenerator = (props: HostingProps): AmplifyHostingGenerator =>
  new AmplifyHostingGenerator(props, {
    constructContainer: {} as never,
    outputStorageStrategy: {} as never,
  });

// ================================================================
// Sandbox mode — hosting is silently skipped
// ================================================================

void describe('AmplifyHostingGenerator — sandbox mode', () => {
  void it('silently skips hosting in sandbox mode', () => {
    const generator = createGenerator({ framework: 'spa' });
    const scope = createScope('sandbox');

    const result = generator.generateContainerEntry(makeEntryProps(scope));

    assert.deepStrictEqual(result, { resources: {} });
  });

  void it('writes warning to stderr in sandbox mode', () => {
    const stderrWrites: string[] = [];
    const originalWrite = process.stderr.write.bind(process.stderr);
    mock.method(
      process.stderr,
      'write',
      (chunk: string | Uint8Array, ...args: unknown[]) => {
        if (typeof chunk === 'string') {
          stderrWrites.push(chunk);
        }
        return originalWrite(chunk, ...(args as []));
      },
    );

    const generator = createGenerator({ framework: 'spa' });
    const scope = createScope('sandbox');

    generator.generateContainerEntry(makeEntryProps(scope));

    const warningMessage = stderrWrites.find((msg) =>
      msg.includes('not supported in sandbox mode'),
    );
    assert.ok(
      warningMessage,
      'Expected stderr warning about sandbox mode not being supported',
    );
    assert.ok(
      warningMessage!.includes('ampx deploy'),
      'Warning should mention ampx deploy',
    );

    mock.restoreAll();
  });
});

// ================================================================
// Branch / pipeline-deploy mode — throws HostingNotSupportedError
// ================================================================

void describe('AmplifyHostingGenerator — branch deployment', () => {
  void it('throws HostingNotSupportedError for branch deployment type', () => {
    const generator = createGenerator({ framework: 'spa' });
    const scope = createScope('branch');

    assert.throws(
      () => generator.generateContainerEntry(makeEntryProps(scope)),
      (err: Error) => {
        assert.strictEqual(err.name, 'HostingNotSupportedError');
        assert.ok(
          err.message.includes('not supported with pipeline-deploy'),
          `Expected message to mention pipeline-deploy, got: ${err.message}`,
        );
        return true;
      },
    );
  });

  void it('HostingNotSupportedError is an AmplifyUserError', () => {
    const generator = createGenerator({ framework: 'spa' });
    const scope = createScope('branch');

    try {
      generator.generateContainerEntry(makeEntryProps(scope));
      assert.fail('Expected HostingNotSupportedError to be thrown');
    } catch (err) {
      assert.strictEqual((err as Error).name, 'HostingNotSupportedError');
      // AmplifyUserError instances have a `classification` property
      assert.strictEqual(
        (err as Record<string, unknown>).classification,
        'ERROR',
      );
    }
  });
});

// ================================================================
// Standalone deploy mode — creates hosting construct
// ================================================================

void describe('AmplifyHostingGenerator — standalone deploy mode', () => {
  let tmpDir: string;
  let buildOutputDir: string;
  let originalCwd: () => string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hosting-generator-test-'));

    // Create build output directory with an index.html
    buildOutputDir = path.join(tmpDir, 'dist');
    fs.mkdirSync(buildOutputDir, { recursive: true });
    fs.writeFileSync(
      path.join(buildOutputDir, 'index.html'),
      '<html><body>test</body></html>',
    );

    // Mock process.cwd() to return our temp directory
    // so the lock file and adapter output go there
    originalCwd = process.cwd.bind(process);
    mock.method(process, 'cwd', () => tmpDir);
  });

  afterEach(() => {
    mock.restoreAll();
    // Restore cwd before cleanup
    process.cwd = originalCwd;

    // Clean up temp dir and any lock files
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  void it('creates hosting construct in standalone deploy mode', () => {
    const generator = createGenerator({
      framework: 'spa',
      buildOutputDir,
    });
    const scope = createScope('standalone');

    const result = generator.generateContainerEntry(makeEntryProps(scope));

    assert.ok(result.resources, 'Result should have resources');
    const resources = result.resources;
    assert.ok(resources.bucket, 'Resources should have a bucket');
    assert.ok(resources.distribution, 'Resources should have a distribution');
    assert.ok(
      resources.distributionUrl,
      'Resources should have a distributionUrl',
    );
  });

  void it('logs distribution URL to stderr', () => {
    const stderrWrites: string[] = [];
    const originalWrite = process.stderr.write.bind(process.stderr);
    mock.method(
      process.stderr,
      'write',
      (chunk: string | Uint8Array, ...args: unknown[]) => {
        if (typeof chunk === 'string') {
          stderrWrites.push(chunk);
        }
        return originalWrite(chunk, ...(args as []));
      },
    );

    const generator = createGenerator({
      framework: 'spa',
      buildOutputDir,
    });
    const scope = createScope('standalone');

    generator.generateContainerEntry(makeEntryProps(scope));

    const urlMessage = stderrWrites.find((msg) => msg.includes('Hosting URL:'));
    assert.ok(urlMessage, 'Expected stderr to contain the Hosting URL message');
    assert.ok(
      urlMessage!.includes('https://'),
      'Hosting URL should start with https://',
    );
  });

  void it('cleans up deploy lock file after successful deploy', () => {
    const generator = createGenerator({
      framework: 'spa',
      buildOutputDir,
    });
    const scope = createScope('standalone');

    generator.generateContainerEntry(makeEntryProps(scope));

    const lockFile = path.join(tmpDir, '.amplify-hosting-deploy.lock');
    assert.strictEqual(
      fs.existsSync(lockFile),
      false,
      'Lock file should be cleaned up after deploy',
    );
  });

  void it('uses custom name when provided', () => {
    const generator = createGenerator({
      framework: 'spa',
      buildOutputDir,
      name: 'myCustomHosting',
    });
    const scope = createScope('standalone');

    const result = generator.generateContainerEntry(makeEntryProps(scope));

    assert.ok(result.resources, 'Result should have resources');
    assert.ok(
      result.resources.distributionUrl,
      'Should produce a distributionUrl',
    );
  });
});
