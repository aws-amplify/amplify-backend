#!/usr/bin/env node

import * as fs from 'fs';
import * as fsp from 'fs/promises';
import * as path from 'path';
import { NpmPackageManagerController } from './npm_package_manager_controller.js';

// TODO once we create `aws-amplify-backend` that will be included here
const defaultPackages = [
  '@aws-amplify/backend',
  '@aws-amplify/backend-graphql',
  '@aws-amplify/backend-auth',
  '@aws-amplify/cli',
  'aws-amplify',
];

// Check if the current directory already has a non-empty amplify directory
// If so, we fail fast
const testAmplifyDir = path.resolve(process.cwd(), 'amplify');

if (
  fs.existsSync(testAmplifyDir) &&
  (await fsp.stat(testAmplifyDir)).isDirectory() &&
  (await fsp.readdir(testAmplifyDir)).length > 0
) {
  console.error(
    'The current directory already contains a non-empty amplify directory. Either delete this directory or initialize the project in a different location.'
  );
  process.exit(1);
}

// right now there's only one controller, but we could add logic to pick between different package managers
const packageManager = new NpmPackageManagerController();

console.log(`Installing packages ${defaultPackages.join(', ')}...`);
await packageManager.installDevDependencies(defaultPackages);

/*
  We should be very careful about how much logic we put here.
  If this grows beyond just copying template files, we probably should put that logic into @aws-amplify/cli and delegate to it here
  This is because packages that run as part of `npm create *` are cached in the global npx cache which is cumbersome to update / clean.
  If customers have a cached version of the create-amplify packages, they might execute that cached version even after we publish features and fixes to the package on npm.
 */

console.log(`Scaffolding initial project files...`);
const targetDir = path.resolve(process.cwd(), 'amplify');
await fsp.mkdir(targetDir, { recursive: true });
/*
  Note: Although the source code template directory contains expected-cdk-out test assets,
  these assets are not published to npm and thus not copied when this code runs in production
 */
await fsp.cp(
  new URL('../templates/basic-auth-data', import.meta.url),
  targetDir,
  { recursive: true }
);

console.log('All done! Run `npx amplify help` to see available CLI commands.');
