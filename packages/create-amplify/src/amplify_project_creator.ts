import { LogLevel } from '@aws-amplify/cli-core';
import { PackageManagerController } from '@aws-amplify/plugin-types';
import { ProjectRootValidator } from './project_root_validator.js';
import { GitIgnoreInitializer } from './gitignore_initializer.js';
import { InitialProjectFileGenerator } from './initial_project_file_generator.js';
import { printer } from './printer.js';

const LEARN_MORE_USAGE_DATA_TRACKING_LINK = `https://docs.amplify.aws/gen2/reference/telemetry`;

/**
 *
 */
export class AmplifyProjectCreator {
  private readonly defaultDevPackages = [
    '@aws-amplify/backend',
    '@aws-amplify/backend-cli',
    'aws-cdk@^2',
    'aws-cdk-lib@^2',
    'constructs@^10.0.0',
    'typescript@^5.0.0',
  ];

  private readonly defaultProdPackages = ['aws-amplify'];

  /**
   * Orchestrator for the create-amplify workflow.
   * Delegates out to other classes that handle parts of the getting started experience
   */
  constructor(
    private readonly projectRoot: string,
    private readonly packageManagerController: PackageManagerController,
    private readonly projectRootValidator: ProjectRootValidator,
    private readonly gitIgnoreInitializer: GitIgnoreInitializer,
    private readonly initialProjectFileGenerator: InitialProjectFileGenerator
  ) {}

  /**
   * Executes the create-amplify workflow
   */
  create = async (): Promise<void> => {
    printer.log(
      `Validating current state of target directory...`,
      LogLevel.DEBUG
    );
    await this.projectRootValidator.validate();

    await this.packageManagerController.initializeProject();

    await printer.indicateProgress(
      `Installing required dependencies`,
      async () => {
        await this.packageManagerController.installDependencies(
          this.defaultProdPackages,
          'prod'
        );

        await this.packageManagerController.installDependencies(
          this.defaultDevPackages,
          'dev'
        );
      }
    );

    await printer.indicateProgress(`Creating template files`, async () => {
      await this.gitIgnoreInitializer.ensureInitialized();

      await this.initialProjectFileGenerator.generateInitialProjectFiles();
    });

    printer.log('Successfully created a new project!');

    const cdPreamble =
      process.cwd() === this.projectRoot
        ? ''
        : `Navigate to your project directory using
'cd .${this.projectRoot.replace(process.cwd(), '')}'.
Then get started with the following commands:
`;

    printer.log(
      `Welcome to AWS Amplify! 
${cdPreamble}
${this.packageManagerController.getWelcomeMessage()}`
    );

    printer.log(
      `Amplify (Gen 2) collects anonymous telemetry data about general usage of the CLI.

Participation is optional, and you may opt-out by using \`amplify configure telemetry disable\`.

To learn more about telemetry, visit ${LEARN_MORE_USAGE_DATA_TRACKING_LINK}`
    );
  };
}
