import { execa as _execa } from 'execa';
import fsp from 'fs/promises';
import * as path from 'path';
import { executeWithDebugLogger } from '../execute_with_logger.js';
import {
  DependencyType,
  PackageManagerController,
  PackageManagerControllerFactory,
} from './package_manager_controller_factory.js';

/**
 *
 */
export class YarnModernPackageManagerController
  implements PackageManagerController
{
  private readonly fsp = fsp;
  private readonly execa = _execa;
  private readonly packageManagerProps = {
    name: 'yarn-modern',
    executable: 'yarn',
    binaryRunner: 'yarn',
    installCommand: 'add',
    lockFile: 'yarn.lock',
    initDefault: ['init', '--yes'],
  };
  /**
   * Abstraction around yarn modern commands that are needed to initialize a project and install dependencies
   */
  constructor(
    private readonly projectRoot: string,
    private readonly packageManagerControllerFactory: PackageManagerControllerFactory
  ) {}

  /**
   * Installs the given package names as devDependencies
   */
  installDependencies = async (
    packageNames: string[],
    type: DependencyType
  ): Promise<void> => {
    const args = [`${this.packageManagerProps.installCommand}`].concat(
      ...packageNames
    );
    if (type === 'dev') {
      args.push('-D');
    }

    await executeWithDebugLogger(
      this.projectRoot,
      this.packageManagerProps.executable,
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
Run \`${this.packageManagerProps.binaryRunner} amplify help\` for a list of available commands. 
Get started by running \`${cdCommand}${this.packageManagerProps.binaryRunner} amplify sandbox\`.`;
  };

  generateInitialProjectFiles = async () => {
    const targetDir = path.resolve(this.projectRoot, 'amplify');
    await this.fsp.mkdir(targetDir, { recursive: true });
    await this.fsp.cp(
      new URL('../../templates/basic-auth-data/amplify', import.meta.url),
      targetDir,
      { recursive: true }
    );

    const packageJsonContent = { type: 'module' };
    await this.fsp.writeFile(
      path.resolve(targetDir, 'package.json'),
      JSON.stringify(packageJsonContent, null, 2)
    );

    try {
      await this.fsp.writeFile(path.resolve(targetDir, 'yarn.lock'), '');
      console.log(`${targetDir}/yarn.lock created successfully.`);
    } catch (error) {
      console.error(`Error creating ${targetDir}/${targetDir}`, error);
    }

    await this.packageManagerControllerFactory.initializeTsConfig(
      targetDir,
      this.packageManagerProps
    );
  };

  initializeAmplifyFolder = async () => {
    await this.packageManagerControllerFactory.initializeProject(
      this.packageManagerProps
    );
  };
}
