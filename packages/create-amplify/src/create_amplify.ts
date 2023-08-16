#!/usr/bin/env node

import * as fs from 'fs';
import * as fsp from 'fs/promises';
import * as path from 'path';
import { NpmPackageManagerController } from './npm_package_manager_controller.js';

// once we create `aws-amplify-backend` that will be included here
const defaultPackages = [
  '@aws-amplify/backend',
  '@aws-amplify/backend-data',
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

await packageManager.ensureInitialized();

console.log(`Installing packages ${defaultPackages.join(', ')}...`);
await packageManager.installDevDependencies(defaultPackages);

console.log(`Scaffolding initial project files...`);
const targetDir = path.resolve(process.cwd(), 'amplify');
await fsp.mkdir(targetDir, { recursive: true });
await fsp.cp(
  new URL('../templates/basic-auth-data', import.meta.url),
  targetDir,
  { recursive: true }
);

console.log('All done! Run `npx amplify help` to see available CLI commands.');
