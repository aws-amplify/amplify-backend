/**
 * Astro adapter — works for any Astro 4+ project (`output: 'static' |
 * 'server' | 'hybrid'`). Reads the user's `astro.config.{ts,mjs,js}`
 * with jiti (no source-text scanning), inspects the post-build `dist/`
 * tree, and emits a framework-agnostic DeployManifest.
 *
 * The L3 construct never knows the project is Astro — it sees compute
 * resources, route patterns, and static-asset directories.
 *
 * Inputs read from the project:
 *   - `package.json`          → astro version (≥ 4.0)
 *   - `astro.config.{ts,mjs,js}` → output mode, trailingSlash, image config
 *   - `dist/`                 → static-only output
 *   - `dist/client/` + `dist/server/entry.mjs` → server / hybrid output
 *
 * SSR runtime: server / hybrid builds run via the Lambda Web Adapter
 * fronting `@astrojs/node`'s standalone HTTP server. The L3 attaches
 * the LWA layer for `compute.type === 'http-server'` automatically.
 *
 * Transparent build: when the user has not wired `@astrojs/node`
 * themselves, the adapter materialises a hidden config-bridge that
 * imports the user's config and force-merges `output: 'server'` +
 * `adapter: node({ mode: 'standalone' })`. The bridge is removed after
 * build (success or failure). When the user already configured
 * `@astrojs/node`, the bridge is skipped.
 */
import { spawn } from './spawn.js';
import { normalizeBasePath } from './shared/basepath.js';
import * as fs from 'fs';
import * as path from 'path';
import fg from 'fast-glob';
import semver from 'semver';
import { createJiti } from 'jiti';
import { getPackageInfoSync, isPackageExists } from 'local-pkg';
import { HostingError } from '../hosting_error.js';
import { DeployManifest, Redirect, RouteBehavior } from '../manifest/types.js';

export type AstroAdapterOptions = {
  /** Project root directory (absolute). */
  projectDir: string;
  /**
   * Skip running the build command. Useful for tests and when the
   * caller has already produced `dist/`.
   */
  skipBuild?: boolean;
  /**
   * Override the build command. Defaults to `npm run build` when the
   * user's `package.json` defines a `build` script, falling back to
   * `npx astro build`.
   */
  buildCommand?: string[];
  /**
   * Maximum request body size (bytes) Astro will accept before throwing.
   * Default: 20 MB — matches Lambda Function URL's response-stream
   * payload ceiling. Set to `Infinity` or `0` to opt out (not
   * recommended; oversized requests then fail mid-stream at the
   * platform boundary instead of with a clean 413).
   */
  bodySizeLimit?: number;
};

/** 20 MB — Lambda Function URL response-stream payload ceiling. */
const DEFAULT_BODY_SIZE_LIMIT_BYTES = 20 * 1024 * 1024;

/** SSR Lambda port (the standalone server reads `PORT` env). */
const ASTRO_SERVER_PORT = 3000;

/** Bridge files live here, hidden from the user. */
const BRIDGE_DIR_REL = path.posix.join('.amplify', 'astro');
const BRIDGE_CONFIG_FILE = 'config-bridge.mjs';

/** Pinned to match astro@^5/^6 peer-dep. Bump in lockstep on Astro majors. */
const ASTROJS_NODE_PIN = '@astrojs/node@^9';

/**
 * Maximum redirects lifted from astro.config to the CloudFront viewer
 * Function. Matches the cap applied to Next.js's lifted redirects so the
 * compiled CFF stays under the 10 KB limit; anything past this stays in
 * the SSR Lambda where Astro evaluates it natively.
 */
const REDIRECT_LIFT_CAP = 100;

/**
 * Lambda Web Adapter exec wrapper. The LWA's `/opt/bootstrap` runs
 * `$_HANDLER` as a child process — without a `node` shebang, bash
 * would parse `entry.mjs` as shell, so we wrap in `run.sh`.
 */
