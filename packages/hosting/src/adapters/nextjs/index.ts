/**
 * Next.js Adapter — OpenNext Integration
 *
 * This module integrates with OpenNext (`@opennextjs/aws`) to build and package
 * Next.js applications for deployment on AWS. Instead of custom route classification
 * and manifest parsing, we delegate to OpenNext which is production-proven.
 *
 * The adapter's responsibilities:
 * 1. Run `npx open-next build` (or accept pre-built output)
 * 2. Read `.open-next/open-next.output.json`
 * 3. Translate OpenNext output → DeployManifest v2
 *
 * The L3 construct only sees DeployManifest v2 — it never imports OpenNext.
 *
 * @example next.config.js
 * ```javascript
 * module.exports = {
 *   output: 'standalone',
 * };
 * ```
 * @example Programmatic usage
 * ```typescript
 * import { adapt } from '@aws-amplify/hosting/adapters/nextjs';
 *
 * const manifest = adapt({
 *   projectDir: '/path/to/project',
 *   skipBuild: false,
 * });
 * ```
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { DeployManifestV2 } from '../../manifest/deploy_manifest.js';
import { translateToManifest } from './manifest.js';
import { HOSTING_DIR } from '../../constants.js';
import { OpenNextOutput } from './types.js';

/**
 * Options for the Next.js adapter.
 */
export type NextjsAdapterOptions = {
  /** Absolute path to the project root (where package.json lives). */
  projectDir: string;

  /**
   * Absolute path to the .next/ build output directory.
   * Used for legacy mode (pre-built output without OpenNext).
   * When OpenNext is used, this is derived from the project.
   */
  buildOutputDir?: string;

  /**
   * Output directory for the generated hosting manifest.
   * Defaults to `<projectDir>/.amplify-hosting/`.
   */
  outputDir?: string;

  /**
   * Whether to write the manifest to disk.
   * Set to false for dry-run / testing scenarios.
   * @default true
   */
  writeToDisk?: boolean;

  /**
   * Skip running the OpenNext build (assume .open-next/ already exists).
   * Useful for CI pipelines that run the build separately.
   * @default false
   */
  skipBuild?: boolean;

  /**
   * Path to the OpenNext output directory.
   * Defaults to `<projectDir>/.open-next/`.
   */
  openNextOutputDir?: string;

  /**
   * Custom build command override.
   * @default 'npx open-next build'
   */
  buildCommand?: string;
};

/**
 * Result of running the adapter.
 */
export type AdapterResult = {
  /** The generated DeployManifest v2. */
  manifest: DeployManifestV2;

  /** Path where the manifest was written (undefined if writeToDisk=false). */
  manifestPath?: string;
};

/**
 * Run the Next.js adapter to generate a DeployManifest v2 via OpenNext.
 *
 * This is the primary programmatic entry point. It runs OpenNext's build,
 * reads the output manifest, and translates it to our framework-agnostic format.
 * @param options - Adapter configuration.
 * @returns The adapter result including the generated manifest.
 * @throws Error if the build fails or output is missing/invalid.
 */
export const adapt = (options: NextjsAdapterOptions): AdapterResult => {
  const {
    projectDir,
    outputDir = path.join(projectDir, HOSTING_DIR),
    writeToDisk = true,
    skipBuild = false,
    openNextOutputDir = path.join(projectDir, '.open-next'),
    buildCommand = 'npx open-next build',
  } = options;

  // Validate project directory exists
  if (!fs.existsSync(projectDir)) {
    throw new Error(
      `Project directory not found at ${projectDir}. ` +
        'Verify the projectDir path is correct.',
    );
  }

  // Step 1: Run OpenNext build (unless skipped)
  if (!skipBuild) {
    runOpenNextBuild(projectDir, buildCommand);
  }

  // Step 2: Read OpenNext output manifest
  const output = readOpenNextOutput(openNextOutputDir);

  // Step 3: Detect Next.js version for metadata
  const nextVersion = detectNextVersion(projectDir);

  // Step 4: Translate to DeployManifest v2
  const manifest = translateToManifest(output, projectDir, nextVersion);

  // Step 5: Write to disk if requested
  let manifestPath: string | undefined;
  if (writeToDisk) {
    manifestPath = writeManifestToDisk(manifest, outputDir);
  }

  return { manifest, manifestPath };
};

/**
 * Run the OpenNext build process.
 * @param projectDir - Project root directory.
 * @param buildCommand - Command to execute.
 * @throws Error if the build command fails.
 */
const runOpenNextBuild = (projectDir: string, buildCommand: string): void => {
  try {
    execSync(buildCommand, {
      cwd: projectDir,
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'production',
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(
      `OpenNext build failed: ${msg}\n` +
        'Ensure @opennextjs/aws is installed and next build succeeds independently.',
      { cause: error },
    );
  }
};

/**
 * Read and parse the OpenNext output manifest.
 * @param openNextOutputDir - Path to the .open-next/ directory.
 * @returns Parsed OpenNext output.
 * @throws Error if the output file doesn't exist or is invalid.
 */
export const readOpenNextOutput = (openNextOutputDir: string): OpenNextOutput => {
  const outputPath = path.join(openNextOutputDir, 'open-next.output.json');

  if (!fs.existsSync(outputPath)) {
    throw new Error(
      `OpenNext output not found at ${outputPath}. ` +
        'Run `npx open-next build` first or verify the openNextOutputDir path.',
    );
  }

  try {
    const content = fs.readFileSync(outputPath, 'utf-8');
    return JSON.parse(content) as OpenNextOutput;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to parse OpenNext output at ${outputPath}: ${msg}`,
      { cause: error },
    );
  }
};

/**
 * Write the manifest to the hosting output directory.
 * @param manifest - The DeployManifest v2 to write.
 * @param outputDir - The hosting output directory.
 * @returns Path to the written manifest file.
 */
const writeManifestToDisk = (
  manifest: DeployManifestV2,
  outputDir: string,
): string => {
  fs.mkdirSync(outputDir, { recursive: true });

  const manifestPath = path.join(outputDir, 'deploy-manifest.v2.json');
  fs.writeFileSync(
    manifestPath,
    JSON.stringify(manifest, null, 2),
    'utf-8',
  );

  return manifestPath;
};

/**
 * Detect the Next.js version from node_modules.
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

// Re-export types for consumers
export type { DeployManifestV2 } from '../../manifest/deploy_manifest.js';
export type { OpenNextOutput } from './types.js';
export { translateToManifest } from './manifest.js';
