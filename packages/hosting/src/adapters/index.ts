import * as fs from 'fs';
import * as path from 'path';
import { HostingError } from '../hosting_error.js';
import { spaAdapter } from './spa.js';
import { nextjsAdapter } from './nextjs.js';
import { DeployManifest } from '../manifest/types.js';

/**
 * An adapter function that transforms a build output directory into the
 * canonical .amplify-hosting/ directory structure.
 */
export type FrameworkAdapterFn = (
  buildOutputDir: string,
  projectDir: string,
) => DeployManifest;

/**
 * Built-in adapter registry.
 */
const adapterRegistry = new Map<string, FrameworkAdapterFn>([
  ['nextjs', nextjsAdapter],
  ['spa', spaAdapter],
  ['static', spaAdapter],
]);

/**
 * Detect the framework from the project's package.json.
 * @param projectDir - absolute path to the project root
 * @returns the detected framework type
 */
export const detectFramework = (projectDir: string): string => {
  const packageJsonPath = path.join(projectDir, 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    // No package.json — treat as static site
    return 'static';
  }

  let packageJson: Record<string, unknown>;
  try {
    packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  } catch (error) {
    throw new HostingError(
      'PackageJsonParseError',
      {
        message: `Failed to parse package.json at ${packageJsonPath}`,
        resolution:
          'Fix JSON syntax errors in package.json, or set framework explicitly: defineHosting({ framework: "spa" })',
      },
      error as Error,
    );
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
 * Looks up the adapter registry.
 * @param framework - the framework type
 * @returns the adapter function
 */
export const getAdapter = (framework: string): FrameworkAdapterFn => {
  const adapter = adapterRegistry.get(framework);
  if (!adapter) {
    throw new HostingError('UnsupportedFrameworkError', {
      message: `Framework "${framework}" is not supported.`,
      resolution:
        'Use a built-in framework (nextjs, spa, static) or provide a customAdapter in your defineHosting configuration.',
    });
  }
  return adapter;
};
