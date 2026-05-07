import * as fs from 'fs';
import * as path from 'path';
import { HostingError } from '../hosting_error.js';
import { spaAdapter } from './spa.js';
import { nextjsAdapter } from './nextjs.js';
import { DeployManifest } from '../manifest/types.js';

export { spaAdapter } from './spa.js';
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
 * Built-in adapter registry.
 * Each adapter takes a projectDir and returns a DeployManifest.
 */
const adapterRegistry = new Map<string, FrameworkAdapterFn>([
  ['nextjs', (projectDir: string) => nextjsAdapter({ projectDir })],
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
