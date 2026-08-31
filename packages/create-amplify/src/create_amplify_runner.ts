import {
  LogLevel,
  PackageManagerControllerFactory,
  format,
  printer,
} from '@aws-amplify/cli-core';
import { AmplifyProjectCreator } from './amplify_project_creator.js';
import { getProjectRoot } from './get_project_root.js';
import { GitIgnoreInitializer } from './gitignore_initializer.js';
import { InitialProjectFileGenerator } from './initial_project_file_generator.js';
import { ProjectRootValidator } from './project_root_validator.js';

export type CreateAmplifyRunnerOptions = {
  getProjectRoot?: () => Promise<string>;
  createProject?: (projectRoot: string) => Promise<void>;
};

const createProject = async (projectRoot: string): Promise<void> => {
  const packageManagerControllerFactory = new PackageManagerControllerFactory(
    projectRoot,
  );
  const packageManagerController =
    packageManagerControllerFactory.getPackageManagerController();
  const amplifyProjectCreator = new AmplifyProjectCreator(
    projectRoot,
    packageManagerController,
    new ProjectRootValidator(projectRoot),
    new GitIgnoreInitializer(projectRoot),
    new InitialProjectFileGenerator(projectRoot, packageManagerController),
  );

  await amplifyProjectCreator.create();
};

const isUserForceClosePromptError = (error: unknown): boolean =>
  error instanceof Error &&
  error.message.includes('User force closed the prompt');

/** Runs the create-amplify workflow and converts prompt cancellation into a clean exit. */
export const runCreateAmplify = async ({
  getProjectRoot: resolveProjectRoot = getProjectRoot,
  createProject: createAmplifyProject = createProject,
}: CreateAmplifyRunnerOptions = {}): Promise<void> => {
  try {
    const projectRoot = await resolveProjectRoot();
    await createAmplifyProject(projectRoot);
  } catch (error) {
    if (isUserForceClosePromptError(error)) {
      return;
    }

    printer.log(format.error(error), LogLevel.ERROR);
    process.exitCode = 1;
  }
};
