import kleur from 'kleur';
import { PackageManagerController } from './package_manager_controller.js';
import { ProjectRootValidator } from './project_root_validator.js';
import { InitialProjectFileGenerator } from './initial_project_file_generator.js';
import { NpmProjectInitializer } from './npm_project_initializer.js';
import { GitIgnoreInitializer } from './gitignore_initializer.js';
import { logger } from './logger.js';

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
    // TODO figure out how do we manage CDK version here as part of https://github.com/aws-amplify/amplify-backend/issues/392
    'aws-cdk@2.110.1',
    'aws-cdk-lib@2.110.1',
    'constructs@^10.0.0',
    'typescript@^5.0.0',
  ];

  private readonly defaultProdPackages = ['aws-amplify'];

  /**
   * Orchestrator for the create-amplify workflow.
   * Delegates out to other classes that handle parts of the getting started experience
   */
  constructor(
    private readonly packageManagerController: PackageManagerController,
    private readonly projectRootValidator: ProjectRootValidator,
    private readonly initialProjectFileGenerator: InitialProjectFileGenerator,
    private readonly npmInitializedEnsurer: NpmProjectInitializer,
    private readonly gitIgnoreInitializer: GitIgnoreInitializer,
    private readonly projectRoot: string
  ) {}

  /**
   * Executes the create-amplify workflow
   */
  create = async (): Promise<void> => {
    logger.debug(kleur.dim(`Validating current state of target directory...`));
    await this.projectRootValidator.validate();

    await this.npmInitializedEnsurer.ensureInitialized();

    logger.log('\nInstalling devDependencies:');
    this.defaultDevPackages.forEach((dep) => {
      logger.log(kleur.blue(`- ${dep}`));
    });

    logger.log('\nInstalling dependencies:');
    this.defaultProdPackages.forEach((dep) => {
      logger.log(kleur.blue(`- ${dep}`));
    });

    logger.log('\n');
    await logger.indicateSpinnerProgress(
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

    await logger.indicateSpinnerProgress(
      [
        async () => {
          await this.gitIgnoreInitializer.ensureInitialized();
          await this.initialProjectFileGenerator.generateInitialProjectFiles();
        },
      ],
      ['Creating template files'],
      'Template files created'
    );

    logger.log(kleur.green().bold('Successfully created a new project!\n'));

    const cdCommand =
      process.cwd() === this.projectRoot
        ? null
        : `Change directory by running ${kleur
            .yellow()
            .bold(
              'cd .' + this.projectRoot.replace(process.cwd(), '') + ''
            )} and then:`;

    logger.log(kleur.cyan('Welcome to AWS Amplify!\n'));

    const instructionSteps = [
      cdCommand,
      `- Get started with your project by running ${kleur
        .yellow()
        .bold('npx amplify sandbox')}.`,
      `- Run ${kleur
        .yellow()
        .bold('npx amplify help')} for a list of available commands.`,
    ]
      .filter(Boolean)
      .join('\n');

    logger.log(instructionSteps);

    logger.log(
      kleur.dim(`\nAmplify (Gen 2) collects anonymous telemetry data about general usage of the CLI.
Participation is optional, and you may opt-out by using ${kleur
        .yellow()
        .bold('amplify configure telemetry disable')}.
To learn more about telemetry, visit ${LEARN_MORE_USAGE_DATA_TRACKING_LINK}\n`)
    );
  };
}
