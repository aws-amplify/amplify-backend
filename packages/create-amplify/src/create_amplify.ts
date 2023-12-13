#!/usr/bin/env node

/*
  We should be very careful about how much logic we add to this package.
  If this grows beyond just copying template files, we probably should put that logic into @aws-amplify/cli and delegate to it here
  This is because packages that run as part of `npm create *` are cached in the global npx cache which is cumbersome to update / clean.
  If customers have a cached version of the create-amplify package, they might execute that cached version even after we publish features and fixes to the package on npm.
 */

import { ProjectRootValidator } from './project_root_validator.js';
import { AmplifyProjectCreator } from './amplify_project_creator.js';
import {
  PackageManagerBase,
  type PackageManagerName,
  type PackageManagerProps,
  packageManagerControllerFactory,
} from './package-manager-controller/index.js';
import { projectInitializerFactory } from './project-initializer/index.js';
import { InitialProjectFileGenerator } from './initial_project_file_generator.js';
import { getProjectRoot } from './get_project_root.js';
import { GitIgnoreInitializer } from './gitignore_initializer.js';
import { logger } from './logger.js';

const projectRoot = await getProjectRoot();

const getPackageManager: () => PackageManagerProps = () => {
  const getPackageManagerConfig = new PackageManagerBase().getPackageManager;
  if (!process.env.npm_config_user_agent) {
    logger.warn('Could not determine package manager, defaulting to npm');
    return getPackageManagerConfig('npm');
  }

  const userAgent = process.env.npm_config_user_agent;
  const packageManagerAndVersion = userAgent.split(' ')[0];
  const packageManagerName = packageManagerAndVersion.split('/')[0];

  if (packageManagerName === 'yarn') {
    const yarnMajorVersion = packageManagerAndVersion
      .split('/')[1]
      .split('.')[0];
    const yarnName: PackageManagerName = `${packageManagerName}-${
      yarnMajorVersion === '1' ? 'classic' : 'modern'
    }`;
    return getPackageManagerConfig(yarnName);
  }
  return getPackageManagerConfig(packageManagerName as PackageManagerName);
};

const packageManager = getPackageManager();
const PackageController = packageManagerControllerFactory(packageManager.name);
const ProjectInitializer = projectInitializerFactory(packageManager.name);

const amplifyProjectCreator = new AmplifyProjectCreator(
  new PackageController(projectRoot, packageManager),
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