const RUN_SH_FILENAME = 'run.sh';
const RUN_SH_SOURCE = `#!/bin/sh
cd "$(dirname "$0")"
if [ -x /var/lang/bin/node ]; then
  exec /var/lang/bin/node entry.mjs
fi
exec node entry.mjs
`;

/**
 * Run the Astro adapter pipeline.
 * @param options - adapter configuration
 * @returns the generated DeployManifest
 */
export const astroAdapter = (options: AstroAdapterOptions): DeployManifest => {
  const { projectDir, skipBuild, buildCommand } = options;
  const bodySizeLimit = options.bodySizeLimit ?? DEFAULT_BODY_SIZE_LIMIT_BYTES;

  assertAstroVersion(projectDir);

  // Load the user's config BEFORE the build — we need the output mode
  // to decide whether the bridge should run, and so the post-build
  // probes know which directory shape to expect.
  const config = loadAstroConfig(projectDir);
  const userOutput: AstroOutput =
    (config.output as AstroOutput | undefined) ?? 'static';
  const trailingSlash: AstroTrailingSlash =
    (config.trailingSlash as AstroTrailingSlash | undefined) ?? 'ignore';
  const imageDomains = readArrayOfStrings(config, 'image', 'domains');
  const liftedRedirects = liftAstroRedirects(config);
  const basePath = normalizeBasePath(
    typeof config.base === 'string' ? config.base : undefined,
  );

  if (!skipBuild) {
    const useBridge =
      userOutput !== 'static' && !userHasAstroJsNode(projectDir);
    let cleanupBridge: (() => void) | undefined;
    if (useBridge) {
      cleanupBridge = installAstroBridge(projectDir, bodySizeLimit);
    } else if (userOutput !== 'static') {
      process.stderr.write(
        '✨ Detected user-configured @astrojs/node; using user config as-is.\n',
      );
    }
    try {
      runAstroBuild(projectDir, buildCommand, useBridge);
    } finally {
      cleanupBridge?.();
    }
  }

  // Final output mode: trust the user's astro.config. If they declared
  // server/hybrid, the build MUST produce dist/server/entry.mjs — even
  // if the bridge wasn't used (because they wired @astrojs/node
  // themselves and broke it, or skipBuild was set incorrectly).
  // Static-only configs may still get a server bundle if the bridge
  // ran (skipBuild=false), but downgrading from server→static would
  // hide configuration mistakes; keep the user's declared mode.
  const distDir = path.join(projectDir, 'dist');
  const clientDir = path.join(distDir, 'client');
  const serverDir = path.join(distDir, 'server');
  const serverEntry = path.join(serverDir, 'entry.mjs');
  const output: AstroOutput =
    userOutput === 'static' && fs.existsSync(serverEntry)
      ? 'server'
      : userOutput;

  if (output === 'static') {
    if (!directoryHasFiles(distDir)) {
      throw buildOutputMissingError(distDir, 'static');
    }
  } else {
    if (!fs.existsSync(serverEntry)) {
      throw buildOutputMissingError(serverDir, output);
    }
    if (!directoryHasFiles(clientDir)) {
      throw buildOutputMissingError(clientDir, output);
    }
  }

  const manifest: DeployManifest =
    output === 'static'
      ? buildStaticManifest(distDir)
      : buildSsrManifest({
          distDir,
          clientDir,
          serverDir,
          output,
          trailingSlash,
          imageDomains,
        });

  // Lift the user's astro.config `redirects:` table out of the SSR
  // Lambda and onto the CloudFront viewer-request Function. Capped at
  // 100 to keep the compiled CFF under the 10 KB limit (matches the
  // Next.js redirect-lift cap in liftSimpleRoutesManifest).
  if (liftedRedirects.length > 0) {
    if (liftedRedirects.length > REDIRECT_LIFT_CAP) {
      process.stderr.write(
        `⚠️  Astro config has ${liftedRedirects.length} redirects; lifting only the first ${REDIRECT_LIFT_CAP} ` +
          `to the CloudFront edge. The rest will be evaluated by Astro at runtime.\n`,
      );
    }
    manifest.redirects = liftedRedirects.slice(0, REDIRECT_LIFT_CAP);
  }

  if (basePath) {
    manifest.basePath = basePath;
    process.stdout.write(
      `🔗 Detected Astro base=${basePath}; CloudFront behaviors will be prefixed.\n`,
    );
  }

  // Pre-compressed sibling cleanup — CloudFront re-compresses on the
  // edge based on `Accept-Encoding`; serving the build's `.gz`/`.br`
  // copies as if they were originals breaks negotiation.
  const staticDir = manifest.staticAssets.directory;
  if (fs.existsSync(staticDir)) {
    const compressed = fg.sync('**/*.{gz,br,zst}', {
      cwd: staticDir,
      absolute: true,
      caseSensitiveMatch: false,
    });
    for (const f of compressed) fs.rmSync(f);
  }

  // Inject amplify_outputs.json into the SSR bundle so framework code
  // can read backend config at runtime regardless of file tracing.
  if (output !== 'static') {
    const outputsFile = path.join(projectDir, 'amplify_outputs.json');
    if (fs.existsSync(outputsFile) && fs.existsSync(serverDir)) {
      const dest = path.join(serverDir, 'amplify_outputs.json');
      if (!fs.existsSync(dest)) {
        fs.copyFileSync(outputsFile, dest);
        process.stderr.write(
          `\u{1F4E6} Copied amplify_outputs.json → ${path.relative(projectDir, dest)}\n`,
        );
      }
    }
    writeRunShWrapper(serverDir);
    // Defensive: a previous tool (or an older adapter version) may have
    // left `dist/node_modules/` behind. Astro's build does not write
    // there, so anything present is unbundled and would balloon the
    // Lambda zip past the 250 MB unzipped limit.
    const strayNodeModules = path.join(distDir, 'node_modules');
    if (fs.existsSync(strayNodeModules)) {
      fs.rmSync(strayNodeModules, { recursive: true, force: true });
    }
  }

  warnIfImageOptUnreachable(manifest, staticDir);

  return manifest;
};

