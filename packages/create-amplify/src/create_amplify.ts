#!/usr/bin/env node

/*
  We should be very careful about how much logic we add to this package.
  If this grows beyond just copying template files, we probably should put that logic into @aws-amplify/cli and delegate to it here
  This is because packages that run as part of `npm create *` are cached in the global npx cache which is cumbersome to update / clean.
  If customers have a cached version of the create-amplify package, they might execute that cached version even after we publish features and fixes to the package on npm.
 */

import { NpmPackageManagerController } from './npm_package_manager_controller.js';
import { ProjectRootValidator } from './project_root_validator.js';
import { AmplifyProjectCreator } from './amplify_project_creator.js';
import { InitialProjectFileGenerator } from './initial_project_file_generator.js';
import { NpmProjectInitializer } from './npm_project_initializer.js';
import { TsConfigInitializer } from './tsconfig_initializer.js';
import { getProjectRoot } from './get_project_root.js';

const projectRoot = await getProjectRoot();

const amplifyProjectCreator = new AmplifyProjectCreator(
  new NpmPackageManagerController(projectRoot),
  new ProjectRootValidator(projectRoot),
  new InitialProjectFileGenerator(projectRoot),
  new NpmProjectInitializer(projectRoot),
  new TsConfigInitializer(projectRoot),
  console
);

try {
  await amplifyProjectCreator.create();
  console.info(
    `Run \`amplify help\` for a list of available commands. 
Get started by running \`${
      process.cwd() === projectRoot
        ? ''
        : `cd  ${projectRoot.replace(process.cwd(), '')}`
    }; amplify sandbox\`.`
  );
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
}
