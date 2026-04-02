import * as fs from 'fs';
import * as path from 'path';
import { HostingError } from '../hosting_error.js';
import { DeployManifest, ManifestRoute } from '../manifest/types.js';
import { copyDirRecursive } from './copy.js';
import { SSR_DEFAULT_PORT } from '../defaults.js';
import { HOSTING_DIR, MANIFEST_FILENAME, STATIC_DIR } from '../constants.js';

const COMPUTE_DIR = 'compute';
const DEFAULT_COMPUTE_NAME = 'default';

/**
 * Cache-Control for public/ assets. These can change between deploys but
 * are served under build-id-keyed paths, so a moderate TTL is safe.
 */
const PUBLIC_ASSET_CACHE_CONTROL = 'public, max-age=86400';

/**
 * Generate the run.sh bootstrap script for Lambda Web Adapter.
 * This is the Lambda handler entrypoint; the Web Adapter invokes it
 * and proxies HTTP traffic to the Next.js server on PORT.
 */
export const generateRunScript = (): string => {
  return `#!/bin/bash
export PORT=${SSR_DEFAULT_PORT}
export HOSTNAME=0.0.0.0
export NODE_ENV=production
exec node server.js
`;
};

/**
 * Detect the Next.js version from the project's node_modules.
 */
const detectNextVersion = (projectDir: string): string | undefined => {
  const nextPkgPath = path.join(
    projectDir,
    'node_modules',
    'next',
    'package.json',
  );
  if (fs.existsSync(nextPkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(nextPkgPath, 'utf-8'));
      return pkg.version as string;
    } catch {
      return undefined;
    }
  }
  return undefined;
};

/**
 * Pre-flight check: verify that next.config has output: 'standalone'.
 *
 * This is a best-effort string-based check. The authoritative validation is
 * the post-build check for `.next/standalone/` directory existence.
 */
export const checkNextConfig = (projectDir: string): void => {
  const configFiles = ['next.config.js', 'next.config.mjs', 'next.config.ts'];
  for (const configFile of configFiles) {
    const configPath = path.join(projectDir, configFile);
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf-8');
      // Check for output property set to 'standalone' — tolerates various formatting
      if (!/output\s*[:=]\s*['"]standalone['"]/.test(content)) {
        process.stderr.write(
          `Warning: Next.js config at ${configFile} may not have output: 'standalone' set. ` +
            `The build will proceed, but deployment requires .next/standalone/ to exist.\n`,
        );
      }
      return;
    }
  }
  // No config file found — Next.js defaults to no standalone output
  throw new HostingError('NextjsConfigNotFoundError', {
    message: 'No next.config.js/mjs/ts found in project root.',
    resolution:
      'Create a next.config.js with `output: "standalone"` set. This is required for Lambda deployment.',
  });
};

/**
 * Scan the `public/` directory and return static routes for top-level entries.
 *
 * Files (e.g. `favicon.ico`) → `{ path: '/favicon.ico', ... }`
 * Directories (e.g. `images/`) → `{ path: '/images/*', ... }`
 *
 * Dotfiles (e.g. `.DS_Store`) are excluded. Returns an empty array when
 * `public/` does not exist.
 *
 * NOTE: Each route becomes a CloudFront behavior. CloudFront has a default
 * limit of 25 behaviors per distribution. Most Next.js apps have fewer than
 * 10 top-level entries in `public/`, so this is fine. If a project exceeds
 * the limit, request a quota increase or consolidate public assets into
 * fewer top-level directories.
 */
export const scanPublicRoutes = (projectDir: string): ManifestRoute[] => {
  const publicDir = path.join(projectDir, 'public');
  if (!fs.existsSync(publicDir)) {
    return [];
  }

  const entries = fs.readdirSync(publicDir, { withFileTypes: true });
  const routes: ManifestRoute[] = [];

  for (const entry of entries) {
    // Skip dotfiles (e.g. .DS_Store, .gitkeep)
    if (entry.name.startsWith('.')) {
      continue;
    }

    if (entry.isDirectory()) {
      routes.push({
        path: `/${entry.name}/*`,
        target: {
          kind: 'Static',
          cacheControl: PUBLIC_ASSET_CACHE_CONTROL,
        },
      });
    } else if (entry.isFile()) {
      routes.push({
        path: `/${entry.name}`,
        target: {
          kind: 'Static',
          cacheControl: PUBLIC_ASSET_CACHE_CONTROL,
        },
      });
    }
    // Symlinks and other special entries are ignored
  }

  if (routes.length > 20) {
    process.stderr.write(
      `Warning: Found ${routes.length} top-level entries in public/. CloudFront has a default limit of 25 cache behaviors. Consider consolidating assets into fewer top-level directories.\n`,
    );
  }

  return routes;
};

/**
 * Next.js adapter — transforms .next/ build output into the canonical
 * .amplify-hosting/ directory structure with compute + static routes.
 * Expects `next.config.js` to have `output: 'standalone'` set, which
 * produces a self-contained server at `.next/standalone/server.js`.
 * @param buildOutputDir - absolute path to the .next/ directory
 * @param projectDir - absolute path to the project root
 * @returns the generated DeployManifest
 */
