import * as fs from 'fs';
import * as path from 'path';
import { AmplifyUserError } from '@aws-amplify/platform-core';
import { DeployManifest } from '../manifest/types.js';
import { copyDirRecursive } from './utils.js';

const HOSTING_DIR = '.amplify-hosting';
const STATIC_DIR = 'static';
const COMPUTE_DIR = 'compute';
const DEFAULT_COMPUTE_NAME = 'default';
const MANIFEST_FILENAME = 'deploy-manifest.json';

/**
 * Generate the run.sh bootstrap script for Lambda Web Adapter.
 * This is the Lambda handler entrypoint; the Web Adapter invokes it
 * and proxies HTTP traffic to the Next.js server on PORT.
 */
export const generateRunScript = (): string => {
  return `#!/bin/bash
export PORT=3000
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
 * Called before running the Next.js adapter to give clear error messages.
 */
export const checkNextConfig = (projectDir: string): void => {
  const configFiles = ['next.config.js', 'next.config.mjs', 'next.config.ts'];
  for (const configFile of configFiles) {
    const configPath = path.join(projectDir, configFile);
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf-8');
      if (!content.includes('standalone')) {
        throw new AmplifyUserError('NextjsStandaloneRequiredError', {
          message: `Next.js config at ${configFile} does not appear to have output: 'standalone' set.`,
          resolution:
            'Add `output: "standalone"` to your next.config.js/mjs/ts. This is required for Lambda deployment. See: https://nextjs.org/docs/app/api-reference/next-config-js/output',
        });
      }
      return;
    }
  }
  // No config file found — Next.js defaults to no standalone output
  throw new AmplifyUserError('NextjsConfigNotFoundError', {
    message: 'No next.config.js/mjs/ts found in project root.',
    resolution:
      'Create a next.config.js with `output: "standalone"` set. This is required for Lambda deployment.',
  });
};

/**
 * Next.js adapter — transforms .next/ build output into the canonical
 * .amplify-hosting/ directory structure with compute + static routes.
 *
 * Expects `next.config.js` to have `output: 'standalone'` set, which
 * produces a self-contained server at `.next/standalone/server.js`.
 *
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
    throw new AmplifyUserError('NextjsStandaloneNotFoundError', {
      message: `Next.js standalone output not found at ${standaloneDir}`,
      resolution:
        'Ensure your next.config.js (or next.config.mjs) has `output: "standalone"` set, ' +
        'then run `next build`. The standalone output is required for Lambda deployment.',
    });
  }

  if (!fs.existsSync(path.join(standaloneDir, 'server.js'))) {
    throw new AmplifyUserError('NextjsServerNotFoundError', {
      message: `Next.js server.js not found in standalone output at ${standaloneDir}`,
      resolution:
        'Ensure `next build` completed successfully with `output: "standalone"` ' +
        'in your next.config.js. The file .next/standalone/server.js should exist.',
    });
  }

  const hostingDir = path.join(projectDir, HOSTING_DIR);
  const computeDir = path.join(
    hostingDir,
    COMPUTE_DIR,
    DEFAULT_COMPUTE_NAME,
  );
  const hostingStaticDir = path.join(hostingDir, STATIC_DIR);

  // Clean previous hosting output
  if (fs.existsSync(hostingDir)) {
    fs.rmSync(hostingDir, { recursive: true, force: true });
  }

  // 1. Copy standalone server → .amplify-hosting/compute/default/
  //    No exclude patterns for compute — we need everything including .map for debugging
  copyDirRecursive(standaloneDir, computeDir, { excludePatterns: [] });

  // 2. Copy .next/static/ → .amplify-hosting/static/_next/static/
  //    These are hashed immutable assets served by CloudFront from S3
  if (fs.existsSync(staticDir)) {
    const destStaticNextDir = path.join(
      hostingStaticDir,
      '_next',
      'static',
    );
    copyDirRecursive(staticDir, destStaticNextDir);

    // Also copy to compute for fallback serving
    const computeStaticDir = path.join(computeDir, '.next', 'static');
    copyDirRecursive(staticDir, computeStaticDir, { excludePatterns: [] });
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

  // 5. Write a fallback handler (Lambda Web Adapter intercepts, but this prevents HandlerNotFound)
  fs.writeFileSync(
    path.join(computeDir, 'index.js'),
    'exports.handler = async (event) => { return { statusCode: 502, body: "SSR bootstrap failed" }; };\n',
  );

  // 6. Generate deploy manifest
  const nextVersion = detectNextVersion(projectDir);

  const manifest: DeployManifest = {
    version: 1,
    routes: [
      {
        path: '/_next/static/*',
        target: {
          kind: 'Static',
          cacheControl: 'public, max-age=31536000, immutable',
        },
      },
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
