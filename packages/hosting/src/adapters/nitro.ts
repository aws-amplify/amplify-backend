/**
 * Nitro adapter — works for any framework that builds with Nitro.
 *
 * Nitro is a framework-agnostic server engine (https://nitro.unjs.io)
 * used by Nuxt, SolidStart, Analog, TanStack Start, and standalone Nitro
 * apps. They all emit the same `.output/` directory shape, so a single
 * adapter can translate any of them into a DeployManifest.
 *
 * Inputs read from `.output/`:
 *   - `nitro.json`  — preset, framework metadata, routeRules
 *   - `server/`     — the Lambda bundle
 *   - `public/`     — static assets + prerendered HTML
 *
 * The L3 construct never knows which UI framework produced this — it
 * only sees compute resources, route patterns, and a static-assets dir.
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
import { NITRO_CACHE_PLUGIN_SOURCE } from './nitro_cache_plugin_template.js';
import {
  IPX_LAMBDA_HANDLER_SOURCE,
  IPX_LAMBDA_PACKAGE_JSON,
} from './ipx_lambda_template.js';

export type NitroAdapterOptions = {
  /** Project root directory (the directory containing the framework config) */
  projectDir: string;
  /** Skip the build step (use a pre-existing .output/) */
  skipBuild?: boolean;
  /**
   * Override the Nitro preset to build with.
   *
   * Defaults to `'aws-lambda'` which produces an AWS Lambda handler.
   * To enable response streaming, set `nitro.awsLambda.streaming: true`
   * in the user's `nuxt.config.ts` (the adapter reads this from
   * `.output/nitro.json`). `'node-server'` produces a plain Node HTTP
   * server (run via the Lambda Web Adapter).
   */
  preset?: string;
  /**
   * Build command override. Defaults to `npm run build`, which works for
   * Nuxt, SolidStart, Analog, TanStack Start, and any Nitro-based project
   * that wires `build` to its framework's CLI in package.json.
   *
   * Pass an explicit array (e.g. `['nuxt', 'build']`) to bypass npm and
   * call the framework CLI directly.
   */
  buildCommand?: string[];
};

/** Subset of `.output/nitro.json` we rely on. */
type NitroBuildInfo = {
  preset?: string;
  framework?: { name?: string; version?: string };
  serverEntry?: string;
  publicDir?: string;
  routeRules?: Record<string, NitroRouteRule>;
  config?: {
    awsLambda?: { streaming?: boolean };
  };
};

type NitroRouteRule = {
  prerender?: boolean;
  redirect?: string | { to: string; statusCode?: 301 | 302 | 307 | 308 };
  headers?: Record<string, string>;
  cors?: boolean;
  cache?: { swr?: boolean; maxAge?: number };
};

/**
 * Run the framework's build (unless skipped) and translate `.output/`
 * into a DeployManifest.
 * @param options - adapter options
 * @returns framework-agnostic DeployManifest ready for the L3 construct
 */
