import * as fs from 'fs';
import * as path from 'path';
import { AmplifyUserError } from '@aws-amplify/platform-core';
import { spaAdapter } from './spa.js';
import { DeployManifest } from '../manifest/types.js';

/**
 * Supported framework types.
 */
export type FrameworkType = 'nextjs' | 'spa' | 'static';

/**
 * An adapter function that transforms a build output directory into the
 * canonical .amplify-hosting/ directory structure.
 */
export type FrameworkAdapterFn = (
  buildOutputDir: string,
  projectDir: string,
) => DeployManifest;

/**
 * Detect the framework from the project's package.json.
 * @param projectDir - absolute path to the project root
 * @returns the detected framework type
 */
export const detectFramework = (projectDir: string): FrameworkType => {
  const packageJsonPath = path.join(projectDir, 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    // No package.json — treat as static site
    return 'static';
  }

  let packageJson: Record<string, unknown>;
  try {
    packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  } catch {
    return 'spa';
  }

  const deps = {
    ...(packageJson.dependencies as Record<string, string> | undefined),
    ...(packageJson.devDependencies as Record<string, string> | undefined),
  };

  if ('next' in deps) {
    return 'nextjs';
  }

  // Default to SPA for projects with a package.json
  return 'spa';
};

/**
 * Get the adapter function for the given framework type.
 * @param framework - the framework type
 * @returns the adapter function
 */
export const getAdapter = (framework: FrameworkType): FrameworkAdapterFn => {
  switch (framework) {
    case 'spa':
    case 'static':
      return spaAdapter;
    default:
      throw new AmplifyUserError('UnsupportedFrameworkError', {
        message: `Framework "${framework}" is not yet supported.`,
        resolution:
          'Use framework: "spa" or "static" in your defineHosting configuration. ' +
          'Next.js SSR support is planned for a future release.',
      });
  }
};
