import boxen from 'boxen';
import { AmplifyPrompter } from './amplify_prompts.js';
import { PackageManagerController } from './package_manager_controller.js';
import { ProjectRootValidator } from './project_root_validator.js';
import { InitialProjectFileGenerator } from './initial_project_file_generator.js';
import { NpmProjectInitializer } from './npm_project_initializer.js';
import { TsConfigInitializer } from './tsconfig_initializer.js';

/**
 *
 */
export class AmplifyProjectCreator {
  // TODO once we create `aws-amplify-backend` that will be included here
  private readonly defaultDevPackages = [
    '@aws-amplify/backend',
    '@aws-amplify/backend-graphql',
    '@aws-amplify/backend-auth',
    '@aws-amplify/backend-cli',
    // TODO after API-Next is GA change to: @aws-amplify/amplify-api-next
    // https://github.com/aws-amplify/samsara-cli/issues/332
    '@aws-amplify/amplify-api-next-alpha',
    'typescript@^5.0.0',
  ];

  // TODO after API-Next is GA change to: `aws-amplify`
  // https://github.com/aws-amplify/samsara-cli/issues/332
  private readonly defaultProdPackages = ['aws-amplify@api-v6-models'];

  /**
   * Orchestrator for the create-amplify workflow.
   * Delegates out to other classes that handle parts of the getting started experience
   */
  constructor(
    private readonly packageManagerController: PackageManagerController,
    private readonly projectRootValidator: ProjectRootValidator,
    private readonly initialProjectFileGenerator: InitialProjectFileGenerator,
    private readonly npmInitializedEnsurer: NpmProjectInitializer,
    private readonly tsConfigInitializer: TsConfigInitializer,
    private readonly logger: typeof console = console
  ) {}

  /**
   * Executes the create-amplify workflow
   */
  create = async (): Promise<void> => {
    this.logger.log(`Validating current state of target directory...`);
    await this.projectRootValidator.validate();

    await this.npmInitializedEnsurer.ensureInitialized();

    this.logger.log(
      `Installing packages ${this.defaultProdPackages.join(', ')}...`
    );
    await this.packageManagerController.installDependencies(
      this.defaultProdPackages,
      'prod'
    );

    this.logger.log(
      `Installing dev dependencies ${this.defaultDevPackages.join(', ')}...`
    );

    await this.packageManagerController.installDependencies(
      this.defaultDevPackages,
      'dev'
    );

    await this.tsConfigInitializer.ensureInitialized();

    this.logger.log('Scaffolding initial project files...');
    await this.initialProjectFileGenerator.generateInitialProjectFiles();

    this.logger.log(
      `All done! Run \`amplify help\` for a list of available commands. Get started by running \`amplify sandbox\``
    );
  };
}
