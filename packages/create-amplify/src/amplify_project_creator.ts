import kleur from 'kleur';
import { LogLevel } from '@aws-amplify/cli-core';
import { PackageManagerController } from '@aws-amplify/plugin-types';
import { ProjectRootValidator } from './project_root_validator.js';
import { GitIgnoreInitializer } from './gitignore_initializer.js';
import { InitialProjectFileGenerator } from './initial_project_file_generator.js';
import { printer } from './printer.js';

const LEARN_MORE_USAGE_DATA_TRACKING_LINK = kleur.blue(
  `https://docs.amplify.aws/gen2/reference/telemetry`
);

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

    printer.log('\nInstalling devDependencies:');
    this.defaultDevPackages.forEach((dep) => {
      printer.log(kleur.blue(`- ${dep}`));
    });

    printer.log('\nInstalling dependencies:');
    this.defaultProdPackages.forEach((dep) => {
      printer.log(kleur.blue(`- ${dep}`));
    });

    printer.log('\n');
    await printer.indicateSpinnerProgress(
      [
        async () =>
          this.packageManagerController.installDependencies(
            this.defaultDevPackages,
            'dev'
          ),
        async () =>
          this.packageManagerController.installDependencies(
            this.defaultProdPackages,
            'prod'
          ),
      ],
      ['Installing devDependencies', 'Installing dependencies'],
      'Dependencies installed'
    );

    await printer.indicateSpinnerProgress(
      [
        async () => {
          await this.gitIgnoreInitializer.ensureInitialized();
          await this.initialProjectFileGenerator.generateInitialProjectFiles();
        },
      ],
      ['Creating template files'],
      'Template files created'
    );

    printer.log(kleur.green().bold('Successfully created a new project!\n'));

    const cdPreamble =
      process.cwd() === this.projectRoot
        ? null
        : `Change directory by running ${kleur
            .yellow()
            .bold(
              'cd .' + this.projectRoot.replace(process.cwd(), '') + ''
            )} and then:`;

    printer.log(kleur.cyan('Welcome to AWS Amplify!\n'));

    const instructionSteps = [
      cdPreamble,
      `- Get started with your project by running ${kleur
        .yellow()
        .bold('npx amplify sandbox')}.`,
      `- Run ${kleur
        .yellow()
        .bold('npx amplify help')} for a list of available commands.`,
    ]
      .filter(Boolean)
      .join('\n');

    printer.log(instructionSteps);

    printer.log(
      kleur.dim(`\nAmplify (Gen 2) collects anonymous telemetry data about general usage of the CLI.
Participation is optional, and you may opt-out by using ${kleur
        .yellow()
        .bold('amplify configure telemetry disable')}.
To learn more about telemetry, visit ${LEARN_MORE_USAGE_DATA_TRACKING_LINK}\n`)
    );
  };
}
