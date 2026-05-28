/**
 * Next.js adapter using opennextjs/aws.
 *
 * Runs OpenNext build, reads .open-next/ output, translates to DeployManifest.
 * The output manifest is framework-agnostic — the L3 construct never knows this
 * came from Next.js.
 */
import { spawn } from './spawn.js';
import { normalizeBasePath } from './shared/basepath.js';
import { validateCacheControl } from './shared/cache_control.js';
import {
  type TrailingSlashMode,
  emitTrailingSlashRedirects,
} from './shared/trailing_slash.js';
import * as fs from 'fs';
import * as path from 'path';
import fg from 'fast-glob';
import { HostingError } from '../hosting_error.js';
import type {
  ComputeResource,
  CustomHeader,
  DeployManifest,
  Redirect,
  RouteBehavior,
} from '../manifest/types.js';

export type NextjsAdapterOptions = {
  /** Project root directory */
  projectDir: string;
  /** Custom open-next.config.ts path (relative to projectDir) */
  configPath?: string;
  /** Skip the OpenNext build step (use pre-existing .open-next/ output) */
  skipBuild?: boolean;
};

// ---- OpenNext output types (internal) ----

type OpenNextOutput = {
  origins?: Record<string, OpenNextOrigin>;
  /**
   * Edge functions (Lambda@Edge bundles). OpenNext writes one entry per
   * edge function declared in the user's `functions: { ... }` config; each
   * one corresponds to a separate Lambda@Edge replica.
   */
  edgeFunctions?: Record<string, OpenNextEdgeFunction>;
  behaviors?: OpenNextBehavior[];
  additionalProps?: {
    [key: string]: unknown;
    disableIncrementalCache?: boolean;
    imageOptimization?: boolean;
  };
};

type OpenNextOrigin = {
  type?: 'function' | 'ecs' | 'docker' | 'edge' | string;
  handler?: string;
  entrypoint?: string;
  port?: number;
  streaming?: boolean;
  runtime?: string;
  memorySize?: number;
  timeout?: number;
  environment?: Record<string, string>;
};

type OpenNextEdgeFunction = {
  bundle?: string;
  handler?: string;
  /** Always 'aws-lambda' for AWS-targeted edge functions in OpenNext. */
  wrapper?: string;
  /** 'aws-cloudfront' when placement is global (Lambda@Edge). */
  converter?: string;
};

type OpenNextBehavior = {
  pattern: string;
  /** Set when the route targets a regional origin (S3, regional Lambda). */
  origin?: string;
  /**
   * Set when the route targets an edge function — keyed off
   * `output.edgeFunctions[edgeFunction]`.
   */
  edgeFunction?: string;
  fallback?: string;
};

/**
 * Run the OpenNext build and translate its output into a DeployManifest.
 * @param options - Adapter options
 * @returns Framework-agnostic DeployManifest ready for the L3 construct
 */
export const nextjsAdapter = (
  options: NextjsAdapterOptions,
): DeployManifest => {
  const { projectDir, configPath, skipBuild } = options;

  const openNextDir = path.join(projectDir, '.open-next');
  const outputPath = path.join(openNextDir, 'open-next.output.json');

  if (!skipBuild) {
    // L3 routes the SSR Lambda through API Gateway REST + STREAM. REST sends
    // payload v1, OpenNext defaults to v2 — force the v1 converter + streaming
    // wrapper for `default`. OpenNext's `--config-path` flag silently fails
    // to load configs from non-default locations, so the file must live at
    // <projectDir>/open-next.config.ts.
    //
    // Edge route detection requires Next.js's compiled middleware-manifest.
    // Skip the pre-build when:
    //   (a) the manifest already exists (user/CI ran `next build`, or a
    //       previous deploy cached it), OR
    //   (b) the project's source declares no `runtime: 'edge'` routes —
    //       in that case detectEdgeRoutes returns empty and the generated
    //       open-next.config.ts has no functions{} block, so OpenNext's
    //       own build pass produces all the manifests we'd need.
    // Both branches eliminate one full Next.js build (~10-60s) without
    // changing correctness: when we DO need edge detection AND the manifest
    // is missing, runNextBuild fires.
    let cleanupConfig: (() => void) | undefined;
    if (!configPath) {
      if (
        !hasExistingMiddlewareManifest(projectDir) &&
        projectHasEdgeRuntimeRoutes(projectDir)
      ) {
        runNextBuild(projectDir);
      }
      const edgeRoutes = detectEdgeRoutes(projectDir);
      cleanupConfig = installGeneratedOpenNextConfig(projectDir, edgeRoutes);
    }
    try {
      runOpenNextBuild(projectDir, configPath);
    } finally {
      cleanupConfig?.();
    }

    // Patch OpenNext's bundled aws-lambda-streaming wrapper for API Gateway
    // STREAM framing. See patchStreamingWrapperForApiGateway for what changes.
    patchStreamingWrapperForApiGateway(openNextDir);

    // Patch each edge bundle's process import banner for Lambda@Edge
    // nodejs20.x compatibility. See patchEdgeBundleForLambdaEdge.
    patchEdgeBundlesForLambdaEdge(openNextDir);
  }

  // Ensure amplify_outputs.json is in every server function bundle.
  // Next.js outputFileTracingIncludes is unreliable across rebuild scenarios,
  // so we explicitly copy the file into the OpenNext output.
  copyAmplifyOutputsToServerBundles(projectDir, openNextDir);

  if (!fs.existsSync(outputPath)) {
    throw new HostingError('OpenNextOutputNotFoundError', {
      message: `OpenNext output not found at ${outputPath}. Did the build succeed?`,
      resolution:
        'Ensure @opennextjs/aws is installed and the build completed successfully. ' +
        'Run `npx @opennextjs/aws build` manually to diagnose build failures.',
    });
  }

  let output: OpenNextOutput;
  try {
    output = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
  } catch (error) {
    throw new HostingError(
      'OpenNextOutputParseError',
      {
        message: `Failed to parse OpenNext output at ${outputPath}`,
        resolution:
          'The open-next.output.json file contains invalid JSON. Try running the build again.',
      },
      error as Error,
    );
  }

  const manifest = translateOpenNextOutput(output, openNextDir);

  // Lift simple Next.js redirects() / headers() rules out of the OpenNext
  // Lambda and into CloudFront. This eliminates a Lambda invocation for
  // matching paths (~150ms cold-start + ~5ms warm vs. ~5ms at the edge).
  // Complex rules (with `has`/`missing` conditions, regex captures, or
  // i18n locale groups) stay in the Lambda — see liftSimpleRoutesManifest
  // for the classifier. Anything we don't lift remains handled by the
  // OpenNext server bundle, so behavior is preserved.
  applyLiftedRoutesManifest(manifest, projectDir);
  applyAssetPrefix(manifest, projectDir);

  return manifest;
};

