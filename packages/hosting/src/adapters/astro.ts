/**
 * Astro adapter — translates an Astro build into a DeployManifest.
 *
 * Goal: `npx ampx deploy` is the only command Astro users run. They
 * never install `@astrojs/node` or edit `astro.config.{mjs,ts}`. The
 * adapter materialises a hidden bridge into the user's project at
 * build time and cleans it up afterwards — same pattern as the Nitro
 * cache plugin.
 *
 * The bridge delegates the entire SSR runtime to `@astrojs/node`'s
 * `mode: 'standalone'` adapter, which Astro maintains upstream. This
 * gives us their static-file fallback, MIME types, streaming, error
 * handling, trailing-slash handling, and cookie semantics for free.
 *
 * Build output (with the bridge):
 *   dist/server/entry.mjs   — Node HTTP server (bundles @astrojs/node)
 *   dist/client/            — static + prerendered HTML
 *
 * `@astrojs/node`'s standalone server resolves `dist/client/` by
 * walking up from `import.meta.url` looking for the `server/` directory
 * segment. To preserve that behavior on Lambda (where the zip would
 * normally lose the `server/` prefix), we point the L3's `bundle:` at
 * `dist/` and the `entrypoint:` at `server/run.sh`. The Lambda zip's
 * root then contains `server/` and `client/` as siblings, exactly
 * what `@astrojs/node` expects.
 *
 * Exception: if the user already has `@astrojs/node` configured
 * themselves, the adapter respects their setup and skips the bridge.
 */
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { HostingError } from '../hosting_error.js';
import type {
  ComputeResource,
  DeployManifest,
  RouteBehavior,
} from '../manifest/types.js';
import { buildAstroConfigBridgeSource } from './astro_config_bridge_template.js';
import {
  copyAmplifyOutputsToServerBundle,
  htmlFileToUrlPath,
  walkHtmlFiles,
} from './shared.js';

export type AstroAdapterOptions = {
  /** Project root directory (the directory containing astro.config.{mjs,ts,…}). */
  projectDir: string;
  /** Skip the build step (use a pre-existing dist/). */
  skipBuild?: boolean;
  /**
   * Build command override. Defaults to `npm run build`. Pass an explicit
   * array (e.g. `['npx', 'astro', 'build']`) to bypass npm scripts.
   */
  buildCommand?: string[];
  /**
   * Maximum request body size in bytes Astro will accept before throwing.
   * Default: 20 MB — matches AWS Lambda Function URL's streaming-invoke
   * payload ceiling, so request bodies above this fail inside the
   * framework with a clear error rather than mid-stream at the platform
   * boundary. Astro's own default is 1 GB, which is meaningless on
   * Lambda. Set to `Infinity` or `0` to opt out (not recommended).
   */
  bodySizeLimit?: number;
};

/**
 * 20 MB — AWS Lambda Function URL's streaming-mode payload ceiling.
 * Sync mode is actually 6 MB, but our L3 wires Function URL with
 * RESPONSE_STREAM, so 20 MB is the real platform limit.
 */
const DEFAULT_BODY_SIZE_LIMIT_BYTES = 20 * 1024 * 1024;

/** Astro emits the bundled server runtime as `entry.mjs`. */
const ASTRO_BUNDLED_ENTRY = 'entry.mjs';

/**
 * Tiny shell wrapper the Lambda Web Adapter execs as the handler.
 * The LWA's `/opt/bootstrap` runs `$_HANDLER` as a process; without a
 * `node` shebang on `entry.mjs`, bash would parse the JS as shell.
 * Wrapping in `run.sh` keeps the contract explicit.
 */
const RUN_SH_FILENAME = 'run.sh';
const RUN_SH_SOURCE = `#!/bin/sh
# Resolve relative paths from the script's own directory regardless of
# where the LWA invokes us from.
cd "$(dirname "$0")"
# Lambda Node 20 runtime puts node at /var/lang/bin/node. Fall back to
# PATH lookup so the script also boots in local-preview shells.
if [ -x /var/lang/bin/node ]; then
  exec /var/lang/bin/node ${ASTRO_BUNDLED_ENTRY}
fi
exec node ${ASTRO_BUNDLED_ENTRY}
`;

