import { execa } from 'execa';
import path from 'path';
import { existsSync } from 'fs';
import fs from 'fs/promises';
import { glob } from 'glob';
import { amplifyAtTag } from './constants.js';
import os from 'os';
import assert from 'assert';

/**
 * A fixed, absolute verdaccio storage location shared by every
 * {@link NpmProxyController} instance that opts into
 * {@link NpmProxyControllerOptions.preserveThirdPartyCache}. Passed to
 * verdaccio via the `VERDACCIO_STORAGE_PATH` env var (honored by
 * `@verdaccio/config`), so proxies started from different working directories
 * (e.g. the baseline checkout in a tmp dir and the current checkout in the repo)
 * all read/write the SAME on-disk cache of proxied third-party packages.
 *
 * Rooted at `RUNNER_TEMP` in CI so it lives in a stable, cross-OS location the
 * `warm_verdaccio_cache` action can reference by the same path for
 * `actions/cache` (falls back to `os.tmpdir()` for local runs).
 */
const SHARED_VERDACCIO_STORAGE_PATH = path.join(
  process.env.RUNNER_TEMP || os.tmpdir(),
  'amplify-e2e-verdaccio-shared-storage',
);

/**
 * Options for {@link NpmProxyController}.
 */
export type NpmProxyControllerOptions = {
  /**
   * When true, {@link NpmProxyController.setUp} keeps verdaccio's proxied
   * third-party package cache on disk in a process-wide shared location
   * instead of wiping it on every setUp. Only the workspace packages are
   * removed and re-published each setUp; the (identical every time) proxied
   * third-party dependencies are served from local disk.
   *
   * Use this for tests that set up the proxy multiple times (e.g. baseline +
   * current version installs, possibly across two controller instances).
   * Fully cleaning the cache on every setUp forces verdaccio to re-proxy every
   * third-party dependency from the registry, which is the dominant cost
   * (~20 min per install) and makes a single test attempt outlive the 1h e2e
   * credential window. Sharing + preserving the cache keeps the second and
   * subsequent installs fast. Defaults to false (every setUp fully cleans its
   * own cwd-local cache — the original behavior, unchanged for other tests).
   */
  preserveThirdPartyCache?: boolean;
};

/**
 * A class that orchestrates npm proxy usage in tests.
 */
export class NpmProxyController {
  /**
   * Creates NPM proxy controller.
   */
  constructor(
    private readonly workspacePath = process.cwd(),
    private readonly options: NpmProxyControllerOptions = {},
  ) {}

  setUp = async (): Promise<void> => {
    if (this.options.preserveThirdPartyCache) {
      await this.setUpWithSharedCache();
    } else {
      // Original behavior: fully clean the cwd-local cache, then vend.
      await execa('npm', ['run', 'clean:npm-proxy'], {
        stdio: 'inherit',
        cwd: this.workspacePath,
      });
      await execa('npm', ['run', 'vend'], {
        stdio: 'inherit',
        cwd: this.workspacePath,
      });
    }

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
   * The names of all non-private packages published from this workspace to the
   * proxy (e.g. `@aws-amplify/backend`, `create-amplify`, `ampx`). These are the
   * ONLY packages that differ between two versions published to two different
   * proxies (baseline vs current) — every third-party dependency, including the
   * large bundled external packages `@aws-amplify/data-construct` and
   * `@aws-amplify/graphql-api-construct` (version-pinned deps, not workspace
   * packages), is identical across proxies. Callers use this to reinstall only
   * what actually changed instead of nuking and re-unpacking all node_modules.
   */
  getWorkspacePackageNames = async (): Promise<string[]> => {
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
    return [...workspacePackageNames];
  };

  /**
   * setUp variant that points verdaccio at a process-wide shared storage dir
   * (so multiple instances/cwds reuse one cache) and preserves the proxied
   * third-party packages across calls. Only the workspace packages are cleared
   * and re-published; the first call cold-populates, later calls reuse.
   */
  private setUpWithSharedCache = async (): Promise<void> => {
    // Verdaccio must write to the shared storage path for both start and
    // publish, so the env var is threaded through the `vend` npm script.
    const env = {
      ...process.env,
      VERDACCIO_STORAGE_PATH: SHARED_VERDACCIO_STORAGE_PATH,
    };

    // Stop any running proxy WITHOUT the full cache wipe that clean:npm-proxy
    // does, so the shared third-party cache survives across setUps.
    await execa('npm', ['run', 'stop:npm-proxy'], {
      stdio: 'inherit',
      cwd: this.workspacePath,
      env,
    });

    // ALWAYS remove only the workspace packages (never the whole storage): a
    // full wipe would defeat both the cross-run actions/cache warm-up AND the
    // cross-instance reuse this mode exists for. Removing just the workspace
    // packages lets `vend` re-publish them at the same version without an
    // EPUBLISHCONFLICT, while every proxied third-party package stays cached.
    // Stale third-party entries are harmless — verdaccio serves cached versions
    // and proxies only new ones; the actions/cache key (package-lock hash)
    // handles third-party version bumps across runs.
    await this.removeWorkspacePackagesFromCache(SHARED_VERDACCIO_STORAGE_PATH);

    await execa('npm', ['run', 'vend'], {
      stdio: 'inherit',
      cwd: this.workspacePath,
      env,
    });
  };

  /**
   * Delete only the workspace-published packages from the given verdaccio
   * storage dir. Proxied third-party dependencies — including the top-level
   * `aws-amplify` meta-package and the `@aws-amplify/*` packages that come from
   * the registry rather than this workspace (e.g. `@aws-amplify/data-construct`)
   * — are left cached. Removing the workspace copies lets `vend` re-publish them
   * (same version numbers) without a publish conflict.
   */
  private removeWorkspacePackagesFromCache = async (
    storageDir: string,
  ): Promise<void> => {
    if (!existsSync(storageDir)) {
      return;
    }
    const workspacePackageNames = await this.getWorkspacePackageNames();
    await Promise.all(
      workspacePackageNames.map(async (name) => {
        // verdaccio stores each package under storage/<name> (scope included).
        const pkgDir = path.join(storageDir, name);
        await fs.rm(pkgDir, { recursive: true, force: true });
      }),
    );
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
}