export const nitroAdapter = (options: NitroAdapterOptions): DeployManifest => {
  const { projectDir, skipBuild, preset, buildCommand } = options;
  const effectivePreset = preset ?? 'aws-lambda';

  const outputDir = path.join(projectDir, '.output');
  const serverDir = path.join(outputDir, 'server');
  const publicDir = path.join(outputDir, 'public');
  const nitroJsonPath = path.join(outputDir, 'nitro.json');

  if (!skipBuild) {
    // Inject the Amplify cache plugin into the user's source tree so
    // Nitro picks it up at build time. Always remove it after the
    // build completes (even on failure) so we never leave artefacts
    // in the user's repo.
    const cachePluginCleanup = installNitroCachePlugin(projectDir);
    try {
      runNitroBuild(projectDir, effectivePreset, buildCommand);
    } finally {
      cachePluginCleanup();
    }
  }

  if (!fs.existsSync(outputDir)) {
    throw new HostingError('NitroOutputNotFoundError', {
      message: `Nitro .output/ not found at ${outputDir}.`,
      resolution:
        'Ensure the framework build succeeded. Re-run it manually with NITRO_PRESET=aws-lambda to diagnose.',
    });
  }

  if (!fs.existsSync(serverDir)) {
    throw new HostingError('NitroOutputNotFoundError', {
      message: `Nitro server bundle not found at ${serverDir}.`,
      resolution:
        'The build did not produce a server output. Check your framework config and the Nitro preset.',
    });
  }

  // Best-effort copy of amplify_outputs.json into the server bundle so the
  // SSR Lambda can talk to the Amplify backend at runtime. No-op if absent.
  copyAmplifyOutputsToServerBundle(projectDir, serverDir);

  // Strip pre-compressed sibling files (.gz / .br / .zst). We let
  // CloudFront re-compress on the edge instead — the per-edge cache
  // would otherwise hold N variants per object without negotiating
  // them, and the storage savings are eaten by upload time.
  prunePreCompressedAssets(publicDir);

  // If the user has @nuxt/image installed, build a standalone IPX
  // Lambda bundle so sharp doesn't bloat the SSR Lambda. The bundle
  // is referenced via `manifest.imageOptimization` later on.
  const imageOptBundle = buildImageOptBundleIfNeeded(projectDir);

  let nitroInfo: NitroBuildInfo = {};
  if (fs.existsSync(nitroJsonPath)) {
    try {
      nitroInfo = JSON.parse(fs.readFileSync(nitroJsonPath, 'utf-8'));
    } catch (error) {
      throw new HostingError(
        'NitroOutputParseError',
        {
          message: `Failed to parse Nitro build info at ${nitroJsonPath}.`,
          resolution:
            'The .output/nitro.json file contains invalid JSON. Try running the build again.',
        },
        error as Error,
      );
    }
  }

  // Merge route rules from the user's nuxt.config.ts (visible in
  // nitro.json on some Nitro versions) with the rules Nitro itself
  // bakes into the server bundle (Cache-Control for /_nuxt/**,
  // /_nuxt/builds/**, custom publicAssets entries, etc.). The bundled
  // ones include framework-default Cache-Control headers we want to
  // preserve.
  const bundledRouteRules = readBundledRouteRules(serverDir);
  const mergedRouteRules: Record<string, NitroRouteRule> = {
    ...bundledRouteRules,
    ...(nitroInfo.routeRules ?? {}),
  };

  const resolvedPreset = nitroInfo.preset ?? effectivePreset;
  const awsLambdaStreaming = nitroInfo.config?.awsLambda?.streaming === true;

  return buildManifest({
    preset: resolvedPreset,
    serverDir,
    publicDir,
    routeRules: mergedRouteRules,
    awsLambdaStreaming,
    imageOptBundle,
  });
};

/**
 * Execute the framework's build via the user's package.json scripts.
 *
 * Default `npm run build` works across Nuxt, SolidStart, Analog,
 * TanStack Start, and standalone Nitro apps because each one wires its
 * own `build` script. We pass NITRO_PRESET via env so any Nitro-backed
 * framework targets the right runtime without per-framework branching.
 */
const runNitroBuild = (
  projectDir: string,
  preset: string,
  buildCommand?: string[],
): void => {
  const cmd =
    buildCommand && buildCommand.length > 0
      ? buildCommand
      : ['npm', 'run', 'build'];
  process.stderr.write(
    `\u{1F528} Running build (NITRO_PRESET=${preset}): ${cmd.join(' ')}\n`,
  );
  try {
    const [bin, ...args] = cmd;
    execFileSync(bin!, args, {
      cwd: projectDir,
      stdio: 'inherit',
      env: { ...process.env, NITRO_PRESET: preset },
    });
  } catch (error) {
    throw new HostingError(
      'NitroBuildError',
      {
        message: 'Framework build failed.',
        resolution:
          'Check the build output above for errors. Common causes:\n' +
          '  - Missing dependencies (run: npm install)\n' +
          '  - Invalid framework config\n' +
          '  - TypeScript errors in your app\n' +
          '  - Unsupported NITRO_PRESET for the installed framework version',
      },
      error as Error,
    );
  }
};

/**
 * Filename injected into the user's `server/plugins/`. The leading
 * underscore avoids ordering collisions with user-named plugins.
 */
const CACHE_PLUGIN_FILENAME = '_amplify-cache.mjs';

/**
 * Copy the Amplify cache plugin into the user's `server/plugins/`
 * before Nitro builds. Returns a cleanup function that removes the
 * file (and the `server/plugins/` directory if we created it).
 */
