import * as fs from 'fs';
import * as path from 'path';
import { HostingError } from '../hosting_error.js';
import { spaAdapter } from './spa.js';
import { nextjsAdapter } from './nextjs.js';
import { DeployManifest } from '../manifest/types.js';

export { spaAdapter } from './spa.js';
export type { SpaAdapterOptions } from './spa.js';
export { nextjsAdapter } from './nextjs.js';
export type { NextjsAdapterOptions } from './nextjs.js';

/**
 * A framework adapter function that produces a DeployManifest from a project.
 *
 * For the new manifest format, adapters receive the project directory
 * and return a DeployManifest directly (no intermediate .amplify-hosting/ step).
 */
export type FrameworkAdapterFn = (projectDir: string) => DeployManifest;

/**
 * Adapter registry entry.
 */
type AdapterRegistryEntry = {
  adapter: FrameworkAdapterFn;
};

/**
 * Built-in adapter registry.
 * Each adapter takes a projectDir and returns a DeployManifest.
 */
const adapterRegistry = new Map<string, AdapterRegistryEntry>([
  [
    'nextjs',
    { adapter: (projectDir: string) => nextjsAdapter({ projectDir }) },
  ],
  ['spa', { adapter: spaAdapter }],
  ['static', { adapter: spaAdapter }],
]);

/**
 * Detect the framework from the project's package.json.
 * @param projectDir - absolute path to the project root
 * @returns the detected framework type
 */
export const detectFramework = (projectDir: string): string => {
  const packageJsonPath = path.join(projectDir, 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
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

  return 'spa';
};

/**
 * Get the adapter function for the given framework type.
 * @param framework - the framework type
 * @param buildOutputDir - explicit build output directory (for SPA/static)
 * @returns the adapter function
 */
export const getAdapter = (
  framework: string,
  buildOutputDir?: string,
): FrameworkAdapterFn => {
  const entry = adapterRegistry.get(framework);
  if (!entry) {
    throw new HostingError('UnsupportedFrameworkError', {
      message: `Framework "${framework}" is not supported.`,
      resolution:
        'Use a built-in framework (nextjs, spa, static) or provide a customAdapter in your defineHosting configuration.',
    });
  }

  // For SPA/static with explicit buildOutputDir, wrap the adapter
  if (buildOutputDir && (framework === 'spa' || framework === 'static')) {
    return (projectDir: string) =>
      spaAdapter(projectDir, { buildOutputDir });
  }

  return entry.adapter;
};
