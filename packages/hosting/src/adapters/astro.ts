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
 */
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import fg from 'fast-glob';
import semver from 'semver';
import { createJiti } from 'jiti';
import { HostingError } from '../hosting_error.js';
import { DeployManifest, RouteBehavior } from '../manifest/types.js';
import { readProjectDeps } from './index.js';

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
};

/**
 * Run the Astro adapter pipeline.
 * @param options - adapter configuration
 * @returns the generated DeployManifest
 */
export const astroAdapter = (options: AstroAdapterOptions): DeployManifest => {
  const { projectDir, skipBuild, buildCommand } = options;

  assertAstroVersion(projectDir);

  if (!skipBuild) {
    runAstroBuild(projectDir, buildCommand);
  }

  const config = loadAstroConfig(projectDir);
  const output: AstroOutput =
    (config.output as AstroOutput | undefined) ?? 'static';
  const trailingSlash: AstroTrailingSlash =
    (config.trailingSlash as AstroTrailingSlash | undefined) ?? 'ignore';
  const imageDomains = readArrayOfStrings(config, 'image', 'domains');

  const distDir = path.join(projectDir, 'dist');
  const clientDir = path.join(distDir, 'client');
  const serverDir = path.join(distDir, 'server');
  const serverEntry = path.join(serverDir, 'entry.mjs');

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
          projectDir,
          clientDir,
          serverDir,
          output,
          trailingSlash,
          imageDomains,
        });

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
  image?: {
    domains?: string[];
  };
};

// ---- pipeline steps ----

const assertAstroVersion = (projectDir: string): void => {
  const deps = readProjectDeps(projectDir);
  const raw = deps['astro'];
  const version = raw ? semver.coerce(raw)?.version : undefined;
  if (!version || !semver.gte(version, '4.0.0')) {
    throw new HostingError('UnsupportedAstroVersionError', {
      message: `Astro 4.0+ is required; found ${raw ?? 'no astro dependency'}.`,
      resolution:
        'Upgrade Astro: npm install astro@latest. ' +
        'If you are on Astro 3.x, follow the official upgrade guide at https://docs.astro.build/en/upgrade-astro/.',
    });
  }
};

const runAstroBuild = (
  projectDir: string,
  buildCommand: string[] | undefined,
): void => {
  const cmd =
    buildCommand && buildCommand.length > 0
      ? buildCommand
      : projectHasBuildScript(projectDir)
        ? ['npm', 'run', 'build']
        : ['npx', 'astro', 'build'];
  process.stderr.write(`\u{1F528} Running Astro build: ${cmd.join(' ')}\n`);
  try {
    const [bin, ...args] = cmd;
    // shell: true so Windows resolves `npm` → `npm.cmd` via PATHEXT.
    execFileSync(bin!, args, {
      cwd: projectDir,
      stdio: 'inherit',
      shell: true,
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
  'astro.config.mjs',
  'astro.config.js',
  'astro.config.cjs',
];

const loadAstroConfig = (projectDir: string): AstroConfigShape => {
  const configPath = ASTRO_CONFIG_FILES.map((f) =>
    path.join(projectDir, f),
  ).find((p) => fs.existsSync(p));
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
  projectDir: string;
  clientDir: string;
  serverDir: string;
  output: AstroOutput;
  trailingSlash: AstroTrailingSlash;
  imageDomains: string[];
}): DeployManifest => {
  const { clientDir, serverDir, output, trailingSlash, imageDomains } = input;

  const manifest: DeployManifest = {
    version: 1,
    compute: {
      default: {
        type: 'handler',
        bundle: serverDir,
        handler: 'entry.handler',
        placement: 'regional',
        streaming: true,
        runtime: 'nodejs20.x',
      },
    },
    staticAssets: { directory: clientDir },
    routes: [],
  };

  // Astro middleware (when src/middleware.ts exists, the build emits
  // dist/server/_middleware.mjs).
  const middlewareFile = path.join(serverDir, '_middleware.mjs');
  if (fs.existsSync(middlewareFile)) {
    manifest.middleware = {
      bundle: serverDir,
      handler: '_middleware.handler',
      matchers: ['/((?!_astro/).*)'],
    };
  }

  // Astro's built-in image endpoint shows up in the server manifest.
  const astroManifestPath = findAstroServerManifest(serverDir);
  if (astroManifestPath && hasImageEndpoint(astroManifestPath)) {
    manifest.imageOptimization = {
      bundle: serverDir,
      handler: 'entry.handler',
      formats: ['webp', 'avif'],
      sizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
      baseURL: '/_astro/_image',
      ...(imageDomains.length > 0 ? { domains: imageDomains } : {}),
    };
  }

  const errorPages = detectErrorPages(clientDir);
  if (Object.keys(errorPages).length > 0) {
    manifest.errorPages = errorPages;
  }

  const routes: RouteBehavior[] = [{ pattern: '/_astro/*', target: 'static' }];

  // Hybrid: each prerendered HTML page in dist/client/ resolves through
  // the static origin so the SSR Lambda doesn't waste invocations.
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

const findAstroServerManifest = (serverDir: string): string | undefined => {
  if (!fs.existsSync(serverDir)) return undefined;
  const matches = fg.sync(['manifest_*.json', 'manifest.json'], {
    cwd: serverDir,
    absolute: true,
    onlyFiles: true,
  });
  return matches[0];
};

const hasImageEndpoint = (manifestPath: string): boolean => {
  try {
    const raw = fs.readFileSync(manifestPath, 'utf-8');
    return /_astro\/_image/.test(raw);
  } catch {
    return false;
  }
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