const installNitroCachePlugin = (projectDir: string): (() => void) => {
  const pluginsDir = path.join(projectDir, 'server', 'plugins');
  const pluginPath = path.join(pluginsDir, CACHE_PLUGIN_FILENAME);

  // Track what we created so cleanup is exact.
  const createdPluginsDir = !fs.existsSync(pluginsDir);
  const createdServerDir = !fs.existsSync(path.join(projectDir, 'server'));

  fs.mkdirSync(pluginsDir, { recursive: true });
  fs.writeFileSync(pluginPath, NITRO_CACHE_PLUGIN_SOURCE, 'utf-8');

  return (): void => {
    try {
      if (fs.existsSync(pluginPath)) fs.rmSync(pluginPath);
      // Remove the directories ONLY if we created them — never touch
      // user-owned dirs.
      if (createdPluginsDir && fs.existsSync(pluginsDir)) {
        const entries = fs.readdirSync(pluginsDir);
        if (entries.length === 0) fs.rmdirSync(pluginsDir);
      }
      if (createdServerDir) {
        const serverDir = path.join(projectDir, 'server');
        if (fs.existsSync(serverDir)) {
          const entries = fs.readdirSync(serverDir);
          if (entries.length === 0) fs.rmdirSync(serverDir);
        }
      }
      // eslint-disable-next-line @aws-amplify/amplify-backend-rules/no-empty-catch
    } catch {
      // Best-effort cleanup. Failure to delete shouldn't fail the deploy.
    }
  };
};

/**
 * Read the routeRules object Nitro embedded in the server bundle.
 *
 * The compiled `chunks/nitro/nitro.mjs` file contains a JSON-shaped
 * `_inlineRuntimeConfig` literal whose `nitro.routeRules` field holds
 * every per-pattern rule Nitro produced — both the user's `routeRules`
 * from `nuxt.config.ts` and the framework defaults (e.g. immutable
 * Cache-Control on `/_nuxt/**`, custom `publicAssets` entries with
 * their `maxAge`).
 *
 * `nitro.json` doesn't expose this, so we extract it via regex from
 * the bundle. Returns {} if the file is missing or the regex doesn't
 * match — this is best-effort, never blocking.
 */
const readBundledRouteRules = (
  serverDir: string,
): Record<string, NitroRouteRule> => {
  const bundlePath = path.join(serverDir, 'chunks', 'nitro', 'nitro.mjs');
  if (!fs.existsSync(bundlePath)) return {};

  const source = fs.readFileSync(bundlePath, 'utf-8');
  const blob = extractJsonObjectAfter(source, '"routeRules":');
  if (!blob) return {};

  try {
    return JSON.parse(blob) as Record<string, NitroRouteRule>;
    // eslint-disable-next-line @aws-amplify/amplify-backend-rules/no-empty-catch
  } catch {
    // Malformed extraction — degrade gracefully.
    return {};
  }
};

/**
 * Find the first `{...}` JSON object that follows `marker` in `source`,
 * tracking brace depth so nested objects don't terminate early.
 */
const extractJsonObjectAfter = (
  source: string,
  marker: string,
): string | undefined => {
  const start = source.indexOf(marker);
  if (start === -1) return undefined;
  const open = source.indexOf('{', start + marker.length);
  if (open === -1) return undefined;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = open; i < source.length; i++) {
    const ch = source[i];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === '\\') {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === '{') {
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0) return source.slice(open, i + 1);
    }
  }
  return undefined;
};

/**
 * Remove pre-compressed sibling files (`*.gz`, `*.br`, `*.zst`) from
 * the public directory so they aren't uploaded to S3. CloudFront's
 * `compress: true` re-compresses on the edge based on `Accept-Encoding`,
 * which works correctly without these variants and avoids the cache-key
 * complexity needed to negotiate them.
 */
const prunePreCompressedAssets = (publicDir: string): void => {
  if (!fs.existsSync(publicDir)) return;
  const compressedExt = /\.(gz|br|zst)$/i;
  const visit = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        visit(full);
      } else if (entry.isFile() && compressedExt.test(entry.name)) {
        fs.rmSync(full);
      }
    }
  };
  visit(publicDir);
};

/**
 * If the user's project depends on `@nuxt/image`, materialise a
 * standalone IPX Lambda bundle at `<projectDir>/.amplify-hosting/image-optimization/`
 * so sharp doesn't bloat the SSR Lambda. Returns the absolute path to
 * the bundle directory, or undefined if no image-opt is needed.
 *
 * The bundle is reproducible: a fixed handler script (inlined in
 * ipx_lambda_template) plus an `npm install` targeting linux-x64 so
 * sharp's native binary matches the Lambda runtime.
 */
