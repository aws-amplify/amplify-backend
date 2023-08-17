import { PackageManagerController } from './package_manager_controller.js';
import { NoAmplifyDirValidator } from './no_amplify_dir_validator.js';
import { InitialProjectFileGenerator } from './initial_project_file_generator.js';

/**
 *
 */
export class CreateAmplifyRunner {
  // TODO once we create `aws-amplify-backend` that will be included here
  private readonly defaultPackages = [
    '@aws-amplify/backend',
    '@aws-amplify/backend-graphql',
    '@aws-amplify/backend-auth',
    '@aws-amplify/cli',
    'aws-amplify',
  ];

  /**
   * Orchestrator for the create-amplify workflow.
   * Delegates out to other classes that handle parts of the getting started experience
   */
  constructor(
    private readonly packageManagerController: PackageManagerController,
    private readonly dirValidator: NoAmplifyDirValidator,
    private readonly initialProjectFileGenerator: InitialProjectFileGenerator,
    private readonly logger: typeof console = console
  ) {}

  /**
   * Executes the create-amplify workflow
   */
  async run(): Promise<void> {
    this.logger.log(`Validating current state of target directory...`);
    await this.dirValidator.validate();

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
