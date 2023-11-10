import { execa as _execa } from 'execa';
import {
  DependencyType,
  PackageManagerController,
} from './package_manager_controller.js';
import { logger } from './logger.js';
import { executeWithLogger } from './execute_with_logger.js';

/**
 *
 */
export class NpmPackageManagerController implements PackageManagerController {
  /**
   * Abstraction around npm commands that are needed to initialize a project and install dependencies
   */
  constructor(
    private readonly projectRoot: string,
    private readonly execa = _execa
  ) {}
  private readonly executableName = 'npm';

  /**
   * Installs the given package names as devDependencies
   */
  installDependencies = async (
    packageNames: string[],
    type: DependencyType
  ): Promise<void> => {
    const args = ['install'].concat(...packageNames);
    const typeDev = type === 'dev';
    if (typeDev) {
      args.push('--save-dev');
    }

    try {
      await executeWithLogger(this.execa, this.projectRoot, 'npm', args);
    } catch {
      throw new Error(
        `\`npm install ${packageNames.join(' ')}${
          typeDev ? ' --save-dev' : ''
        }\` did not exit successfully.`
      );
    }
  };
}
