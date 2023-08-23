import { PackageManagerController } from './package_manager_controller.js';
import { ProjectRootValidator } from './project_root_validator.js';
import { InitialProjectFileGenerator } from './initial_project_file_generator.js';
import { NpmInitializedEnsurer } from './npm_initialized_ensurer.js';

/**
 *
 */
export class AmplifyProjectCreator {
  // TODO once we create `aws-amplify-backend` that will be included here
  private readonly defaultPackages = [
    '@aws-amplify/backend',
    '@aws-amplify/backend-graphql',
    '@aws-amplify/backend-auth',
    '@aws-amplify/backend-cli',
    'aws-amplify',
  ];

  /**
   * Orchestrator for the create-amplify workflow.
   * Delegates out to other classes that handle parts of the getting started experience
   */
  constructor(
    private readonly packageManagerController: PackageManagerController,
    private readonly projectRootValidator: ProjectRootValidator,
    private readonly initialProjectFileGenerator: InitialProjectFileGenerator,
    private readonly npmInitializedEnsurer: NpmInitializedEnsurer,
    private readonly logger: typeof console = console
  ) {}

  /**
   * Executes the create-amplify workflow
   */
  async create(): Promise<void> {
    this.logger.log(`Validating current state of target directory...`);
    await this.projectRootValidator.validate();

    await this.npmInitializedEnsurer.ensureNpmInitialized();

    this.logger.log(
      `Installing packages ${this.defaultPackages.join(', ')}...`
    );
    await this.packageManagerController.installDependencies(
      this.defaultPackages,
      'dev'
    );

    this.logger.log('Scaffolding initial project files...');
    await this.initialProjectFileGenerator.generateInitialProjectFiles();

    this.logger.log(
      'All done! Run `amplify help` for a list of available commands.'
    );
  }
}
