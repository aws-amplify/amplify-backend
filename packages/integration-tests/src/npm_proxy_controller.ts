import { execa } from 'execa';
import path from 'path';
import { existsSync } from 'fs';
import fs from 'fs/promises';
import { glob } from 'glob';
import { amplifyAtTag } from './constants.js';
import os from 'os';
import assert from 'assert';

/**
 * Options for {@link NpmProxyController}.
 */
export type NpmProxyControllerOptions = {
  /**
   * When true, repeated {@link NpmProxyController.setUp} calls preserve the
   * verdaccio proxy's third-party package cache (`verdaccio-cache/storage`)
   * instead of wiping it. Only the workspace packages (`@aws-amplify/*`,
   * `create-amplify`, `ampx`) are removed and re-published; the proxied
   * third-party dependencies stay cached on disk.
   *
   * Use this for tests that call `setUp` multiple times (e.g. baseline +
   * current version installs). Fully cleaning the cache on every setUp forces
   * verdaccio to re-proxy every third-party dependency from the registry,
   * which is the dominant cost (~20 min per install) and makes a single test
   * attempt outlive the 1h e2e credential window. Preserving the cache keeps
   * the second and subsequent installs fast (deps served from local disk).
   * Defaults to false (every setUp fully cleans the cache — original behavior).
   */
  preserveThirdPartyCache?: boolean;
};

/**
 * A class that orchestrates npm proxy usage in tests.
 */
export class NpmProxyController {
  private hasSetUpOnce = false;

  /**
   * Creates NPM proxy controller.
   */
  constructor(
    private readonly workspacePath = process.cwd(),
    private readonly options: NpmProxyControllerOptions = {},
  ) {}

  setUp = async (): Promise<void> => {
    // On repeated setUps, optionally preserve verdaccio's third-party cache so
    // proxied npmjs dependencies aren't re-fetched from the network every time.
    // The very first setUp always does a full clean (there is no useful cache
    // yet); only subsequent setUps take the cache-preserving path.
    if (this.options.preserveThirdPartyCache && this.hasSetUpOnce) {
      await this.setUpPreservingCache();
    } else {
      // start a local npm proxy and publish the current codebase to the proxy
      await execa('npm', ['run', 'clean:npm-proxy'], {
        stdio: 'inherit',
        cwd: this.workspacePath,
      });
      await execa('npm', ['run', 'vend'], {
        stdio: 'inherit',
        cwd: this.workspacePath,
      });
    }

    this.hasSetUpOnce = true;
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
      },
    );

    // Assert that above command printed help output.
    assert.match(output.stdout, /--help/);
    assert.match(output.stdout, /--version/);
    assert.match(output.stdout, /Show version number/);
    assert.match(output.stdout, /--yes/);
  };

  /**
   * Re-publish the workspace to the proxy WITHOUT wiping verdaccio's storage,
   * so the proxied third-party dependency cache survives. Stops the proxy,
   * removes only the workspace packages from storage (so `vend`'s publish does
   * not conflict with an already-published version), then vends.
   */
  private setUpPreservingCache = async (): Promise<void> => {
    // Stop the proxy WITHOUT the full cache wipe that clean:npm-proxy does, so
    // the third-party package cache on disk is kept for the next install.
    await execa('npm', ['run', 'stop:npm-proxy'], {
      stdio: 'inherit',
      cwd: this.workspacePath,
    });
    await this.removeWorkspacePackagesFromCache();
    await execa('npm', ['run', 'vend'], {
      stdio: 'inherit',
      cwd: this.workspacePath,
    });
  };

  /**
   * Delete only the workspace-published packages from verdaccio's storage.
   * Proxied third-party dependencies — including the top-level `aws-amplify`
   * meta-package and the `@aws-amplify/*` packages that come from the registry
   * rather than this workspace (e.g. `@aws-amplify/data-construct`) — are left
   * cached. Removing the workspace copies lets `vend` re-publish them (same
   * version numbers) without a publish conflict.
   */
  private removeWorkspacePackagesFromCache = async (): Promise<void> => {
    const storageDir = path.join(
      this.workspacePath,
      'verdaccio-cache',
      'storage',
    );
    if (!existsSync(storageDir)) {
      return;
    }
    // Collect the names of packages published from this workspace.
    const packageJsonPaths = await glob('packages/*/package.json', {
      cwd: this.workspacePath,
      absolute: true,
    });
    const workspacePackageNames = new Set<string>();
    for (const packageJsonPath of packageJsonPaths) {
      let parsed: { name?: string; private?: boolean } | undefined;
      try {
        parsed = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      } catch {
        // Skip unreadable/invalid package.json files.
        parsed = undefined;
      }
      // Private packages are never published to the proxy.
      if (parsed?.name && !parsed.private) {
        workspacePackageNames.add(parsed.name);
      }
    }
    await Promise.all(
      [...workspacePackageNames].map(async (name) => {
        // verdaccio stores each package under storage/<name> (scope included).
        const pkgDir = path.join(storageDir, name);
        await fs.rm(pkgDir, { recursive: true, force: true });
      }),
    );
  };
}