// ---- internal types ----

type AstroOutput = 'static' | 'server' | 'hybrid';
type AstroTrailingSlash = 'always' | 'never' | 'ignore';

type AstroConfigShape = {
  output?: AstroOutput;
  trailingSlash?: AstroTrailingSlash;
  base?: string;
  image?: {
    domains?: string[];
  };
};

// ---- pipeline steps ----

const assertAstroVersion = (projectDir: string): void => {
  // Read the version from `node_modules/astro/package.json` rather than
  // the project's own `package.json` spec range. This matters when:
  //   - the user declared `^4.0.0` but never ran `npm install` (no
  //     astro on disk → fail closed),
  //   - the spec is a non-semver string like `workspace:*`, `latest`,
  //     `file:../fork` (semver.coerce returned `null` before, blocking
  //     legitimate users),
  //   - the installed version drifted from the spec range and the
  //     user is on an older Astro than the declaration claims.
  const info = getPackageInfoSync('astro', { paths: [projectDir] });
  const version = info?.version;
  if (!version || !semver.gte(version, '4.0.0')) {
    throw new HostingError('UnsupportedAstroVersionError', {
      message: `Astro 4.0+ is required; ${
        version ? `installed version is ${version}` : 'astro is not installed'
      }.`,
      resolution:
        'Run `npm install astro@latest` (or your package manager equivalent). ' +
        'If you are on Astro 3.x, follow the upgrade guide at https://docs.astro.build/en/upgrade-astro/.',
    });
  }
};

const userHasAstroJsNode = (projectDir: string): boolean =>
  isPackageExists('@astrojs/node', { paths: [projectDir] });