/** LWA-fronted SSR Lambda port. The standalone server reads PORT env. */
const ASTRO_SERVER_PORT = 3000;

/** Bridge files live here, hidden from the user. */
const BRIDGE_DIR = path.posix.join('.amplify', 'astro');

/**
 * Pinned to match astro@^6 peer-dep. If a future Astro major changes
 * the peer requirement, bump this in lockstep.
 */
const ASTROJS_NODE_PIN = '@astrojs/node@^10';

/**
 * Run the Astro build (unless skipped) and translate `dist/` into a
 * DeployManifest the L3 hosting construct can consume.
 */
export const astroAdapter = (options: AstroAdapterOptions): DeployManifest => {
  const { projectDir, skipBuild, buildCommand } = options;
  const bodySizeLimit = options.bodySizeLimit ?? DEFAULT_BODY_SIZE_LIMIT_BYTES;

  const distDir = path.join(projectDir, 'dist');
  const serverDir = path.join(distDir, 'server');
  const clientDir = path.join(distDir, 'client');

  if (!skipBuild) {
    const userConfigPath = findUserAstroConfig(projectDir);
    const useBridge = !hasUserAstroNode(userConfigPath);

    if (useBridge) {
      const bridgeCleanup = installAstroBridge(
        projectDir,
        userConfigPath,
        bodySizeLimit,
      );
      try {
        runAstroBuild(projectDir, buildCommand, /* useBridgeConfig */ true);
      } finally {
        bridgeCleanup();
      }
    } else {
      process.stderr.write(
        '✨ Detected user-installed @astrojs/node; using user config as-is.\n',
      );
      runAstroBuild(projectDir, buildCommand, /* useBridgeConfig */ false);
    }
  }

  if (!fs.existsSync(distDir) || !fs.existsSync(serverDir)) {
    throw new HostingError('AstroOutputNotFoundError', {
      message: `Astro build output not found at ${distDir}.`,
      resolution:
        'Ensure `astro build` completed successfully. Re-run it manually to diagnose.',
    });
  }

  const entryPath = path.join(serverDir, ASTRO_BUNDLED_ENTRY);
  if (!fs.existsSync(entryPath)) {
    throw new HostingError('AstroOutputNotFoundError', {
      message: `Astro server entry not found at ${entryPath}.`,
      resolution:
        'The build did not produce a server bundle. Confirm `output: "server"` in astro.config and that the build completed without errors.',
    });
  }

  copyAmplifyOutputsToServerBundle(projectDir, serverDir);
  writeRunShWrapper(serverDir);

  return buildManifest({ distDir, serverDir, clientDir });
};

const writeRunShWrapper = (serverDir: string): void => {
  const dest = path.join(serverDir, RUN_SH_FILENAME);
  fs.writeFileSync(dest, RUN_SH_SOURCE, { encoding: 'utf-8', mode: 0o755 });
};

/**
 * Locate the user's Astro config file. Astro recognises (in this
 * precedence order) `.mjs`, `.ts`, `.mts`, `.cjs`, `.js`. Mirror it.
 */
const findUserAstroConfig = (projectDir: string): string | undefined => {
  for (const ext of ['mjs', 'ts', 'mts', 'cjs', 'js']) {
    const candidate = path.join(projectDir, `astro.config.${ext}`);
    if (fs.existsSync(candidate)) return candidate;
  }
  return undefined;
};

/**
 * Detect whether the user has explicitly wired `@astrojs/node` in their
 * own config. We honour that choice and skip the bridge.
 *
 * Match an actual import statement, not the substring `@astrojs/node`
 * (so a comment like `// install @astrojs/node` doesn't trigger).
 */