/**
 * Detect Next.js `assetPrefix` from the build's `required-server-files.json`
 * and copy it to the manifest. The L3 uses this to add CloudFront cache
 * behaviors at `/<prefix>/_next/*` so prefixed asset URLs resolve.
 *
 * Skips silently if the file is missing or assetPrefix is unset (most
 * apps).
 */
const applyAssetPrefix = (
  manifest: DeployManifest,
  projectDir: string,
): void => {
  const requiredServerFilesPath = path.join(
    projectDir,
    '.next',
    'required-server-files.json',
  );
  if (!fs.existsSync(requiredServerFilesPath)) return;
  let parsed: {
    config?: {
      assetPrefix?: string;
      basePath?: string;
      trailingSlash?: boolean;
    };
  };
  try {
    parsed = JSON.parse(fs.readFileSync(requiredServerFilesPath, 'utf-8'));
  } catch {
    return;
  }
  // basePath — the framework-side URL prefix for routes + assets. Read
  // alongside assetPrefix because they share the same JSON file.
  const bp = normalizeBasePath(parsed.config?.basePath);
  if (bp) {
    manifest.basePath = bp;
    process.stdout.write(
      `🔗 Detected Next.js basePath=${bp}; CloudFront behaviors will be prefixed.\n`,
    );
  }

  // trailingSlash — Next.js exposes a tri-state via boolean: true ⇒
  // 'always', false ⇒ 'never', undefined ⇒ 'ignore' (default).
  const tsRaw = parsed.config?.trailingSlash;
  const tsMode: TrailingSlashMode =
    tsRaw === true ? 'always' : tsRaw === false ? 'never' : 'ignore';
  applyTrailingSlashRedirects(manifest, projectDir, tsMode);

  const ap = parsed.config?.assetPrefix;
  if (typeof ap !== 'string' || ap === '') return;
  // Strip absolute-URL form (`https://cdn.example.com`) — only path-form
  // assetPrefix can be wired to a CloudFront behavior on the same
  // distribution. Absolute-URL assetPrefix means the user is fronting
  // their assets with a separate origin and we shouldn't touch it.
  if (/^https?:\/\//.test(ap)) return;
  // Normalize: ensure leading slash, no trailing slash.
  const normalized = '/' + ap.replace(/^\/+|\/+$/g, '');
  if (normalized === '/') return;
  manifest.assetPrefix = normalized;
  process.stdout.write(
    `🔗 Detected Next.js assetPrefix=${normalized}; will add CloudFront behaviors for prefixed asset paths.\n`,
  );
};

const REDIRECT_CAP_NEXTJS = 100;

/**
 * Read `.next/prerender-manifest.json` for the list of statically
 * prerendered URL paths and emit canonical-form redirects honoring the
 * user's `trailingSlash` setting. Caps at 100 entries (matches the
 * CloudFront Function size budget); user-declared redirects from
 * `liftSimpleRoutesManifest` get appended *afterwards* with the same
 * cap split.
 */
const applyTrailingSlashRedirects = (
  manifest: DeployManifest,
  projectDir: string,
  mode: TrailingSlashMode,
): void => {
  if (mode === 'ignore') return;
  const prerenderManifestPath = path.join(
    projectDir,
    '.next',
    'prerender-manifest.json',
  );
  if (!fs.existsSync(prerenderManifestPath)) return;
  let parsed: { routes?: Record<string, unknown> };
  try {
    parsed = JSON.parse(fs.readFileSync(prerenderManifestPath, 'utf-8'));
  } catch {
    return;
  }
  const paths = Object.keys(parsed.routes ?? {});
  const ts = emitTrailingSlashRedirects(paths, mode);
  if (ts.length === 0) return;
  const existing = manifest.redirects ?? [];
  const remaining = REDIRECT_CAP_NEXTJS - existing.length;
  if (remaining <= 0) {
    process.stderr.write(
      `⚠️  ${ts.length} trailing-slash redirect(s) skipped — Next.js redirect cap of ${REDIRECT_CAP_NEXTJS} ` +
        `already filled by user-declared redirects.\n`,
    );
    return;
  }
  if (ts.length > remaining) {
    process.stderr.write(
      `⚠️  ${ts.length} trailing-slash redirects requested; only ${remaining} fit ` +
        `under the ${REDIRECT_CAP_NEXTJS}-redirect CloudFront Function cap.\n`,
    );
  }
  manifest.redirects = [...existing, ...ts.slice(0, remaining)];
};

/**
 * One detected edge route, in the OpenNext config shape.
 *
 * `module` is the OpenNext route id (e.g. `app/api/edge/a/route`) —
 * leading `app/` or `pages/`, no extension. `pattern` is the URL pattern
 * with leading `/` (used as the CloudFront cache-behavior PathPattern).
 */
export type EdgeRoute = { module: string; pattern: string };

// Shape of the entries we care about in `.next/routes-manifest.json`. Both
// `redirects[]` and `headers[]` carry a `source` (Next route pattern) and
// a `regex` (compiled JS regex). Redirects also have a destination and
// statusCode; headers carry a list of {key, value} pairs.
type NextRoutesManifest = {
  redirects?: Array<{
    source: string;
    destination: string;
    statusCode: number;
    locale?: boolean;
    internal?: boolean;
    has?: unknown;
    missing?: unknown;
  }>;
  headers?: Array<{
    source: string;
    headers: Array<{ key: string; value: string }>;
    locale?: boolean;
    has?: unknown;
    missing?: unknown;
  }>;
};

/**
 * Test whether a Next.js route `source` is simple enough to lift to a
 * CloudFront Function / per-pattern ResponseHeadersPolicy. A source is
 * simple if it has no params (`:slug`, `:path+`), no regex groups, and
 * no character classes. Trailing-`*` is allowed because we map it to a
 * suffix-wildcard pattern handled by both the redirect snippet and
 * CloudFront's behavior matcher.
 *
 * Why so strict: the CloudFront Function redirect snippet only knows
 * exact-match and trailing-`*`. Anything else (param interpolation,
 * regex captures, locale groups) can't be evaluated at the edge — those
 * rules must stay in the OpenNext Lambda.
 */
const isSimpleNextSource = (source: string): boolean => {
  // Param syntax: ":name", ":name+", ":name*", or "(group)".
  if (/[:()]/.test(source)) return false;
  // Brackets, escapes, alternation, character classes.
  if (/[[\]\\|{}^$+?]/.test(source)) return false;
  // Only allow ASCII letters, digits, '/', '-', '_', '.', and a trailing '*'.
  // Strip the trailing '*' first if present.
  const stripped = source.endsWith('/*') ? source.slice(0, -2) : source;
  return /^\/[a-zA-Z0-9/_.-]*$/.test(stripped);
};

/**
 * Read `.next/routes-manifest.json` and lift simple redirects/headers
 * into the deploy manifest so the L3 wires them as CloudFront Functions
 * and per-pattern ResponseHeadersPolicies. Anything we don't lift stays
 * in the OpenNext Lambda; behavior is preserved either way.
 *
 * Skips silently when:
 *  - The manifest doesn't exist (e.g. `next build` hasn't run, or
 *    OpenNext is being driven from a pre-built `.next/`).
 *  - The redirect is `internal: true` (e.g. trailing-slash normalization;
 *    OpenNext handles it natively, and lifting it can flip-flop with
 *    Next's runtime URL handling).
 *  - The rule has `has`/`missing` conditions, locale groups, or any
 *    pattern feature the CloudFront edge can't evaluate.
 */
const applyLiftedRoutesManifest = (
  manifest: DeployManifest,
  projectDir: string,
): void => {
  const routesManifestPath = path.join(
    projectDir,
    '.next',
    'routes-manifest.json',
  );
  if (!fs.existsSync(routesManifestPath)) return;

  let routesManifest: NextRoutesManifest;
  try {
    routesManifest = JSON.parse(fs.readFileSync(routesManifestPath, 'utf-8'));
  } catch {
    // Invalid JSON — leave everything in Lambda. Don't fail the build.
    return;
  }

  const liftedRedirects: Redirect[] = [];
  const liftedHeaders: CustomHeader[] = [];
  let skippedRedirects = 0;
  let skippedHeaders = 0;

  for (const r of routesManifest.redirects ?? []) {
    if (r.internal) {
      // Trailing-slash and similar — leave to OpenNext.
      continue;
    }
    if (r.has || r.missing) {
      skippedRedirects++;
      continue;
    }
    if (![301, 302, 307, 308].includes(r.statusCode)) {
      skippedRedirects++;
      continue;
    }
    if (!isSimpleNextSource(r.source) || !isSimpleNextSource(r.destination)) {
      skippedRedirects++;
      continue;
    }
    liftedRedirects.push({
      source: r.source,
      destination: r.destination,
      statusCode: r.statusCode as 301 | 302 | 307 | 308,
    });
  }

  for (const h of routesManifest.headers ?? []) {
    if (h.has || h.missing) {
      skippedHeaders++;
      continue;
    }
    if (!isSimpleNextSource(h.source)) {
      skippedHeaders++;
      continue;
    }
    const headers: Record<string, string> = {};
    for (const entry of h.headers) {
      if (entry.key.toLowerCase() === 'cache-control') {
        validateCacheControl(
          entry.value,
          `route ${h.source} (Next.js headers config)`,
        );
      }
      headers[entry.key] = entry.value;
    }
    liftedHeaders.push({
      source: h.source,
      headers,
    });
  }

  if (liftedRedirects.length > 0) {
    manifest.redirects = [...(manifest.redirects ?? []), ...liftedRedirects];
  }
  if (liftedHeaders.length > 0) {
    manifest.headers = [...(manifest.headers ?? []), ...liftedHeaders];
  }

  if (
    liftedRedirects.length > 0 ||
    liftedHeaders.length > 0 ||
    skippedRedirects > 0 ||
    skippedHeaders > 0
  ) {
    process.stdout.write(
      `🚀 Lifted ${liftedRedirects.length} redirect(s) and ${liftedHeaders.length} header rule(s) to CloudFront. ` +
        `${skippedRedirects + skippedHeaders} kept in Lambda (conditional/regex/locale).\n`,
    );
  }
};

/**
 * Detect edge routes by reading Next.js's compiled middleware-manifest.
 *
 * `next build` writes `.next/server/middleware-manifest.json` containing
 * one entry per route compiled with the edge runtime. The `name` field
 * is exactly the module path OpenNext expects in `functions.<n>.routes`,
 * and `matchers[0].originalSource` is the URL the route serves.
 *
 * Reading the manifest is the only reliable detection: a regex scan
 * matches false positives in comments and string literals; the user's
 * code may also re-export edge runtime via barrel files. Next's compiler
 * is the source of truth.
 *
 * Caller must run `next build` (we do, via runNextBuild) before this.
 * Returns an empty array when the manifest is missing or has no edge
 * functions — both cases are valid (no edge usage in the project).
 * @internal
 */
export const detectEdgeRoutes = (projectDir: string): EdgeRoute[] => {
  const manifestPath = path.join(
    projectDir,
    '.next',
    'server',
    'middleware-manifest.json',
  );
  let manifest: {
    functions?: Record<
      string,
      {
        name?: string;
        matchers?: { originalSource?: string }[];
      }
    >;
  };
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw err;
  }

  const fns = manifest.functions ?? {};
  const out: EdgeRoute[] = [];
  for (const fn of Object.values(fns)) {
    const moduleName = fn.name;
    if (!moduleName) continue;
    // Iterate every matcher — multi-matcher middleware
    // (e.g. matcher: ['/admin/:path*', '/api/admin/:path*']) loses every
    // matcher after the first if we only honor matchers[0].
    for (const matcher of fn.matchers ?? []) {
      const original = matcher.originalSource;
      if (!original) continue;
      const slashed = original.startsWith('/') ? original : `/${original}`;
      out.push({
        module: moduleName,
        // OpenNext docs require CloudFront-compatible patterns in
        // functions.<n>.patterns; same translation as the route mapper.
        pattern: nextPatternToCloudFront(slashed),
      });
    }
  }
  return out;
};

