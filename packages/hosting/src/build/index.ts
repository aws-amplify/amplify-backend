import * as fs from 'fs';
import * as path from 'path';
import { AmplifyUserError } from '@aws-amplify/platform-core';
import { runBuild } from './runner.js';
import { detectFramework, getAdapter } from '../adapters/index.js';
import { getHostingOutputDir, parseManifest } from '../manifest/parser.js';
import { DeployManifest } from '../manifest/types.js';

export interface BuildAndPrepareOptions {
  /**
   * Optional build command (e.g., 'npm run build').
   * If omitted, the build step is skipped.
   */
  buildCommand?: string;

  /**
   * Build output directory (e.g., 'dist', '.next').
   * Auto-detected per framework if not specified.
   */
  buildOutputDir?: string;

  /**
   * Framework type. Auto-detected from package.json if not specified.
   */
  framework?: string;

  /**
   * Absolute path to the project root directory.
   */
  projectDir: string;
}

export interface BuildAndPrepareResult {
  /**
   * The validated deploy manifest.
   */
  manifest: DeployManifest;

  /**
   * Absolute path to the .amplify-hosting/ output directory.
   */
  hostingOutputDir: string;

  /**
   * Whether the build step was skipped (CI/CD pre-built mode).
   */
  buildSkipped: boolean;
}

/**
 * Get the default build output directory for a given framework.
 */
const getDefaultBuildOutputDir = (framework: string): string => {
  switch (framework) {
    case 'nextjs':
      return '.next';
    case 'spa':
      return 'dist';
    case 'static':
      return 'public';
    default:
      return 'dist';
  }
};

/**
 * Orchestrate the full build pipeline: detect framework → run build → run
 * adapter → validate manifest.
 *
 * If `.amplify-hosting/` already exists (CI/CD pre-built), the build step
 * and adapter step are skipped entirely — we just parse the existing manifest.
 */
export const buildAndPrepare = (
  options: BuildAndPrepareOptions,
): BuildAndPrepareResult => {
  const { projectDir } = options;
  const hostingOutputDir = getHostingOutputDir(projectDir);

  // ---- CI/CD pre-built mode: .amplify-hosting/ already exists ----
  const manifestPath = path.join(hostingOutputDir, 'deploy-manifest.json');
  if (fs.existsSync(manifestPath)) {
    const manifest = parseManifest(hostingOutputDir);
    return {
      manifest,
      hostingOutputDir,
      buildSkipped: true,
    };
  }

  // ---- Step 1: Detect framework ----
  const framework = options.framework ?? detectFramework(projectDir);

  // ---- Step 2: Run build command (if provided) ----
  if (options.buildCommand) {
    runBuild({
      command: options.buildCommand,
      cwd: projectDir,
    });
  }

  // ---- Step 3: Resolve build output directory ----
  const buildOutputDir =
    options.buildOutputDir ?? getDefaultBuildOutputDir(framework);
  const absoluteBuildOutputDir = path.isAbsolute(buildOutputDir)
    ? buildOutputDir
    : path.join(projectDir, buildOutputDir);

  if (!fs.existsSync(absoluteBuildOutputDir)) {
    throw new AmplifyUserError('BuildOutputNotFoundError', {
      message: `Build output directory not found at: ${absoluteBuildOutputDir}`,
      resolution: [
        'Verify your buildOutputDir matches your build tool output.',
        options.buildCommand
          ? `Your build command "${options.buildCommand}" may not have produced output at this path.`
          : 'If you did not specify a buildCommand, run your build manually before deploying.',
        `Expected directory: ${absoluteBuildOutputDir}`,
      ].join('\n'),
    });
  }

  // ---- Step 4: Run framework adapter ----
  let manifest: DeployManifest;
  try {
    const adapter = getAdapter(framework);
    manifest = adapter(absoluteBuildOutputDir, projectDir);
  } catch (error) {
    if (error instanceof AmplifyUserError) {
      throw error;
    }
    throw new AmplifyUserError('AdapterError', {
      message: `Framework adapter failed for "${framework}".`,
      resolution: [
        'Check that your build output is in the expected format.',
        `Framework: ${framework}`,
        `Build output directory: ${absoluteBuildOutputDir}`,
        error instanceof Error ? error.message : String(error),
      ].join('\n'),
    });
  }

  // ---- Step 5: Validate manifest ----
  try {
    parseManifest(hostingOutputDir);
  } catch (error) {
    if (error instanceof AmplifyUserError) {
      throw error;
    }
    throw new AmplifyUserError('ManifestError', {
      message: 'Deploy manifest validation failed after adapter ran.',
      resolution: [
        'The framework adapter produced an invalid manifest.',
        'This is likely a bug in the adapter. Please report it.',
        error instanceof Error ? error.message : String(error),
      ].join('\n'),
    });
  }

  return {
    manifest,
    hostingOutputDir,
    buildSkipped: false,
  };
};
