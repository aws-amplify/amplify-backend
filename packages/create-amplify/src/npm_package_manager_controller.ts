import { execa as _execa } from 'execa';
import {
  DependencyType,
  PackageManagerController,
} from './package_manager_controller.js';
import { executeWithDebugLogger } from './execute_with_logger.js';
import { type PackageManager } from './amplify_project_creator.js';

/**
 *
 */
export class NpmPackageManagerController implements PackageManagerController {
  /**
   * Abstraction around npm commands that are needed to initialize a project and install dependencies
   */
  constructor(
    private readonly projectRoot: string,
    private readonly packageManagerExecutable: PackageManager,
    private readonly execa = _execa
  ) {}

  /**
   * Installs the given package names as devDependencies
   */
  installDependencies = async (
    packageNames: string[],
    type: DependencyType
  ): Promise<void> => {
    const executableName = !this.packageManagerExecutable
      ? 'npm'
      : this.packageManagerExecutable.startsWith('yarn')
      ? 'yarn'
      : this.packageManagerExecutable;

    const args = [executableName.startsWith('yarn') ? 'add' : 'install'].concat(
      ...packageNames
    );
    if (type === 'dev') {
      args.push('-D');
    }

    try {
      await executeWithDebugLogger(
        this.projectRoot,
        executableName,
        args,
        this.execa
      );
    } catch {
      throw new Error(
        `\`${executableName} ${args.join(' ')}\` did not exit successfully.`
      );
    }
  };
}
