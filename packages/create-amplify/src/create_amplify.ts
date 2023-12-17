#!/usr/bin/env node

/*
  We should be very careful about how much logic we add to this package.
  If this grows beyond just copying template files, we probably should put that logic into @aws-amplify/cli and delegate to it here
  This is because packages that run as part of `npm create *` are cached in the global npx cache which is cumbersome to update / clean.
  If customers have a cached version of the create-amplify package, they might execute that cached version even after we publish features and fixes to the package on npm.
 */

import { ProjectRootValidator } from './project_root_validator.js';
import { AmplifyProjectCreator } from './amplify_project_creator.js';
import { PackageManagerControllerFactory } from './package-manager-controller/index.js';
import { InitialProjectFileGenerator } from './initial_project_file_generator.js';
import { getProjectRoot } from './get_project_root.js';
import { GitIgnoreInitializer } from './gitignore_initializer.js';

const projectRoot = await getProjectRoot();

const packageManagerControllerFactory = new PackageManagerControllerFactory(
  projectRoot,
  process.env.npm_config_user_agent
);

const amplifyProjectCreator = new AmplifyProjectCreator(
  packageManagerControllerFactory.getPackageManagerController(),
  new ProjectRootValidator(projectRoot),
  new InitialProjectFileGenerator(projectRoot, packageManagerControllerFactory),
  new GitIgnoreInitializer(projectRoot),
  projectRoot
);

try {
  await amplifyProjectCreator.create();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
}