const installAstroBridge = (
  projectDir: string,
  bodySizeLimit: number,
): (() => void) => {
  const userConfigPath = findAstroConfigPath(projectDir);
  if (!userConfigPath) {
    throw new HostingError('AstroConfigNotFoundError', {
      message: `No astro.config.{mjs,ts,mts,cjs,js} found in ${projectDir}.`,
      resolution:
        'Add an astro.config.mjs (with at least `output: "server"`) at the project root, ' +
        'or install @astrojs/node yourself and configure it in your astro.config.',
    });
  }

  const bridgeDir = path.join(projectDir, BRIDGE_DIR_REL);
  const amplifyDir = path.dirname(bridgeDir);
  const createdAmplifyDir = !fs.existsSync(amplifyDir);
  const createdBridgeDir = !fs.existsSync(bridgeDir);

  fs.mkdirSync(bridgeDir, { recursive: true });

  // Forward-slash relative path from `<projectDir>/.amplify/astro/`
  // back to the user's config; works on both POSIX and Windows because
  // ESM resolves URLs, not native paths.
  const userConfigRelative = path.posix.join(
    '..',
    '..',
    path.basename(userConfigPath),
  );
  fs.writeFileSync(
    path.join(bridgeDir, BRIDGE_CONFIG_FILE),
    buildBridgeConfigSource(userConfigRelative, bodySizeLimit),
    'utf-8',
  );

  installAstroJsNode(projectDir);
  process.stderr.write(
    '✨ Installed Amplify Astro bridge (transparent build)\n',
  );

  return (): void => {
    try {
      const cfg = path.join(bridgeDir, BRIDGE_CONFIG_FILE);
      if (fs.existsSync(cfg)) fs.rmSync(cfg);
      if (createdBridgeDir && fs.existsSync(bridgeDir)) {
        if (fs.readdirSync(bridgeDir).length === 0) fs.rmdirSync(bridgeDir);
      }
      if (createdAmplifyDir && fs.existsSync(amplifyDir)) {
        if (fs.readdirSync(amplifyDir).length === 0) fs.rmdirSync(amplifyDir);
      }
      // eslint-disable-next-line @aws-amplify/amplify-backend-rules/no-empty-catch
    } catch {
      // Best-effort cleanup; a leftover .amplify/astro/ shouldn't fail the deploy.
    }
  };
};

const installAstroJsNode = (projectDir: string): void => {
  process.stderr.write(
    `\u{1F4E6} Installing ${ASTROJS_NODE_PIN} (--no-save)\n`,
  );
  try {
    spawn.sync(
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
          'Try `npm install --no-save @astrojs/node` in your project to diagnose, ' +
          'or pin @astrojs/node yourself in package.json and re-run.',
      },
      error as Error,
    );
  }
};

const buildBridgeConfigSource = (
  userConfigRelativePath: string,
  bodySizeLimit: number,
): string => `import userConfig from '${userConfigRelativePath}';
import node from '@astrojs/node';

if (userConfig.adapter) {
  process.stderr.write(
    \`[amplify-hosting:astro] replacing user adapter "\${userConfig.adapter.name}" with @astrojs/node (standalone).\\n\`,
  );
}

export default {
  ...userConfig,
  output: 'server',
  adapter: node({ mode: 'standalone', bodySizeLimit: ${bodySizeLimit} }),
  vite: {
    ...(userConfig.vite ?? {}),
    ssr: {
      ...((userConfig.vite ?? {}).ssr ?? {}),
      // Bundle every transitive dep into the server output so the
      // Lambda zip needs no node_modules at runtime. Known caveat:
      // some CJS-only packages (e.g. \`cssesc\` reached through
      // \`astro:content\` build-time sync) fail Vite's SSR module
      // runner with "module is not defined". Workarounds: avoid
      // content collections, or pin the affected package via
      // \`vite.ssr.noExternal: ['my-pkg']\` in your astro.config.
      noExternal: true,
    },
  },
};
`;

