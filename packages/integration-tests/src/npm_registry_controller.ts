import { execa } from 'execa';
import path from 'path';
import { existsSync } from 'fs';
import fs from 'fs/promises';
import { amplifyAtTag } from './constants.js';
import os from 'os';
import assert from 'assert';

/**
 * This class encapsulates starting, hydrating cache and tearing down npm registry.
 */
export class NpmRegistryController {
  /**
   * Creates npm registry controller.
   */
  constructor(private readonly useLocalProxy: boolean) {}

  setUp = async (): Promise<void> => {
    if (this.useLocalProxy) {
      // start a local npm proxy and publish the current codebase to the proxy
      await execa('npm', ['run', 'clean:npm-proxy'], { stdio: 'inherit' });
      await execa('npm', ['run', 'vend'], { stdio: 'inherit' });
    }

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
    if (this.useLocalProxy) {
      // stop the npm proxy
      await execa('npm', ['run', 'stop:npm-proxy'], { stdio: 'inherit' });
    }
  };
}
