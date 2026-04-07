import * as fs from 'fs';
import * as path from 'path';
import { HostingError } from '../hosting_error.js';
import { deployManifestSchema } from './schema.js';
import { DeployManifest } from './types.js';
import { HOSTING_DIR, MANIFEST_FILENAME } from '../constants.js';

/**
 * Parse and validate the deploy manifest from the hosting output directory.
 * @param hostingOutputDir - absolute path to the .amplify-hosting directory
 * @returns validated DeployManifest
 */
export const parseManifest = (hostingOutputDir: string): DeployManifest => {
  const manifestPath = path.join(hostingOutputDir, MANIFEST_FILENAME);

  if (!fs.existsSync(manifestPath)) {
    throw new HostingError('ManifestNotFoundError', {
      message: `Deploy manifest not found at ${manifestPath}`,
      resolution:
        `Ensure your framework adapter produces a ${MANIFEST_FILENAME} in the ${HOSTING_DIR}/ directory. ` +
        `If using a custom build, create ${HOSTING_DIR}/${MANIFEST_FILENAME} manually.`,
    });
  }

  let rawContent: string;
  try {
    rawContent = fs.readFileSync(manifestPath, 'utf-8');
  } catch (error) {
    throw new HostingError(
      'ManifestReadError',
      {
        message: `Failed to read deploy manifest at ${manifestPath}`,
        resolution: 'Verify the file exists and has read permissions.',
      },
      error as Error,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawContent);
  } catch (error) {
    throw new HostingError(
      'ManifestParseError',
      {
        message: `Deploy manifest at ${manifestPath} contains invalid JSON`,
        resolution:
          'Ensure the manifest file contains valid JSON. Check for trailing commas or syntax errors.',
      },
      error as Error,
    );
  }

  const result = deployManifestSchema.safeParse(parsed);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    throw new HostingError('ManifestValidationError', {
      message: `Deploy manifest validation failed:\n${issues}`,
      resolution:
        'Fix the manifest to match the expected schema. See https://docs.amplify.aws/hosting/manifest for details.',
    });
  }

  return result.data as DeployManifest;
};

/**
 * Get the default hosting output directory path.
 */
export const getHostingOutputDir = (projectDir: string): string => {
  return path.join(projectDir, HOSTING_DIR);
};
