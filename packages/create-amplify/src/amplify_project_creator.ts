import { PackageManagerController } from './package_manager_controller.js';
import { ProjectRootValidator } from './project_root_validator.js';
import { InitialProjectFileGenerator } from './initial_project_file_generator.js';
import { NpmProjectInitializer } from './npm_project_initializer.js';
import { TsConfigInitializer } from './tsconfig_initializer.js';
import { GitIgnoreInitializer } from './gitignore_initializer.js';

/**
 *
 */
export class AmplifyProjectCreator {
  private readonly defaultDevPackages = [
    '@aws-amplify/backend',
    '@aws-amplify/backend-cli',
    'typescript@^5.0.0',
  ];

  // TODO after API-Next is GA change to: `aws-amplify`
  // https://github.com/aws-amplify/amplify-backend/issues/332
  private readonly defaultProdPackages = ['aws-amplify@unstable'];

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
    private readonly gitIgnoreInitializer: GitIgnoreInitializer,
    private readonly projectRoot: string,
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

    await this.gitIgnoreInitializer.ensureInitialized();

    this.logger.log('Scaffolding initial project files...');
    await this.initialProjectFileGenerator.generateInitialProjectFiles();

    const cdCommand =
      process.cwd() === this.projectRoot
        ? '`'
        : `\`cd .${this.projectRoot.replace(process.cwd(), '')}; `;

    this.logger.log(
      `All done! 
Run \`npx amplify help\` for a list of available commands. 
Get started by running ${cdCommand}npx amplify sandbox\`.`
    );
  };
}
