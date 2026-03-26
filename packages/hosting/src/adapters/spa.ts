import * as fs from 'fs';
import * as path from 'path';
import { AmplifyUserError } from '@aws-amplify/platform-core';
import { DeployManifest } from '../manifest/types.js';
import { copyDirRecursive } from './copy.js';

const HOSTING_DIR = '.amplify-hosting';
const STATIC_DIR = 'static';
const MANIFEST_FILENAME = 'deploy-manifest.json';

/**
 * SPA adapter — transforms a built SPA output directory into the canonical
 * .amplify-hosting/ directory structure with a deploy manifest.
 * @param buildOutputDir - absolute path to the build output (e.g., dist/)
 * @param projectDir - absolute path to the project root
 * @returns the generated DeployManifest
 */
export const spaAdapter = (
  buildOutputDir: string,
  projectDir: string,
): DeployManifest => {
  if (!fs.existsSync(buildOutputDir)) {
    throw new AmplifyUserError('BuildOutputNotFoundError', {
      message: `Build output directory not found at ${buildOutputDir}`,
      resolution:
        'Run your build command first, or configure buildOutputDir in defineHosting to point to your build output.',
    });
  }

  const files = fs.readdirSync(buildOutputDir);
  if (files.length === 0) {
    throw new AmplifyUserError('BuildOutputEmptyError', {
      message: `Build output directory is empty: ${buildOutputDir}`,
      resolution:
        'Your build command may have failed silently. Run it locally and verify files are created in the output directory.',
    });
  }

  if (!files.includes('index.html')) {
    process.stderr.write(
      `Warning: No index.html found in build output directory (${buildOutputDir}). ` +
        'SPA routing may not work correctly without an index.html.\n',
    );
  }

  const hostingDir = path.join(projectDir, HOSTING_DIR);
  const staticDir = path.join(hostingDir, STATIC_DIR);

  // Clean previous hosting output
  if (fs.existsSync(hostingDir)) {
    fs.rmSync(hostingDir, { recursive: true, force: true });
  }

  // Copy all build output to .amplify-hosting/static/
  // Default exclude patterns skip source maps, OS metadata, and build artifacts
  copyDirRecursive(buildOutputDir, staticDir);

  // Generate deploy manifest
  const manifest: DeployManifest = {
    version: 1,
    routes: [
      {
        path: '/*',
        target: {
          kind: 'Static',
          cacheControl: 'public, max-age=0, must-revalidate',
        },
      },
    ],
    framework: {
      name: 'spa',
      version: '1.0.0',
    },
  };

  // Write manifest to .amplify-hosting/deploy-manifest.json
  fs.writeFileSync(
    path.join(hostingDir, MANIFEST_FILENAME),
    JSON.stringify(manifest, null, 2),
    'utf-8',
  );

  return manifest;
};
