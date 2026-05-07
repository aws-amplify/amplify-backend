import * as fs from 'fs';
import * as path from 'path';
import { HostingError } from '../hosting_error.js';
import { deployManifestSchema } from './schema.js';
import { DeployManifest } from './types.js';
import { HOSTING_DIR, MANIFEST_FILENAME } from '../constants.js';

/**
 * Parse and validate a DeployManifest from a JSON file.
 * @param manifestPath - absolute path to the manifest JSON file
 * @returns validated DeployManifest
 */
export const parseManifestFile = (manifestPath: string): DeployManifest => {
  if (!fs.existsSync(manifestPath)) {
    throw new HostingError('ManifestNotFoundError', {
      message: `Deploy manifest not found at ${manifestPath}`,
      resolution:
        `Ensure your framework adapter produces a manifest file. ` +
        `If using a custom build, create the manifest manually.`,
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

  return parseManifestJson(rawContent, manifestPath);
};

/**
 * Parse and validate a DeployManifest from a JSON string.
 * @param json - raw JSON string
 * @param source - source identifier for error messages
 * @returns validated DeployManifest
 */
export const parseManifestJson = (
  json: string,
  source: string = '<inline>',
): DeployManifest => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (error) {
    throw new HostingError(
      'ManifestParseError',
      {
        message: `Deploy manifest at ${source} contains invalid JSON`,
        resolution:
          'Ensure the manifest file contains valid JSON. Check for trailing commas or syntax errors.',
      },
      error as Error,
    );
  }

  return validateManifest(parsed, source);
};

/**
 * Validate a parsed object against the DeployManifest schema.
 * @param data - parsed JSON object to validate
 * @param source - source identifier for error messages
 * @returns validated DeployManifest
 */
export const validateManifest = (
  data: unknown,
  source: string = '<inline>',
): DeployManifest => {
  const result = deployManifestSchema.safeParse(data);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    throw new HostingError('ManifestValidationError', {
      message: `Deploy manifest validation failed (source: ${source}):\n${issues}`,
      resolution:
        'Fix the manifest to match the expected schema. ' +
        'Ensure all compute resources have a valid type (handler/http-server/edge) and placement.',
    });
  }

  return result.data as DeployManifest;
};

/**
 * Parse manifest from the hosting output directory.
 * @param hostingOutputDir - absolute path to the .amplify-hosting directory
 * @returns validated DeployManifest
 */
export const parseManifest = (hostingOutputDir: string): DeployManifest => {
  const manifestPath = path.join(hostingOutputDir, MANIFEST_FILENAME);
  return parseManifestFile(manifestPath);
};

/**
 * Get the default hosting output directory path.
 */
export const getHostingOutputDir = (projectDir: string): string => {
  return path.join(projectDir, HOSTING_DIR);
};
