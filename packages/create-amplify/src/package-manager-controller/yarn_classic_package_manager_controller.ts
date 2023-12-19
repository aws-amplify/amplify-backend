import { existsSync as _existsSync } from 'fs';
import { execa as _execa } from 'execa';
import { executeWithDebugLogger } from '../execute_with_logger.js';
import {
  DependencyType,
  PackageManagerController,
  PackageManagerControllerFactory,
} from './package_manager_controller_factory.js';

/**
 *
 */
export class YarnClassicPackageManagerController extends PackageManagerController {
  /**
   * Abstraction around yarn classic commands that are needed to initialize a project and install dependencies
   */
  constructor() {
    super();
    this.executable = 'yarn';
    this.binaryRunner = 'yarn';
    this.installCommand = 'add';
    this.initDefault = ['init', '--yes'];
  }

  /**
   * Installs the given package names as devDependencies
   */
  installDependencies = async (
    packageNames: string[],
    type: DependencyType
  ): Promise<void> => {
    const args = [`${this.installCommand}`].concat(...packageNames);
    if (type === 'dev') {
      args.push('-D');
    }

    await executeWithDebugLogger(
      this.projectRoot,
      this.executable,
      args,
      this.execa
    );
  };

  getWelcomeMessage = () => {
    const cdCommand =
      process.cwd() === this.projectRoot
        ? ''
        : `cd .${this.projectRoot.replace(process.cwd(), '')}; `;

    return `Welcome to AWS Amplify! 
Run \`${this.binaryRunner} amplify help\` for a list of available commands. 
Get started by running \`${cdCommand}${this.binaryRunner} amplify sandbox\`.`;
  };

  generateInitialProjectFiles = async () => {
    await this.packageManagerControllerFactory.generateInitialProjectFiles(
      this.packageManagerProps
    );
  };
}