const runAstroBuild = (
  projectDir: string,
  buildCommand: string[] | undefined,
  useBridgeConfig: boolean,
): void => {
  const baseCmd =
    buildCommand && buildCommand.length > 0
      ? buildCommand
      : projectHasBuildScript(projectDir)
        ? ['npm', 'run', 'build']
        : ['npx', 'astro', 'build'];
  const cmd = useBridgeConfig
    ? [
        ...baseCmd,
        '--',
        '--config',
        path.posix.join(BRIDGE_DIR_REL, BRIDGE_CONFIG_FILE),
      ]
    : baseCmd;

  process.stderr.write(`\u{1F528} Running Astro build: ${cmd.join(' ')}\n`);
  try {
    const [bin, ...args] = cmd;
    spawn.sync(bin!, args, {
      cwd: projectDir,
      stdio: 'inherit',
    });
  } catch (error) {
    throw new HostingError(
      'AstroBuildError',
      {
        message: 'Astro build failed.',
        resolution:
          'Check the build output above. Common causes:\n' +
          '  - Missing dependencies (run: npm install)\n' +
          '  - Invalid astro.config.{ts,mjs}\n' +
          '  - TypeScript errors in your pages or components',
      },
      error as Error,
    );
  }
};

const projectHasBuildScript = (projectDir: string): boolean => {
  const pkgPath = path.join(projectDir, 'package.json');
  if (!fs.existsSync(pkgPath)) return false;
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as {
      scripts?: Record<string, string>;
    };
    return Boolean(pkg.scripts?.build);
  } catch {
    return false;
  }
};

const ASTRO_CONFIG_FILES = [
  'astro.config.ts',
  'astro.config.mts',
  'astro.config.mjs',
  'astro.config.js',
  'astro.config.cjs',
];

const findAstroConfigPath = (projectDir: string): string | undefined =>
  ASTRO_CONFIG_FILES.map((f) => path.join(projectDir, f)).find((p) =>
    fs.existsSync(p),
  );

const loadAstroConfig = (projectDir: string): AstroConfigShape => {
  const configPath = findAstroConfigPath(projectDir);
  if (!configPath) return {};
  try {
    const jiti = createJiti(projectDir, { interopDefault: true });
    const mod = jiti(configPath) as
      | AstroConfigShape
      | { default?: AstroConfigShape };
    const config: AstroConfigShape =
      mod && typeof mod === 'object' && 'default' in mod && mod.default
        ? (mod.default as AstroConfigShape)
        : (mod as AstroConfigShape);
    return config ?? {};
  } catch (error) {
    process.stderr.write(
      `⚠️  Failed to load astro.config (${path.basename(configPath)}); ` +
        `falling back to defaults. Error: ${(error as Error).message}\n`,
    );
    return {};
  }
};

const readArrayOfStrings = (
  obj: Record<string, unknown>,
  ...keys: string[]
): string[] => {
  let cur: unknown = obj;
  for (const k of keys) {
    if (!cur || typeof cur !== 'object') return [];
    cur = (cur as Record<string, unknown>)[k];
  }
  return Array.isArray(cur) && cur.every((v) => typeof v === 'string')
    ? (cur as string[])
    : [];
};

/**
 * Translate Astro's `redirects:` config table into the manifest's
 * `redirects[]` shape. Astro accepts two value forms:
 *   - string shorthand:    `'/old': '/new'`             → 301
 *   - object with status:  `'/old': { destination, status }`
 * `status` defaults to 301 when omitted. Unknown / malformed entries are
 * skipped silently — Astro treats malformed redirect entries the same way
 * (they fall through to its router) and we don't want a typo in
 * `astro.config` to fail the whole build.
 */