const buildImageOptBundleIfNeeded = (
  projectDir: string,
): string | undefined => {
  if (!projectUsesNuxtImage(projectDir)) return undefined;

  const bundleDir = path.join(
    projectDir,
    '.amplify-hosting',
    'image-optimization',
  );
  fs.mkdirSync(bundleDir, { recursive: true });
  fs.writeFileSync(
    path.join(bundleDir, 'index.mjs'),
    IPX_LAMBDA_HANDLER_SOURCE,
    'utf-8',
  );
  fs.writeFileSync(
    path.join(bundleDir, 'package.json'),
    IPX_LAMBDA_PACKAGE_JSON,
    'utf-8',
  );

  process.stderr.write(
    '\u{1F4F8} Building image-optimization Lambda bundle (sharp linux-x64)\n',
  );

  // Force npm to install Linux x64 binaries so sharp's native module
  // matches the Lambda runtime — Lambda is linux-x64.
  try {
    execFileSync(
      'npm',
      [
        'install',
        '--no-audit',
        '--no-fund',
        '--silent',
        '--include=optional',
        '--os=linux',
        '--cpu=x64',
        '--libc=glibc',
      ],
      {
        cwd: bundleDir,
        stdio: 'inherit',
      },
    );
  } catch (error) {
    throw new HostingError(
      'ImageOptimizationBundleError',
      {
        message:
          'Failed to install image-optimization dependencies (ipx + sharp).',
        resolution:
          'Run `npm install` inside .amplify-hosting/image-optimization/ to diagnose.',
      },
      error as Error,
    );
  }

  return bundleDir;
};

/**
 * True if the user has `@nuxt/image` in their direct dependencies.
 * The image-opt Lambda is only useful when the runtime ships
 * `<NuxtImg>` and uses the IPX provider.
 */
const projectUsesNuxtImage = (projectDir: string): boolean => {
  const pkgPath = path.join(projectDir, 'package.json');
  if (!fs.existsSync(pkgPath)) return false;
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    return '@nuxt/image' in deps;
    // eslint-disable-next-line @aws-amplify/amplify-backend-rules/no-empty-catch
  } catch {
    return false;
  }
};

/**
 * Copy amplify_outputs.json from project root into .output/server/ so SSR
 * code can read backend configuration at runtime.
 */
const copyAmplifyOutputsToServerBundle = (
  projectDir: string,
  serverDir: string,
): void => {
  const src = path.join(projectDir, 'amplify_outputs.json');
  if (!fs.existsSync(src)) return;

  const dest = path.join(serverDir, 'amplify_outputs.json');
  if (!fs.existsSync(dest)) {
    fs.copyFileSync(src, dest);
    process.stderr.write(
      `\u{1F4E6} Copied amplify_outputs.json → ${path.relative(projectDir, dest)}\n`,
    );
  }
};

/**
 * Build the DeployManifest from a known-good `.output/` layout.
 */
const buildManifest = (input: {
  preset: string;
  serverDir: string;
  publicDir: string;
  routeRules: Record<string, NitroRouteRule>;
  awsLambdaStreaming: boolean;
  imageOptBundle?: string;
}): DeployManifest => {
  const {
    preset,
    serverDir,
    publicDir,
    routeRules,
    awsLambdaStreaming,
    imageOptBundle,
  } = input;

  const compute: Record<string, ComputeResource> = {
    default: presetToCompute(preset, serverDir, awsLambdaStreaming),
  };

  const manifest: DeployManifest = {
    version: 1,
    compute,
    staticAssets: {
      directory: publicDir,
    },
    routes: buildRoutes(publicDir, routeRules, !!imageOptBundle),
  };

  const redirects = buildRedirects(routeRules);
  if (redirects.length > 0) {
    manifest.redirects = redirects;
  }

  const headers = buildHeaders(routeRules);
  if (headers.length > 0) {
    manifest.headers = headers;
  }

  // If any route rule uses SWR / ISR / cache, ask the L3 to provision
  // a shared S3-backed cache. Nitro's `useStorage('cache')` reads/writes
  // through the Amplify cache plugin we injected into the build.
  if (usesIsrFeatures(routeRules)) {
    manifest.cache = {
      computeResource: 'default',
      driver: 'nitro-s3',
    };
  }

  // Image optimization Lambda — separate compute so sharp's native
  // binary doesn't bloat the SSR Lambda zip.
  if (imageOptBundle) {
    manifest.imageOptimization = {
      bundle: imageOptBundle,
      handler: 'index.handler',
      // @nuxt/image's defaults; user can override via nuxt.config but
      // the IPX runtime accepts any size requested in the URL anyway.
      formats: ['webp', 'avif'],
      sizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    };
  }

  return manifest;
};