export const nextjsAdapter = (
  buildOutputDir: string,
  projectDir: string,
): DeployManifest => {
  const standaloneDir = path.join(buildOutputDir, 'standalone');
  const staticDir = path.join(buildOutputDir, 'static');

  // Validate that standalone output exists
  if (!fs.existsSync(standaloneDir)) {
    throw new HostingError('NextjsStandaloneNotFoundError', {
      message: `Next.js standalone output not found at ${standaloneDir}`,
      resolution:
        'Ensure your next.config.js (or next.config.mjs) has `output: "standalone"` set, ' +
        'then run `next build`. The standalone output is required for Lambda deployment.',
    });
  }

  const standaloneFiles = fs.readdirSync(standaloneDir);
  if (standaloneFiles.length === 0) {
    throw new HostingError('BuildOutputEmptyError', {
      message: `Build output directory is empty: ${standaloneDir}`,
      resolution:
        'Your build command may have failed silently. Run it locally and verify files are created in the output directory.',
    });
  }

  if (!fs.existsSync(path.join(standaloneDir, 'server.js'))) {
    throw new HostingError('NextjsServerNotFoundError', {
      message: `Next.js server.js not found in standalone output at ${standaloneDir}`,
      resolution:
        'Ensure `next build` completed successfully with `output: "standalone"` ' +
        'in your next.config.js. The file .next/standalone/server.js should exist.',
    });
  }

  const hostingDir = path.join(projectDir, HOSTING_DIR);
  const computeDir = path.join(hostingDir, COMPUTE_DIR, DEFAULT_COMPUTE_NAME);
  const hostingStaticDir = path.join(hostingDir, STATIC_DIR);

  // Clean previous hosting output
  if (fs.existsSync(hostingDir)) {
    fs.rmSync(hostingDir, { recursive: true, force: true });
  }

  // 1. Copy standalone server → .amplify-hosting/compute/default/
  //    Excludes source maps (.map) and other non-essential files by default.
  copyDirRecursive(standaloneDir, computeDir);

  // 2. Copy .next/static/ → .amplify-hosting/static/_next/static/
  //    These are hashed immutable assets served by CloudFront from S3.
  //    NOT copied to compute — CloudFront serves /_next/static/* directly from S3.
  if (fs.existsSync(staticDir)) {
    const destStaticNextDir = path.join(hostingStaticDir, '_next', 'static');
    copyDirRecursive(staticDir, destStaticNextDir);
  }

  // 3. Copy public/ → .amplify-hosting/static/ (public assets like favicon, robots.txt)
  const publicDir = path.join(projectDir, 'public');
  if (fs.existsSync(publicDir)) {
    copyDirRecursive(publicDir, hostingStaticDir);

    // Also copy to compute/default/public/ for server-side serving
    const computePublicDir = path.join(computeDir, 'public');
    copyDirRecursive(publicDir, computePublicDir, { excludePatterns: [] });
  }

  // 4. Generate run.sh bootstrap script for Lambda Web Adapter
  const runScriptPath = path.join(computeDir, 'run.sh');
  fs.writeFileSync(runScriptPath, generateRunScript(), { mode: 0o755 });

  // 5. Write a fallback handler (Lambda Web Adapter intercepts all requests;
  //    this handler should never execute but prevents Lambda HandlerNotFound errors)
  const fallbackHandler = `exports.handler = async (event) => {
  const safeContext = {
    path: event.rawPath,
    method: event.requestContext?.http?.method,
    sourceIp: event.requestContext?.http?.sourceIp,
  };
  process.stderr.write('Fallback handler invoked — Lambda Web Adapter did not intercept this request. ' + JSON.stringify(safeContext) + '\\n');
  return {
    statusCode: 502,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      error: 'Lambda Web Adapter failed to handle request',
      message: 'The Lambda Web Adapter layer should intercept all requests. If you see this, the adapter may not be configured correctly.',
    }),
  };
};
`;
  fs.writeFileSync(path.join(computeDir, 'index.js'), fallbackHandler);

  // 6. Generate deploy manifest
  const nextVersion = detectNextVersion(projectDir);

  // Scan public/ for top-level entries to route via S3 instead of Lambda
  const publicRoutes = scanPublicRoutes(projectDir);

  const manifest: DeployManifest = {
    version: 1,
    routes: [
      // Immutable hashed assets — longest cache
      {
        path: '/_next/static/*',
        target: {
          kind: 'Static',
          cacheControl: 'public, max-age=31536000, immutable',
        },
      },
      // Public assets (favicon.ico, images/, etc.) — served from S3
      ...publicRoutes,
      // Catch-all — everything else goes to Lambda (SSR)
      {
        path: '/*',
        target: {
          kind: 'Compute',
          src: DEFAULT_COMPUTE_NAME,
        },
      },
    ],
    computeResources: [
      {
        name: DEFAULT_COMPUTE_NAME,
        runtime: 'nodejs20.x',
        entrypoint: 'run.sh',
      },
    ],
    framework: {
      name: 'nextjs',
      version: nextVersion,
    },
  };

  // Write manifest
  fs.writeFileSync(
    path.join(hostingDir, MANIFEST_FILENAME),
    JSON.stringify(manifest, null, 2),
    'utf-8',
  );

  return manifest;
};
