import { execa } from 'execa';
import path from 'path';
import { existsSync } from 'fs';
import fs from 'fs/promises';
import { amplifyAtTag } from './constants.js';
import os from 'os';
import assert from 'assert';

/**
 * A class that orchestrates npm proxy usage in tests.
 */
export class NpmProxyController {
  /**
   * Creates NPM proxy controller.
   */
  constructor(private readonly workspacePath = process.cwd()) {}

  setUp = async (): Promise<void> => {
    // start a local npm proxy and publish the current codebase to the proxy
    await execa('npm', ['run', 'clean:npm-proxy'], {
      stdio: 'inherit',
      cwd: this.workspacePath,
    });
    await execa('npm', ['run', 'vend'], {
      stdio: 'inherit',
      cwd: this.workspacePath,
    });

    await this.invalidateNpxCache();
    await this.hydrateNpxCacheWithCreateAmplify();
  };

  tearDown = async (): Promise<void> => {
    // stop the npm proxy
    await execa('npm', ['run', 'stop:npm-proxy'], {
      stdio: 'inherit',
      cwd: this.workspacePath,
    });
  };

  /**
   * Nukes the npx cache to ensure we are installing packages from the npm proxy
   */
  private invalidateNpxCache = async (): Promise<void> => {
    const { stdout } = await execa('npm', ['config', 'get', 'cache']);
    const npxCacheLocation = path.join(stdout.toString().trim(), '_npx');

    if (existsSync(npxCacheLocation)) {
      await fs.rm(npxCacheLocation, { recursive: true });
    }
  };

  /**
   * Forces 'create-amplify' installation in npx cache by executing help command
   * before tests run. Otherwise, installing 'create-amplify' concurrently
   * may lead to race conditions and corrupted npx cache.
   */
  private hydrateNpxCacheWithCreateAmplify = async (): Promise<void> => {
    // Invoke create-amplify with --help to force installation in npx cache.
    // This command does not create any project and only prints help.
    const output = await execa(
      'npm',
      ['create', amplifyAtTag, '--yes', '--', '--help'],
      {
        // Command must run outside 'amplify-backend' workspace.
        // Otherwise, workspace copy is found and npx cache is not hydrated.
        cwd: os.homedir(),
      }
    );

    // Assert that above command printed help output.
    assert.match(output.stdout, /--help/);
    assert.match(output.stdout, /--version/);
    assert.match(output.stdout, /Show version number/);
    assert.match(output.stdout, /--yes/);
  };
}