/**
 * Returns true if any route rule uses an ISR / SWR / cache feature
 * that needs a shared cache backend to actually work across Lambda
 * containers.
 */
const usesIsrFeatures = (
  routeRules: Record<string, NitroRouteRule>,
): boolean => {
  return Object.values(routeRules).some(
    (rule) =>
      rule.cache !== undefined ||
      // `swr` and `isr` aren't typed on our local NitroRouteRule yet
      // because we only consumed `cache` previously. Read them from the
      // raw object — Nitro emits any of these three for ISR semantics.
      (rule as Record<string, unknown>).swr !== undefined ||
      (rule as Record<string, unknown>).isr !== undefined,
  );
};

/**
 * Map a Nitro preset (+ relevant config flags) to the right
 * ComputeResource shape.
 */
const presetToCompute = (
  preset: string,
  serverDir: string,
  awsLambdaStreaming: boolean,
): ComputeResource => {
  // Plain Node HTTP server presets — front via the Lambda Web Adapter.
  if (preset === 'node-server' || preset === 'node') {
    return {
      type: 'http-server',
      bundle: serverDir,
      entrypoint: 'index.mjs',
      port: 3000,
      placement: 'regional',
      runtime: 'nodejs20.x',
    };
  }

  // Default: aws-lambda preset. Streaming is opt-in via
  // `nitro.awsLambda.streaming: true` in the user's config; Nitro
  // emits a different runtime entry that wraps the handler with
  // `awslambda.streamifyResponse`.
  return {
    type: 'handler',
    bundle: serverDir,
    handler: 'index.handler',
    placement: 'regional',
    streaming: awsLambdaStreaming,
    runtime: 'nodejs20.x',
  };
};

/**
 * Walk `.output/public/` and emit static routes for prerendered output,
 * then append a catch-all `/* → default` for SSR.
 */
const buildRoutes = (
  publicDir: string,
  routeRules: Record<string, NitroRouteRule>,
  hasImageOptimization: boolean,
): RouteBehavior[] => {
  const routes: RouteBehavior[] = [];
  const seenPatterns = new Set<string>();

  const addRoute = (route: RouteBehavior): void => {
    if (seenPatterns.has(route.pattern)) return;
    routes.push(route);
    seenPatterns.add(route.pattern);
  };

  // Image optimization route must come BEFORE the catch-all and
  // before any /<dir>/* match so /_ipx/* lands on the dedicated
  // Lambda. The L3 routes target='image-optimization' to a separate
  // compute resource (it's a reserved target).
  if (hasImageOptimization) {
    addRoute({ pattern: '/_ipx/*', target: 'image-optimization' });
  }

  if (fs.existsSync(publicDir)) {
    // Everything in `.output/public/` is, by definition, a static
    // asset. Walk the top level and route each entry to S3:
    //   - directory  → `/<name>/*`
    //   - file       → `/<name>`
    // This catches both framework-emitted dirs (`_nuxt/`, `_build/`,
    // `assets/`) and user-supplied ones (anything dropped into
    // `public/`, e.g. `public/img/`, `public/fonts/`).
    for (const entry of fs.readdirSync(publicDir, { withFileTypes: true })) {
      // Skip prerendered HTML routes — handled below as `<route>/*`.
      if (entry.isFile() && entry.name.endsWith('.html')) continue;
      const pattern = entry.isDirectory()
        ? `/${entry.name}/*`
        : `/${entry.name}`;
      addRoute({ pattern, target: 'static' });
    }

    // Walk for prerendered HTML pages and emit a *subtree* route for each.
    //
    // We deliberately do NOT emit a bare `/<route>` static route — the
    // CloudFront build-ID rewrite Function only appends `index.html` when
    // the URI ends with `/`, so `/about` would resolve to the S3 key
    // `builds/{id}/about` (no such object → 403). Instead we route
    // `/<route>/*` to S3 (so `_payload.json` and other sibling assets the
    // framework prefetches resolve), and let the bare `/<route>` flow
    // through the catch-all to the SSR Lambda, which re-renders the page
    // from the bundled component on demand.
    for (const htmlFile of walkHtmlFiles(publicDir)) {
      const rel = path.relative(publicDir, htmlFile).replace(/\\/g, '/');
      const urlPath = htmlFileToUrlPath(rel);
      if (urlPath === '/') continue;
      addRoute({ pattern: `${urlPath}/*`, target: 'static' });
    }
  }

  // Honour route rules with `prerender: true` even if the build hasn't
  // emitted a file at that path yet. We emit the subtree pattern only
  // (e.g. `/about/*` not bare `/about`) for the same reason the
  // filesystem walk above does — the build-ID rewriter can't resolve a
  // bare prerendered path to its index.html.
  for (const [routePattern, rule] of Object.entries(routeRules)) {
    if (rule.prerender) {
      const normalized = normalizeRulePattern(routePattern);
      const subtree = normalized.endsWith('/*')
        ? normalized
        : `${normalized}/*`;
      addRoute({ pattern: subtree, target: 'static' });
    }
  }

  // Catch-all SSR route always last.
  addRoute({ pattern: '/*', target: 'default' });

  return routes;
};