const liftAstroRedirects = (config: Record<string, unknown>): Redirect[] => {
  const redirects = config.redirects;
  if (!redirects || typeof redirects !== 'object') return [];
  const out: Redirect[] = [];
  for (const [source, value] of Object.entries(
    redirects as Record<string, unknown>,
  )) {
    if (typeof value === 'string') {
      out.push({ source, destination: value, statusCode: 301 });
      continue;
    }
    if (
      value &&
      typeof value === 'object' &&
      'destination' in value &&
      typeof (value as { destination?: unknown }).destination === 'string'
    ) {
      const v = value as { destination: string; status?: unknown };
      const rawStatus = typeof v.status === 'number' ? v.status : 301;
      const statusCode: 301 | 302 | 307 | 308 =
        rawStatus === 302 || rawStatus === 307 || rawStatus === 308
          ? rawStatus
          : 301;
      out.push({ source, destination: v.destination, statusCode });
    }
  }
  return out;
};

const directoryHasFiles = (dir: string): boolean => {
  if (!fs.existsSync(dir)) return false;
  return fs.readdirSync(dir).length > 0;
};

const buildOutputMissingError = (
  missingPath: string,
  mode: AstroOutput,
): HostingError =>
  new HostingError('AstroBuildOutputMissingError', {
    message: `Astro ${mode} build output is missing or empty at ${missingPath}.`,
    resolution:
      mode === 'static'
        ? 'Run `astro build` and confirm `dist/` is populated.'
        : 'Run `astro build` with `output: "server"` (or `"hybrid"`) and the @astrojs/node adapter ' +
          'in standalone mode so `dist/server/entry.mjs` is emitted.',
  });

// ---- manifest builders ----

const buildStaticManifest = (distDir: string): DeployManifest => {
  const errorPages = detectErrorPages(distDir);
  return {
    version: 1,
    compute: {},
    staticAssets: { directory: distDir },
    routes: [{ pattern: '/*', target: 'static' }],
    ...(Object.keys(errorPages).length > 0 ? { errorPages } : {}),
  };
};

const buildSsrManifest = (input: {
  distDir: string;
  clientDir: string;
  serverDir: string;
  output: AstroOutput;
  trailingSlash: AstroTrailingSlash;
  imageDomains: string[];
}): DeployManifest => {
  const { distDir, clientDir, serverDir, output, trailingSlash, imageDomains } =
    input;

  // bundle: dist/  — so the Lambda zip has `server/` and `client/` as
  // siblings; @astrojs/node's standalone runtime walks `import.meta.url`
  // up to find the `server/` segment, then resolves `client/` relative
  // to it. Pointing bundle at dist/server/ would lose the `client/`
  // prefix and the static-fallback inside the standalone server would
  // 404 every prerendered route.
  const manifest: DeployManifest = {
    version: 1,
    compute: {
      default: {
        type: 'http-server',
        bundle: distDir,
        entrypoint: path.posix.join(path.basename(serverDir), RUN_SH_FILENAME),
        port: ASTRO_SERVER_PORT,
        placement: 'regional',
        runtime: 'nodejs20.x',
      },
    },
    staticAssets: { directory: clientDir },
    routes: [],
  };

  // Astro middleware is bundled into entry.mjs by the standalone
  // runtime — it runs inside the regional SSR Lambda on every request.
  // We deliberately do NOT set manifest.middleware: that field tells the
  // L3 to provision a separate Lambda@Edge viewer-request association,
  // which would (a) double-invoke (one Lambda@Edge + one regional
  // Lambda) and (b) collide with the CloudFront Function the L3 already
  // attaches to viewer-request for asset-prefix / build-id rewrites.
  // The middleware bundle is still inspected later for diagnostics.

  // Astro's built-in image endpoint shows up in the server manifest.
  if (hasAstroImageEndpoint(serverDir)) {
    manifest.imageOptimization = {
      bundle: serverDir,
      handler: 'entry.handler',
      formats: ['webp', 'avif'],
      sizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
      baseURL: '/_image',
      ...(imageDomains.length > 0 ? { domains: imageDomains } : {}),
    };
  }

  const errorPages = detectErrorPages(clientDir);
  if (Object.keys(errorPages).length > 0) {
    manifest.errorPages = errorPages;
  }

  const routes: RouteBehavior[] = [{ pattern: '/_astro/*', target: 'static' }];

  // Hybrid: route prerendered HTML pages to the static origin so the
  // SSR Lambda doesn't burn invocations rendering frozen content.
  if (output === 'hybrid') {
    const prerendered = fg.sync('**/*.html', {
      cwd: clientDir,
      ignore: ['index.html'],
    });
    for (const html of prerendered) {
      const urlPath = htmlToUrlPath(html);
      if (urlPath === '/') continue;
      routes.push({ pattern: `${urlPath}/*`, target: 'static' });
      const bare = normalizeRoutePattern(urlPath, trailingSlash);
      if (bare !== '/') routes.push({ pattern: bare, target: 'static' });
    }
  }

  routes.push({ pattern: '/*', target: 'default' });
  manifest.routes = dedupeRoutes(routes);

  return manifest;
};

