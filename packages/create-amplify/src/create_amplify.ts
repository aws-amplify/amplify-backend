#!/usr/bin/env node

/*
  We should be very careful about how much logic we add to this package.
  If this grows beyond just copying template files, we probably should put that logic into @aws-amplify/cli and delegate to it here
  This is because packages that run as part of `npm create *` are cached in the global npx cache which is cumbersome to update / clean.
  If customers have a cached version of the create-amplify package, they might execute that cached version even after we publish features and fixes to the package on npm.
 */

import { PackageManagerController } from './package_manager_controller.js';
import { ProjectRootValidator } from './project_root_validator.js';
import {
  AmplifyProjectCreator,
  type PackageManager,
} from './amplify_project_creator.js';
import { InitialProjectFileGenerator } from './initial_project_file_generator.js';
import { ProjectInitializer } from './project_initializer.js';
import { getProjectRoot } from './get_project_root.js';
import { GitIgnoreInitializer } from './gitignore_initializer.js';
import { logger } from './logger.js';

const projectRoot = await getProjectRoot();

const getPackageManager: () => PackageManager = () => {
  if (!process.env.npm_config_user_agent) {
    logger.warn('Could not determine package manager, defaulting to npm');
    return 'npm';
  }

  const userAgent = process.env.npm_config_user_agent;
  const packageManagerAndVersion = userAgent.split(' ')[0];
  const packageManager = packageManagerAndVersion.split('/')[0];

  if (packageManager === 'yarn') {
    const yarnMajorVersion = packageManagerAndVersion
      .split('/')[1]
      .split('.')[0];
    return `${packageManager}-${
      yarnMajorVersion === '1' ? 'classic' : 'modern'
    }`;
  }

  return packageManager as PackageManager;
};

const packageManager = getPackageManager();

const amplifyProjectCreator = new AmplifyProjectCreator(
  new PackageManagerController(projectRoot, packageManager),
  new ProjectRootValidator(projectRoot),
  new InitialProjectFileGenerator(projectRoot, packageManager),
  new ProjectInitializer(projectRoot, packageManager),
  new GitIgnoreInitializer(projectRoot),
  projectRoot,
  packageManager
);

try {
  await amplifyProjectCreator.create();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
}