/**
 * Recursively collect every `.html` file under `dir`.
 */
const walkHtmlFiles = (dir: string): string[] => {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkHtmlFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      out.push(full);
    }
  }
  return out;
};

/**
 * Convert a relative `.html` path into a CloudFront route pattern.
 * `about/index.html` → `/about`
 * `index.html` → `/`
 * `blog/post.html` → `/blog/post`
 */
const htmlFileToUrlPath = (relPath: string): string => {
  let urlPath = '/' + relPath.replace(/\\/g, '/').replace(/\.html$/, '');
  urlPath = urlPath.replace(/\/index$/, '');
  return urlPath === '' ? '/' : urlPath;
};

/**
 * Normalize a route-rule pattern (e.g. `/blog/**`) to a CloudFront cache
 * behavior pattern (e.g. `/blog/*`).
 */
const normalizeRulePattern = (pattern: string): string => {
  return pattern.replace(/\*\*/g, '*');
};

/**
 * Translate `redirect` route rules into manifest Redirects.
 */
const buildRedirects = (
  routeRules: Record<string, NitroRouteRule>,
): NonNullable<DeployManifest['redirects']> => {
  const out: NonNullable<DeployManifest['redirects']> = [];
  for (const [source, rule] of Object.entries(routeRules)) {
    if (!rule.redirect) continue;
    const dest =
      typeof rule.redirect === 'string' ? rule.redirect : rule.redirect.to;
    const statusCode =
      typeof rule.redirect === 'object' && rule.redirect.statusCode
        ? rule.redirect.statusCode
        : 302;
    out.push({
      source: normalizeRulePattern(source),
      destination: dest,
      statusCode,
    });
  }
  return out;
};

/**
 * Translate `headers` route rules into manifest CustomHeaders.
 */
const buildHeaders = (
  routeRules: Record<string, NitroRouteRule>,
): NonNullable<DeployManifest['headers']> => {
  const out: NonNullable<DeployManifest['headers']> = [];
  for (const [source, rule] of Object.entries(routeRules)) {
    if (!rule.headers || Object.keys(rule.headers).length === 0) continue;
    out.push({
      source: normalizeRulePattern(source),
      headers: rule.headers,
    });
  }
  return out;
};

/**
 * Detect whether a project uses Nitro by inspecting its package.json deps.
 *
 * Frameworks built on Nitro:
 *   - Nuxt 3+ (`nuxt`)
 *   - SolidStart v1+ (`@solidjs/start`)
 *   - Analog (`@analogjs/platform-server`)
 *   - TanStack Start (`@tanstack/start`)
 *   - Standalone Nitro (`nitropack`)
 */
export const isNitroProject = (deps: Record<string, string>): boolean => {
  return (
    'nuxt' in deps ||
    'nitropack' in deps ||
    '@solidjs/start' in deps ||
    '@analogjs/platform-server' in deps ||
    '@tanstack/start' in deps
  );
};