/**
 * Generate <projectDir>/open-next.config.ts with `aws-apigw-v1` + streaming
 * wrapper so OpenNext picks them up on its next build. Returns a cleanup
 * closure. No-ops if the user already has their own open-next.config.ts.
 *
 * When `edgeRoutes` is non-empty, also emits a `functions.edge` block that
 * tells OpenNext to bundle those routes into a separate Lambda@Edge
 * function. Without that block OpenNext refuses to build any project that
 * declares `runtime = 'edge'` — it errors with "OpenNext requires edge
 * runtime function to be defined in a separate function" mid-bundle, so
 * the auto-config has to declare the split function up front.
 */
const installGeneratedOpenNextConfig = (
  projectDir: string,
  edgeRoutes: EdgeRoute[] = [],
): (() => void) => {
  const configFile = path.join(projectDir, 'open-next.config.ts');
  const edgeBlock = renderEdgeFunctionsBlock(edgeRoutes);
  const configBody = `// AUTO-GENERATED by @aws-amplify/hosting — do not edit.
const config = {
  default: {
    override: {
      converter: 'aws-apigw-v1',
      wrapper: 'aws-lambda-streaming',
    },
  },${edgeBlock}
};
export default config;
`;
  // wx = write exclusively; throws EEXIST atomically if the file is already
  // there. Avoids a TOCTOU between an existsSync check and the write.
  try {
    fs.writeFileSync(configFile, configBody, {
      encoding: 'utf-8',
      flag: 'wx',
    });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'EEXIST') {
      const edgeNote =
        edgeRoutes.length > 0
          ? `\n   Edge routes detected (${edgeRoutes.map((r) => r.pattern).join(', ')}); ` +
            `your config must also declare:\n` +
            `     functions: { edge: { runtime: 'edge', placement: 'global', routes: [...], patterns: [...] } }\n`
          : '';
      process.stderr.write(
        `⚠️  Found existing open-next.config.ts; not generating override.\n` +
          `   Streaming + POST/PUT compatibility through API Gateway requires:\n` +
          `     default: { override: { converter: 'aws-apigw-v1', wrapper: 'aws-lambda-streaming' } }${edgeNote}`,
      );
      return () => undefined;
    }
    throw err;
  }
  if (edgeRoutes.length > 0) {
    process.stderr.write(
      `\u{1F4DD} Generated open-next.config.ts with edge function for: ${edgeRoutes
        .map((r) => r.pattern || '/')
        .join(', ')}\n`,
    );
  }
  return () => {
    // best-effort cleanup; ignore if the file is gone or cannot be removed.
    try {
      fs.rmSync(configFile, { force: true });
      // eslint-disable-next-line @aws-amplify/amplify-backend-rules/no-empty-catch
    } catch {
      // intentional
    }
  };
};