const detectErrorPages = (
  staticDir: string,
): Partial<Record<404 | 500, string>> => {
  const out: Partial<Record<404 | 500, string>> = {};
  if (fs.existsSync(path.join(staticDir, '404.html'))) {
    out[404] = '/404.html';
  }
  if (fs.existsSync(path.join(staticDir, '500.html'))) {
    out[500] = '/500.html';
  }
  return out;
};

const hasAstroImageEndpoint = (serverDir: string): boolean => {
  if (!fs.existsSync(serverDir)) return false;
  const matches = fg.sync(
    ['manifest_*.json', 'manifest_*.mjs', 'manifest.json'],
    {
      cwd: serverDir,
      absolute: true,
      onlyFiles: true,
    },
  );
  for (const file of matches) {
    try {
      if (/_image|_astro\/_image/.test(fs.readFileSync(file, 'utf-8'))) {
        return true;
      }
      // eslint-disable-next-line @aws-amplify/amplify-backend-rules/no-empty-catch
    } catch {
      // Skip unreadable manifests — cheap fallback.
    }
  }
  return false;
};

const htmlToUrlPath = (relPath: string): string => {
  const normalized = relPath.replace(/\\/g, '/').replace(/\.html$/, '');
  let urlPath = '/' + normalized;
  urlPath = urlPath.replace(/\/index$/, '');
  return urlPath === '' ? '/' : urlPath;
};

const normalizeRoutePattern = (
  pattern: string,
  trailingSlash: AstroTrailingSlash,
): string => {
  if (pattern === '/' || pattern.endsWith('/*')) return pattern;
  const stripped = pattern.replace(/\/+$/, '');
  if (trailingSlash === 'always') {
    return stripped + '/';
  }
  return stripped;
};

const dedupeRoutes = (routes: RouteBehavior[]): RouteBehavior[] => {
  const seen = new Set<string>();
  const out: RouteBehavior[] = [];
  for (const r of routes) {
    if (seen.has(r.pattern)) continue;
    seen.add(r.pattern);
    out.push(r);
  }
  return out;
};

const writeRunShWrapper = (serverDir: string): void => {
  const dest = path.join(serverDir, RUN_SH_FILENAME);
  fs.writeFileSync(dest, RUN_SH_SOURCE, { encoding: 'utf-8', mode: 0o755 });
};

const warnIfImageOptUnreachable = (
  manifest: DeployManifest,
  staticDir: string,
): void => {
  if (!manifest.imageOptimization) return;
  const domains = manifest.imageOptimization.domains ?? [];
  if (domains.length > 0) return;
  const localImages = fs.existsSync(staticDir)
    ? fg.sync('**/*.{png,jpg,jpeg,gif,webp,avif,svg}', {
        cwd: staticDir,
        caseSensitiveMatch: false,
      })
    : [];
  if (localImages.length === 0) {
    process.stderr.write(
      '⚠️  Image optimization is enabled but no allowed remote domains are configured\n' +
        '   and no local images were found in the static assets. If you intend to\n' +
        '   optimize remote images, set image.domains[] in astro.config.\n',
    );
  }
};
