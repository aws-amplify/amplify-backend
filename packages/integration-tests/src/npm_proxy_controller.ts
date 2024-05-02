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

    // nuke the npx cache to ensure we are installing packages from the npm proxy
    const { stdout } = await execa('npm', ['config', 'get', 'cache']);
    const npxCacheLocation = path.join(stdout.toString().trim(), '_npx');

    if (existsSync(npxCacheLocation)) {
      await fs.rm(npxCacheLocation, { recursive: true });
    }

    // Force 'create-amplify' installation in npx cache by executing help command
    // before tests run. Otherwise, installing 'create-amplify' concurrently
    // may lead to race conditions and corrupted npx cache.
    const output = await execa(
      'npm',
      ['create', amplifyAtTag, '--yes', '--', '--help'],
      {
        // Command must run outside of 'amplify-backend' workspace.
        cwd: os.homedir(),
      }
    );

    assert.match(output.stdout, /--help/);
    assert.match(output.stdout, /--version/);
    assert.match(output.stdout, /Show version number/);
    assert.match(output.stdout, /--yes/);
  };

  tearDown = async (): Promise<void> => {
    // stop the npm proxy
    await execa('npm', ['run', 'stop:npm-proxy'], {
      stdio: 'inherit',
      cwd: this.workspacePath,
    });
  };
}