/**
 * Build the `functions: { edge1: {...}, edge2: {...} }` snippet (with a
 * leading comma) for inclusion in the generated open-next.config.ts.
 * Empty string when the project has no edge routes.
 *
 * OpenNext's `generateEdgeBundle` enforces one route per function entry —
 * passing two routes throws `"Only one function is supported for now"`.
 * So we emit one `edgeN` entry per detected route instead of bundling
 * them all under one `edge` key.
 *
 * Patterns are CloudFront cache-behavior patterns and require a leading
 * slash (per the SplittedFunctionOptions.patterns JSDoc in OpenNext:
 * "Cloudfront compatible patterns. i.e. /api/*"). The detection code
 * stores them slash-less for ergonomics, so we prepend here.
 *
 * Per OpenNext docs, `placement: 'global'` deploys to Lambda@Edge in
 * us-east-1 and replicates to CloudFront PoPs. The Lambda@Edge converter
 * (`aws-cloudfront`) reads CloudFront origin-request events directly —
 * no API Gateway in front, so the body-hash 403 issue doesn't apply
 * here (Lambda@Edge invocation isn't OAC-signed by CloudFront).
 */
const renderEdgeFunctionsBlock = (edgeRoutes: EdgeRoute[]): string => {
  if (edgeRoutes.length === 0) return '';
  // Escape backslashes first (so the slash inserted by quote-escape isn't
  // itself doubled), then escape single quotes. Without this CodeQL flags
  // the encoder as incomplete — a route module path containing `\` would
  // emit invalid JS into the generated open-next.config.ts.
  const quote = (s: string) =>
    `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  const entries = edgeRoutes
    .map(
      (route, i) => `    edge${i + 1}: {
      runtime: 'edge',
      placement: 'global',
      override: {
        converter: 'aws-cloudfront',
        wrapper: 'aws-lambda',
      },
      routes: [${quote(route.module)}],
      patterns: [${quote(route.pattern)}],
    },`,
    )
    .join('\n');
  return `
  functions: {
${entries}
  },`;
};

/**
 * Patch OpenNext's bundled `aws-lambda-streaming` wrapper for API Gateway
 * STREAM framing. Two changes to <projectDir>/.open-next/server-functions/
 * default/index.mjs:
 *   1. Drop the `setContentType("application/vnd.awslambda.http-integration-
 *      response")` call — that's the Function URL streaming marker; API
 *      Gateway leaks it into the wire response and breaks HTTP/2 framing.
 *   2. Force the wrapper's identity branch (skip brotli/gzip/deflate);
 *      CloudFront handles compression downstream.
 * Idempotent.
 * @internal
 */
export const patchStreamingWrapperForApiGateway = (
  openNextDir: string,
): void => {
  const root = path.join(openNextDir, 'server-functions', 'default');
  // OpenNext puts the streaming wrapper in `default/index.mjs` for flat
  // packages, but in workspace setups it nests the real bundle under
  // `default/<workspace-path>/index.mjs` and emits a 60-byte re-export
  // at `default/index.mjs`. Match every index.mjs in the tree (skipping
  // node_modules — the bundler embeds OpenNext inline) and patch the
  // ones that contain the wrapper signature.
  if (!fs.existsSync(root)) return;
  const candidates = fg.sync('**/index.mjs', {
    cwd: root,
    absolute: true,
    ignore: ['**/node_modules/**'],
  });

  let totalPatches = 0;
  let filesPatched = 0;
  for (const bundle of candidates) {
    let src: string;
    try {
      src = fs.readFileSync(bundle, 'utf-8');
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') continue;
      throw err;
    }
    let patches = 0;

    const setContentTypeRe =
      /[A-Za-z_$][\w$]*\.setContentType\("application\/vnd\.awslambda\.http-integration-response"\)/g;
    if (setContentTypeRe.test(src)) {
      src = src.replace(setContentTypeRe, 'void 0');
      patches++;
    }

    // The wrapper does:
    //   if (acceptEncoding.includes("br")) { ... brotli ... }
    //   else if (acceptEncoding.includes("gzip")) { ... gzip ... }
    //   else if (acceptEncoding.includes("deflate")) { ... deflate ... }
    //   else { identity }
    // Force the identity branch by neutering all three checks.
    for (const algo of ['br', 'gzip', 'deflate']) {
      const re = new RegExp(`\\.includes\\("${algo}"\\)`, 'g');
      if (re.test(src)) {
        src = src.replace(re, `.includes("__amplify_no_${algo}__")`);
        patches++;
      }
    }

    if (patches > 0) {
      fs.writeFileSync(bundle, src, 'utf-8');
      totalPatches += patches;
      filesPatched++;
    }
  }

  if (filesPatched === 0) {
    if (process.env.AMPLIFY_HOSTING_LENIENT_PATCHES === '1') {
      process.stderr.write(
        `⚠️  Streaming-wrapper patch found nothing to change under ${root}. ` +
          `Continuing because AMPLIFY_HOSTING_LENIENT_PATCHES=1 is set.\n`,
      );
      return;
    }
    throw new HostingError('UpstreamPatchPatternChangedError', {
      message:
        `Streaming-wrapper patch found nothing to change under ${root}. ` +
        'OpenNext likely changed its bundled aws-lambda-streaming wrapper.',
      resolution:
        'File an issue with the OpenNext version and the regex name (`patchStreamingWrapperForApiGateway`). ' +
        'To bypass while investigating, set AMPLIFY_HOSTING_LENIENT_PATCHES=1 — note that streaming responses may be malformed without the patch.',
    });
  }

  process.stderr.write(
    `\u{1F527} Patched bundled aws-lambda-streaming wrapper for API Gateway STREAM ` +
      `(${totalPatches} edits across ${filesPatched} file${filesPatched > 1 ? 's' : ''}).\n`,
  );
};

/**
 * Patch every OpenNext edge bundle so it runs on Lambda@Edge nodejs20.x.
 *
 * OpenNext prepends each edge bundle with `import * as process from "node:process";`
 * (banner injected by createEdgeBundle.ts). Under Node 20 ESM the resulting
 * Module namespace's `env` binding is non-writable. The next-emitted Next.js
 * shim then runs `process.env = e.g.process.env` and crashes with:
 *
 * TypeError: Cannot assign to read only property 'env' of object '[object Module]'
 *
 * Replace the namespace import with a default import so `process` is the
 * live mutable singleton (default export of `node:process`). Idempotent —
 * re-running on an already-patched file finds no banner to swap.
 *
 * Affects only edge functions (Lambda@Edge); the regional `default` bundle
 * uses a different banner and is unaffected.
 * @internal
 */
const EDGE_PROCESS_BANNER = /^import \* as process from "node:process";/m;
const EDGE_PROCESS_BANNER_REPLACEMENT =
  'const process = (await import("node:process")).default;';

/**
 * Apply the {@link EDGE_PROCESS_BANNER} swap to every edge bundle under
 * `<openNextDir>/server-functions/edge*\/index.mjs`. Throws
 * `UpstreamPatchPatternChangedError` when bundles exist but none match the
 * banner (use `AMPLIFY_HOSTING_LENIENT_PATCHES=1` to revert to a warning).
 * @internal
 */
export const patchEdgeBundlesForLambdaEdge = (openNextDir: string): void => {
  const serverFnDir = path.join(openNextDir, 'server-functions');
  if (!fs.existsSync(serverFnDir)) return;
  const bundles = fg.sync('edge*/index.mjs', {
    cwd: serverFnDir,
    absolute: true,
  });
  if (bundles.length === 0) return;

  let total = 0;
  for (const bundle of bundles) {
    const src = fs.readFileSync(bundle, 'utf-8');
    if (!EDGE_PROCESS_BANNER.test(src)) continue;
    fs.writeFileSync(
      bundle,
      src.replace(EDGE_PROCESS_BANNER, EDGE_PROCESS_BANNER_REPLACEMENT),
      'utf-8',
    );
    total++;
  }
  if (total === 0) {
    if (process.env.AMPLIFY_HOSTING_LENIENT_PATCHES === '1') {
      process.stderr.write(
        `⚠️  Edge-bundle banner patch matched none of ${bundles.length} edge bundle(s). ` +
          `Continuing because AMPLIFY_HOSTING_LENIENT_PATCHES=1 is set.\n`,
      );
      return;
    }
    throw new HostingError('UpstreamPatchPatternChangedError', {
      message:
        `Edge-bundle banner patch matched none of ${bundles.length} edge bundle(s) under ${serverFnDir}. ` +
        'OpenNext likely changed the process import banner injected into edge bundles.',
      resolution:
        'File an issue with the OpenNext version and the regex name (`patchEdgeBundlesForLambdaEdge`). ' +
        'To bypass while investigating, set AMPLIFY_HOSTING_LENIENT_PATCHES=1 — Lambda@Edge cold starts may crash without the patch.',
    });
  }
  process.stderr.write(
    `\u{1F527} Patched ${total} edge bundle(s) for Lambda@Edge nodejs20.x compatibility.\n`,
  );
};

/**
 * Check whether `.next/server/middleware-manifest.json` already exists.
 *
 * The user's CI (or a previous deploy) may have already produced this
 * manifest. When present, we can read edge routes directly without
 * spending another `next build` cycle.
 *
 * Exported for unit testing.
 * @internal
 */
export const hasExistingMiddlewareManifest = (projectDir: string): boolean => {
  return fs.existsSync(
    path.join(projectDir, '.next', 'server', 'middleware-manifest.json'),
  );
};

/**
 * Source-scan the project for files declaring `runtime: 'edge'` (or
 * `'experimental-edge'`).
 *
 * Returns true if any user file looks like an edge-runtime route, false
 * if none. False-positives are acceptable (we'd just rebuild as before);
 * false-negatives must be avoided (we'd skip the build but OpenNext
 * would then refuse to bundle the route).
 *
 * The scan is conservative: a single regex match anywhere in any
 * `.ts/.tsx/.js/.jsx` under `app/`, `src/app/`, `pages/`, or `src/pages/`
 * triggers a true return. Comments and strings are not excluded — that's
 * fine since the cost of a false-positive is a rebuild we'd otherwise
 * have run anyway.
 *
 * Exported for unit testing.
 * @internal
 */
export const projectHasEdgeRuntimeRoutes = (projectDir: string): boolean => {
  const roots = ['app', 'src/app', 'pages', 'src/pages'].filter((d) =>
    fs.existsSync(path.join(projectDir, d)),
  );
  if (roots.length === 0) return false;
  const pattern = /runtime\s*[:=]\s*['"`](?:edge|experimental-edge)['"`]/;
  const files = fg.sync(
    roots.map((r) => `${r}/**/*.{ts,tsx,js,jsx,mjs}`),
    { cwd: projectDir, absolute: true, ignore: ['**/node_modules/**'] },
  );
  for (const file of files) {
    try {
      if (pattern.test(fs.readFileSync(file, 'utf-8'))) return true;
    } catch {
      continue;
    }
  }
  return false;
};

/**
 * Execute `next build` from the project directory so that the
 * .next/server/middleware-manifest.json (which lists every edge function
 * Next compiled) exists before we generate `open-next.config.ts`.
 *
 * OpenNext re-runs `next build` later — Next's `.next/cache` makes that
 * second invocation cheap (typically <10s when nothing changed).
 *
 * The build is delegated to the user's `npm run build` script so any
 * project-specific env / pre-build steps are honored.
 */
const runNextBuild = (projectDir: string): void => {
  process.stderr.write(`\u{1F528} Running next build (for edge detection)\n`);
  try {
    spawn.sync('npm', ['run', 'build'], {
      cwd: projectDir,
      stdio: 'inherit',
      env: { ...process.env, NODE_OPTIONS: '' },
    });
  } catch (error) {
    throw new HostingError(
      'NextBuildError',
      {
        message: 'next build failed (running from npm run build).',
        resolution:
          'Run `npm run build` manually in your project to see the failure. ' +
          'Once it builds locally, re-run the deploy.',
      },
      error as Error,
    );
  }
};

/**
 * Execute the OpenNext build command.
 *
 * Runs `npx @opennextjs/aws build` from the project directory. The consumer
 * project must have @opennextjs/aws installed as a devDependency — this avoids
 * bloating the hosting package for SPA/static users who don't need OpenNext.
 *
 * If @opennextjs/aws is not installed, npx will fail with a clear error.
 * We catch it and provide an actionable resolution message.
 */
const runOpenNextBuild = (projectDir: string, configPath?: string): void => {
  const args = ['@opennextjs/aws', 'build'];
  if (configPath) args.push('--config-path', configPath);

  process.stderr.write(
    `\u{1F528} Running OpenNext build: npx ${args.join(' ')}\n`,
  );

  try {
    spawn.sync('npx', args, {
      cwd: projectDir,
      stdio: 'inherit',
      env: { ...process.env, NODE_OPTIONS: '' },
    });
  } catch (error) {
    // Check if the error is because @opennextjs/aws is not installed
    const errMsg = (error as Error).message || '';
    if (
      errMsg.includes('not found') ||
      errMsg.includes('ERR_MODULE_NOT_FOUND') ||
      errMsg.includes('Cannot find package')
    ) {
      throw new HostingError(
        'OpenNextNotFoundError',
        {
          message:
            '@opennextjs/aws is not installed. Next.js hosting requires OpenNext to build and deploy your app.',
          resolution:
            "Add @opennextjs/aws to your project's devDependencies:\n\n" +
            '  npm install --save-dev @opennextjs/aws\n\n' +
            'Then re-run your deployment.',
        },
        error as Error,
      );
    }

    throw new HostingError(
      'OpenNextBuildError',
      {
        message: 'OpenNext build failed.',
        resolution:
          'Check the build output above for errors. Common issues:\n' +
          '  - Missing Next.js dependencies (run: npm install)\n' +
          '  - Invalid next.config.js\n' +
          '  - TypeScript compilation errors in your app\n' +
          '  - Missing .next/ directory (run: next build)',
      },
      error as Error,
    );
  }
};

/**
 * Copy amplify_outputs.json from the project root into all server function
 * bundle directories under .open-next/. This ensures the Lambda can read
 * backend configuration (auth, data, storage endpoints) at runtime regardless
 * of whether Next.js file tracing included the file.
 */
const copyAmplifyOutputsToServerBundles = (
  projectDir: string,
  openNextDir: string,
): void => {
  const outputsFile = path.join(projectDir, 'amplify_outputs.json');
  if (!fs.existsSync(outputsFile)) return;

  // Single (server-function/) and multi (server-functions/<name>/) layouts.
  const targets = fg.sync(['server-function', 'server-functions/*'], {
    cwd: openNextDir,
    absolute: true,
    onlyDirectories: true,
  });

  for (const target of targets) {
    const dest = path.join(target, 'amplify_outputs.json');
    if (!fs.existsSync(dest)) {
      fs.copyFileSync(outputsFile, dest);
      process.stderr.write(
        `\u{1F4E6} Copied amplify_outputs.json → ${path.relative(projectDir, dest)}\n`,
      );
    }

    // Some OpenNext versions root the Next.js server at .next/standalone/.
    const standaloneDest = path.join(
      target,
      '.next',
      'standalone',
      'amplify_outputs.json',
    );
    if (
      fs.existsSync(path.dirname(standaloneDest)) &&
      !fs.existsSync(standaloneDest)
    ) {
      fs.copyFileSync(outputsFile, standaloneDest);
      process.stderr.write(
        `\u{1F4E6} Copied amplify_outputs.json → ${path.relative(projectDir, standaloneDest)}\n`,
      );
    }
  }
};

/**
 * Translate OpenNext output structure into our framework-agnostic DeployManifest.
 */
const translateOpenNextOutput = (
  output: OpenNextOutput,
  openNextDir: string,
): DeployManifest => {
  const manifest: DeployManifest = {
    version: 1,
    compute: {},
    staticAssets: {
      directory: path.join(openNextDir, 'assets'),
    },
    routes: [],
  };

  // Map server functions (origins) to compute resources
  if (output.origins) {
    for (const [name, origin] of Object.entries(output.origins)) {
      // Skip S3 origin and imageOptimizer (handled separately via manifest.imageOptimization)
      if (name === 's3' || name === 'imageOptimizer') continue;

      const computeResource = mapOriginToCompute(name, origin, openNextDir);
      if (computeResource) {
        manifest.compute[name] = computeResource;
      }
    }
  }

  // Edge functions (Lambda@Edge bundles, one per route) live under
  // `edgeFunctions` in OpenNext's output, separate from `origins` because
  // they don't have an HTTP origin endpoint — CloudFront associates them
  // directly with cache behaviors. Translate each to a compute resource of
  // `type: 'edge'` so the L3 construct can build them with
  // `experimental.EdgeFunction` and attach as edgeLambdas on the matching
  // behavior.
  if (output.edgeFunctions) {
    for (const [name, fn] of Object.entries(output.edgeFunctions)) {
      // OpenNext writes `bundle: ".open-next/functions/<name>"` in the
      // output manifest but the actual edge bundle is emitted under
      // `.open-next/server-functions/<name>`. Probe the disk and pick
      // whichever path actually exists.
      const candidates = [
        fn.bundle
          ? path.resolve(path.dirname(openNextDir), fn.bundle)
          : path.join(openNextDir, 'functions', name),
        path.join(openNextDir, 'server-functions', name),
        path.join(openNextDir, 'functions', name),
      ];
      const bundle = candidates.find((p) => fs.existsSync(p)) ?? candidates[0];

      manifest.compute[name] = {
        type: 'edge',
        bundle,
        handler: fn.handler ?? 'index.handler',
        placement: 'global',
        streaming: false,
        runtime: 'nodejs20.x',
      };
    }
  }

  // Map behaviors to routes
  if (output.behaviors) {
    manifest.routes = mapBehaviorsToRoutes(output.behaviors);
  }

  // ISR/Cache detection — only provision cache infra if ISR is actually used.
  // Evidence: revalidation-function exists OR cache handler dir exists in output.
  if (output.additionalProps?.disableIncrementalCache !== true) {
    const revalidationFnDir = path.join(openNextDir, 'revalidation-function');
    const hasRevalidationFn = fs.existsSync(revalidationFnDir);
    const hasIsrEvidence =
      hasRevalidationFn || fs.existsSync(path.join(openNextDir, 'cache'));

    if (hasIsrEvidence) {
      const computeNames = Object.keys(manifest.compute);
      const primaryComputeName =
        computeNames.find((n) => n === 'default' || n === 'server') ??
        computeNames[0];
      if (primaryComputeName) {
        manifest.cache = {
          computeResource: primaryComputeName,
          tagRevalidation: true,
          revalidationQueue: true,
          revalidationFunction: hasRevalidationFn
            ? { bundle: revalidationFnDir, handler: 'index.handler' }
            : undefined,
        };
      }
    }
  }

  // Image optimization
  if (output.additionalProps?.imageOptimization !== false) {
    const imgDir = path.join(openNextDir, 'image-optimization-function');
    if (fs.existsSync(imgDir)) {
      const imgConfig = tryReadJson(path.join(imgDir, 'config.json'));
      manifest.imageOptimization = {
        bundle: imgDir,
        handler: 'index.handler',
        formats: (imgConfig?.formats as string[] | undefined) ?? [
          'webp',
          'avif',
        ],
        sizes: (imgConfig?.sizes as number[] | undefined) ?? [
          640, 750, 828, 1080, 1200, 1920, 2048, 3840,
        ],
      };
    }
  }

  // Middleware
  const middlewareDir = path.join(openNextDir, 'middleware');
  if (fs.existsSync(middlewareDir)) {
    const middlewareManifest = tryReadJson(
      path.join(middlewareDir, 'manifest.json'),
    );
    manifest.middleware = {
      bundle: middlewareDir,
      handler: 'handler.handler',
      matchers: (middlewareManifest?.matchers as string[] | undefined) ?? [
        '/*',
      ],
    };
  }

  return manifest;
};

/**
 * Map an OpenNext origin to a ComputeResource.
 */
const mapOriginToCompute = (
  name: string,
  origin: OpenNextOrigin,
  openNextDir: string,
): ComputeResource | undefined => {
  const bundleDir = path.join(openNextDir, 'server-functions', name);

  const effectiveBundle = fs.existsSync(bundleDir)
    ? bundleDir
    : path.join(openNextDir, 'server-function');

  if (!fs.existsSync(effectiveBundle)) {
    return undefined;
  }

  if (origin.type === 'function' || origin.type === undefined) {
    return {
      type: 'handler',
      bundle: effectiveBundle,
      handler: origin.handler ?? 'index.handler',
      placement: 'regional',
      streaming: origin.streaming ?? true,
      runtime: origin.runtime ?? 'nodejs20.x',
      memorySize: origin.memorySize,
      timeout: origin.timeout,
      environment: origin.environment,
    };
  }

  if (origin.type === 'ecs' || origin.type === 'docker') {
    return {
      type: 'http-server',
      bundle: effectiveBundle,
      entrypoint: origin.entrypoint ?? 'server.js',
      port: origin.port ?? 3000,
      placement: 'regional',
      streaming: origin.streaming ?? false,
      runtime: origin.runtime ?? 'nodejs20.x',
      environment: origin.environment,
    };
  }

  if (origin.type === 'edge') {
    return {
      type: 'edge',
      bundle: effectiveBundle,
      handler: origin.handler ?? 'index.handler',
      placement: 'global',
      streaming: false,
      runtime: origin.runtime ?? 'nodejs20.x',
      environment: origin.environment,
    };
  }

  // Unknown type — treat as handler
  return {
    type: 'handler',
    bundle: effectiveBundle,
    handler: 'index.handler',
    placement: 'regional',
    streaming: origin.streaming ?? true,
    runtime: 'nodejs20.x',
  };
};

/**
 * Normalize OpenNext origin names to match the construct's compute resource keys.
 */
const normalizeOriginName = (name: string): string => {
  const originNameMap: Record<string, string> = {
    imageOptimizer: 'image-optimization',
  };
  return originNameMap[name] ?? name;
};

/**
 * Map OpenNext behaviors to RouteBehavior array.
 */
const mapBehaviorsToRoutes = (
  behaviors: OpenNextBehavior[],
): RouteBehavior[] => {
  const routes: RouteBehavior[] = [];

  for (const behavior of behaviors) {
    // Edge behaviors carry `edgeFunction` instead of `origin` — point the
    // route at that compute name so CdnConstruct can attach the Lambda@Edge
    // function to the matching cache behavior.
    const target = behavior.edgeFunction
      ? behavior.edgeFunction
      : normalizeOriginName(behavior.origin ?? 'default');
    routes.push({
      pattern: nextPatternToCloudFront(behavior.pattern),
      target,
      fallback: behavior.fallback,
    });
  }

  // Ensure a catch-all exists
  const hasCatchAll = routes.some(
    (r) => r.pattern === '/*' || r.pattern === '*',
  );
  if (!hasCatchAll && routes.length > 0) {
    routes.push({
      pattern: '/*',
      target: 'default',
    });
  }

  return routes;
};

/**
 * Translate Next.js / OpenNext route patterns into CloudFront PathPatterns.
 *
 * OpenNext emits behaviors with patterns in Next-style syntax:
 *   `/api/edge/[slug]`            (dynamic segment)
 *   `/api/edge/catch/[...path]`   (catch-all)
 * CloudFront supports only `*` (match any) and `?` (match single char) and
 * rejects `[]/{}/+/?...` as regex syntax. The translator collapses each
 * dynamic segment to a single `*` and turns catch-all segments into a
 * trailing `*`. The result still uniquely identifies the route prefix
 * because CloudFront path patterns are evaluated longest-match-first.
 *
 *   `/api/edge/[slug]`            → `/api/edge/*`
 *   `/api/edge/catch/[...path]`   → `/api/edge/catch/*`
 *   `/products/[id]/reviews/[r]`  → `/products/*\/reviews/*`
 */
const nextPatternToCloudFront = (pattern: string): string => {
  // Collapse catch-all `[...name]` (must come first; it's a superset).
  let out = pattern.replace(/\[\.\.\..+?\]/g, '*');
  // Collapse single dynamic segments `[name]`.
  out = out.replace(/\[[^/\]]+?\]/g, '*');
  return out;
};

/**
 * Safely read and parse a JSON file, returning undefined on failure.
 */
const tryReadJson = (filePath: string): Record<string, unknown> | undefined => {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
    // eslint-disable-next-line @aws-amplify/amplify-backend-rules/no-empty-catch
  } catch {
    // Ignore parse errors — caller handles undefined
  }
  return undefined;
};
