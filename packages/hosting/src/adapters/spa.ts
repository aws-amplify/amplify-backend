import * as fs from 'fs';
import * as path from 'path';
import { HostingError } from '../hosting_error.js';
import { DeployManifest } from '../manifest/types.js';
import { copyDirRecursive } from './copy.js';
import { HOSTING_DIR, MANIFEST_FILENAME, STATIC_DIR } from '../constants.js';

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
    throw new HostingError('BuildOutputNotFoundError', {
      message: `Build output directory not found at ${buildOutputDir}`,
      resolution:
        'Run your build command first, or configure buildOutputDir in defineHosting to point to your build output.',
    });
  }

  const files = fs.readdirSync(buildOutputDir);
  if (files.length === 0) {
    throw new HostingError('BuildOutputEmptyError', {
      message: `Build output directory is empty: ${buildOutputDir}`,
      resolution:
        'Your build command may have failed silently. Run it locally and verify files are created in the output directory.',
    });
  }

  if (!files.includes('index.html')) {
    throw new HostingError('MissingIndexHtmlError', {
      message: 'No index.html found in the build output directory.',
      resolution: `Ensure your build command produces an index.html file in the output directory (${buildOutputDir}).`,
    });
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
