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
      if (!/output\s*[:=]\s*['"]standalone['"]/.test(content) && !content.includes('standalone')) {
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

  const standaloneFiles = fs.readdirSync(standaloneDir);
  if (standaloneFiles.length === 0) {
    throw new AmplifyUserError('BuildOutputEmptyError', {
      message: `Build output directory is empty: ${standaloneDir}`,
      resolution:
        'Your build command may have failed silently. Run it locally and verify files are created in the output directory.',
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
  //    These are hashed immutable assets served by CloudFront from S3.
  //    NOT copied to compute — CloudFront serves /_next/static/* directly from S3.
  if (fs.existsSync(staticDir)) {
    const destStaticNextDir = path.join(
      hostingStaticDir,
      '_next',
      'static',
    );
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
  console.error('Fallback handler invoked — Lambda Web Adapter did not intercept this request.', JSON.stringify(event));
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