const hasUserAstroNode = (userConfigPath: string | undefined): boolean => {
  if (!userConfigPath || !fs.existsSync(userConfigPath)) return false;
  const source = fs.readFileSync(userConfigPath, 'utf-8');
  return /\bfrom\s+['"]@astrojs\/node['"]/.test(source);
};

/**
 * Materialise the bridge: install `@astrojs/node` (no-save) and write
 * the bridge config that wires it up. Returns a cleanup closure that
 * removes everything we created.
 */
const installAstroBridge = (
  projectDir: string,
  userConfigPath: string | undefined,
  bodySizeLimit: number,
): (() => void) => {
  if (!userConfigPath) {
    throw new HostingError('AstroConfigNotFoundError', {
      message: `No astro.config.{mjs,ts,mts,cjs,js} found in ${projectDir}.`,
      resolution: 'Add an astro.config.mjs (with at least `output: "server"`).',
    });
  }

  const bridgeDir = path.join(projectDir, BRIDGE_DIR);
  const amplifyDir = path.dirname(bridgeDir);
  const createdAmplifyDir = !fs.existsSync(amplifyDir);
  const createdBridgeDir = !fs.existsSync(bridgeDir);

  fs.mkdirSync(bridgeDir, { recursive: true });

  const userConfigRelative = path.posix.join(
    '..',
    '..',
    path.basename(userConfigPath),
  );

  fs.writeFileSync(
    path.join(bridgeDir, 'config-bridge.mjs'),
    buildAstroConfigBridgeSource(userConfigRelative, { bodySizeLimit }),
    'utf-8',
  );

  // `@astrojs/node` is the runtime. Install it with --no-save so the
  // user's package.json and lockfile aren't modified, and remember that
  // we may need to roll the install back during cleanup.
  installAstroJsNode(projectDir);

  process.stderr.write(
    '✨ Installed Amplify Astro bridge (transparent build)\n',
  );

  return (): void => {
    try {
      const configBridge = path.join(bridgeDir, 'config-bridge.mjs');
      if (fs.existsSync(configBridge)) fs.rmSync(configBridge);
      if (createdBridgeDir && fs.existsSync(bridgeDir)) {
        const entries = fs.readdirSync(bridgeDir);
        if (entries.length === 0) fs.rmdirSync(bridgeDir);
      }
      if (createdAmplifyDir && fs.existsSync(amplifyDir)) {
        const entries = fs.readdirSync(amplifyDir);
        if (entries.length === 0) fs.rmdirSync(amplifyDir);
      }
      // eslint-disable-next-line @aws-amplify/amplify-backend-rules/no-empty-catch
    } catch {
      // Best-effort cleanup. A leftover .amplify/astro/ shouldn't fail the deploy.
    }
  };
};

/**
 * Install `@astrojs/node` into the user's project without modifying
 * package.json (--no-save). The package becomes resolvable via
 * `node_modules/@astrojs/node` for the bridge config to import.
 */
const installAstroJsNode = (projectDir: string): void => {
  process.stderr.write(`\u{1F4E6} Installing ${ASTROJS_NODE_PIN} (no-save)\n`);
  try {
    execFileSync(
      'npm',
      [
        'install',
        '--no-save',
        '--no-audit',
        '--no-fund',
        '--silent',
        ASTROJS_NODE_PIN,
      ],
      {
        cwd: projectDir,
        stdio: 'inherit',
      },
    );
  } catch (error) {
    throw new HostingError(
      'AstroBridgeInstallError',
      {
        message:
          'Failed to install @astrojs/node — required for the Amplify Astro bridge.',
        resolution:
          'Try `npm install --no-save @astrojs/node` in your project to diagnose.',
      },
      error as Error,
    );
  }
};

const runAstroBuild = (
  projectDir: string,
  buildCommand: string[] | undefined,
  useBridgeConfig: boolean,
): void => {
  const baseCmd =
    buildCommand && buildCommand.length > 0
      ? buildCommand
      : ['npm', 'run', 'build'];

  const cmd = useBridgeConfig
    ? [
        ...baseCmd,
        '--',
        '--config',
        path.posix.join(BRIDGE_DIR, 'config-bridge.mjs'),
      ]
    : baseCmd;

  process.stderr.write(`\u{1F528} Running Astro build: ${cmd.join(' ')}\n`);
  try {
    const [bin, ...args] = cmd;
    execFileSync(bin!, args, {
      cwd: projectDir,
      stdio: 'inherit',
    });
  } catch (error) {
    throw new HostingError(
      'AstroBuildError',
      {
        message: 'Astro build failed.',
        resolution:
          'Check the build output above for errors. Common causes:\n' +
          '  - Missing dependencies (run: npm install)\n' +
          '  - TypeScript errors in your app\n' +
          '  - Invalid astro.config.{mjs,ts,…}',
      },
      error as Error,
    );
  }
};

/**
 * Build the DeployManifest from a known-good `dist/` layout.
 *
 * `bundle:` points at `dist/` (not `dist/server/`) so the Lambda zip's
 * root contains both `server/` and `client/` as siblings. That's the
 * layout `@astrojs/node`'s standalone runtime walks `import.meta.url`
 * for: it walks up from `/var/task/server/entry.mjs` to find the
 * `server/` segment, then resolves `client/` relative to it.
 */
const buildManifest = (input: {
  distDir: string;
  serverDir: string;
  clientDir: string;
}): DeployManifest => {
  const { distDir, serverDir, clientDir } = input;

  const compute: Record<string, ComputeResource> = {
    default: {
      type: 'http-server',
      bundle: distDir,
      entrypoint: path.posix.join(path.basename(serverDir), RUN_SH_FILENAME),
      port: ASTRO_SERVER_PORT,
      placement: 'regional',
      runtime: 'nodejs20.x',
    },
  };

  return {
    version: 1,
    compute,
    staticAssets: {
      directory: clientDir,
    },
    routes: buildRoutes(clientDir),
  };
};

/**
 * Walk `dist/client/` and emit:
 *   - per-top-level-entry static routes for public assets and Astro's
 *     hashed bundles (`_astro/*`)
 *   - subtree routes (`<route>/*`) for prerendered HTML pages so
 *     sibling assets resolve to S3
 *   - a final catch-all `/*` → `default` for SSR
 *
 * Bare `/<route>` paths (e.g. `/about` without trailing slash) fall
 * through to the SSR Lambda. `@astrojs/node`'s static handler resolves
 * them by checking the matching route's `prerender` flag and serving
 * the prerendered HTML directly — no custom 308 redirect needed.
 */
const buildRoutes = (clientDir: string): RouteBehavior[] => {
  const routes: RouteBehavior[] = [];
  const seenPatterns = new Set<string>();

  const addRoute = (route: RouteBehavior): void => {
    if (seenPatterns.has(route.pattern)) return;
    routes.push(route);
    seenPatterns.add(route.pattern);
  };

  if (fs.existsSync(clientDir)) {
    for (const entry of fs.readdirSync(clientDir, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith('.html')) continue;
      const pattern = entry.isDirectory()
        ? `/${entry.name}/*`
        : `/${entry.name}`;
      addRoute({ pattern, target: 'static' });
    }

    for (const htmlFile of walkHtmlFiles(clientDir)) {
      const rel = path.relative(clientDir, htmlFile).replace(/\\/g, '/');
      const urlPath = htmlFileToUrlPath(rel);
      if (urlPath === '/') continue;
      addRoute({ pattern: `${urlPath}/*`, target: 'static' });
    }
  }

  addRoute({ pattern: '/*', target: 'default' });

  return routes;
};

/**
 * Detect whether a project uses Astro by inspecting its package.json
 * deps. Used by the framework-detection step in adapters/index.ts.
 */
export const isAstroProject = (deps: Record<string, string>): boolean => {
  return 'astro' in deps;
};
