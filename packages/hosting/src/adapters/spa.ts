import * as fs from 'fs';
import * as path from 'path';
import { AmplifyUserError } from '@aws-amplify/platform-core';
import { DeployManifest } from '../manifest/types.js';

const HOSTING_DIR = '.amplify-hosting';
const STATIC_DIR = 'static';
const MANIFEST_FILENAME = 'deploy-manifest.json';

/**
 * Copy a directory recursively.
 */
const copyDirRecursive = (src: string, dest: string): void => {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
};

/**
 * SPA adapter — transforms a built SPA output directory into the canonical
 * .amplify-hosting/ directory structure with a deploy manifest.
 *
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

  const hostingDir = path.join(projectDir, HOSTING_DIR);
  const staticDir = path.join(hostingDir, STATIC_DIR);

  // Clean previous hosting output
  if (fs.existsSync(hostingDir)) {
    fs.rmSync(hostingDir, { recursive: true, force: true });
  }

  // Copy all build output to .amplify-hosting/static/
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
