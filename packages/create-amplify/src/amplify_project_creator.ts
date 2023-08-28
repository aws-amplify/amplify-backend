import { PackageManagerController } from './package_manager_controller.js';
import { ProjectRootValidator } from './project_root_validator.js';
import { InitialProjectFileGenerator } from './initial_project_file_generator.js';
import { NpmProjectInitializer } from './npm_project_initializer.js';

/**
 *
 */
export class AmplifyProjectCreator {
  private readonly defaultDevDependencies = [
    'aws-amplify-backend',
    '@aws-amplify/backend-cli',
  ];

  private readonly defaultDependencies = ['aws-amplify'];

  /**
   * Orchestrator for the create-amplify workflow.
   * Delegates out to other classes that handle parts of the getting started experience
   */
  constructor(
    private readonly packageManagerController: PackageManagerController,
    private readonly projectRootValidator: ProjectRootValidator,
    private readonly initialProjectFileGenerator: InitialProjectFileGenerator,
    private readonly npmInitializedEnsurer: NpmProjectInitializer,
    private readonly logger: typeof console = console
  ) {}

  /**
   * Executes the create-amplify workflow
   */
  async create(): Promise<void> {
    this.logger.log(`Validating current state of target directory...`);
    await this.projectRootValidator.validate();

    await this.npmInitializedEnsurer.ensureInitialized();

    this.logger.log(
      `Installing dependencies ${this.defaultDevDependencies.join(', ')}...`
    );
    await this.packageManagerController.installDependencies(
      this.defaultDependencies,
      'prod'
    );

    this.logger.log(
      `Installing dev dependencies ${this.defaultDependencies.join(', ')}...`
    );
    await this.packageManagerController.installDependencies(
      this.defaultDevDependencies,
      'dev'
    );

    this.logger.log('Scaffolding initial project files...');
    await this.initialProjectFileGenerator.generateInitialProjectFiles();

    this.logger.log(
      'All done! Run `amplify help` for a list of available commands.'
    );
  }
}
