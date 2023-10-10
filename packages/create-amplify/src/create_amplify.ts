#!/usr/bin/env node

/*
  We should be very careful about how much logic we add to this package.
  If this grows beyond just copying template files, we probably should put that logic into @aws-amplify/cli and delegate to it here
  This is because packages that run as part of `npm create *` are cached in the global npx cache which is cumbersome to update / clean.
  If customers have a cached version of the create-amplify package, they might execute that cached version even after we publish features and fixes to the package on npm.
 */

import { input } from '@inquirer/prompts';
import { NpmPackageManagerController } from './npm_package_manager_controller.js';
import { ProjectRootValidator } from './project_root_validator.js';
import { AmplifyProjectCreator } from './amplify_project_creator.js';
import { InitialProjectFileGenerator } from './initial_project_file_generator.js';
import { NpmProjectInitializer } from './npm_project_initializer.js';
import { TsConfigInitializer } from './tsconfig_initializer.js';

/*
  The project root is the root directory of the customer's repo
  This is the directory above the `amplify` directory
  We may want to expose a `--target` arg to the `create-amplify` command at some point, but for now, we just use process.cwd()
 */

try {
  const useDefault = process.env.npm_config_yes === 'true';
  const defaultProjectRoot = '.';
  const projectRoot = useDefault
    ? defaultProjectRoot
    : await input({
        message: 'Where should we create your project?',
        default: defaultProjectRoot,
      });

  const amplifyProjectCreator = new AmplifyProjectCreator(
    new NpmPackageManagerController(projectRoot),
    new ProjectRootValidator(projectRoot),
    new InitialProjectFileGenerator(projectRoot),
    new NpmProjectInitializer(projectRoot),
    new TsConfigInitializer(projectRoot)
  );
  await amplifyProjectCreator.create({
    /**
     * process.env.npm_config_yes is set by npm when the user passes `--yes` or `-y` to `npm init`.
     * See https://github.com/npm/init-package-json/blob/4a9b5f1832bd2709e6e432f019f1a964b7159910/test/npm-defaults.js#L112
     */
    skipPrompts: process.env.npm_config_yes === 'true',
  });
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
}
