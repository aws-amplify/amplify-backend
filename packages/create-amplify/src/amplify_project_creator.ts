import { EOL } from 'os';
import { LogLevel, format, printer } from '@aws-amplify/cli-core';
import { PackageManagerController } from '@aws-amplify/plugin-types';
import { ProjectRootValidator } from './project_root_validator.js';
import { GitIgnoreInitializer } from './gitignore_initializer.js';
import { InitialProjectFileGenerator } from './initial_project_file_generator.js';

const LEARN_MORE_USAGE_DATA_TRACKING_LINK =
  'https://docs.amplify.aws/gen2/reference/telemetry';

/**
 * Orchestration class that sets up a new Amplify project
 */
export class AmplifyProjectCreator {
  /**
   * TODO: remove @beta tags before GA
   * https://github.com/aws-amplify/amplify-backend/issues/1013
   */
  private readonly defaultDevPackages = [
    '@aws-amplify/backend@beta',
    '@aws-amplify/backend-cli@beta',
    'aws-cdk@^2',
    'aws-cdk-lib@^2',
    'constructs@^10.0.0',
    'typescript@^5.0.0',
    'tsx',
    'esbuild',
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

    printer.printNewLine();
    printer.log(format.sectionHeader(`Installing devDependencies:`));
    printer.log(format.list(this.defaultDevPackages));

    printer.printNewLine();
    printer.log(format.sectionHeader(`Installing dependencies:`));
    printer.log(format.list(this.defaultProdPackages));
    printer.printNewLine();

    await printer.indicateProgress('Installing devDependencies', () =>
      this.packageManagerController.installDependencies(
        this.defaultDevPackages,
        'dev'
      )
    );
    printer.log(`✔ DevDependencies installed`);
    await printer.indicateProgress('Installing dependencies', () =>
      this.packageManagerController.installDependencies(
        this.defaultProdPackages,
        'prod'
      )
    );
    printer.log(`✔ Dependencies installed`);
    await printer.indicateProgress('Creating template files', async () => {
      await this.gitIgnoreInitializer.ensureInitialized();
      await this.initialProjectFileGenerator.generateInitialProjectFiles();
    });
    printer.log(`✔ Template files created`);

    printer.log(format.success('Successfully created a new project!'));
    printer.printNewLine();

    const cdPreamble =
      process.cwd() === this.projectRoot
        ? null
        : `Navigate to your project directory using ${format.command(
            `cd .${this.projectRoot.replace(process.cwd(), '')}`
          )} and then:`;

    printer.log(format.sectionHeader(`Welcome to AWS Amplify!`));

    const instructionSteps = [
      cdPreamble,
      this.packageManagerController.getWelcomeMessage(),
    ]
      .filter(Boolean)
      .join(EOL);

    printer.log(instructionSteps);
    printer.printNewLine();

    printer.log(
      format.note(
        `Amplify (Gen 2) collects anonymous telemetry data about general usage of the CLI. Participation is optional, and you may opt-out by using ${format.command(
          'npx amplify configure telemetry disable'
        )}. To learn more about telemetry, visit ${format.link(
          LEARN_MORE_USAGE_DATA_TRACKING_LINK
        )}`
      )
    );
    printer.printNewLine();
  };
}
